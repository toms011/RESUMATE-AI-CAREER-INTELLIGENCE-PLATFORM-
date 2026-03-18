
import os
import json
import secrets
from dotenv import load_dotenv
# Load environment variables
load_dotenv()

# --- Patch PyJWT: accept integer "sub" claims for backward-compatible tokens ---
import jwt.api_jwt
jwt.api_jwt.PyJWT._validate_sub = lambda self, payload, subject=None: None

from flask import Flask, request, jsonify, render_template, make_response
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from models import db, User, Resume, PersonalInfo, Experience, Education, Skill, AdditionalDetail, Template, ATSAnalysis, JobMatchHistory, ResumeAnalysis, ComparisonHistory, CareerChatHistory, ApiKey, ApiKeyLog, JobListing, JobSearchLog, CompanyAnalysisCache, CompanyAnalysisLog, AIFeatureSetting, AIUsageLog, GeneratedReport, JobApplicationLog
from xhtml2pdf import pisa
from ai_service import AIResumeService
from docx_service import DOCXGenerator
from resume_parser import parse_resume as parse_resume_file
from ai_limit_checker import check_ai_limit, log_ai_usage
import io
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)

# Allow localhost on any port for local development (flask-cors v6 API)
CORS(app, origins=[
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:5174", "http://127.0.0.1:5174",
    "http://localhost:5175", "http://127.0.0.1:5175",
    "http://localhost:5176", "http://127.0.0.1:5176",
    "http://localhost:5177", "http://127.0.0.1:5177",
    "http://localhost:5178", "http://127.0.0.1:5178",
    "http://localhost:5179", "http://127.0.0.1:5179",
    "http://localhost:3000", "http://127.0.0.1:3000",
], supports_credentials=True)

# --- JWT CONFIGURATION ---
# Persist the JWT secret key so tokens survive server restarts.
def _get_or_create_jwt_secret():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    # 1. Already in environment (production deployment)
    key = os.environ.get('JWT_SECRET_KEY')
    if key:
        return key
    # 2. Try to read from .env file
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('JWT_SECRET_KEY='):
                    key = line.split('=', 1)[1].strip().strip('"').strip("'")
                    if key:
                        return key
    # 3. Generate a new one and append it to .env
    key = secrets.token_hex(32)
    with open(env_path, 'a') as f:
        f.write(f'\nJWT_SECRET_KEY={key}\n')
    return key

app.config['JWT_SECRET_KEY'] = _get_or_create_jwt_secret()
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
jwt = JWTManager(app)

# --- HELPER: Admin-required decorator ---
def admin_required(fn):
    """Decorator that checks JWT + is_admin flag."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        uid = int(get_jwt_identity())
        user = User.query.get(uid)
        if not user or not user.is_admin:
            return jsonify({"message": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper

# --- HELPER: ownership check ---
def verify_resume_owner(resume, user_id):
    """Return True if resume belongs to user_id (or user is admin)."""
    uid = int(user_id)
    if resume.user_id == uid:
        return True
    user = User.query.get(uid)
    return user and user.is_admin

# --- FILE UPLOAD CONFIGURATION ---
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'html', 'rtf', 'txt', 'png', 'jpg', 'jpeg'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- DATABASE CONFIGURATION ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///resume_builder.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# ── Initialize key manager (DB-backed API key rotation) ──
from key_manager import init_key_manager
from job_service import init_job_service


def init_default_templates():
    """Initialize default resume templates with dynamic config"""
    # these match the frontend/src/utils/templates.js
    templates_data = [
        {
            "name": "Classic Professional",
            "description": "Traditional, clean layout suitable for corporate environments.",
            "preview_image": "/templates/classic.png",
            "section_order": ["HeaderSection", "SummarySection", "ExperienceSection", "EducationSection", "SkillsSection", "ProjectsSection"],
            "styles": {
                "fontFamily": "Times New Roman, serif",
                "accentColor": "#333333",
                "nameColor": "#000000",
                "borderBottom": True,
                "textAlign": "left",
                "marginBottom": "var(--space-section)",
                "headerTransform": "uppercase"
            },
            "category": "classic"
        },
        {
            "name": "Modern Minimal",
            "description": "Sleek, sans-serif design with bold headers and clean spacing.",
            "preview_image": "/templates/modern.png",
            "section_order": ["HeaderSection", "SummarySection", "SkillsSection", "ExperienceSection", "ProjectsSection", "EducationSection"],
            "styles": {
                "fontFamily": "Inter, sans-serif",
                "accentColor": "#2563EB",
                "nameColor": "#1E40AF",
                "borderBottom": False,
                "textAlign": "left",
                "marginBottom": "2rem",
                "tagStyle": True,
                "headerTransform": "none",
                "nameWeight": "800"
            },
            "category": "modern"
        },
        {
            "name": "Centered Creative",
            "description": "Centered header and content for a unique, personal feel.",
            "preview_image": "/templates/creative.png",
            "section_order": ["HeaderSection", "SkillsSection", "SummarySection", "ExperienceSection", "EducationSection"],
            "styles": {
                "fontFamily": "Georgia, serif",
                "accentColor": "#D946EF",
                "textAlign": "center",
                "borderBottom": True,
                "headerTransform": "uppercase",
                "headerColor": "#86198F"
            },
            "category": "creative"
        }
    ]
    
    for tpl_data in templates_data:
        # Check if exists by name
        existing = Template.query.filter_by(name=tpl_data["name"]).first()
        if not existing:
            template = Template(
                name=tpl_data["name"],
                description=tpl_data["description"],
                preview_image=tpl_data["preview_image"],
                category=tpl_data["category"],
                section_order=tpl_data["section_order"],
                styles=tpl_data["styles"],
                html_template="",  # Default to empty string to satisfy NOT NULL constraint
                is_active=True
            )
            db.session.add(template)
    
    try:
        db.session.commit()
        print("✅ Default dynamic templates initialized")
    except Exception as e:
        print(f"Error initializing templates: {e}")
        db.session.rollback()


def init_html_templates():
    """Ensure HTML-file-based PDF templates exist and have proper section_order/styles."""
    DEFAULT_SECTION_ORDER = [
        "HeaderSection", "SummarySection", "ExperienceSection",
        "EducationSection", "SkillsSection"
    ]
    html_templates = [
        {
            "name": "Modern Professional",
            "description": "Two-column sidebar layout with dark blue & gold accent.",
            "html_template": "template_modern.html",
            "category": "modern",
            "preview_image": "/templates/modern.png",
            "section_order": DEFAULT_SECTION_ORDER,
            "styles": {
                "fontFamily": "Inter, sans-serif",
                "accentColor": "#1e3a5f",
                "nameColor": "#1e3a5f",
                "borderBottom": False,
                "textAlign": "left",
                "headerTransform": "none",
                "nameWeight": "800",
                "allowProfileImage": True,
                "imagePosition": "right",
                "imageShape": "circle",
                "imageSize": 90,
            },
        },
        {
            "name": "Classic Traditional",
            "description": "Elegant dark header with gold accents, single-column.",
            "html_template": "template_classic.html",
            "category": "classic",
            "preview_image": "/templates/classic.png",
            "section_order": DEFAULT_SECTION_ORDER,
            "styles": {
                "fontFamily": "Times New Roman, serif",
                "accentColor": "#7c5c00",
                "nameColor": "#1a1a1a",
                "borderBottom": True,
                "textAlign": "left",
                "headerTransform": "uppercase",
                "allowProfileImage": True,
                "imagePosition": "right",
                "imageShape": "square",
                "imageSize": 85,
            },
        },
        {
            "name": "Minimal Clean",
            "description": "Clean grayscale sidebar layout, ATS-optimized.",
            "html_template": "template_minimal.html",
            "category": "minimal",
            "preview_image": "/templates/minimal.png",
            "section_order": DEFAULT_SECTION_ORDER,
            "styles": {
                "fontFamily": "Calibri, sans-serif",
                "accentColor": "#475569",
                "nameColor": "#1e293b",
                "borderBottom": True,
                "textAlign": "left",
                "headerTransform": "uppercase",
                "allowProfileImage": False,
            },
        },
        {
            "name": "Professional Modern",
            "description": "Single-column modern layout with photo, contact icons, and yellow accents.",
            "html_template": "template_professional.html",
            "category": "professional",
            "preview_image": "/templates/professional.png",
            "section_order": DEFAULT_SECTION_ORDER,
            "styles": {
                "fontFamily": "Inter, sans-serif",
                "accentColor": "#d97706",
                "nameColor": "#111827",
                "borderBottom": False,
                "textAlign": "left",
                "headerTransform": "none",
                "allowProfileImage": True,
                "imagePosition": "left",
                "imageShape": "circle",
                "imageSize": 90,
            },
        },
    ]
    for tpl in html_templates:
        existing = Template.query.filter_by(html_template=tpl["html_template"]).first()
        if not existing:
            t = Template(
                name=tpl["name"],
                description=tpl["description"],
                html_template=tpl["html_template"],
                category=tpl["category"],
                preview_image=tpl["preview_image"],
                is_active=True,
                section_order=tpl["section_order"],
                styles=tpl["styles"],
            )
            db.session.add(t)
        else:
            # Patch existing rows that were saved with empty section_order / styles
            if not existing.section_order:
                existing.section_order = tpl["section_order"]
            if not existing.styles:
                existing.styles = tpl["styles"]
    try:
        db.session.commit()
        print("✅ HTML-based PDF templates registered/updated")
    except Exception as e:
        print(f"Error registering HTML templates: {e}")
        db.session.rollback()


with app.app_context():
    try:
        db.create_all()
        
        # --- SCHEMA MIGRATION ---
        inspector = db.inspect(db.engine)
        columns = [col['name'] for col in inspector.get_columns('template')]
        
        with db.engine.connect() as conn:
            # layout_config
            if 'layout_config' not in columns:
                print("⚠️  Migrating: Adding layout_config to Template...")
                conn.execute(db.text("ALTER TABLE template ADD COLUMN layout_config JSON"))
            
            # section_order
            if 'section_order' not in columns:
                print("⚠️  Migrating: Adding section_order to Template...")
                conn.execute(db.text("ALTER TABLE template ADD COLUMN section_order JSON"))
                
            # styles
            if 'styles' not in columns:
                print("⚠️  Migrating: Adding styles to Template...")
                conn.execute(db.text("ALTER TABLE template ADD COLUMN styles JSON"))

            # DESIGN template columns — must migrate BEFORE init_default_templates queries them
            if 'template_type' not in columns:
                print("⚠️  Migrating: Adding template_type to template...")
                conn.execute(db.text("ALTER TABLE template ADD COLUMN template_type VARCHAR(10) DEFAULT 'ATS'"))
            if 'background_image' not in columns:
                print("⚠️  Migrating: Adding background_image to template...")
                conn.execute(db.text("ALTER TABLE template ADD COLUMN background_image TEXT"))
            if 'content_padding' not in columns:
                print("⚠️  Migrating: Adding content_padding to template...")
                conn.execute(db.text("ALTER TABLE template ADD COLUMN content_padding JSON"))

            conn.commit()
            
        # Initialize default templates if they don't exist (or we just added columns)
        init_default_templates()

        # Register HTML-file-based PDF templates
        init_html_templates()
        
        # --- RESUME MIGRATION (previous) ---
        resume_cols = [col['name'] for col in inspector.get_columns('resume')]
        if 'is_deleted' not in resume_cols:
            print("⚠️  Migrating database: Adding is_deleted and deleted_at columns...")
            with db.engine.connect() as conn:
                conn.execute(db.text("ALTER TABLE resume ADD COLUMN is_deleted BOOLEAN DEFAULT 0"))
                conn.execute(db.text("ALTER TABLE resume ADD COLUMN deleted_at DATETIME"))
                conn.commit()
            print("✅ Database migration complete.")

        if 'template_id' not in resume_cols:
            print("⚠️  Migrating database: Adding template_id column...")
            with db.engine.connect() as conn:
                try:
                    conn.execute(db.text("ALTER TABLE resume ADD COLUMN template_id INTEGER DEFAULT 1"))
                    conn.commit()
                    print("✅ Added template_id column.")
                except Exception as e:
                    print(f"Error adding template_id: {e}")

        if 'canvas_design' not in resume_cols:
            print("⚠️  Migrating database: Adding canvas_design column...")
            with db.engine.connect() as conn:
                try:
                    conn.execute(db.text("ALTER TABLE resume ADD COLUMN canvas_design TEXT"))
                    conn.commit()
                    print("✅ Added canvas_design column.")
                except Exception as e:
                    print(f"Error adding canvas_design: {e}")

        # Check for ATS Analysis table
        if not inspector.has_table("ats_analysis"):
            print("⚠️  Creating ats_analysis table...")
            with db.engine.connect() as conn:
                 # Basic SQL for SQLite
                 conn.execute(db.text("""
                    CREATE TABLE ats_analysis (
                        id INTEGER PRIMARY KEY,
                        user_id INTEGER,
                        filename VARCHAR(255),
                        score INTEGER,
                        created_at DATETIME,
                        FOREIGN KEY(user_id) REFERENCES user(id)
                    )
                 """))
                 conn.commit()
            print("✅ ATS Analysis table created.")

        # --- PersonalInfo migration (new fields) ---
        if inspector.has_table("personal_info"):
            pi_cols = [col['name'] for col in inspector.get_columns('personal_info')]
            new_pi_cols = {
                'first_name': 'VARCHAR(100)', 'last_name': 'VARCHAR(100)',
                'job_title': 'VARCHAR(200)', 'github': 'VARCHAR(200)',
                'location': 'VARCHAR(200)', 'country': 'VARCHAR(10)',
                'country_name': 'VARCHAR(100)', 'state': 'VARCHAR(10)',
                'state_name': 'VARCHAR(100)', 'city': 'VARCHAR(100)',
                'additional_info': 'TEXT',
                'profile_image_url': 'TEXT',
                'profile_image_enabled': 'BOOLEAN DEFAULT 0'
            }
            with db.engine.connect() as conn:
                for col_name, col_type in new_pi_cols.items():
                    if col_name not in pi_cols:
                        print(f"⚠️  Migrating: Adding {col_name} to personal_info...")
                        conn.execute(db.text(f"ALTER TABLE personal_info ADD COLUMN {col_name} {col_type}"))
                conn.commit()

        # --- Education grade migration ---
        if inspector.has_table("education"):
            edu_cols = [col['name'] for col in inspector.get_columns('education')]
            with db.engine.connect() as conn:
                if 'grade' not in edu_cols:
                    print("⚠️  Migrating: Adding grade to education...")
                    conn.execute(db.text("ALTER TABLE education ADD COLUMN grade VARCHAR(50)"))
                conn.commit()

        # --- User migration (reset_token fields) ---
        user_cols = [col['name'] for col in inspector.get_columns('user')]
        with db.engine.connect() as conn:
            if 'reset_token' not in user_cols:
                print("⚠️  Migrating: Adding reset_token to user...")
                conn.execute(db.text("ALTER TABLE user ADD COLUMN reset_token VARCHAR(200)"))
            if 'reset_token_expires' not in user_cols:
                print("⚠️  Migrating: Adding reset_token_expires to user...")
                conn.execute(db.text("ALTER TABLE user ADD COLUMN reset_token_expires DATETIME"))
            conn.commit()

        # --- AdditionalDetail table ---
        if not inspector.has_table("additional_detail"):
            print("⚠️  Creating additional_detail table...")
            with db.engine.connect() as conn:
                conn.execute(db.text("""
                    CREATE TABLE additional_detail (
                        id INTEGER PRIMARY KEY,
                        resume_id INTEGER NOT NULL,
                        detail_type VARCHAR(50) NOT NULL,
                        value TEXT NOT NULL,
                        sort_order INTEGER DEFAULT 0,
                        FOREIGN KEY(resume_id) REFERENCES resume(id)
                    )
                """))
                conn.commit()
            print("✅ additional_detail table created.")

        # --- DESIGN template columns migration ---
        tpl_cols = [col['name'] for col in inspector.get_columns('template')]
        with db.engine.connect() as conn:
            if 'template_type' not in tpl_cols:
                print("⚠️  Migrating: Adding template_type to template...")
                conn.execute(db.text("ALTER TABLE template ADD COLUMN template_type VARCHAR(10) DEFAULT 'ATS'"))
            if 'background_image' not in tpl_cols:
                print("⚠️  Migrating: Adding background_image to template...")
                conn.execute(db.text("ALTER TABLE template ADD COLUMN background_image TEXT"))
            if 'content_padding' not in tpl_cols:
                print("⚠️  Migrating: Adding content_padding to template...")
                conn.execute(db.text("ALTER TABLE template ADD COLUMN content_padding JSON"))
            conn.commit()

        # --- ResumeAnalysis table migration ---
        if not inspector.has_table("resume_analysis"):
            print("\u26a0\ufe0f  Creating resume_analysis table...")
            with db.engine.connect() as conn:
                conn.execute(db.text("""
                    CREATE TABLE resume_analysis (
                        id INTEGER PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        filename VARCHAR(255),
                        opportunity_score INTEGER,
                        career_stage VARCHAR(50),
                        career_summary TEXT,
                        analysis_json TEXT,
                        created_at DATETIME,
                        FOREIGN KEY(user_id) REFERENCES user(id)
                    )
                """))
                conn.commit()
            print("\u2705 resume_analysis table created.")

        # --- ATSAnalysis migration: add analysis_json + analysis_type columns ---
        if inspector.has_table("ats_analysis"):
            ats_cols = {col['name'] for col in inspector.get_columns('ats_analysis')}
            with db.engine.connect() as conn:
                if 'analysis_json' not in ats_cols:
                    print("⚠️  Migrating: Adding analysis_json to ats_analysis...")
                    conn.execute(db.text("ALTER TABLE ats_analysis ADD COLUMN analysis_json TEXT"))
                    conn.commit()
                if 'analysis_type' not in ats_cols:
                    print("⚠️  Migrating: Adding analysis_type to ats_analysis...")
                    conn.execute(db.text("ALTER TABLE ats_analysis ADD COLUMN analysis_type VARCHAR(20) DEFAULT 'ats'"))
                    conn.commit()

        # --- ComparisonHistory table migration ---
        if not inspector.has_table("comparison_history"):
            print("⚠️  Creating comparison_history table...")
            with db.engine.connect() as conn:
                conn.execute(db.text("""
                    CREATE TABLE comparison_history (
                        id INTEGER PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        file_names TEXT,
                        target_job VARCHAR(255),
                        winner_name VARCHAR(255),
                        resume_count INTEGER,
                        comparison_json TEXT,
                        created_at DATETIME,
                        FOREIGN KEY(user_id) REFERENCES user(id)
                    )
                """))
                conn.commit()
            print("✅ comparison_history table created.")

        # --- CareerChatHistory table migration ---
        if not inspector.has_table("career_chat_history"):
            print("⚠️  Creating career_chat_history table...")
            with db.engine.connect() as conn:
                conn.execute(db.text("""
                    CREATE TABLE career_chat_history (
                        id INTEGER PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        query TEXT,
                        response TEXT,
                        created_at DATETIME,
                        FOREIGN KEY(user_id) REFERENCES user(id)
                    )
                """))
                conn.commit()
            print("✅ career_chat_history table created.")
            
        # --- ApiKey / ApiKeyLog table migration ---
        if not inspector.has_table("api_key"):
            print("⚠️  Creating api_key table...")
            with db.engine.connect() as conn:
                conn.execute(db.text("""
                    CREATE TABLE api_key (
                        id INTEGER PRIMARY KEY,
                        provider_name VARCHAR(50) NOT NULL DEFAULT 'gemini',
                        label VARCHAR(100),
                        encrypted_key TEXT NOT NULL,
                        status VARCHAR(20) NOT NULL DEFAULT 'active',
                        priority INTEGER NOT NULL DEFAULT 10,
                        usage_count INTEGER DEFAULT 0,
                        success_count INTEGER DEFAULT 0,
                        failure_count INTEGER DEFAULT 0,
                        last_used_at DATETIME,
                        last_error VARCHAR(255),
                        monthly_limit INTEGER,
                        daily_limit INTEGER,
                        daily_usage INTEGER DEFAULT 0,
                        last_daily_reset DATETIME,
                        created_at DATETIME,
                        updated_at DATETIME
                    )
                """))
                conn.commit()
            print("✅ api_key table created.")

        if not inspector.has_table("api_key_log"):
            print("⚠️  Creating api_key_log table...")
            with db.engine.connect() as conn:
                conn.execute(db.text("""
                    CREATE TABLE api_key_log (
                        id INTEGER PRIMARY KEY,
                        api_key_id INTEGER,
                        endpoint_used VARCHAR(255),
                        success BOOLEAN DEFAULT 1,
                        error_code VARCHAR(50),
                        error_message VARCHAR(500),
                        response_time_ms INTEGER,
                        created_at DATETIME,
                        FOREIGN KEY(api_key_id) REFERENCES api_key(id)
                    )
                """))
                conn.commit()
            print("✅ api_key_log table created.")

        # --- CompanyAnalysisCache table migration ---
        if not inspector.has_table("company_analysis_cache"):
            print("⚠️  Creating company_analysis_cache table...")
            with db.engine.connect() as conn:
                conn.execute(db.text("""
                    CREATE TABLE company_analysis_cache (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        company_name VARCHAR(200) NOT NULL,
                        job_role VARCHAR(200),
                        analysis_json TEXT NOT NULL,
                        created_at DATETIME,
                        expires_at DATETIME NOT NULL
                    )
                """))
                conn.execute(db.text("CREATE INDEX IF NOT EXISTS idx_cac_company ON company_analysis_cache(company_name)"))
                conn.commit()
            print("✅ company_analysis_cache table created.")

        # --- CompanyAnalysisLog table migration ---
        if not inspector.has_table("company_analysis_log"):
            print("⚠️  Creating company_analysis_log table...")
            with db.engine.connect() as conn:
                conn.execute(db.text("""
                    CREATE TABLE company_analysis_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        company_name VARCHAR(200),
                        created_at DATETIME,
                        FOREIGN KEY(user_id) REFERENCES user(id)
                    )
                """))
                conn.commit()
            print("✅ company_analysis_log table created.")

        # Initialize key manager (seeds .env keys into DB on first run)
        init_key_manager(app, db)

        # Initialize job service (creates tables + starts background scheduler)
        init_job_service(app, db)

        # Seed AI Feature Settings (only once, on first run)
        if AIFeatureSetting.query.count() == 0:
            for feat in AIFeatureSetting.FEATURE_DEFAULTS:
                db.session.add(AIFeatureSetting(**feat))
            db.session.commit()
            print("✅ Seeded default AI feature settings")

    except Exception as e:
        # If tables already exist or another DB issue occurs during reload,
        # log the error but allow the app to continue running so endpoints stay available.
        print(f"Warning: db.create_all() raised an exception: {e}")

@app.route("/")
def home():
    return "Heyyy Welcome Jarvis - Database is Connected!"

# --- Serve uploaded files (template backgrounds, etc.) ---
from flask import send_from_directory
@app.route("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(os.path.abspath(UPLOAD_FOLDER), filename)


from routes.template_routes import template_routes

app.register_blueprint(template_routes)

# --- REGISTER API ---
@app.route("/register", methods=["POST"])
def register():
    print("--- REGISTER REQUEST RECEIVED ---")
    print(f"Headers: {request.headers}")
    print(f"JSON: {request.json}")
    data = request.json
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    print(f"Attempting register: user={username}, email={email}")

    if User.query.filter_by(email=email).first():
        existing = User.query.filter_by(email=email).first()
        print(f"CONFLICT: Request email '{email}' matches DB User ID {existing.id} with email '{existing.email}'")
        return jsonify({"message": "Email already registered!"}), 400

    hashed_password = generate_password_hash(password)
    new_user = User(username=username, email=email, password_hash=hashed_password)

    try:
        db.session.add(new_user)
        db.session.commit()
        print(f"User created: ID={new_user.id}")
        return jsonify({"message": "User registered successfully!"}), 201
    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({"message": "Error saving user", "error": str(e)}), 500

# --- LOGIN API ---
@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = User.query.filter_by(email=email).first()

    # Check if user is banned
    if user and user.is_banned:
        # Check if ban has expired
        if user.banned_until and user.banned_until < datetime.utcnow():
            # Ban has expired, unban them automatically
            user.is_banned = False
            user.banned_until = None
            user.ban_reason = None
            db.session.commit()
        else:
            # Still banned
            ban_msg = f"Your account is banned"
            if user.banned_until:
                ban_msg += f" until {user.banned_until.strftime('%Y-%m-%d %H:%M:%S')}"
            else:
                ban_msg += " permanently"
            if user.ban_reason:
                ban_msg += f". Reason: {user.ban_reason}"
            return jsonify({"message": ban_msg}), 403

    if user and check_password_hash(user.password_hash, password):
        # Generate Access + Refresh Tokens (identity must be a string for PyJWT)
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        return jsonify({
            "message": "Login successful!",
            "token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "is_admin": user.is_admin
            }
        }), 200
    else:
        return jsonify({"message": "Invalid email or password"}), 401

# --- TOKEN REFRESH ---
@app.route("/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh_token():
    uid = get_jwt_identity()
    new_token = create_access_token(identity=str(uid))
    return jsonify({"token": new_token}), 200

# --- PASSWORD RESET (request) ---
@app.route("/auth/reset-password", methods=["POST"])
def request_password_reset():
    data = request.json
    email = data.get('email')
    user = User.query.filter_by(email=email).first()
    if not user:
        # Don't reveal whether email exists
        return jsonify({"message": "If that email is registered, a reset link has been sent."}), 200
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    db.session.commit()
    # In production, send email with token. For dev, return it.
    return jsonify({"message": "Reset token generated.", "reset_token": token}), 200

# --- PASSWORD RESET (confirm) ---
@app.route("/auth/reset-password/confirm", methods=["POST"])
def confirm_password_reset():
    data = request.json
    token = data.get('token')
    new_password = data.get('new_password')
    if not token or not new_password:
        return jsonify({"message": "Token and new_password are required"}), 400
    user = User.query.filter_by(reset_token=token).first()
    if not user or (user.reset_token_expires and user.reset_token_expires < datetime.utcnow()):
        return jsonify({"message": "Invalid or expired token"}), 400
    user.password_hash = generate_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()
    return jsonify({"message": "Password reset successful!"}), 200

# --- GET ALL RESUMES ---
@app.route("/resumes", methods=["GET"])
@jwt_required()
def get_resumes():
    user_id = int(get_jwt_identity())

    # Fetch active resumes belonging to this user
    user_resumes = Resume.query.filter_by(user_id=user_id, is_deleted=False).all()
    
    # Convert list of objects to list of dictionaries (JSON)
    output = []
    for resume in user_resumes:
        output.append({
            "id": resume.id,
            "title": resume.title,
            "created_at": resume.created_at
        })
    
    return jsonify({"resumes": output}), 200

# --- GET TRASH RESUMES ---
@app.route("/resumes/trash", methods=["GET"])
@jwt_required()
def get_trash_resumes():
    user_id = int(get_jwt_identity())

    # Fetch deleted resumes
    deleted_resumes = Resume.query.filter_by(user_id=user_id, is_deleted=True).all()
    
    output = []
    for resume in deleted_resumes:
        output.append({
            "id": resume.id,
            "title": resume.title,
            "deleted_at": resume.deleted_at
        })
    
    return jsonify({"resumes": output}), 200

# --- SOFT DELETE RESUME ---
@app.route("/resumes/<int:resume_id>/trash", methods=["PATCH"])
@jwt_required()
def soft_delete_resume(resume_id):
    resume = Resume.query.get(resume_id)
    if not resume:
        return jsonify({"message": "Resume not found"}), 404
    if not verify_resume_owner(resume, get_jwt_identity()):
        return jsonify({"message": "Unauthorized"}), 403
        
    try:
        resume.is_deleted = True
        resume.deleted_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"message": "Resume moved to trash"}), 200
    except Exception as e:
        return jsonify({"message": "Error moving to trash", "error": str(e)}), 500

# --- RESTORE RESUME ---
@app.route("/resumes/<int:resume_id>/restore", methods=["PATCH"])
@jwt_required()
def restore_resume(resume_id):
    resume = Resume.query.get(resume_id)
    if not resume:
        return jsonify({"message": "Resume not found"}), 404
    if not verify_resume_owner(resume, get_jwt_identity()):
        return jsonify({"message": "Unauthorized"}), 403
        
    try:
        resume.is_deleted = False
        resume.deleted_at = None
        db.session.commit()
        return jsonify({"message": "Resume restored successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Error restoring resume", "error": str(e)}), 500

# --- ADD RESUME ---
@app.route("/add_resume", methods=["POST"])
@jwt_required()
def add_resume():
    data = request.json
    user_id = int(get_jwt_identity())
    title = data.get('title')

    if not title:
        return jsonify({"message": "Title is required"}), 400

    new_resume = Resume(user_id=user_id, title=title)
    
    try:
        db.session.add(new_resume)
        db.session.commit()
        return jsonify({"message": "Resume created successfully!", "resume_id": new_resume.id}), 201
    except Exception as e:
        return jsonify({"message": "Error creating resume", "error": str(e)}), 500


# --- UPLOAD RESUME FILE ---
@app.route("/upload_resume", methods=["POST"])
@jwt_required()
def upload_resume():
    """Upload and parse an existing resume file"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({"message": "No file provided"}), 400
        
        file = request.files['file']
        user_id = int(get_jwt_identity())
        
        if file.filename == '':
            return jsonify({"message": "No file selected"}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            # ── STEP 1: Check if this is a ResuMate system-generated PDF ────
            if filename.lower().endswith('.pdf'):
                try:
                    import PyPDF2
                    with open(filepath, 'rb') as f:
                        pdf_reader = PyPDF2.PdfReader(f)
                        meta = pdf_reader.metadata or {}
                    if meta.get('/Producer') == 'ResuMate-AI-Builder' and meta.get('/ResuMateResumeId'):
                        source_id = int(meta.get('/ResuMateResumeId'))
                        print(f"\n{'='*60}")
                        print(f"✅ ResuMate system PDF detected! Source resume ID: {source_id}")
                        print(f"{'='*60}")
                        source = Resume.query.get(source_id)
                        if source:
                            # Clone the original resume for this user
                            new_resume = Resume(
                                user_id=user_id,
                                title=f"{source.title} (Re-imported)",
                                template_id=source.template_id,
                            )
                            db.session.add(new_resume)
                            db.session.flush()  # get new_resume.id

                            # Clone PersonalInfo
                            pi = source.personal_info
                            if pi:
                                new_pi = PersonalInfo(
                                    resume_id=new_resume.id,
                                    full_name=pi.full_name, first_name=pi.first_name,
                                    last_name=pi.last_name, email=pi.email,
                                    phone=pi.phone, job_title=pi.job_title,
                                    linkedin=pi.linkedin, github=pi.github,
                                    location=pi.location, country=pi.country,
                                    country_name=pi.country_name, state=pi.state,
                                    state_name=pi.state_name, city=pi.city,
                                    summary=pi.summary, additional_info=pi.additional_info,
                                    profile_image_url=pi.profile_image_url,
                                    profile_image_enabled=pi.profile_image_enabled,
                                )
                                db.session.add(new_pi)

                            # Clone Experiences
                            exp_count = 0
                            for ex in (source.experience or []):
                                db.session.add(Experience(
                                    resume_id=new_resume.id,
                                    job_title=ex.job_title, company=ex.company,
                                    start_date=ex.start_date, end_date=ex.end_date,
                                    description=ex.description,
                                ))
                                exp_count += 1

                            # Clone Education
                            edu_count = 0
                            for ed in (source.education or []):
                                db.session.add(Education(
                                    resume_id=new_resume.id,
                                    degree=ed.degree, institution=ed.institution,
                                    year=ed.year, grade=ed.grade,
                                ))
                                edu_count += 1

                            # Clone Skills
                            skill_count = 0
                            for sk in (source.skills or []):
                                db.session.add(Skill(
                                    resume_id=new_resume.id,
                                    name=sk.name, proficiency=sk.proficiency,
                                ))
                                skill_count += 1

                            # Clone AdditionalDetails
                            for ad in (source.additional_details or []):
                                db.session.add(AdditionalDetail(
                                    resume_id=new_resume.id,
                                    detail_type=ad.detail_type,
                                    value=ad.value,
                                    sort_order=ad.sort_order,
                                ))

                            db.session.commit()
                            print(f"✓ Resume perfectly restored from database! ID: {new_resume.id}")
                            return jsonify({
                                "message": "Resume perfectly restored from original data!",
                                "resume_id": new_resume.id,
                                "source": "database_restore",
                                "parsed_summary": {
                                    "full_name": (pi.full_name if pi else ''),
                                    "experiences_count": exp_count,
                                    "education_count": edu_count,
                                    "skills_count": skill_count,
                                }
                            }), 201
                        else:
                            print(f"⚠️  Source resume {source_id} not found in DB. Falling back to AI parsing.")
                except Exception as meta_check_err:
                    print(f"⚠️  Metadata check failed: {meta_check_err}. Proceeding with AI parsing.")

            # ── STEP 2: External / non-system PDF — AI parsing ───────────────
            print(f"\n{'='*60}")
            print(f"Uploading and parsing resume: {filepath}")
            print(f"{'='*60}")
            parsed_data = parse_resume_file(filepath, AIResumeService)
            
            if parsed_data.get('error'):
                print(f"⚠️  Warning: {parsed_data.get('error')}")
            
            # Create a new resume entry
            new_resume = Resume(
                user_id=user_id,
                title=f"Imported Resume - {filename}"
            )
            db.session.add(new_resume)
            db.session.commit()
            print(f"✓ Created resume entry with ID: {new_resume.id}")
            
            # Create PersonalInfo from parsed data
            personal_info = PersonalInfo(
                resume_id=new_resume.id,
                full_name=parsed_data.get('full_name', ''),
                email=parsed_data.get('email', ''),
                phone=parsed_data.get('phone', ''),
                linkedin=parsed_data.get('linkedin', ''),
                job_title=parsed_data.get('job_title', ''),
                location=parsed_data.get('location', ''),
                summary=parsed_data.get('summary', '')
            )
            db.session.add(personal_info)
            print(f"✓ Added personal info: {personal_info.full_name}")
            
            # Add Experiences
            experiences_list = parsed_data.get('experiences', [])
            print(f"Processing {len(experiences_list)} experiences...")
            for exp in experiences_list:
                if exp.get('job_title') or exp.get('company'):
                    experience = Experience(
                        resume_id=new_resume.id,
                        job_title=exp.get('job_title', ''),
                        company=exp.get('company', ''),
                        start_date=exp.get('start_date', ''),
                        end_date=exp.get('end_date', ''),
                        description=exp.get('description', '')
                    )
                    db.session.add(experience)
                    print(f"  ✓ Added: {exp.get('job_title', 'Unknown')} at {exp.get('company', 'Unknown')}")
            
            # Add Education
            education_list = parsed_data.get('education', [])
            print(f"Processing {len(education_list)} education entries...")
            for edu in education_list:
                if edu.get('degree') or edu.get('institution'):
                    education = Education(
                        resume_id=new_resume.id,
                        degree=edu.get('degree', ''),
                        institution=edu.get('institution', ''),
                        year=edu.get('year', ''),
                        grade=edu.get('grade', '')
                    )
                    db.session.add(education)
                    print(f"  ✓ Added: {edu.get('degree', 'Unknown')} from {edu.get('institution', 'Unknown')}")
            
            # Add Skills
            skills_list = parsed_data.get('skills', [])
            print(f"Processing {len(skills_list)} skills...")
            for skill in skills_list:
                skill_name = None
                skill_proficiency = 'Intermediate'
                
                if isinstance(skill, dict):
                    skill_name = skill.get('name', skill.get('skill', ''))
                    skill_proficiency = skill.get('proficiency', 'Intermediate')
                else:
                    skill_name = str(skill)
                
                if skill_name and skill_name.strip():
                    skill_obj = Skill(
                        resume_id=new_resume.id,
                        name=skill_name.strip(),
                        proficiency=skill_proficiency
                    )
                    db.session.add(skill_obj)
                    print(f"  ✓ Added: {skill_name} ({skill_proficiency})")

            # Add Languages as AdditionalDetails
            languages_list = parsed_data.get('languages', [])
            for lang in languages_list:
                if isinstance(lang, dict):
                    lang_val = json.dumps(lang)
                else:
                    lang_val = json.dumps({"language": str(lang), "proficiency": "Fluent"})
                db.session.add(AdditionalDetail(
                    resume_id=new_resume.id,
                    detail_type='languages',
                    value=lang_val,
                    sort_order=0,
                ))

            # Add Certifications as AdditionalDetails
            certs_list = parsed_data.get('certifications', [])
            for cert in certs_list:
                if isinstance(cert, dict) and cert.get('name'):
                    db.session.add(AdditionalDetail(
                        resume_id=new_resume.id,
                        detail_type='certifications',
                        value=json.dumps(cert),
                        sort_order=0,
                    ))

            # Add Awards as AdditionalDetails
            awards_list = parsed_data.get('awards', [])
            for award in awards_list:
                if isinstance(award, dict) and award.get('title'):
                    db.session.add(AdditionalDetail(
                        resume_id=new_resume.id,
                        detail_type='awards',
                        value=json.dumps(award),
                        sort_order=0,
                    ))
            
            db.session.commit()
            print(f"\n✓ Resume successfully imported!")
            print(f"{'='*60}\n")
            
            return jsonify({
                "message": "Resume uploaded and parsed successfully!",
                "resume_id": new_resume.id,
                "source": "ai_parsed",
                "parsed_summary": {
                    "full_name": parsed_data.get('full_name'),
                    "experiences_count": len(experiences_list),
                    "education_count": len(education_list),
                    "skills_count": len(skills_list)
                }
            }), 201
        else:
            return jsonify({"message": "Invalid file type"}), 400
            
    except Exception as e:
        print(f"\n❌ Error uploading resume: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"message": "Error uploading resume", "error": str(e)}), 500





# --- GET / SAVE FULL RESUME DATA ---
@app.route("/resume/<int:resume_id>", methods=["GET", "POST"])
@jwt_required()
def handle_resume(resume_id):
    resume = Resume.query.get(resume_id)
    if not resume:
        return jsonify({"message": "Resume not found"}), 404
    if not verify_resume_owner(resume, get_jwt_identity()):
        return jsonify({"message": "Unauthorized"}), 403

    if request.method == 'GET':
        # 1. Personal Info — return ALL fields
        p_info = resume.personal_info
        personal_info_data = {}
        if p_info:
            personal_info_data = {
                "full_name": p_info.full_name,
                "first_name": p_info.first_name,
                "last_name": p_info.last_name,
                "job_title": p_info.job_title,
                "email": p_info.email,
                "phone": p_info.phone,
                "linkedin": p_info.linkedin,
                "github": p_info.github,
                "location": p_info.location,
                "country": p_info.country,
                "country_name": p_info.country_name,
                "state": p_info.state,
                "state_name": p_info.state_name,
                "city": p_info.city,
                "summary": p_info.summary,
                "additional_info": p_info.additional_info,
                "profile_image_url": p_info.profile_image_url or '',
                "profile_image_enabled": bool(p_info.profile_image_enabled)
            }

        # 2. Experience
        experiences = []
        for exp in resume.experience:
            experiences.append({
                "id": exp.id,
                "job_title": exp.job_title,
                "company": exp.company,
                "start_date": exp.start_date,
                "end_date": exp.end_date,
                "description": exp.description
            })

        # 3. Education
        education_list = []
        for edu in resume.education:
            education_list.append({
                "id": edu.id,
                "degree": edu.degree,
                "institution": edu.institution,
                "year": edu.year,
                "grade": edu.grade or ''
            })

        # 4. Skills
        skills_list = []
        for skill in resume.skills:
            skills_list.append({
                "id": skill.id,
                "name": skill.name,
                "proficiency": skill.proficiency
            })

        # 5. Additional Details (languages, awards, certifications, etc.)
        additional_details = {}
        for detail in resume.additional_details:
            dtype = detail.detail_type
            if dtype not in additional_details:
                additional_details[dtype] = []
            try:
                additional_details[dtype].append(json.loads(detail.value))
            except (json.JSONDecodeError, TypeError):
                additional_details[dtype].append(detail.value)

        return jsonify({
            "title": resume.title,
            "personal_info": personal_info_data,
            "experiences": experiences,
            "education": education_list,
            "skills": skills_list,
            "additional_details": additional_details,
            "canvas_design": resume.canvas_design or None,
            "design_settings": {
                "template": resume.template_id
            }
        }), 200

    if request.method == 'POST':
        try:
            data = request.json
            
            # Update basic fields
            if 'title' in data: resume.title = data['title']
            if 'template_id' in data: resume.template_id = data['template_id']
            if 'canvas_design' in data: resume.canvas_design = data['canvas_design']

            # Update Personal Info — ALL fields
            if 'personal_info' in data:
                p_data = data['personal_info']
                p_info = resume.personal_info or PersonalInfo(resume_id=resume.id)
                if not resume.personal_info: db.session.add(p_info)
                
                p_info.full_name = p_data.get('full_name', '')
                p_info.first_name = p_data.get('first_name', '')
                p_info.last_name = p_data.get('last_name', '')
                p_info.job_title = p_data.get('job_title', '')
                p_info.email = p_data.get('email', '')
                p_info.phone = p_data.get('phone', '')
                p_info.linkedin = p_data.get('linkedin', '')
                p_info.github = p_data.get('github', '')
                p_info.location = p_data.get('location', '')
                p_info.country = p_data.get('country', '')
                p_info.country_name = p_data.get('country_name', '')
                p_info.state = p_data.get('state', '')
                p_info.state_name = p_data.get('state_name', '')
                p_info.city = p_data.get('city', '')
                p_info.summary = p_data.get('summary', '')
                p_info.additional_info = p_data.get('additional_info', '')
                p_info.profile_image_url = p_data.get('profile_image_url', '')
                p_info.profile_image_enabled = bool(p_data.get('profile_image_enabled', False))

            # Helper to replace list items (Delete all existing, add new)
            def replace_items(current_items, new_items_data, ModelClass, mapper_func):
                for item in current_items: db.session.delete(item)
                for item_data in new_items_data:
                    db.session.add(ModelClass(resume_id=resume.id, **mapper_func(item_data)))

            if 'experiences' in data:
                replace_items(resume.experience, data['experiences'], Experience, 
                    lambda x: {'job_title': x.get('job_title'), 'company': x.get('company'), 'start_date': x.get('start_date'), 'end_date': x.get('end_date'), 'description': x.get('description')})

            if 'education' in data:
                replace_items(resume.education, data['education'], Education,
                    lambda x: {'degree': x.get('degree'), 'institution': x.get('institution'), 'year': x.get('year'), 'grade': x.get('grade', '')})

            if 'skills' in data:
                replace_items(resume.skills, data['skills'], Skill,
                    lambda x: {'name': x.get('name'), 'proficiency': x.get('proficiency', 'Intermediate')})

            # Save Additional Details (languages, awards, certifications, etc.)
            if 'additional_details' in data:
                # Delete existing
                for detail in resume.additional_details:
                    db.session.delete(detail)
                ad = data['additional_details']
                sort_idx = 0
                for detail_type, items in ad.items():
                    if isinstance(items, list):
                        for item in items:
                            db.session.add(AdditionalDetail(
                                resume_id=resume.id,
                                detail_type=detail_type,
                                value=json.dumps(item) if isinstance(item, dict) else str(item),
                                sort_order=sort_idx
                            ))
                            sort_idx += 1

            db.session.commit()
            return jsonify({"message": "Resume saved successfully"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error saving resume: {e}")
            return jsonify({"message": "Error saving resume", "error": str(e)}), 500

# --- UPDATE PERSONAL INFO ---
@app.route("/resume/<int:resume_id>/personal_info", methods=["POST"])
@jwt_required()
def update_personal_info(resume_id):
    data = request.json
    resume = Resume.query.get(resume_id)
    if not resume:
        return jsonify({"message": "Resume not found"}), 404
    if not verify_resume_owner(resume, get_jwt_identity()):
        return jsonify({"message": "Unauthorized"}), 403

    # Check if personal info already exists
    p_info = resume.personal_info
    if not p_info:
        # Create new
        p_info = PersonalInfo(resume_id=resume.id)
        db.session.add(p_info)
    
    # Update fields
    p_info.full_name = data.get('full_name')
    p_info.first_name = data.get('first_name', '')
    p_info.last_name = data.get('last_name', '')
    p_info.job_title = data.get('job_title', '')
    p_info.email = data.get('email')
    p_info.phone = data.get('phone')
    p_info.linkedin = data.get('linkedin')
    p_info.github = data.get('github', '')
    p_info.location = data.get('location', '')
    p_info.country = data.get('country', '')
    p_info.country_name = data.get('country_name', '')
    p_info.state = data.get('state', '')
    p_info.state_name = data.get('state_name', '')
    p_info.city = data.get('city', '')
    p_info.summary = data.get('summary')
    p_info.additional_info = data.get('additional_info', '')
    p_info.profile_image_url = data.get('profile_image_url', '')
    p_info.profile_image_enabled = bool(data.get('profile_image_enabled', False))

    try:
        db.session.commit()
        return jsonify({"message": "Personal Info Saved!"}), 200
    except Exception as e:
        return jsonify({"message": "Error saving info", "error": str(e)}), 500

# --- ADD EXPERIENCE ---
@app.route("/resume/<int:resume_id>/experience", methods=["POST"])
@jwt_required()
def add_experience(resume_id):
    data = request.json
    resume = Resume.query.get(resume_id)
    if not resume or not verify_resume_owner(resume, get_jwt_identity()):
        return jsonify({"message": "Not found or unauthorized"}), 404
    
    # 1. VALIDATION: Check if specific fields are empty
    if not data.get('job_title') or not data.get('company'):
        return jsonify({"message": "Job Title and Company are required fields."}), 400

    # 2. Create Object
    new_exp = Experience(
        resume_id=resume_id,
        job_title=data.get('job_title'),
        company=data.get('company'),
        start_date=data.get('start_date'),
        end_date=data.get('end_date'),
        description=data.get('description')
    )
    
    # 3. Save
    try:
        db.session.add(new_exp)
        db.session.commit()
        return jsonify({"message": "Experience added!"}), 201
    except Exception as e:
        return jsonify({"message": "Error adding experience", "error": str(e)}), 500

# --- DELETE EXPERIENCE ---
@app.route("/experience/<int:exp_id>", methods=["DELETE"])
@jwt_required()
def delete_experience(exp_id):
    exp = Experience.query.get(exp_id)
    if not exp:
        return jsonify({"message": "Experience not found"}), 404
    
    try:
        db.session.delete(exp)
        db.session.commit()
        return jsonify({"message": "Deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Error deleting", "error": str(e)}), 500
    
# --- ADD EDUCATION ---
@app.route("/resume/<int:resume_id>/education", methods=["POST"])
@jwt_required()
def add_education(resume_id):
    data = request.json
    resume = Resume.query.get(resume_id)
    if not resume or not verify_resume_owner(resume, get_jwt_identity()):
        return jsonify({"message": "Not found or unauthorized"}), 404
    
    # Validation
    if not data.get('degree') or not data.get('institution'):
        return jsonify({"message": "Degree and Institution are required."}), 400

    new_edu = Education(
        resume_id=resume_id,
        degree=data.get('degree'),
        institution=data.get('institution'),
        year=data.get('year')
    )
    
    try:
        db.session.add(new_edu)
        db.session.commit()
        return jsonify({"message": "Education added!"}), 201
    except Exception as e:
        return jsonify({"message": "Error adding education", "error": str(e)}), 500

# --- DELETE EDUCATION ---
@app.route("/education/<int:edu_id>", methods=["DELETE"])
@jwt_required()
def delete_education(edu_id):
    edu = Education.query.get(edu_id)
    if not edu:
        return jsonify({"message": "Education not found"}), 404
    
    try:
        db.session.delete(edu)
        db.session.commit()
        return jsonify({"message": "Deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Error deleting", "error": str(e)}), 500

# --- ADD SKILL ---
@app.route("/resume/<int:resume_id>/skill", methods=["POST"])
@jwt_required()
def add_skill(resume_id):
    data = request.json
    # Validation
    if not data.get('name'):
        return jsonify({"message": "Skill name is required"}), 400

    new_skill = Skill(
        resume_id=resume_id,
        name=data.get('name'),
        proficiency=data.get('proficiency') # e.g. "Expert", "Beginner"
    )
    try:
        db.session.add(new_skill)
        db.session.commit()
        return jsonify({"message": "Skill added!"}), 201
    except Exception as e:
        return jsonify({"message": "Error adding skill", "error": str(e)}), 500

# --- DELETE SKILL ---
@app.route("/skill/<int:skill_id>", methods=["DELETE"])
@jwt_required()
def delete_skill(skill_id):
    skill = Skill.query.get(skill_id)
    if not skill:
        return jsonify({"message": "Skill not found"}), 404
    
    try:
        db.session.delete(skill)
        db.session.commit()
        return jsonify({"message": "Deleted successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Error deleting", "error": str(e)}), 500

# --- GENERATE PDF ---
@app.route("/resume/<int:resume_id>/download", methods=["GET", "POST"])
@jwt_required()
def download_resume(resume_id):
    resume = Resume.query.get(resume_id)
    if not resume:
        return jsonify({"message": "Resume not found"}), 404
    if not verify_resume_owner(resume, get_jwt_identity()):
        return jsonify({"message": "Unauthorized"}), 403

    # 1. Gather all data as dictionary
    data = {
        "personal_info": resume.personal_info,
        "experiences": resume.experience,
        "education": resume.education,
        "skills": resume.skills
    }

    # 2. Render Template — always use the default template file
    html_content = render_template('resume.html', data=data)

    # 3. Parse Request Params
    download_format = 'pdf'
    style_config = {}

    if request.method == 'POST':
        json_data = request.get_json() or {}
        download_format = json_data.get('format', 'pdf').lower()
        if 'fontScale' in json_data:
             style_config['font_scale'] = json_data['fontScale']
    else:
        download_format = request.args.get('format', 'pdf').lower()

    # 4. Generate & Return
    if download_format in ['doc', 'docx', 'word']:
        try:
            docx_buffer = DOCXGenerator.generate(data, style_config=style_config)
            response = make_response(docx_buffer.read())
            response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            response.headers['Content-Disposition'] = f'attachment; filename={resume.title}.docx'
            return response
        except Exception as e:
            print(f"DOCX Generation Error: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({"message": f"Error generating DOCX: {str(e)}"}), 500

    # Default: Convert HTML to PDF
    pdf_output = io.BytesIO()
    pisa_status = pisa.CreatePDF(html_content, dest=pdf_output)

    if pisa_status.err:
        return jsonify({"message": "Error generating PDF"}), 500

    # 5. Embed ResuMate metadata so the PDF can be perfectly re-imported later
    try:
        import PyPDF2
        pdf_output.seek(0)
        reader = PyPDF2.PdfReader(pdf_output)
        writer = PyPDF2.PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        writer.add_metadata({
            '/Producer': 'ResuMate-AI-Builder',
            '/ResuMateResumeId': str(resume_id),
            '/ResuMateExportedAt': datetime.utcnow().isoformat(),
        })
        stamped = io.BytesIO()
        writer.write(stamped)
        stamped.seek(0)
        pdf_bytes = stamped.getvalue()
    except Exception as meta_err:
        print(f"Warning: Could not embed PDF metadata: {meta_err}")
        pdf_output.seek(0)
        pdf_bytes = pdf_output.getvalue()

    # 6. Send the PDF file to the browser
    response = make_response(pdf_bytes)
    response.headers['Content-Type'] = 'application/pdf'
    response.headers['Content-Disposition'] = f'attachment; filename={resume.title}.pdf'
    
    return response

# --- ADMIN API: GET SYSTEM STATS ---
@app.route("/admin/stats", methods=["GET"])
@admin_required
def get_admin_stats():
    total_users = User.query.count()
    total_resumes = Resume.query.count()
    
    # Get recent users (last 5)
    recent_users = User.query.order_by(User.id.desc()).limit(5).all()
    users_list = [{"id": u.id, "username": u.username, "email": u.email} for u in recent_users]

    return jsonify({
        "total_users": total_users,
        "total_resumes": total_resumes,
        "recent_users": users_list
    }), 200

# --- MAKE USER ADMIN ---
@app.route("/admin/make-admin/<int:user_id>", methods=["POST"])
@admin_required
def make_user_admin(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    try:
        user.is_admin = True
        db.session.commit()
        return jsonify({"message": f"User {user.username} is now an admin!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error updating user", "error": str(e)}), 500

@app.route("/admin/remove-admin/<int:user_id>", methods=["POST"])
@admin_required
def remove_user_admin(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404
    
    try:
        user.is_admin = False
        db.session.commit()
        return jsonify({"message": f"Admin status removed from {user.username}!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error updating user", "error": str(e)}), 500

# --- GET ALL USERS (for admin panel) ---
@app.route("/admin/users", methods=["GET"])
@admin_required
def get_all_users():
    try:
        users = User.query.all()
        resumes = Resume.query.all()
        users_list = []
        for u in users:
            user_data = {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "is_admin": u.is_admin,
                "is_banned": u.is_banned,
                "banned_until": u.banned_until.isoformat() if u.banned_until else None,
                "ban_reason": u.ban_reason
            }
            users_list.append(user_data)
        
        return jsonify({
            "users": users_list,
            "total_resumes": len(resumes)
        }), 200
    except Exception as e:
        return jsonify({"message": "Error fetching users", "error": str(e)}), 500

# --- BAN USER ---
@app.route("/admin/users/<int:user_id>/ban", methods=["POST"])
@admin_required
def ban_user(user_id):
    try:
        data = request.json
        duration = data.get('duration', 'permanent')  # 'hours', 'days', 'weeks', 'permanent'
        reason = data.get('reason', 'No reason provided')
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        if user.is_admin:
            return jsonify({"message": "Cannot ban admin user"}), 400
        
        # Calculate ban expiry
        if duration == 'permanent':
            banned_until = None  # None = permanent ban
        elif duration == '1hour':
            banned_until = datetime.utcnow() + timedelta(hours=1)
        elif duration == '1day':
            banned_until = datetime.utcnow() + timedelta(days=1)
        elif duration == '1week':
            banned_until = datetime.utcnow() + timedelta(weeks=1)
        else:
            banned_until = None
        
        user.is_banned = True
        user.banned_until = banned_until
        user.ban_reason = reason
        db.session.commit()
        
        return jsonify({
            "message": f"User '{user.username}' banned successfully",
            "banned_until": banned_until.isoformat() if banned_until else "Permanent"
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error banning user", "error": str(e)}), 500

# --- UNBAN USER ---
@app.route("/admin/users/<int:user_id>/unban", methods=["POST"])
@admin_required
def unban_user(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        user.is_banned = False
        user.banned_until = None
        user.ban_reason = None
        db.session.commit()
        
        return jsonify({"message": f"User '{user.username}' unbanned successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error unbanning user", "error": str(e)}), 500

# --- DELETE USER ---
@app.route("/admin/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"message": "User not found"}), 404
        
        # Delete all user's resumes and related data
        resumes = Resume.query.filter_by(user_id=user_id).all()
        for resume in resumes:
            PersonalInfo.query.filter_by(resume_id=resume.id).delete()
            Experience.query.filter_by(resume_id=resume.id).delete()
            Education.query.filter_by(resume_id=resume.id).delete()
            Skill.query.filter_by(resume_id=resume.id).delete()
            db.session.delete(resume)
        
        # Delete the user
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({"message": f"User '{user.username}' and all their data deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error deleting user", "error": str(e)}), 500

# --- CLEAR AI CACHE ---
@app.route("/admin/clear-cache", methods=["POST"])
@admin_required
def clear_ai_cache():
    try:
        # This would clear any AI cache stored in memory or Redis
        # For now, just return success
        return jsonify({"message": "AI cache cleared successfully"}), 200
    except Exception as e:
        return jsonify({"message": "Error clearing cache", "error": str(e)}), 500

# ═══════════════════════════════════════════════════════════════
#  ADMIN — API KEY MANAGEMENT
# ═══════════════════════════════════════════════════════════════
import key_manager as km

@app.route("/admin/api-keys", methods=["GET"])
@admin_required
def list_api_keys():
    """List all API keys (masked) with usage stats."""
    try:
        provider = request.args.get('provider')
        keys = km.get_all_keys_safe(provider)
        stats = km.get_key_stats()
        return jsonify({"keys": keys, "stats": stats}), 200
    except Exception as e:
        return jsonify({"message": "Error fetching keys", "error": str(e)}), 500


@app.route("/admin/api-keys", methods=["POST"])
@admin_required
def add_api_key():
    """Add a new API key."""
    data = request.get_json() or {}
    raw_key = data.get('api_key', '').strip()
    if not raw_key:
        return jsonify({"message": "api_key is required"}), 400
    try:
        result = km.add_key(
            provider=data.get('provider', 'gemini'),
            raw_key=raw_key,
            label=data.get('label'),
            priority=int(data.get('priority', 10)),
            monthly_limit=data.get('monthly_limit'),
            daily_limit=data.get('daily_limit'),
        )
        return jsonify({"message": "Key added", "key": result}), 201
    except Exception as e:
        return jsonify({"message": "Error adding key", "error": str(e)}), 500


@app.route("/admin/api-keys/<int:key_id>", methods=["PUT"])
@admin_required
def update_api_key(key_id):
    """Update key label, priority, limits."""
    data = request.get_json() or {}
    try:
        result = km.update_key(key_id, **{
            k: data[k] for k in ('label', 'priority', 'monthly_limit', 'daily_limit', 'status')
            if k in data
        })
        if not result:
            return jsonify({"message": "Key not found"}), 404
        return jsonify({"message": "Key updated", "key": result}), 200
    except Exception as e:
        return jsonify({"message": "Error updating key", "error": str(e)}), 500


@app.route("/admin/api-keys/<int:key_id>/activate", methods=["PUT"])
@admin_required
def activate_api_key(key_id):
    """Re-activate an inactive or exhausted key."""
    try:
        result = km.activate_key(key_id)
        if not result:
            return jsonify({"message": "Key not found"}), 404
        return jsonify({"message": "Key activated", "key": result}), 200
    except Exception as e:
        return jsonify({"message": "Error activating key", "error": str(e)}), 500


@app.route("/admin/api-keys/<int:key_id>/deactivate", methods=["PUT"])
@admin_required
def deactivate_api_key(key_id):
    """Deactivate a key (won't be used for AI calls)."""
    try:
        result = km.deactivate_key(key_id)
        if not result:
            return jsonify({"message": "Key not found"}), 404
        return jsonify({"message": "Key deactivated", "key": result}), 200
    except Exception as e:
        return jsonify({"message": "Error deactivating key", "error": str(e)}), 500


@app.route("/admin/api-keys/<int:key_id>/set-primary", methods=["PUT"])
@admin_required
def set_primary_key(key_id):
    """Make this the primary (highest priority) key."""
    try:
        result = km.set_as_primary(key_id)
        if not result:
            return jsonify({"message": "Key not found"}), 404
        return jsonify({"message": "Key set as primary", "key": result}), 200
    except Exception as e:
        return jsonify({"message": "Error setting primary key", "error": str(e)}), 500


@app.route("/admin/api-keys/<int:key_id>", methods=["DELETE"])
@admin_required
def delete_api_key(key_id):
    """Permanently remove a key."""
    try:
        ok = km.delete_key(key_id)
        if not ok:
            return jsonify({"message": "Key not found"}), 404
        return jsonify({"message": "Key deleted"}), 200
    except Exception as e:
        return jsonify({"message": "Error deleting key", "error": str(e)}), 500


@app.route("/admin/api-keys/logs", methods=["GET"])
@admin_required
def get_api_key_logs():
    """Get usage logs with optional filter by key_id."""
    try:
        key_id = request.args.get('key_id', type=int)
        limit = request.args.get('limit', 100, type=int)
        logs = km.get_usage_logs(key_id=key_id, limit=limit)
        return jsonify({"logs": logs}), 200
    except Exception as e:
        return jsonify({"message": "Error fetching logs", "error": str(e)}), 500


@app.route("/admin/api-keys/stats", methods=["GET"])
@admin_required
def get_api_key_stats():
    """Get aggregate API key statistics."""
    try:
        stats = km.get_key_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"message": "Error fetching stats", "error": str(e)}), 500


@app.route("/admin/api-keys/reset-exhausted", methods=["POST"])
@admin_required
def reset_exhausted_keys():
    """Attempt to re-activate keys that were exhausted > 1 hour ago."""
    try:
        count = km.try_reset_exhausted()
        return jsonify({"message": f"Reset {count} key(s)", "count": count}), 200
    except Exception as e:
        return jsonify({"message": "Error resetting keys", "error": str(e)}), 500


# ─── ADZUNA PAIR TOGGLE (exclusive ON/OFF) ──────────────────────
@app.route("/admin/adzuna-pairs", methods=["GET"])
@admin_required
def get_adzuna_pairs():
    """Get all Adzuna credential pairs with their ON/OFF status."""
    try:
        pairs = km.get_adzuna_pairs()
        return jsonify({"pairs": pairs}), 200
    except Exception as e:
        return jsonify({"message": "Error fetching pairs", "error": str(e)}), 500


@app.route("/admin/adzuna-pairs/<int:id_key_id>/activate", methods=["PUT"])
@admin_required
def activate_adzuna_pair(id_key_id):
    """Turn ON one Adzuna pair (turns OFF all others — only one active at a time)."""
    try:
        result = km.activate_adzuna_pair(id_key_id)
        if not result:
            return jsonify({"message": "Adzuna pair not found"}), 404
        return jsonify({"message": "Adzuna pair activated — connection established", **result}), 200
    except Exception as e:
        return jsonify({"message": "Error activating pair", "error": str(e)}), 500


@app.route("/admin/adzuna-pairs/<int:id_key_id>/deactivate", methods=["PUT"])
@admin_required
def deactivate_adzuna_pair(id_key_id):
    """Turn OFF an Adzuna pair (Job Finder will be disabled if no other pair is ON)."""
    try:
        result = km.deactivate_adzuna_pair(id_key_id)
        if not result:
            return jsonify({"message": "Adzuna pair not found"}), 404
        return jsonify({"message": "Adzuna pair deactivated — connection closed", **result}), 200
    except Exception as e:
        return jsonify({"message": "Error deactivating pair", "error": str(e)}), 500


# --- ADMIN REPORT DOWNLOAD ---
@app.route("/admin/report", methods=["GET"])
@admin_required
def download_admin_report():
    """Generate and download a PDF report of all users and resumes."""
    try:
        report_type = request.args.get('type', 'full')  # full, users, resumes
        now_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')

        # --- Gather data ---
        users_data = []
        resumes_data = []
        if report_type in ('full', 'users'):
            users = User.query.all()
            for u in users:
                rc = Resume.query.filter_by(user_id=u.id, is_deleted=False).count()
                status = 'Admin' if u.is_admin else ('Banned' if u.is_banned else 'Active')
                users_data.append({
                    'id': u.id,
                    'username': u.username,
                    'email': u.email,
                    'status': status,
                    'resumes': rc,
                })

        if report_type in ('full', 'resumes'):
            resumes = Resume.query.all()
            for r in resumes:
                owner = db.session.get(User, r.user_id)
                resumes_data.append({
                    'id': r.id,
                    'title': (r.title or 'Untitled')[:30],
                    'owner': owner.username if owner else 'Unknown',
                    'created': r.created_at.strftime('%Y-%m-%d') if r.created_at else '-',
                    'deleted': 'Yes' if r.is_deleted else 'No',
                })

        total_users = User.query.count()
        total_admins = User.query.filter_by(is_admin=True).count()
        banned_users = User.query.filter_by(is_banned=True).count()
        total_resumes = Resume.query.count()
        active_resumes = Resume.query.filter_by(is_deleted=False).count()
        trashed_resumes = Resume.query.filter_by(is_deleted=True).count()

        # --- Build HTML (xhtml2pdf-compatible, no CSS gradients) ---
        html = f'''<html>
<head><meta charset="utf-8"/>
<style>
@page {{ size: A4; margin: 2cm; }}
body {{ font-family: Helvetica, Arial, sans-serif; color: #1e293b; font-size: 11px; margin: 0; padding: 0; }}
.header {{ background-color: #4f46e5; color: #ffffff; padding: 24px 28px; margin-bottom: 20px; }}
.header h1 {{ font-size: 20px; margin: 0 0 4px 0; }}
.header p {{ font-size: 9px; margin: 0; color: #c7d2fe; }}
.section {{ font-size: 13px; font-weight: bold; color: #4f46e5; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 2px solid #e0e7ff; }}
table {{ width: 100%; border-collapse: collapse; margin-bottom: 14px; }}
th {{ background-color: #f1f5f9; color: #334155; font-size: 9px; font-weight: bold; padding: 6px 8px; text-align: left; border-bottom: 2px solid #cbd5e1; }}
td {{ padding: 5px 8px; font-size: 10px; color: #475569; border-bottom: 1px solid #e2e8f0; }}
.alt td {{ background-color: #f8fafc; }}
.badge-active {{ color: #166534; font-weight: bold; }}
.badge-banned {{ color: #991b1b; font-weight: bold; }}
.badge-admin {{ color: #92400e; font-weight: bold; }}
.summ-label {{ font-weight: bold; color: #334155; width: 60%; }}
.summ-value {{ font-size: 14px; font-weight: bold; color: #4f46e5; }}
.footer {{ text-align: center; font-size: 8px; color: #94a3b8; margin-top: 24px; padding-top: 8px; border-top: 1px solid #e2e8f0; }}
</style>
</head>
<body>

<div class="header">
<h1>ResuMate Admin Report</h1>
<p>Generated: {now_str} | Type: {report_type.upper()}</p>
</div>
'''

        # Users table (5 columns - fits easily)
        if users_data:
            html += '<div class="section">User Report</div>\n'
            html += '<table><tr><th>ID</th><th>Username</th><th>Email</th><th>Status</th><th>Resumes</th></tr>\n'
            for i, u in enumerate(users_data):
                row_class = ' class="alt"' if i % 2 == 1 else ''
                badge_class = 'badge-admin' if u['status'] == 'Admin' else ('badge-banned' if u['status'] == 'Banned' else 'badge-active')
                html += f'<tr{row_class}><td>{u["id"]}</td><td><b>{u["username"]}</b></td><td>{u["email"]}</td><td class="{badge_class}">{u["status"]}</td><td>{u["resumes"]}</td></tr>\n'
            html += '</table>\n'

        # Resumes table (5 columns)
        if resumes_data:
            html += '<div class="section">Resume Report</div>\n'
            html += '<table><tr><th>ID</th><th>Title</th><th>Owner</th><th>Created</th><th>Deleted</th></tr>\n'
            for i, r in enumerate(resumes_data):
                row_class = ' class="alt"' if i % 2 == 1 else ''
                del_class = 'badge-banned' if r['deleted'] == 'Yes' else 'badge-active'
                html += f'<tr{row_class}><td>{r["id"]}</td><td><b>{r["title"]}</b></td><td>{r["owner"]}</td><td>{r["created"]}</td><td class="{del_class}">{r["deleted"]}</td></tr>\n'
            html += '</table>\n'

        # Summary table
        html += '<div class="section">Summary</div>\n'
        html += '<table>\n'
        html += f'<tr><td class="summ-label">Total Users</td><td class="summ-value">{total_users}</td></tr>\n'
        html += f'<tr class="alt"><td class="summ-label">Admins</td><td class="summ-value">{total_admins}</td></tr>\n'
        html += f'<tr><td class="summ-label">Banned Users</td><td class="summ-value">{banned_users}</td></tr>\n'
        html += f'<tr class="alt"><td class="summ-label">Total Resumes</td><td class="summ-value">{total_resumes}</td></tr>\n'
        html += f'<tr><td class="summ-label">Active Resumes</td><td class="summ-value">{active_resumes}</td></tr>\n'
        html += f'<tr class="alt"><td class="summ-label">Trashed Resumes</td><td class="summ-value">{trashed_resumes}</td></tr>\n'
        html += '</table>\n'

        html += f'<div class="footer">ResuMate Admin Report | {now_str}</div>\n'
        html += '</body></html>'

        # --- Convert HTML to PDF ---
        pdf_buffer = io.BytesIO()
        pisa_status = pisa.CreatePDF(io.StringIO(html), dest=pdf_buffer)
        if pisa_status.err:
            return jsonify({"message": "Error generating PDF", "detail": str(pisa_status.err)}), 500

        pdf_buffer.seek(0)
        response = make_response(pdf_buffer.read())
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'attachment; filename=ResuMate_Report_{report_type}_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.pdf'
        return response

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": "Error generating report", "error": str(e)}), 500

# --- AI ENDPOINTS ---

@app.route("/api/ai/enhance-job-description", methods=["POST"])
@jwt_required()
def enhance_job_description():
    """Enhance a job experience description with AI"""
    try:
        data = request.json
        print(f"Received AI request: {data}")
        job_title = data.get('job_title')
        company = data.get('company')
        description = data.get('description')
        
        if not all([job_title, company, description]):
            return jsonify({"message": "Missing required fields"}), 400
        
        print(f"Calling AI service for: {job_title} at {company}")
        result = AIResumeService.enhance_job_description(job_title, company, description)
        print(f"AI Response: {result}")
        status_code = result.get("status_code", 200 if result.get("success") else 500)
        return jsonify(result), status_code
    except Exception as e:
        print(f"Error in enhance_job_description: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/ai/enhance-education", methods=["POST"])
@jwt_required()
def enhance_education():
    """Enhance an education description with AI"""
    try:
        data = request.json
        degree = data.get('degree')
        institution = data.get('institution')
        description = data.get('description')
        
        if not all([degree, institution]):
            return jsonify({"message": "Degree and Institution are required"}), 400
        
        result = AIResumeService.enhance_education_description(degree, institution, description or "")
        status_code = result.get("status_code", 200 if result.get("success") else 500)
        return jsonify(result), status_code
    except Exception as e:
        print(f"Error in enhance_education: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/ai/enhance-text", methods=["POST"])
@jwt_required()
def enhance_text():
    """Enhance general text (activities, awards, etc.)"""
    try:
        data = request.json
        text = data.get('text')
        context_type = data.get('context_type', 'general')
        
        if not text:
            return jsonify({"message": "Text is required"}), 400
        
        result = AIResumeService.enhance_text(text, context_type)
        status_code = result.get("status_code", 200 if result.get("success") else 500)
        return jsonify(result), status_code
    except Exception as e:
        print(f"Error in enhance_text: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/ai/generate-summary", methods=["POST"])
@jwt_required()
def generate_summary():
    """Generate a professional summary using AI"""
    data = request.json
    # Use defaults to prevent 400 errors on partial data
    full_name = data.get('full_name') or "Candidate"
    job_title = data.get('job_title') or "Professional"
    experience_years = data.get('experience_years', 0)
    skills = data.get('skills', [])
    
    print(f"Generating summary for: {full_name}, {job_title}")
    
    # if not all([full_name, job_title]):
    #     return jsonify({"message": "Missing required fields"}), 400
    
    result = AIResumeService.generate_professional_summary(
        full_name, job_title, experience_years, skills
    )
    status_code = result.get("status_code", 200 if result.get("success") else 500)
    return jsonify(result), status_code

@app.route("/api/ai/improve-skills", methods=["POST"])
@jwt_required()
def improve_skills():
    """Get AI suggestions for improving skills"""
    data = request.json
    current_skills = data.get('skills', [])
    job_title = data.get('job_title', None)
    previous_jobs = data.get('previous_jobs', []) # New field
    
    if not current_skills:
        return jsonify({"message": "Skills list is required"}), 400
    
    result = AIResumeService.improve_skills(current_skills, job_title, previous_jobs)
    status_code = result.get("status_code", 200 if result.get("success") else 500)
    return jsonify(result), status_code

@app.route("/api/ai/ats-score", methods=["POST"])
@jwt_required()
def ats_score():
    """Score resume for ATS (Applicant Tracking System) compatibility"""
    data = request.json
    resume_text = data.get('resume_text')
    
    if not resume_text:
        return jsonify({"message": "Resume text is required"}), 400
    
    result = AIResumeService.score_ats_compatibility(resume_text)
    status_code = result.get("status_code", 200 if result.get("success") else 500)
    return jsonify(result), status_code

@app.route("/api/ai/job-match", methods=["POST"])
@jwt_required()
def job_match():
    """Match resume against a job posting"""
    current_user_id = int(get_jwt_identity())
    allowed, err_resp, err_code = check_ai_limit(current_user_id, 'job_match_ai')
    if not allowed:
        return err_resp, err_code

    data = request.json
    resume_text = data.get('resume_text')
    job_posting = data.get('job_posting')
    
    if not all([resume_text, job_posting]):
        return jsonify({"message": "Resume text and job posting are required"}), 400
    
    result = AIResumeService.match_job_posting(resume_text, job_posting)
    status_code = result.get("status_code", 200 if result.get("success") else 500)
    if result.get("success"):
        log_ai_usage(current_user_id, 'job_match_ai')
    else:
        log_ai_usage(current_user_id, 'job_match_ai', status='failure')
    return jsonify(result), status_code

# --- TEMPLATE MANAGEMENT ENDPOINTS ---

@app.route("/resume/<int:resume_id>/template", methods=["POST"])
@jwt_required()
def set_resume_template(resume_id):
    """Set the template for a specific resume"""
    data = request.json
    template_id = data.get('template_id')
    
    resume = Resume.query.get(resume_id)
    if not resume:
        return jsonify({"message": "Resume not found"}), 404
    
    template = Template.query.get(template_id)
    if not template:
        return jsonify({"message": "Template not found"}), 404
    
    resume.template_id = template_id
    try:
        db.session.commit()
        return jsonify({
            "message": "Template updated successfully",
            "template": {
                "id": template.id,
                "name": template.name
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error updating template", "error": str(e)}), 500

# --- GET ALL USERS (for admin panel) ---

# ... (Keep if __name__ == "__main__": code) ...

# --- NEW: ATS CHECK ENDPOINT ---
# --- NEW: ATS CHECK ENDPOINT ---
@app.route("/ats/analyze", methods=["POST"])
@jwt_required()
def analyze_ats():
    """Analyze resume file for ATS compatibility"""
    try:
        current_user_id = int(get_jwt_identity())
        allowed, err_resp, err_code = check_ai_limit(current_user_id, 'ats_analysis')
        if not allowed:
            return err_resp, err_code

        # Check if file is present
        if 'file' not in request.files:
            return jsonify({"message": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"message": "No file selected"}), 400
            
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # 1. Extract Text
            print(f"Extracting text from: {filepath}")
            from resume_parser import extract_text_from_file
            resume_text = extract_text_from_file(filepath)
            
            result = {} # Initialize result
            
            if not resume_text or len(resume_text.strip()) < 50:
                # If resume text extraction fails, but JD is provided, we can't do a match.
                # We need resume text for any analysis.
                return jsonify({"message": "Could not extract sufficient text from file"}), 400
            
            # Check for JD (Text or File)
            jd_text = request.form.get('jd_text')
            
            if 'jd_file' in request.files:
                jd_file_obj = request.files['jd_file']
                if jd_file_obj and jd_file_obj.filename:
                    jd_filename = secure_filename(jd_file_obj.filename)
                    jd_path = os.path.join(app.config['UPLOAD_FOLDER'], "jd_" + jd_filename)
                    jd_file_obj.save(jd_path)
                    try:
                        jd_extracted = extract_text_from_file(jd_path)
                        if jd_extracted:
                            jd_text = jd_extracted
                    except Exception as e:
                        print(f"Error extracting JD text: {e}")
                    finally:
                        try:
                            if os.path.exists(jd_path):
                                os.remove(jd_path)
                        except:
                            pass
            
            if jd_text:
                print(f"Job Description Provided ({len(jd_text)} chars). Performing Match Analysis...")
                result = AIResumeService.match_resume_with_jd(resume_text, jd_text)
                if result.get("success"):
                     result["analysis_type"] = "match"
                     # Normalize 'match_result' to top level for consistency or keep nested?
                     # The new AI service returns {success: true, match_result: {...}}
                     # The old one returns {success: true, ats_analysis: {...}}
                     # Let's keep the structure clean for frontend.
            else:
                # 2. Analyze with AI (Standard ATS)
                print("Sending to AI for ATS scoring...")
                result = AIResumeService.score_ats_compatibility(resume_text)
                result["analysis_type"] = "ats"

            if result.get("error"):
                 return jsonify(result), 500
            
            # Save History
            user_id = int(get_jwt_identity())
            if user_id:
                try:
                    if result.get("analysis_type") == "match":
                        # Save to JobMatchHistory
                        match_entry = JobMatchHistory(
                            user_id=int(user_id),
                            job_description=jd_text[:500] + "..." if len(jd_text) > 500 else jd_text,
                            match_score=result.get("match_result", {}).get("matchScore", 0),
                            analysis_json=json.dumps(result),
                            created_at=datetime.utcnow()
                        )
                        db.session.add(match_entry)
                    else:
                        # Save to ATSAnalysis (Standard)
                        analysis = ATSAnalysis(
                            user_id=int(user_id),
                            filename=file.filename,
                            score=result.get("ats_analysis", {}).get("score", 0),
                            analysis_type='ats',
                            analysis_json=json.dumps(result),
                            created_at=datetime.utcnow()
                        )
                        db.session.add(analysis)
                    
                    db.session.commit()
                except Exception as e:
                    print(f"Failed to save history: {e}")
                    # Do not fail response

            log_ai_usage(current_user_id, 'ats_analysis')
            return jsonify(result), 200
            
        else:
            return jsonify({"message": "Invalid file type"}), 400
            
    except Exception as e:
        print(f"ATS Analysis Error: {e}")
        return jsonify({"message": "Error analyzing resume", "error": str(e)}), 500

@app.route("/ats/match", methods=["POST"])
@jwt_required()
def match_ats_jd():
    """Compare resume text with job description text"""
    try:
        data = request.json
        if not data:
            return jsonify({"message": "Request body missing"}), 400
            
        resume_text = data.get('resumeText')
        jd_text = data.get('jobDescriptionText')
        
        if not resume_text or not jd_text:
             return jsonify({"message": "Both resumeText and jobDescriptionText are required"}), 400
             
        print(f"Matching Resume ({len(resume_text)} chars) vs JD ({len(jd_text)} chars)...")
        
        result = AIResumeService.match_resume_with_jd(resume_text, jd_text)
        
        if result.get("error"):
             return jsonify(result), 500
             
        # Save History if user authenticated
        user_id = int(get_jwt_identity())
        if user_id:
            try:
                # Optional: link to resume if provided
                resume_id = data.get('resume_id') 
                
                match_entry = JobMatchHistory(
                    user_id=user_id,
                    resume_id=resume_id,
                    job_description=jd_text[:500] + "..." if len(jd_text) > 500 else jd_text, # Store snippet or full
                    match_score=result.get('matchScore', 0),
                    analysis_json=json.dumps(result)
                )
                db.session.add(match_entry)
                db.session.commit()
            except Exception as e:
                print(f"Error saving match history: {e}")
                # Don't fail the request just because history save failed
        
        return jsonify(result), 200

    except Exception as e:
        print(f"Match API Error: {e}")
        return jsonify({"message": "Error analyzing match", "error": str(e)}), 500

@app.route("/ats/match/history", methods=["GET"])
@jwt_required()
def get_match_history():
    """Get job match history for a user"""
    user_id = int(get_jwt_identity())
        
    try:
        # Fetch last 20 matches
        history = JobMatchHistory.query.filter_by(user_id=user_id)\
            .order_by(JobMatchHistory.created_at.desc())\
            .limit(20).all()
            
        results = []
        for h in history:
            results.append({
                "id": h.id,
                "job_description_snippet": h.job_description,
                "match_score": h.match_score,
                "timestamp": h.created_at.isoformat(),
                # "analysis": json.loads(h.analysis_json) if h.analysis_json else {} # Optional: return full detail
            })
            
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"message": "Error fetching history", "error": str(e)}), 500

@app.route("/ats/stats", methods=["GET"])
@jwt_required()
def get_ats_stats():
    user_id = int(get_jwt_identity())
    
    count = ATSAnalysis.query.filter_by(user_id=user_id).count()
    return jsonify({"count": count}), 200


# ─────────────────────────────────────────────────────────────────────────────
# ATS ANALYSIS — RECENT HISTORY ENDPOINTS (unified ATS + Match)
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/ats/history", methods=["GET"])
@jwt_required()
def get_ats_history():
    """Get combined ATS + Match analysis history."""
    user_id = int(get_jwt_identity())
    try:
        # Fetch ATS analyses
        ats_entries = ATSAnalysis.query.filter_by(user_id=user_id)\
            .order_by(ATSAnalysis.created_at.desc()).limit(30).all()
        # Fetch Match analyses
        match_entries = JobMatchHistory.query.filter_by(user_id=user_id)\
            .order_by(JobMatchHistory.created_at.desc()).limit(30).all()

        results = []
        for e in ats_entries:
            results.append({
                "id": e.id,
                "type": "ats",
                "filename": e.filename or "Resume",
                "score": e.score or 0,
                "created_at": e.created_at.isoformat() if e.created_at else "",
            })
        for e in match_entries:
            results.append({
                "id": e.id,
                "type": "match",
                "filename": (e.job_description or "")[:60] + ("..." if e.job_description and len(e.job_description) > 60 else ""),
                "score": e.match_score or 0,
                "created_at": e.created_at.isoformat() if e.created_at else "",
            })

        # Sort combined by date desc
        results.sort(key=lambda x: x["created_at"], reverse=True)
        return jsonify({"history": results[:30]}), 200
    except Exception as e:
        print(f"ATS History Error: {e}")
        return jsonify({"history": []}), 200


@app.route("/ats/history/<string:h_type>/<int:h_id>", methods=["GET"])
@jwt_required()
def get_ats_history_detail(h_type, h_id):
    """Get full ATS/Match analysis detail by ID."""
    user_id = int(get_jwt_identity())
    try:
        if h_type == "ats":
            entry = ATSAnalysis.query.filter_by(id=h_id, user_id=user_id).first()
        elif h_type == "match":
            entry = JobMatchHistory.query.filter_by(id=h_id, user_id=user_id).first()
        else:
            return jsonify({"message": "Invalid type"}), 400

        if not entry:
            return jsonify({"message": "Not found"}), 404

        analysis = json.loads(entry.analysis_json) if entry.analysis_json else None
        if not analysis:
            return jsonify({"message": "No analysis data stored for this entry"}), 404

        return jsonify({"analysis": analysis, "type": h_type}), 200
    except Exception as e:
        print(f"ATS History Detail Error: {e}")
        return jsonify({"message": "Failed to load analysis"}), 500


@app.route("/ats/history/<string:h_type>/<int:h_id>", methods=["DELETE"])
@jwt_required()
def delete_ats_history(h_type, h_id):
    """Delete an ATS/Match analysis from history."""
    user_id = int(get_jwt_identity())
    try:
        if h_type == "ats":
            entry = ATSAnalysis.query.filter_by(id=h_id, user_id=user_id).first()
        elif h_type == "match":
            entry = JobMatchHistory.query.filter_by(id=h_id, user_id=user_id).first()
        else:
            return jsonify({"message": "Invalid type"}), 400

        if not entry:
            return jsonify({"message": "Not found"}), 404

        db.session.delete(entry)
        db.session.commit()
        return jsonify({"message": "Deleted"}), 200
    except Exception as e:
        print(f"ATS History Delete Error: {e}")
        return jsonify({"message": "Failed to delete"}), 500


# ─────────────────────────────────────────────────────────────────────────────
# CAREER ASSISTANT
# ─────────────────────────────────────────────────────────────────────────────
@app.route("/career-assistant", methods=["POST"])
@jwt_required()
def career_assistant():
    """
    AI Career Assistant endpoint.
    Accepts a user query + optional resume context and returns structured career guidance.
    """
    user_id = int(get_jwt_identity())
    data = request.get_json() or {}
    user_query = (data.get("query") or "").strip()

    if not user_query:
        return jsonify({"message": "Query is required"}), 400

    # ── Build resume context from the user's most recent resume ──────────────
    resume_context = {}
    try:
        latest_resume = (
            Resume.query
            .filter_by(user_id=user_id, is_deleted=False)
            .order_by(Resume.id.desc())
            .first()
        )
        if latest_resume:
            # Personal info → job title
            pi = PersonalInfo.query.filter_by(resume_id=latest_resume.id).first()
            if pi and pi.job_title:
                resume_context["job_title"] = pi.job_title

            # Skills
            skills_objs = Skill.query.filter_by(resume_id=latest_resume.id).all()
            skill_names = [s.name for s in skills_objs if s.name]
            if skill_names:
                resume_context["skills"] = skill_names

            # Experience count
            exp_objs = Experience.query.filter_by(resume_id=latest_resume.id).all()
            if exp_objs:
                resume_context["experience_years"] = len(exp_objs)
    except Exception as e:
        print(f"Career assistant: Could not fetch resume context: {e}")

    # ── Call AI service ───────────────────────────────────────────────────────
    result = AIResumeService.career_assistant(user_query, resume_context or None)

    if "error" in result:
        return jsonify({"message": result["error"]}), 500

    # ── Save to history ───────────────────────────────────────────────────────
    try:
        response_text = result.get("response") or result.get("message") or ""
        if response_text and not result.get("blocked"):
            chat_entry = CareerChatHistory(
                user_id=user_id,
                query=user_query[:500],
                response=response_text[:5000],
                created_at=datetime.utcnow()
            )
            db.session.add(chat_entry)
            db.session.commit()
    except Exception as e:
        print(f"Career chat history save error: {e}")

    log_ai_usage(user_id, 'career_chat')
    return jsonify(result), 200


# ─────────────────────────────────────────────────────────────────────────────
# CAREER ASSISTANT — HISTORY ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/career-assistant/history", methods=["GET"])
@jwt_required()
def get_career_history():
    """Get career assistant chat history."""
    user_id = int(get_jwt_identity())
    try:
        entries = CareerChatHistory.query.filter_by(user_id=user_id)\
            .order_by(CareerChatHistory.created_at.desc()).limit(50).all()

        history = []
        for e in entries:
            history.append({
                "id": e.id,
                "query": e.query or "",
                "response": (e.response or "")[:150] + ("..." if e.response and len(e.response) > 150 else ""),
                "created_at": e.created_at.isoformat() if e.created_at else "",
            })
        return jsonify({"history": history}), 200
    except Exception as e:
        print(f"Career History Error: {e}")
        return jsonify({"history": []}), 200


@app.route("/career-assistant/history/<int:chat_id>", methods=["GET"])
@jwt_required()
def get_career_history_detail(chat_id):
    """Get full career assistant history entry."""
    user_id = int(get_jwt_identity())
    try:
        entry = CareerChatHistory.query.filter_by(id=chat_id, user_id=user_id).first()
        if not entry:
            return jsonify({"message": "Not found"}), 404
        return jsonify({
            "id": entry.id,
            "query": entry.query or "",
            "response": entry.response or "",
            "created_at": entry.created_at.isoformat() if entry.created_at else "",
        }), 200
    except Exception as e:
        print(f"Career History Detail Error: {e}")
        return jsonify({"message": "Failed to load"}), 500


@app.route("/career-assistant/history/<int:chat_id>", methods=["DELETE"])
@jwt_required()
def delete_career_history(chat_id):
    """Delete a career assistant history entry."""
    user_id = int(get_jwt_identity())
    try:
        entry = CareerChatHistory.query.filter_by(id=chat_id, user_id=user_id).first()
        if not entry:
            return jsonify({"message": "Not found"}), 404
        db.session.delete(entry)
        db.session.commit()
        return jsonify({"message": "Deleted"}), 200
    except Exception as e:
        print(f"Career History Delete Error: {e}")
        return jsonify({"message": "Failed to delete"}), 500


# ═══════════════════════════════════════════════════════════════════════════════
#  AI RESUME ANALYZER — Deep Career Intelligence
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/resume-analyzer/analyze", methods=["POST"])
@jwt_required()
def analyze_career_profile():
    """Deep AI career analysis from uploaded resume file (PDF, DOCX, TXT, images)"""
    try:
        current_user_id = int(get_jwt_identity())
        allowed, err_resp, err_code = check_ai_limit(current_user_id, 'resume_analyzer')
        if not allowed:
            return err_resp, err_code

        if 'file' not in request.files:
            return jsonify({"message": "No file provided"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"message": "No file selected"}), 400

        # Validate file size (10MB max for this endpoint)
        file.seek(0, 2)
        file_size = file.tell()
        file.seek(0)
        if file_size > 10 * 1024 * 1024:
            return jsonify({"message": "File too large. Maximum size is 10MB."}), 400

        filename = secure_filename(file.filename)
        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''

        allowed_analyzer = {'pdf', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg'}
        if ext not in allowed_analyzer:
            return jsonify({"message": f"Unsupported file format: .{ext}. Supported: PDF, DOCX, TXT, PNG, JPG"}), 400

        filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"analyzer_{filename}")
        file.save(filepath)

        resume_text = ""

        try:
            if ext in ('png', 'jpg', 'jpeg'):
                # ── IMAGE OCR ───────────────────────────────────────────
                ocr_done = False

                # Try Gemini Vision API first (best quality)
                if not ocr_done:
                    try:
                        import google.generativeai as genai_vision
                        import PIL.Image
                        img = PIL.Image.open(filepath)
                        vision_model = genai_vision.GenerativeModel('gemini-2.5-flash')
                        vision_response = vision_model.generate_content([
                            "Extract ALL text from this resume image. Preserve the structure, sections, and formatting as much as possible. Return only the extracted text, nothing else.",
                            img
                        ])
                        if vision_response and hasattr(vision_response, 'text') and len(vision_response.text.strip()) > 30:
                            resume_text = vision_response.text.strip()
                            ocr_done = True
                            print("Image text extracted via Gemini Vision")
                    except Exception as e:
                        print(f"Gemini Vision OCR failed: {e}")

                # Fallback: Tesseract OCR
                if not ocr_done:
                    try:
                        import pytesseract
                        from PIL import Image
                        img = Image.open(filepath)
                        resume_text = pytesseract.image_to_string(img)
                        if resume_text.strip():
                            ocr_done = True
                            print("Image text extracted via Tesseract OCR")
                    except ImportError:
                        print("pytesseract not installed")
                    except Exception as e:
                        print(f"Tesseract OCR failed: {e}")

                if not ocr_done:
                    return jsonify({"message": "Could not extract text from image. Please try PDF or DOCX format."}), 400

            else:
                # ── TEXT-BASED FILES (PDF, DOCX, TXT) ───────────────────
                from resume_parser import extract_text_from_file
                resume_text = extract_text_from_file(filepath)

            if not resume_text or len(resume_text.strip()) < 30:
                ext_name = {'pdf': 'PDF', 'docx': 'Word document', 'txt': 'text file'}.get(ext, ext.upper())
                return jsonify({"message": f"Could not extract text from your {ext_name}. The file may be image-based or empty. Try a different file, or save as .txt and upload again."}), 400

            # Log extraction quality
            clean_text = resume_text.strip()
            print(f"Resume Analyzer: Extracted {len(clean_text)} chars from {ext}. First 100: {clean_text[:100]}")

            if clean_text.startswith('[') and 'could not be extracted' in clean_text.lower():
                return jsonify({"message": "Text extraction failed for this file. Try converting to .txt or .docx format and uploading again."}), 400

            # ── SEND TO AI FOR DEEP ANALYSIS ────────────────────────────
            print(f"Sending to AI for analysis...")
            result = AIResumeService.analyze_career_profile(clean_text)

            if result.get("error"):
                return jsonify({"message": result["error"]}), 500

            # ── SAVE TO HISTORY ──────────────────────────────────────────
            try:
                current_user_id = int(get_jwt_identity())
                analysis_data = result.get("analysis", {})
                history_entry = ResumeAnalysis(
                    user_id=current_user_id,
                    filename=file.filename,
                    opportunity_score=analysis_data.get("opportunity_score", 0),
                    career_stage=analysis_data.get("career_stage", ""),
                    career_summary=analysis_data.get("career_summary", ""),
                    analysis_json=json.dumps(analysis_data),
                    created_at=datetime.utcnow()
                )
                db.session.add(history_entry)
                db.session.commit()
                result["analysis_id"] = history_entry.id
            except Exception as save_err:
                print(f"Warning: Could not save analysis history: {save_err}")

            log_ai_usage(current_user_id, 'resume_analyzer')
            return jsonify(result), 200

        finally:
            # Cleanup uploaded file
            try:
                if os.path.exists(filepath):
                    os.remove(filepath)
            except:
                pass

    except Exception as e:
        error_msg = str(e)
        print(f"Resume Analyzer Error: {e}")
        if "429" in error_msg or "quota" in error_msg.lower() or "Resource has been exhausted" in error_msg:
            return jsonify({"message": "API quota exceeded. The free Gemini API has a daily request limit. Please wait a few minutes and try again."}), 429
        return jsonify({"message": f"Analysis failed: {error_msg}"}), 500


@app.route("/resume-analyzer/history", methods=["GET"])
@jwt_required()
def get_analysis_history():
    """Get user's resume analysis history"""
    try:
        current_user_id = int(get_jwt_identity())
        analyses = ResumeAnalysis.query.filter_by(user_id=current_user_id)\
            .order_by(ResumeAnalysis.created_at.desc()).limit(50).all()
        
        history = []
        for a in analyses:
            history.append({
                "id": a.id,
                "filename": a.filename,
                "opportunity_score": a.opportunity_score,
                "career_stage": a.career_stage,
                "career_summary": (a.career_summary or "")[:120] + ("..." if a.career_summary and len(a.career_summary) > 120 else ""),
                "created_at": a.created_at.isoformat() if a.created_at else None
            })
        return jsonify({"success": True, "history": history}), 200
    except Exception as e:
        print(f"Analysis History Error: {e}")
        return jsonify({"message": str(e)}), 500


@app.route("/resume-analyzer/history/<int:analysis_id>", methods=["GET"])
@jwt_required()
def load_analysis(analysis_id):
    """Load a specific past analysis by ID"""
    try:
        current_user_id = int(get_jwt_identity())
        entry = ResumeAnalysis.query.filter_by(id=analysis_id, user_id=current_user_id).first()
        if not entry:
            return jsonify({"message": "Analysis not found"}), 404
        
        analysis = json.loads(entry.analysis_json) if entry.analysis_json else {}
        return jsonify({
            "success": True,
            "analysis": analysis,
            "analysis_id": entry.id,
            "filename": entry.filename,
            "created_at": entry.created_at.isoformat() if entry.created_at else None
        }), 200
    except Exception as e:
        print(f"Load Analysis Error: {e}")
        return jsonify({"message": str(e)}), 500


@app.route("/resume-analyzer/history/<int:analysis_id>", methods=["DELETE"])
@jwt_required()
def delete_analysis(analysis_id):
    """Delete a specific past analysis"""
    try:
        current_user_id = int(get_jwt_identity())
        entry = ResumeAnalysis.query.filter_by(id=analysis_id, user_id=current_user_id).first()
        if not entry:
            return jsonify({"message": "Analysis not found"}), 404
        db.session.delete(entry)
        db.session.commit()
        return jsonify({"success": True, "message": "Analysis deleted"}), 200
    except Exception as e:
        print(f"Delete Analysis Error: {e}")
        return jsonify({"message": str(e)}), 500


@app.route("/resume-analyzer/chat", methods=["POST"])
@jwt_required()
def analyzer_chat():
    """AI chat about a specific career analysis — user asks follow-up questions"""
    try:
        current_user_id = int(get_jwt_identity())
        allowed, err_resp, err_code = check_ai_limit(current_user_id, 'career_chat')
        if not allowed:
            return err_resp, err_code

        data = request.get_json()
        user_message = data.get("message", "").strip()
        analysis_id = data.get("analysis_id")
        
        if not user_message:
            return jsonify({"message": "No message provided"}), 400
        if len(user_message) > 2000:
            return jsonify({"message": "Message too long (max 2000 chars)"}), 400
            
        # Load the analysis context
        analysis_context = ""
        if analysis_id:
            current_user_id = int(get_jwt_identity())
            entry = ResumeAnalysis.query.filter_by(id=analysis_id, user_id=current_user_id).first()
            if entry and entry.analysis_json:
                analysis_context = entry.analysis_json
        
        # Send to AI with context
        result = AIResumeService.chat_about_analysis(user_message, analysis_context)
        
        if result.get("error"):
            return jsonify(result), 500
        
        log_ai_usage(current_user_id, 'career_chat')
        return jsonify(result), 200
    except Exception as e:
        print(f"Analyzer Chat Error: {e}")
        return jsonify({"message": str(e)}), 500


# ──────────────────────────────────────────────────────────────────────
# RESUME ANALYZER REPORT EXPORT (PDF + DOCX)
# ──────────────────────────────────────────────────────────────────────

@app.route("/resume-analyzer/export/pdf", methods=["POST"])
@jwt_required()
def export_analysis_pdf():
    """Generate and download a PDF career intelligence report from an analysis."""
    try:
        from report_generator import generate_pdf_report
        data = request.get_json()
        analysis_id = data.get("analysis_id")
        analysis_json = data.get("analysis")
        filename = data.get("filename", "Resume")

        # If analysis_id provided, load from database
        if analysis_id:
            current_user_id = int(get_jwt_identity())
            entry = ResumeAnalysis.query.filter_by(id=analysis_id, user_id=current_user_id).first()
            if not entry:
                return jsonify({"message": "Analysis not found"}), 404
            analysis_json = json.loads(entry.analysis_json) if isinstance(entry.analysis_json, str) else entry.analysis_json
            filename = entry.filename or filename

        if not analysis_json:
            return jsonify({"message": "No analysis data provided"}), 400

        pdf_buffer = generate_pdf_report(analysis_json, filename)

        from flask import send_file
        safe_name = "".join(c for c in filename.split('.')[0] if c.isalnum() or c in (' ', '-', '_')).strip()
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"ResuMate_Career_Report_{safe_name}.pdf"
        )
    except Exception as e:
        print(f"PDF Export Error: {e}")
        return jsonify({"message": f"Failed to generate PDF report: {str(e)}"}), 500


@app.route("/resume-analyzer/export/docx", methods=["POST"])
@jwt_required()
def export_analysis_docx():
    """Generate and download a Word (.docx) career intelligence report from an analysis."""
    try:
        from report_generator import generate_docx_report
        data = request.get_json()
        analysis_id = data.get("analysis_id")
        analysis_json = data.get("analysis")
        filename = data.get("filename", "Resume")

        # If analysis_id provided, load from database
        if analysis_id:
            current_user_id = int(get_jwt_identity())
            entry = ResumeAnalysis.query.filter_by(id=analysis_id, user_id=current_user_id).first()
            if not entry:
                return jsonify({"message": "Analysis not found"}), 404
            analysis_json = json.loads(entry.analysis_json) if isinstance(entry.analysis_json, str) else entry.analysis_json
            filename = entry.filename or filename

        if not analysis_json:
            return jsonify({"message": "No analysis data provided"}), 400

        docx_buffer = generate_docx_report(analysis_json, filename)

        from flask import send_file
        safe_name = "".join(c for c in filename.split('.')[0] if c.isalnum() or c in (' ', '-', '_')).strip()
        return send_file(
            docx_buffer,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            as_attachment=True,
            download_name=f"ResuMate_Career_Report_{safe_name}.docx"
        )
    except Exception as e:
        print(f"DOCX Export Error: {e}")
        return jsonify({"message": f"Failed to generate Word report: {str(e)}"}), 500


# ═══════════════════════════════════════════════════════════════════════
#  MULTI-RESUME COMPARISON ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

@app.route("/compare-resumes", methods=["POST"])
@jwt_required()
def compare_resumes():
    """Compare multiple uploaded resumes and find the best one."""
    try:
        current_user_id = int(get_jwt_identity())
        allowed, err_resp, err_code = check_ai_limit(current_user_id, 'resume_compare')
        if not allowed:
            return err_resp, err_code

        MAX_FILES = AIResumeService.MAX_COMPARE_FILES  # 5

        if 'files' not in request.files:
            return jsonify({"message": "No files provided"}), 400

        files = request.files.getlist('files')
        target_job = request.form.get('target_job', '').strip()

        if len(files) < 2:
            return jsonify({"message": "Please upload at least 2 resumes to compare."}), 400

        if len(files) > MAX_FILES:
            return jsonify({"message": f"Maximum {MAX_FILES} resumes allowed. You uploaded {len(files)}."}), 400

        allowed_ext = {'pdf', 'docx', 'doc', 'txt', 'png', 'jpg', 'jpeg'}
        resume_data = []
        saved_paths = []

        for idx, file in enumerate(files):
            if file.filename == '':
                continue

            # Validate size (10MB each)
            file.seek(0, 2)
            fsize = file.tell()
            file.seek(0)
            if fsize > 10 * 1024 * 1024:
                return jsonify({"message": f"File '{file.filename}' exceeds 10MB limit."}), 400

            filename = secure_filename(file.filename)
            ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''
            if ext not in allowed_ext:
                return jsonify({"message": f"Unsupported format: .{ext}. Supported: PDF, DOCX, TXT, PNG, JPG"}), 400

            filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"compare_{idx}_{filename}")
            file.save(filepath)
            saved_paths.append(filepath)

            # Extract text
            resume_text = ""
            try:
                if ext in ('png', 'jpg', 'jpeg'):
                    try:
                        import google.generativeai as genai_vision
                        import PIL.Image
                        img = PIL.Image.open(filepath)
                        vision_model = genai_vision.GenerativeModel('gemini-2.5-flash')
                        vision_response = vision_model.generate_content([
                            "Extract ALL text from this resume image. Preserve the structure. Return only the extracted text.",
                            img
                        ])
                        if vision_response and hasattr(vision_response, 'text') and len(vision_response.text.strip()) > 30:
                            resume_text = vision_response.text.strip()
                    except Exception as e:
                        print(f"Vision OCR failed for {filename}: {e}")

                    if not resume_text:
                        try:
                            import pytesseract
                            from PIL import Image
                            img = Image.open(filepath)
                            resume_text = pytesseract.image_to_string(img)
                        except Exception as e:
                            print(f"Tesseract OCR failed for {filename}: {e}")
                else:
                    from resume_parser import extract_text_from_file
                    resume_text = extract_text_from_file(filepath)

            except Exception as e:
                print(f"Text extraction failed for {filename}: {e}")

            if not resume_text or len(resume_text.strip()) < 30:
                # Cleanup
                for p in saved_paths:
                    try: os.remove(p)
                    except: pass
                return jsonify({"message": f"Could not extract text from '{file.filename}'. Try a different format."}), 400

            resume_data.append({
                "file_name": file.filename,
                "text": resume_text.strip()
            })

        if len(resume_data) < 2:
            for p in saved_paths:
                try: os.remove(p)
                except: pass
            return jsonify({"message": "Need at least 2 valid resumes to compare."}), 400

        # Send to AI for comparison
        print(f"Comparing {len(resume_data)} resumes" + (f" for job: {target_job}" if target_job else " (general)"))
        result = AIResumeService.compare_resumes(resume_data, target_job)

        # Cleanup files
        for p in saved_paths:
            try: os.remove(p)
            except: pass

        if result.get("error"):
            status = 429 if "quota" in result["error"].lower() else 500
            return jsonify({"message": result["error"]}), status

        # Save to comparison history
        try:
            user_id = int(get_jwt_identity())
            comparison_data = result.get("comparison", {})
            file_names = ", ".join([rd["file_name"] for rd in resume_data])
            winner = comparison_data.get("best_resume", {})
            history_entry = ComparisonHistory(
                user_id=user_id,
                file_names=file_names,
                target_job=target_job or "General",
                winner_name=winner.get("resume_name", ""),
                resume_count=len(resume_data),
                comparison_json=json.dumps(comparison_data),
                created_at=datetime.utcnow()
            )
            db.session.add(history_entry)
            db.session.commit()
        except Exception as e:
            print(f"Comparison history save error: {e}")

        log_ai_usage(current_user_id, 'resume_compare')
        return jsonify(result), 200

    except Exception as e:
        error_msg = str(e)
        print(f"Resume Comparison Error: {e}")
        if "429" in error_msg or "quota" in error_msg.lower():
            return jsonify({"message": "API quota exceeded. Please wait and try again."}), 429
        return jsonify({"message": f"Comparison failed: {error_msg}"}), 500


@app.route("/compare-resumes/export/pdf", methods=["POST"])
@jwt_required()
def export_comparison_pdf():
    """Generate a PDF comparison report."""
    try:
        from report_generator import generate_comparison_pdf
        data = request.get_json()
        comparison = data.get("comparison")
        if not comparison:
            return jsonify({"message": "No comparison data provided"}), 400

        pdf_buffer = generate_comparison_pdf(comparison)

        from flask import send_file
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name="ResuMate_Comparison_Report.pdf"
        )
    except Exception as e:
        print(f"Comparison PDF Export Error: {e}")
        return jsonify({"message": f"Failed to generate PDF: {str(e)}"}), 500


@app.route("/compare-resumes/export/docx", methods=["POST"])
@jwt_required()
def export_comparison_docx():
    """Generate a Word comparison report."""
    try:
        from report_generator import generate_comparison_docx
        data = request.get_json()
        comparison = data.get("comparison")
        if not comparison:
            return jsonify({"message": "No comparison data provided"}), 400

        docx_buffer = generate_comparison_docx(comparison)

        from flask import send_file
        return send_file(
            docx_buffer,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            as_attachment=True,
            download_name="ResuMate_Comparison_Report.docx"
        )
    except Exception as e:
        print(f"Comparison DOCX Export Error: {e}")
        return jsonify({"message": f"Failed to generate Word report: {str(e)}"}), 500


# ─────────────────────────────────────────────────────────────────────────────
# RESUME COMPARISON — HISTORY ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/compare-resumes/history", methods=["GET"])
@jwt_required()
def get_comparison_history():
    """Get comparison history list."""
    user_id = int(get_jwt_identity())
    try:
        entries = ComparisonHistory.query.filter_by(user_id=user_id)\
            .order_by(ComparisonHistory.created_at.desc()).limit(30).all()

        history = []
        for e in entries:
            history.append({
                "id": e.id,
                "file_names": e.file_names or "",
                "target_job": e.target_job or "General",
                "winner_name": e.winner_name or "",
                "resume_count": e.resume_count or 0,
                "created_at": e.created_at.isoformat() if e.created_at else "",
            })
        return jsonify({"history": history}), 200
    except Exception as e:
        print(f"Comparison History Error: {e}")
        return jsonify({"history": []}), 200


@app.route("/compare-resumes/history/<int:comp_id>", methods=["GET"])
@jwt_required()
def get_comparison_history_detail(comp_id):
    """Get full comparison result from history."""
    user_id = int(get_jwt_identity())
    try:
        entry = ComparisonHistory.query.filter_by(id=comp_id, user_id=user_id).first()
        if not entry:
            return jsonify({"message": "Not found"}), 404

        comparison = json.loads(entry.comparison_json) if entry.comparison_json else None
        if not comparison:
            return jsonify({"message": "No comparison data stored"}), 404

        return jsonify({"comparison": comparison}), 200
    except Exception as e:
        print(f"Comparison History Detail Error: {e}")
        return jsonify({"message": "Failed to load comparison"}), 500


@app.route("/compare-resumes/history/<int:comp_id>", methods=["DELETE"])
@jwt_required()
def delete_comparison_history(comp_id):
    """Delete a comparison from history."""
    user_id = int(get_jwt_identity())
    try:
        entry = ComparisonHistory.query.filter_by(id=comp_id, user_id=user_id).first()
        if not entry:
            return jsonify({"message": "Not found"}), 404
        db.session.delete(entry)
        db.session.commit()
        return jsonify({"message": "Deleted"}), 200
    except Exception as e:
        print(f"Comparison History Delete Error: {e}")
        return jsonify({"message": "Failed to delete"}), 500


# ═══════════════════════════════════════════════════════════════════════════════
#  💼 SMART JOB OPPORTUNITY FINDER — Adzuna API Integration
# ═══════════════════════════════════════════════════════════════════════════════

from job_service import get_recommended_jobs, search_jobs, get_cache_stats


@app.route("/jobs/recommended", methods=["GET"])
@jwt_required()
def get_recommended_job_listings():
    """
    Get job recommendations based on user's latest resume analysis.
    Query params:
      - analysis_id (optional): specific analysis to use
    """
    try:
        current_user_id = int(get_jwt_identity())
        analysis_id = request.args.get('analysis_id', type=int)

        # Get analysis data
        if analysis_id:
            entry = ResumeAnalysis.query.filter_by(id=analysis_id, user_id=current_user_id).first()
        else:
            # Use most recent analysis
            entry = ResumeAnalysis.query.filter_by(user_id=current_user_id)\
                .order_by(ResumeAnalysis.created_at.desc()).first()

        if not entry:
            return jsonify({
                "message": "No resume analysis found. Please analyze your resume first.",
                "recommended_jobs": []
            }), 404

        analysis_data = json.loads(entry.analysis_json) if entry.analysis_json else {}
        if not analysis_data:
            return jsonify({
                "message": "Analysis data is empty. Please re-analyze your resume.",
                "recommended_jobs": []
            }), 400

        result = get_recommended_jobs(current_user_id, analysis_data)

        if result.get('rate_limited'):
            return jsonify({"message": result['error']}), 429

        return jsonify(result), 200

    except Exception as e:
        print(f"Job Recommendation Error: {e}")
        return jsonify({
            "message": "Job data temporarily unavailable. Please try again later.",
            "recommended_jobs": []
        }), 500


@app.route("/jobs/search", methods=["GET"])
@jwt_required()
def search_job_listings():
    """
    Search jobs by role name.
    Query params:
      - role (required): Job role to search for
      - location (optional): defaults to 'india'
    """
    try:
        current_user_id = int(get_jwt_identity())
        role = request.args.get('role', '').strip()
        location = request.args.get('location', 'india').strip()

        if not role:
            return jsonify({"message": "Please provide a job role to search for"}), 400

        if len(role) < 2:
            return jsonify({"message": "Search query too short"}), 400

        result = search_jobs(role, location, current_user_id)

        if result.get('rate_limited'):
            return jsonify({"message": result['error']}), 429

        return jsonify(result), 200

    except Exception as e:
        print(f"Job Search Error: {e}")
        return jsonify({
            "message": "Job search temporarily unavailable. Please try again later.",
            "jobs": []
        }), 500


@app.route("/jobs/cache-stats", methods=["GET"])
@admin_required
def get_job_cache_statistics():
    """Admin endpoint: Get job cache statistics."""
    try:
        stats = get_cache_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({"message": f"Error: {e}"}), 500


@app.route("/jobs/all", methods=["GET"])
@jwt_required()
def get_all_available_jobs():
    """
    Get paginated list of all available (non-expired) jobs.
    Query params: page (default 1), per_page (default 20), sort (relevance|newest|salary)
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 50)
        sort = request.args.get('sort', 'newest')

        cache_cutoff = datetime.utcnow() - timedelta(hours=6)
        query = JobListing.query.filter(JobListing.fetched_at > cache_cutoff)

        if sort == 'salary':
            query = query.order_by(JobListing.salary_max.desc().nullslast())
        elif sort == 'relevance':
            query = query.order_by(JobListing.fetched_at.desc())
        else:  # newest
            query = query.order_by(JobListing.fetched_at.desc())

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            "jobs": [j.to_dict() for j in paginated.items],
            "total": paginated.total,
            "page": paginated.page,
            "pages": paginated.pages,
            "has_next": paginated.has_next,
            "has_prev": paginated.has_prev,
        }), 200

    except Exception as e:
        print(f"All Jobs Error: {e}")
        return jsonify({"message": "Failed to load jobs", "jobs": []}), 500


@app.route("/jobs/analyses", methods=["GET"])
@jwt_required()
def get_user_analyses_for_jobs():
    """Get user's resume analyses (compact list for the jobs page dropdown)."""
    try:
        current_user_id = int(get_jwt_identity())
        analyses = ResumeAnalysis.query.filter_by(user_id=current_user_id)\
            .order_by(ResumeAnalysis.created_at.desc()).limit(20).all()

        return jsonify({
            "analyses": [{
                "id": a.id,
                "filename": a.filename,
                "career_stage": a.career_stage,
                "opportunity_score": a.opportunity_score,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            } for a in analyses]
        }), 200
    except Exception as e:
        print(f"Analyses List Error: {e}")
        return jsonify({"analyses": []}), 500


# ═══════════════════════════════════════════════════════════════════════════════
#  🏢 AI COMPANY INTELLIGENCE — Deep Company Research
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/company/analyze", methods=["POST"])
@jwt_required()
def analyze_company():
    """
    AI-powered company analysis with 24h caching and rate limiting.
    Input: { company_name, job_role?, job_description?, analysis_id? }
    """
    try:
        current_user_id = int(get_jwt_identity())
        allowed, err_resp, err_code = check_ai_limit(current_user_id, 'company_insights')
        if not allowed:
            return err_resp, err_code

        data = request.get_json()

        company_name = (data.get('company_name') or '').strip()
        if not company_name or len(company_name) < 2:
            return jsonify({"message": "Please provide a valid company name"}), 400

        job_role = (data.get('job_role') or '').strip()
        job_description = (data.get('job_description') or '').strip()

        # Sanitize inputs — prevent prompt injection
        for field in [company_name, job_role]:
            if any(kw in field.lower() for kw in ['ignore previous', 'system prompt', 'forget', 'override']):
                return jsonify({"message": "Invalid input detected"}), 400

        # ── Rate limit: disabled for now ──
        # today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        # daily_count = CompanyAnalysisLog.query.filter(
        #     CompanyAnalysisLog.user_id == current_user_id,
        #     CompanyAnalysisLog.created_at >= today_start
        # ).count()
        # if daily_count >= 5:
        #     return jsonify({"message": "Daily company analysis limit reached (5/day). Please try again tomorrow."}), 429

        # ── Check cache (24h TTL) ──
        cache_key = company_name.lower()
        cached = CompanyAnalysisCache.query.filter(
            db.func.lower(CompanyAnalysisCache.company_name) == cache_key,
            CompanyAnalysisCache.expires_at > datetime.utcnow()
        ).first()

        if cached:
            # Log the usage even for cache hits
            log_entry = CompanyAnalysisLog(
                user_id=current_user_id,
                company_name=company_name,
                created_at=datetime.utcnow()
            )
            db.session.add(log_entry)
            db.session.commit()

            result = cached.to_dict()
            result['cached'] = True

            # If user has an analysis, add personalized match
            analysis_id = data.get('analysis_id')
            if analysis_id:
                entry = ResumeAnalysis.query.filter_by(id=analysis_id, user_id=current_user_id).first()
                if entry and entry.analysis_json:
                    analysis_data = json.loads(entry.analysis_json)
                    skills = []
                    for sl in ['technical_skills', 'soft_skills', 'tools_and_frameworks']:
                        skills.extend(analysis_data.get(sl, []))
                    if skills:
                        result['analysis']['resume_skills'] = skills[:20]

            log_ai_usage(current_user_id, 'company_insights')
            return jsonify(result), 200

        # ── Extract user skills if analysis available ──
        resume_skills = None
        analysis_id = data.get('analysis_id')
        if analysis_id:
            entry = ResumeAnalysis.query.filter_by(id=analysis_id, user_id=current_user_id).first()
            if entry and entry.analysis_json:
                analysis_data = json.loads(entry.analysis_json)
                resume_skills = []
                for sl in ['technical_skills', 'soft_skills', 'tools_and_frameworks']:
                    resume_skills.extend(analysis_data.get(sl, []))

        # ── Call AI ──
        result = AIResumeService.analyze_company(
            company_name=company_name,
            job_role=job_role,
            job_description=job_description[:2000],
            resume_skills=resume_skills
        )

        if result.get('error'):
            return jsonify({"message": result['error']}), 500

        # ── Cache the result (24h) ──
        try:
            now = datetime.utcnow()
            cache_entry = CompanyAnalysisCache(
                company_name=company_name,
                job_role=job_role,
                analysis_json=json.dumps(result.get('analysis', {})),
                created_at=now,
                expires_at=now + timedelta(hours=24)
            )
            db.session.add(cache_entry)

            # Log usage
            log_entry = CompanyAnalysisLog(
                user_id=current_user_id,
                company_name=company_name,
                created_at=now
            )
            db.session.add(log_entry)
            db.session.commit()
        except Exception as cache_err:
            print(f"Warning: Could not cache company analysis: {cache_err}")
            db.session.rollback()

        log_ai_usage(current_user_id, 'company_insights')
        return jsonify({
            "company_name": company_name,
            "job_role": job_role,
            "analysis": result.get('analysis', {}),
            "cached": False,
        }), 200

    except Exception as e:
        error_msg = str(e)
        print(f"Company Analysis Error: {e}")
        if "429" in error_msg or "quota" in error_msg.lower():
            return jsonify({"message": "API quota exceeded. Please wait and try again."}), 429
        return jsonify({"message": f"Company analysis failed: {error_msg}"}), 500


# ═══════════════════════════════════════════════════════════════════════════════
#  ADMIN — AI Feature Controls
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/admin/ai-features', methods=['GET'])
@admin_required
def get_ai_features():
    """List all AI feature settings."""
    features = AIFeatureSetting.query.order_by(AIFeatureSetting.id).all()
    return jsonify({"features": [f.to_dict() for f in features]}), 200


@app.route('/admin/ai-features/<int:feature_id>', methods=['PUT'])
@admin_required
def update_ai_feature(feature_id):
    """Update a single AI feature setting (enable/disable, limits)."""
    feature = AIFeatureSetting.query.get(feature_id)
    if not feature:
        return jsonify({"message": "Feature not found"}), 404

    data = request.get_json()
    if 'is_enabled' in data:
        feature.is_enabled = bool(data['is_enabled'])
    if 'limit_enabled' in data:
        feature.limit_enabled = bool(data['limit_enabled'])
    if 'daily_limit_per_user' in data:
        feature.daily_limit_per_user = max(0, int(data['daily_limit_per_user']))
    if 'monthly_limit_per_user' in data:
        feature.monthly_limit_per_user = max(0, int(data['monthly_limit_per_user']))
    if 'global_daily_limit' in data:
        feature.global_daily_limit = max(0, int(data['global_daily_limit']))

    feature.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"message": "Feature updated", "feature": feature.to_dict()}), 200


@app.route('/admin/ai-features/bulk', methods=['PUT'])
@admin_required
def bulk_update_ai_features():
    """Bulk update all features at once (from the AI Controls panel)."""
    data = request.get_json()
    features_data = data.get('features', [])
    updated = 0
    for fd in features_data:
        feature = AIFeatureSetting.query.get(fd.get('id'))
        if not feature:
            continue
        if 'is_enabled' in fd:
            feature.is_enabled = bool(fd['is_enabled'])
        if 'limit_enabled' in fd:
            feature.limit_enabled = bool(fd['limit_enabled'])
        if 'daily_limit_per_user' in fd:
            feature.daily_limit_per_user = max(0, int(fd['daily_limit_per_user']))
        if 'monthly_limit_per_user' in fd:
            feature.monthly_limit_per_user = max(0, int(fd['monthly_limit_per_user']))
        if 'global_daily_limit' in fd:
            feature.global_daily_limit = max(0, int(fd['global_daily_limit']))
        feature.updated_at = datetime.utcnow()
        updated += 1

    db.session.commit()
    return jsonify({"message": f"{updated} features updated"}), 200


# ═══════════════════════════════════════════════════════════════════════════════
#  ADMIN — AI Usage Analytics & Reports
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/admin/ai-usage/stats', methods=['GET'])
@admin_required
def get_ai_usage_stats():
    """Dashboard-level AI usage statistics."""
    from sqlalchemy import func

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Total requests
    total_today = AIUsageLog.query.filter(AIUsageLog.created_at >= today_start).count()
    total_month = AIUsageLog.query.filter(AIUsageLog.created_at >= month_start).count()

    # Total tokens
    tokens_month = db.session.query(func.sum(AIUsageLog.tokens_used)).filter(
        AIUsageLog.created_at >= month_start
    ).scalar() or 0

    # Active users (users who used AI today)
    active_users = db.session.query(func.count(func.distinct(AIUsageLog.user_id))).filter(
        AIUsageLog.created_at >= today_start
    ).scalar() or 0

    # Most used feature
    most_used = db.session.query(
        AIUsageLog.feature_name, func.count(AIUsageLog.id).label('cnt')
    ).filter(AIUsageLog.created_at >= month_start).group_by(
        AIUsageLog.feature_name
    ).order_by(func.count(AIUsageLog.id).desc()).first()

    # Most active user
    most_active = db.session.query(
        AIUsageLog.user_id, func.count(AIUsageLog.id).label('cnt')
    ).filter(AIUsageLog.created_at >= month_start).group_by(
        AIUsageLog.user_id
    ).order_by(func.count(AIUsageLog.id).desc()).first()

    most_active_user = None
    if most_active:
        u = User.query.get(most_active[0])
        most_active_user = {'username': u.username if u else 'Unknown', 'count': most_active[1]}

    # Feature breakdown
    feature_breakdown = []
    features = AIFeatureSetting.query.all()
    for f in features:
        today_count = AIUsageLog.query.filter(
            AIUsageLog.feature_name == f.feature_name,
            AIUsageLog.created_at >= today_start
        ).count()
        month_count = AIUsageLog.query.filter(
            AIUsageLog.feature_name == f.feature_name,
            AIUsageLog.created_at >= month_start
        ).count()
        feature_breakdown.append({
            'feature_name': f.feature_name,
            'display_name': f.display_name,
            'is_enabled': f.is_enabled,
            'limit_enabled': f.limit_enabled,
            'requests_today': today_count,
            'requests_month': month_count,
        })

    return jsonify({
        'total_today': total_today,
        'total_month': total_month,
        'tokens_month': tokens_month,
        'active_users': active_users,
        'most_used_feature': most_used[0] if most_used else None,
        'most_active_user': most_active_user,
        'feature_breakdown': feature_breakdown,
    }), 200


@app.route('/admin/ai-usage/users', methods=['GET'])
@admin_required
def get_ai_usage_users():
    """Per-user AI usage table with filters."""
    from sqlalchemy import func

    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)
    feature = request.args.get('feature', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')

    query = db.session.query(
        AIUsageLog.user_id,
        AIUsageLog.feature_name,
        func.count(AIUsageLog.id).label('request_count'),
        func.sum(AIUsageLog.tokens_used).label('total_tokens'),
        func.max(AIUsageLog.created_at).label('last_used'),
    )

    if feature:
        query = query.filter(AIUsageLog.feature_name == feature)
    if date_from:
        try:
            query = query.filter(AIUsageLog.created_at >= datetime.fromisoformat(date_from))
        except: pass
    if date_to:
        try:
            query = query.filter(AIUsageLog.created_at <= datetime.fromisoformat(date_to))
        except: pass

    query = query.group_by(AIUsageLog.user_id, AIUsageLog.feature_name)\
                 .order_by(func.count(AIUsageLog.id).desc())

    total = query.count()
    rows = query.offset((page - 1) * per_page).limit(per_page).all()

    result = []
    for row in rows:
        u = User.query.get(row.user_id)
        result.append({
            'user_id': row.user_id,
            'username': u.username if u else 'Unknown',
            'feature_name': row.feature_name,
            'request_count': row.request_count,
            'total_tokens': row.total_tokens or 0,
            'last_used': row.last_used.isoformat() if row.last_used else None,
        })

    return jsonify({'users': result, 'total': total, 'page': page, 'per_page': per_page}), 200


@app.route('/admin/ai-usage/reports', methods=['GET'])
@admin_required
def get_generated_reports():
    """List generated reports with download info."""
    page = request.args.get('page', 1, type=int)
    per_page = min(request.args.get('per_page', 20, type=int), 100)

    query = GeneratedReport.query.order_by(GeneratedReport.created_at.desc())
    total = query.count()
    reports = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'reports': [r.to_dict() for r in reports],
        'total': total,
        'page': page,
    }), 200


@app.route('/admin/ai-usage/export/csv', methods=['GET'])
@admin_required
def export_usage_csv():
    """Export AI usage data as CSV."""
    import csv

    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')

    query = AIUsageLog.query.order_by(AIUsageLog.created_at.desc())
    if date_from:
        try:
            query = query.filter(AIUsageLog.created_at >= datetime.fromisoformat(date_from))
        except: pass
    if date_to:
        try:
            query = query.filter(AIUsageLog.created_at <= datetime.fromisoformat(date_to))
        except: pass

    logs = query.limit(10000).all()

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(['Date', 'User ID', 'Username', 'Feature', 'Provider', 'Tokens', 'Status'])

    for log in logs:
        u = User.query.get(log.user_id)
        writer.writerow([
            log.created_at.strftime('%Y-%m-%d %H:%M:%S') if log.created_at else '',
            log.user_id,
            u.username if u else 'Unknown',
            log.feature_name,
            log.api_provider,
            log.tokens_used,
            log.request_status,
        ])

    output = io.BytesIO()
    output.write(buffer.getvalue().encode('utf-8'))
    output.seek(0)

    return send_file(output, mimetype='text/csv',
                     as_attachment=True, download_name='ResuMate_AI_Usage_Report.csv')


@app.route('/admin/ai-usage/export/pdf', methods=['GET'])
@admin_required
def export_usage_pdf():
    """Export AI usage analytics as a branded PDF report."""
    from xhtml2pdf import pisa
    from sqlalchemy import func

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    now_str = now.strftime("%B %d, %Y at %I:%M %p")

    total_today = AIUsageLog.query.filter(AIUsageLog.created_at >= today_start).count()
    total_month = AIUsageLog.query.filter(AIUsageLog.created_at >= month_start).count()
    tokens_month = db.session.query(func.sum(AIUsageLog.tokens_used)).filter(
        AIUsageLog.created_at >= month_start).scalar() or 0
    active_users = db.session.query(func.count(func.distinct(AIUsageLog.user_id))).filter(
        AIUsageLog.created_at >= today_start).scalar() or 0

    # Feature breakdown rows
    features = AIFeatureSetting.query.all()
    feature_rows = ""
    for f in features:
        tc = AIUsageLog.query.filter(AIUsageLog.feature_name == f.feature_name, AIUsageLog.created_at >= today_start).count()
        mc = AIUsageLog.query.filter(AIUsageLog.feature_name == f.feature_name, AIUsageLog.created_at >= month_start).count()
        status_color = '#059669' if f.is_enabled else '#dc2626'
        status_text = 'Active' if f.is_enabled else 'Disabled'
        feature_rows += (
            f'<tr><td>{f.display_name}</td><td style="text-align:center;">{tc}</td>'
            f'<td style="text-align:center;">{mc}</td>'
            f'<td style="text-align:center;color:{status_color};font-weight:700;">{status_text}</td></tr>'
        )

    # Top users
    top_users = db.session.query(
        AIUsageLog.user_id, func.count(AIUsageLog.id).label('cnt'),
        func.sum(AIUsageLog.tokens_used).label('tokens')
    ).filter(AIUsageLog.created_at >= month_start).group_by(
        AIUsageLog.user_id
    ).order_by(func.count(AIUsageLog.id).desc()).limit(10).all()

    user_rows = ""
    for u_row in top_users:
        u = User.query.get(u_row[0])
        user_rows += (
            f'<tr><td>{u.username if u else "Unknown"}</td>'
            f'<td style="text-align:center;">{u_row.cnt}</td>'
            f'<td style="text-align:center;">{u_row.tokens or 0}</td></tr>'
        )

    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
        @page {{ size: A4; margin: 1.5cm; }}
        body {{ font-family: Helvetica, sans-serif; color: #1e293b; font-size: 10px; line-height: 1.5; }}
        .header {{ background: #1e293b; color: white; padding: 24px; margin-bottom: 18px; }}
        .header h1 {{ font-size: 18px; margin: 0; }}
        .header p {{ margin: 3px 0 0; font-size: 9px; opacity: .7; }}
        .stats {{ display: flex; gap: 10px; margin-bottom: 18px; }}
        .stat {{ flex: 1; border: 1px solid #e2e8f0; padding: 12px; text-align: center; }}
        .stat-val {{ font-size: 20px; font-weight: 800; color: #6366f1; }}
        .stat-lbl {{ font-size: 8px; color: #64748b; text-transform: uppercase; }}
        h2 {{ font-size: 13px; color: #6366f1; margin: 16px 0 8px; }}
        table {{ width: 100%; border-collapse: collapse; margin-bottom: 14px; }}
        th {{ background: #f1f5f9; padding: 6px 8px; font-size: 8.5px; text-transform: uppercase;
              font-weight: 700; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0; }}
        td {{ padding: 6px 8px; font-size: 9.5px; border-bottom: 1px solid #f1f5f9; }}
        .footer {{ text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0;
                   padding-top: 10px; font-size: 8px; color: #94a3b8; }}
    </style></head><body>
    <div class="header"><h1>ResuMate AI Usage Analytics Report</h1>
    <p>Generated on {now_str}</p></div>

    <table style="margin-bottom:18px;"><tr>
        <td class="stat" style="border:1px solid #e2e8f0;"><div class="stat-val">{total_today}</div><div class="stat-lbl">Requests Today</div></td>
        <td class="stat" style="border:1px solid #e2e8f0;"><div class="stat-val">{total_month}</div><div class="stat-lbl">Requests This Month</div></td>
        <td class="stat" style="border:1px solid #e2e8f0;"><div class="stat-val">{tokens_month:,}</div><div class="stat-lbl">Tokens Used</div></td>
        <td class="stat" style="border:1px solid #e2e8f0;"><div class="stat-val">{active_users}</div><div class="stat-lbl">Active Users Today</div></td>
    </tr></table>

    <h2>Feature Usage Breakdown</h2>
    <table><tr><th>Feature</th><th style="text-align:center;">Today</th><th style="text-align:center;">Month</th><th style="text-align:center;">Status</th></tr>
    {feature_rows}</table>

    <h2>Top Users This Month</h2>
    <table><tr><th>User</th><th style="text-align:center;">Requests</th><th style="text-align:center;">Tokens</th></tr>
    {user_rows}</table>

    <div class="footer">
        <p><strong>Generated by ResuMate Admin Panel</strong></p>
        <p>{now_str}</p>
    </div>
    </body></html>"""

    buffer = io.BytesIO()
    pisa.CreatePDF(io.StringIO(html), dest=buffer)
    buffer.seek(0)
    return send_file(buffer, mimetype='application/pdf',
                     as_attachment=True, download_name='ResuMate_AI_Usage_Report.pdf')


# ───────────────────────── Job Finder Export ─────────────────────────
@app.route('/jobs/export/pdf', methods=['POST'])
@jwt_required()
def export_jobs_pdf():
    try:
        data = request.get_json()
        from report_generator import generate_jobs_pdf
        buffer = generate_jobs_pdf(data)
        return send_file(buffer, mimetype='application/pdf',
                         as_attachment=True, download_name='ResuMate_Jobs_Report.pdf')
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@app.route('/jobs/export/docx', methods=['POST'])
@jwt_required()
def export_jobs_docx():
    try:
        data = request.get_json()
        from report_generator import generate_jobs_docx
        buffer = generate_jobs_docx(data)
        return send_file(buffer,
                         mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         as_attachment=True, download_name='ResuMate_Jobs_Report.docx')
    except Exception as e:
        return jsonify({"message": str(e)}), 500


# ───────────────────────── Company Insights Export ─────────────────────────
@app.route('/company/export/pdf', methods=['POST'])
@jwt_required()
def export_company_pdf():
    try:
        data = request.get_json()
        from report_generator import generate_company_pdf
        buffer = generate_company_pdf(data)
        return send_file(buffer, mimetype='application/pdf',
                         as_attachment=True, download_name='ResuMate_Company_Report.pdf')
    except Exception as e:
        return jsonify({"message": str(e)}), 500


@app.route('/company/export/docx', methods=['POST'])
@jwt_required()
def export_company_docx():
    try:
        data = request.get_json()
        from report_generator import generate_company_docx
        buffer = generate_company_docx(data)
        return send_file(buffer,
                         mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                         as_attachment=True, download_name='ResuMate_Company_Report.docx')
    except Exception as e:
        return jsonify({"message": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
#  JOB APPLICATION TRACKING — Log every "Apply Now" click
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/api/jobs/track-apply', methods=['POST'])
@jwt_required()
def track_job_apply():
    """Log when a user clicks 'Apply Now' on a job listing."""
    try:
        uid = int(get_jwt_identity())
        data = request.get_json() or {}

        job_title = (data.get('job_title') or '').strip()
        if not job_title:
            return jsonify({"message": "job_title is required"}), 400

        log_entry = JobApplicationLog(
            user_id=uid,
            job_title=job_title[:255],
            company=(data.get('company') or '')[:200],
            location=(data.get('location') or '')[:200],
            salary_range=(data.get('salary_range') or '')[:100],
            apply_url=(data.get('apply_url') or '')[:2000],
            source=(data.get('source') or 'adzuna')[:50],
        )
        db.session.add(log_entry)
        db.session.commit()
        return jsonify({"message": "Application tracked", "id": log_entry.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": "Error tracking application", "error": str(e)}), 500


# ═══════════════════════════════════════════════════════════════════════════════
#  ADMIN — Job Applications Report
# ═══════════════════════════════════════════════════════════════════════════════

@app.route('/admin/job-applications', methods=['GET'])
@admin_required
def get_job_applications():
    """Get paginated list of all job application clicks with filtering."""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '').strip()
        company_filter = request.args.get('company', '').strip()
        user_filter = request.args.get('user', '').strip()

        query = JobApplicationLog.query.order_by(JobApplicationLog.created_at.desc())

        if search:
            query = query.filter(
                db.or_(
                    JobApplicationLog.job_title.ilike(f'%{search}%'),
                    JobApplicationLog.company.ilike(f'%{search}%'),
                    JobApplicationLog.location.ilike(f'%{search}%'),
                )
            )
        if company_filter:
            query = query.filter(JobApplicationLog.company.ilike(f'%{company_filter}%'))
        if user_filter:
            query = query.join(User).filter(User.username.ilike(f'%{user_filter}%'))

        total = query.count()
        applications = query.offset((page - 1) * per_page).limit(per_page).all()

        # Stats
        total_all = JobApplicationLog.query.count()
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        total_today = JobApplicationLog.query.filter(JobApplicationLog.created_at >= today_start).count()
        unique_users = db.session.query(db.func.count(db.func.distinct(JobApplicationLog.user_id))).scalar() or 0

        # Top companies
        top_companies = db.session.query(
            JobApplicationLog.company,
            db.func.count(JobApplicationLog.id).label('count')
        ).group_by(JobApplicationLog.company).order_by(db.text('count DESC')).limit(5).all()

        return jsonify({
            'applications': [a.to_dict() for a in applications],
            'total': total,
            'page': page,
            'per_page': per_page,
            'stats': {
                'total_applications': total_all,
                'today': total_today,
                'unique_users': unique_users,
                'top_companies': [{'company': c[0] or 'Not specified', 'count': c[1]} for c in top_companies],
            }
        })
    except Exception as e:
        return jsonify({"message": "Error fetching applications", "error": str(e)}), 500


@app.route('/admin/job-applications/export/csv', methods=['GET'])
@admin_required
def export_job_applications_csv():
    """Export all job application logs as CSV."""
    try:
        from flask import send_file
        applications = JobApplicationLog.query.order_by(JobApplicationLog.created_at.desc()).all()

        output = io.StringIO()
        output.write('ID,User,Email,Job Title,Company,Location,Salary Range,Source,Applied At,Apply URL\n')
        for a in applications:
            row = [
                str(a.id),
                a.user.username if a.user else 'Unknown',
                a.user.email if a.user else 'Unknown',
                (a.job_title or '').replace(',', ';'),
                (a.company or '').replace(',', ';'),
                (a.location or '').replace(',', ';'),
                (a.salary_range or '').replace(',', ';'),
                a.source or 'adzuna',
                a.created_at.strftime('%Y-%m-%d %H:%M:%S') if a.created_at else '',
                a.apply_url or '',
            ]
            output.write(','.join(row) + '\n')

        csv_bytes = output.getvalue().encode('utf-8')
        buffer = io.BytesIO(csv_bytes)
        buffer.seek(0)
        return send_file(buffer, mimetype='text/csv', as_attachment=True,
                         download_name=f'ResuMate_Job_Applications_{datetime.utcnow().strftime("%Y%m%d")}.csv')
    except Exception as e:
        return jsonify({"message": "Error exporting CSV", "error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
