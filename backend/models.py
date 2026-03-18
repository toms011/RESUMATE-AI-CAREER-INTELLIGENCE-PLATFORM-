# backend/models.py
import json
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    is_banned = db.Column(db.Boolean, default=False)
    banned_until = db.Column(db.DateTime, nullable=True)  # None = not banned, datetime = ban expires at
    ban_reason = db.Column(db.String(255), nullable=True)
    reset_token = db.Column(db.String(255), nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)
    resumes = db.relationship('Resume', backref='owner', lazy=True)

class Resume(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(100), nullable=False) # e.g. "Software Dev Resume"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    template_id = db.Column(db.Integer, db.ForeignKey('template.id'), nullable=True, default=1)
    is_deleted = db.Column(db.Boolean, default=False)
    deleted_at = db.Column(db.DateTime, nullable=True)
    canvas_design = db.Column(db.Text, nullable=True)   # Fabric.js canvas JSON for visual designer
    
    # Relationships to content
    personal_info = db.relationship('PersonalInfo', backref='resume', uselist=False)
    education = db.relationship('Education', backref='resume', lazy=True)
    experience = db.relationship('Experience', backref='resume', lazy=True)
    skills = db.relationship('Skill', backref='resume', lazy=True)
    additional_details = db.relationship('AdditionalDetail', backref='resume', lazy=True)
    template = db.relationship('Template', backref='resumes')

class PersonalInfo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    resume_id = db.Column(db.Integer, db.ForeignKey('resume.id'), nullable=False)
    full_name = db.Column(db.String(100))
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    job_title = db.Column(db.String(100))
    linkedin = db.Column(db.String(200))
    github = db.Column(db.String(200))
    location = db.Column(db.String(200))
    country = db.Column(db.String(10))
    country_name = db.Column(db.String(100))
    state = db.Column(db.String(10))
    state_name = db.Column(db.String(100))
    city = db.Column(db.String(100))
    summary = db.Column(db.Text)
    additional_info = db.Column(db.Text)
    profile_image_url = db.Column(db.Text)          # base64 data URL or remote URL
    profile_image_enabled = db.Column(db.Boolean, default=False)

class Education(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    resume_id = db.Column(db.Integer, db.ForeignKey('resume.id'), nullable=False)
    degree = db.Column(db.String(100))
    institution = db.Column(db.String(100))
    year = db.Column(db.String(20))
    grade = db.Column(db.String(50))

class Experience(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    resume_id = db.Column(db.Integer, db.ForeignKey('resume.id'), nullable=False)
    job_title = db.Column(db.String(100))
    company = db.Column(db.String(100))
    start_date = db.Column(db.String(20))
    end_date = db.Column(db.String(20))
    description = db.Column(db.Text)

class Skill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    resume_id = db.Column(db.Integer, db.ForeignKey('resume.id'), nullable=False)
    name = db.Column(db.String(50))
    proficiency = db.Column(db.String(20))

class AdditionalDetail(db.Model):
    """Stores languages, awards, certifications, activities, websites, references."""
    id = db.Column(db.Integer, primary_key=True)
    resume_id = db.Column(db.Integer, db.ForeignKey('resume.id'), nullable=False)
    detail_type = db.Column(db.String(30), nullable=False)  # 'language','award','certification','activity','website','reference'
    value = db.Column(db.Text, nullable=False)               # JSON string for structured data
    sort_order = db.Column(db.Integer, default=0)

class Template(db.Model):
    """Resume templates with HTML/CSS styling"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # e.g., "Modern Professional", "Classic"
    description = db.Column(db.String(255))
    preview_image = db.Column(db.String(255))  # URL or path to preview image
    html_template = db.Column(db.Text, nullable=True)  # HTML template content (Optional now)
    section_order = db.Column(db.JSON)  # JSON array of section names
    styles = db.Column(db.JSON)  # JSON object for CSS styles
    layout_config = db.Column(db.JSON)  # JSON object for layout coordinates (for editor)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    category = db.Column(db.String(50), default='professional')  # professional, creative, minimal, etc.
    # --- DESIGN TEMPLATE FIELDS ---
    template_type = db.Column(db.String(10), default='ATS')   # 'ATS' | 'DESIGN'
    background_image = db.Column(db.Text, nullable=True)       # URL/path to A4 bg image
    content_padding = db.Column(db.JSON, nullable=True)        # {top, left, right, bottom} in mm

    def to_dict(self):
        """Serialize template to JSON-safe dictionary for API responses."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'preview_image': self.preview_image,
            'category': self.category or 'professional',
            'section_order': self.section_order or [],
            'sectionOrder': self.section_order or [],   # camelCase alias for frontend
            'styles': self.styles or {},
            'layout_config': self.layout_config or {},
            'layoutConfig': self.layout_config or {},    # camelCase alias for frontend
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            # design template extras
            'template_type': self.template_type or 'ATS',
            'background_image': self.background_image,
            'content_padding': self.content_padding or {'top': 15, 'left': 18, 'right': 18, 'bottom': 15},
        }

class ATSAnalysis(db.Model):
    """Tracks history of ATS analyses"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # Nullable for guest scans if needed
    filename = db.Column(db.String(255))
    score = db.Column(db.Integer)
    analysis_type = db.Column(db.String(20), default='ats')  # 'ats' or 'match'
    analysis_json = db.Column(db.Text)  # Full JSON analysis result
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class JobMatchHistory(db.Model):
    """Tracks history of Job Description matches"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    resume_id = db.Column(db.Integer, db.ForeignKey('resume.id'), nullable=True) # Optional link to specific resume
    job_description = db.Column(db.Text) # Store the JD text or a snippet
    match_score = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    analysis_json = db.Column(db.Text) # Store full analysis for potential future retrieval

class ResumeAnalysis(db.Model):
    """Tracks history of AI Resume Analyzer deep career analyses"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    filename = db.Column(db.String(255))
    opportunity_score = db.Column(db.Integer)
    career_stage = db.Column(db.String(50))
    career_summary = db.Column(db.Text)
    analysis_json = db.Column(db.Text)  # Full JSON analysis result
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class ComparisonHistory(db.Model):
    """Tracks history of multi-resume comparisons"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    file_names = db.Column(db.Text)  # Comma-separated filenames
    target_job = db.Column(db.String(255))
    winner_name = db.Column(db.String(255))
    resume_count = db.Column(db.Integer)
    comparison_json = db.Column(db.Text)  # Full JSON comparison result
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class CareerChatHistory(db.Model):
    """Tracks history of career assistant conversations"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    query = db.Column(db.Text)
    response = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════
#  API KEY MANAGEMENT — Secure rotation & failover
# ═══════════════════════════════════════════════════════════════

class JobListing(db.Model):
    """Cached job listings fetched from Adzuna API"""
    __tablename__ = 'job_listing'
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(150), nullable=False, index=True)        # search term used
    title = db.Column(db.String(255), nullable=False)                    # actual job title
    company = db.Column(db.String(200))
    location = db.Column(db.String(200), index=True)
    salary_min = db.Column(db.Float, nullable=True)
    salary_max = db.Column(db.Float, nullable=True)
    description = db.Column(db.Text)
    apply_url = db.Column(db.Text)
    source = db.Column(db.String(50), default='adzuna')
    adzuna_id = db.Column(db.String(100), nullable=True, unique=True)    # dedup key
    fetched_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'role': self.role,
            'title': self.title,
            'company': self.company or 'Not specified',
            'location': self.location or 'India',
            'salary_min': self.salary_min,
            'salary_max': self.salary_max,
            'salary_range': self._format_salary(),
            'description': (self.description or '')[:300],
            'apply_url': self.apply_url,
            'source': self.source,
            'fetched_at': self.fetched_at.isoformat() if self.fetched_at else None,
        }

    def _format_salary(self):
        if not self.salary_min and not self.salary_max:
            return 'Not disclosed'
        parts = []
        for v in (self.salary_min, self.salary_max):
            if v:
                if v >= 100000:
                    parts.append(f'\u20B9{v/100000:.1f}L')
                elif v >= 1000:
                    parts.append(f'\u20B9{v/1000:.0f}K')
                else:
                    parts.append(f'\u20B9{v:.0f}')
        return ' - '.join(parts) if parts else 'Not disclosed'


class JobSearchLog(db.Model):
    """Rate-limit tracking for job searches per user"""
    __tablename__ = 'job_search_log'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    search_query = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class CompanyAnalysisCache(db.Model):
    """Cached AI company analysis results (24h TTL)"""
    __tablename__ = 'company_analysis_cache'
    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(200), nullable=False, index=True)
    job_role = db.Column(db.String(200), nullable=True)
    analysis_json = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)

    def to_dict(self):
        return {
            'company_name': self.company_name,
            'job_role': self.job_role,
            'analysis': json.loads(self.analysis_json) if self.analysis_json else {},
            'cached': True,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class CompanyAnalysisLog(db.Model):
    """Rate-limit tracking for company analyses per user (5/day)"""
    __tablename__ = 'company_analysis_log'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    company_name = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ApiKey(db.Model):
    """Stores encrypted API keys with status, priority, and usage tracking"""
    __tablename__ = 'api_key'
    id = db.Column(db.Integer, primary_key=True)
    provider_name = db.Column(db.String(50), nullable=False, default='gemini')   # gemini, openai, etc.
    label = db.Column(db.String(100), nullable=True)                              # friendly name
    encrypted_key = db.Column(db.Text, nullable=False)                            # AES-encrypted key
    status = db.Column(db.String(20), nullable=False, default='active')           # active | inactive | exhausted
    priority = db.Column(db.Integer, nullable=False, default=10)                  # lower = higher priority
    usage_count = db.Column(db.Integer, default=0)
    success_count = db.Column(db.Integer, default=0)
    failure_count = db.Column(db.Integer, default=0)
    last_used_at = db.Column(db.DateTime, nullable=True)
    last_error = db.Column(db.String(255), nullable=True)
    monthly_limit = db.Column(db.Integer, nullable=True)        # optional cap
    daily_limit = db.Column(db.Integer, nullable=True)
    daily_usage = db.Column(db.Integer, default=0)
    last_daily_reset = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_safe_dict(self):
        """Return dict WITHOUT exposing the actual key"""
        return {
            'id': self.id,
            'provider_name': self.provider_name,
            'label': self.label or f'Key #{self.id}',
            'masked_key': self._mask_key(),
            'status': self.status,
            'priority': self.priority,
            'usage_count': self.usage_count,
            'success_count': self.success_count,
            'failure_count': self.failure_count,
            'last_used_at': self.last_used_at.isoformat() if self.last_used_at else None,
            'last_error': self.last_error,
            'monthly_limit': self.monthly_limit,
            'daily_limit': self.daily_limit,
            'daily_usage': self.daily_usage,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def _mask_key(self):
        """Show only first 8 and last 4 characters"""
        from key_encryption import decrypt_api_key
        try:
            raw = decrypt_api_key(self.encrypted_key)
            if len(raw) > 12:
                return raw[:8] + '•' * (len(raw) - 12) + raw[-4:]
            return '•' * len(raw)
        except Exception:
            return '••••••••'


class ApiKeyLog(db.Model):
    """Audit log for every AI request — who, when, which key, result"""
    __tablename__ = 'api_key_log'
    id = db.Column(db.Integer, primary_key=True)
    api_key_id = db.Column(db.Integer, db.ForeignKey('api_key.id'), nullable=True)
    endpoint_used = db.Column(db.String(255))       # e.g. "ats_analyze", "enhance_description"
    success = db.Column(db.Boolean, default=True)
    error_code = db.Column(db.String(50), nullable=True)   # e.g. "429", "quota_exceeded"
    error_message = db.Column(db.String(500), nullable=True)
    response_time_ms = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ═══════════════════════════════════════════════════════════════════════════════
#  AI Feature Settings — Admin-controlled per-feature limits & toggles
# ═══════════════════════════════════════════════════════════════════════════════

class AIFeatureSetting(db.Model):
    """Admin-configurable settings for each AI feature: enable/disable + rate limits."""
    __tablename__ = 'ai_feature_setting'
    id = db.Column(db.Integer, primary_key=True)
    feature_name = db.Column(db.String(50), unique=True, nullable=False)  # e.g. "resume_analyzer"
    display_name = db.Column(db.String(100), nullable=False)               # e.g. "Resume Analyzer"
    is_enabled = db.Column(db.Boolean, default=True)                       # Global on/off
    limit_enabled = db.Column(db.Boolean, default=False)                   # Whether limits apply
    daily_limit_per_user = db.Column(db.Integer, default=20)
    monthly_limit_per_user = db.Column(db.Integer, default=500)
    global_daily_limit = db.Column(db.Integer, default=1000)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'feature_name': self.feature_name,
            'display_name': self.display_name,
            'is_enabled': self.is_enabled,
            'limit_enabled': self.limit_enabled,
            'daily_limit_per_user': self.daily_limit_per_user,
            'monthly_limit_per_user': self.monthly_limit_per_user,
            'global_daily_limit': self.global_daily_limit,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    # Default feature seeds
    FEATURE_DEFAULTS = [
        {'feature_name': 'resume_analyzer', 'display_name': 'Resume Analyzer', 'daily_limit_per_user': 10, 'monthly_limit_per_user': 200, 'global_daily_limit': 500},
        {'feature_name': 'resume_compare', 'display_name': 'Resume Compare', 'daily_limit_per_user': 10, 'monthly_limit_per_user': 200, 'global_daily_limit': 500},
        {'feature_name': 'company_insights', 'display_name': 'Company Insights', 'daily_limit_per_user': 15, 'monthly_limit_per_user': 300, 'global_daily_limit': 800},
        {'feature_name': 'job_match_ai', 'display_name': 'Job Match AI', 'daily_limit_per_user': 20, 'monthly_limit_per_user': 500, 'global_daily_limit': 1000},
        {'feature_name': 'report_generation', 'display_name': 'Report Generation', 'daily_limit_per_user': 20, 'monthly_limit_per_user': 500, 'global_daily_limit': 1000},
        {'feature_name': 'ats_analysis', 'display_name': 'ATS Analysis', 'daily_limit_per_user': 15, 'monthly_limit_per_user': 300, 'global_daily_limit': 800},
        {'feature_name': 'career_chat', 'display_name': 'Career Assistant Chat', 'daily_limit_per_user': 30, 'monthly_limit_per_user': 600, 'global_daily_limit': 2000},
    ]


# ═══════════════════════════════════════════════════════════════════════════════
#  AI Usage Log — Centralized tracking for every AI request
# ═══════════════════════════════════════════════════════════════════════════════

class AIUsageLog(db.Model):
    """Centralized usage log for all AI feature requests."""
    __tablename__ = 'ai_usage_log'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    feature_name = db.Column(db.String(50), nullable=False, index=True)   # matches AIFeatureSetting.feature_name
    api_provider = db.Column(db.String(50), default='gemini')
    tokens_used = db.Column(db.Integer, default=0)
    request_status = db.Column(db.String(20), default='success')          # success / failure
    error_message = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'feature_name': self.feature_name,
            'api_provider': self.api_provider,
            'tokens_used': self.tokens_used,
            'request_status': self.request_status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ═══════════════════════════════════════════════════════════════════════════════
#  Generated Report — Tracks downloadable reports for Admin Reports page
# ═══════════════════════════════════════════════════════════════════════════════

class GeneratedReport(db.Model):
    """Tracks every downloadable report generated by users."""
    __tablename__ = 'generated_report'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    report_type = db.Column(db.String(50), nullable=False)   # resume_analysis, resume_comparison, job_intelligence, company_insight
    report_format = db.Column(db.String(10), nullable=False)  # pdf, docx
    file_name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    user = db.relationship('User', backref=db.backref('generated_reports', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else 'Unknown',
            'report_type': self.report_type,
            'report_format': self.report_format,
            'file_name': self.file_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# ═══════════════════════════════════════════════════════════════════════════════
#  Job Application Log — Tracks every "Apply Now" click
# ═══════════════════════════════════════════════════════════════════════════════

class JobApplicationLog(db.Model):
    """Logs every time a user clicks 'Apply Now' on a job listing."""
    __tablename__ = 'job_application_log'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    job_title = db.Column(db.String(255), nullable=False)
    company = db.Column(db.String(200))
    location = db.Column(db.String(200))
    salary_range = db.Column(db.String(100))
    apply_url = db.Column(db.Text)
    source = db.Column(db.String(50), default='adzuna')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    user = db.relationship('User', backref=db.backref('job_applications', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else 'Unknown',
            'email': self.user.email if self.user else 'Unknown',
            'job_title': self.job_title,
            'company': self.company or 'Not specified',
            'location': self.location or 'Not specified',
            'salary_range': self.salary_range or 'Not disclosed',
            'apply_url': self.apply_url,
            'source': self.source,
            'applied_at': self.created_at.isoformat() if self.created_at else None,
        }