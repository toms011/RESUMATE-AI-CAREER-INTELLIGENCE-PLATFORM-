"""
Smart Job Opportunity Finder — Adzuna API Integration
=====================================================
Fetches, caches, and matches job listings from Adzuna API.
Uses smart caching to minimize API calls.

Architecture:
1. Check local DB cache first (6-hour TTL)
2. Fetch from Adzuna only when cache expired
3. Background scheduler pre-fetches popular roles
4. Match scoring based on resume skills vs job description
"""

import os
import re
import json
import time
import threading
import requests
from datetime import datetime, timedelta
from difflib import SequenceMatcher

# ── Adzuna API Configuration ─────────────────────────────────────

ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs'
ADZUNA_COUNTRY = 'in'  # India

# ── Cache Configuration ──────────────────────────────────────────
CACHE_TTL_HOURS = 6
MAX_RESULTS_PER_PAGE = 20
MAX_ROLES_TO_FETCH = 3
MAX_SEARCHES_PER_USER_PER_DAY = 50

# ── Popular roles for background pre-fetching ────────────────────
POPULAR_ROLES = [
    'Software Developer',
    'Frontend Developer',
    'Backend Developer',
    'Data Analyst',
    'AI Engineer',
    'Full Stack Developer',
    'Python Developer',
    'Java Developer',
    'DevOps Engineer',
    'Product Manager',
    'UI UX Designer',
    'Cloud Engineer',
    'Machine Learning Engineer',
    'Business Analyst',
    'Cyber Security Analyst',
]

# ── Module-level references (set via init_job_service) ────────────
_db = None
_app = None
_scheduler_started = False
_scheduler_lock = threading.Lock()


def init_job_service(app, db):
    """Initialize the job service with Flask app and db references."""
    global _app, _db
    _app = app
    _db = db
    _ensure_table()
    _start_background_scheduler()


def _ensure_table():
    """Create job_listing and job_search_log tables if they don't exist."""
    if not _app or not _db:
        return
    with _app.app_context():
        try:
            inspector = _db.inspect(_db.engine)
            if not inspector.has_table('job_listing'):
                print("⚠️  Creating job_listing table...")
                with _db.engine.connect() as conn:
                    conn.execute(_db.text("""
                        CREATE TABLE IF NOT EXISTS job_listing (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            role VARCHAR(150) NOT NULL,
                            title VARCHAR(255) NOT NULL,
                            company VARCHAR(200),
                            location VARCHAR(200),
                            salary_min FLOAT,
                            salary_max FLOAT,
                            description TEXT,
                            apply_url TEXT,
                            source VARCHAR(50) DEFAULT 'adzuna',
                            adzuna_id VARCHAR(100) UNIQUE,
                            fetched_at DATETIME,
                            expires_at DATETIME,
                            created_at DATETIME
                        )
                    """))
                    conn.execute(_db.text("CREATE INDEX IF NOT EXISTS idx_job_listing_role ON job_listing(role)"))
                    conn.execute(_db.text("CREATE INDEX IF NOT EXISTS idx_job_listing_location ON job_listing(location)"))
                    conn.execute(_db.text("CREATE INDEX IF NOT EXISTS idx_job_listing_fetched ON job_listing(fetched_at)"))
                    conn.commit()
                print("✅ job_listing table created.")

            if not inspector.has_table('job_search_log'):
                print("⚠️  Creating job_search_log table...")
                with _db.engine.connect() as conn:
                    conn.execute(_db.text("""
                        CREATE TABLE IF NOT EXISTS job_search_log (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            user_id INTEGER NOT NULL,
                            search_query VARCHAR(200),
                            created_at DATETIME,
                            FOREIGN KEY(user_id) REFERENCES user(id)
                        )
                    """))
                    conn.commit()
                print("✅ job_search_log table created.")
        except Exception as e:
            print(f"Job service table creation warning: {e}")


# ═══════════════════════════════════════════════════════════════
#  CORE PUBLIC API
# ═══════════════════════════════════════════════════════════════

def get_recommended_jobs(user_id: int, analysis_data: dict) -> dict:
    """
    Get job recommendations based on resume analysis data.
    
    Steps:
    1. Extract top job roles from analysis
    2. Check cache for each role
    3. Fetch from Adzuna if cache expired
    4. Score jobs against user skills
    5. Return structured results
    """
    from models import JobSearchLog
    
    # Rate limit check
    if not _check_rate_limit(user_id):
        return {
            'error': 'Daily job search limit reached (50/day). Please try again tomorrow.',
            'rate_limited': True
        }
    
    # Extract roles and skills from analysis
    job_roles = analysis_data.get('job_roles', [])
    if not job_roles:
        return {'recommended_jobs': [], 'message': 'No job roles found in analysis'}
    
    # Take top 3 roles only
    top_roles = sorted(job_roles, key=lambda r: r.get('match_percentage', 0), reverse=True)[:MAX_ROLES_TO_FETCH]
    
    # Extract user skills for matching
    user_skills = set()
    for skill_list in ['technical_skills', 'soft_skills', 'tools_and_frameworks']:
        for s in analysis_data.get(skill_list, []):
            user_skills.add(s.lower().strip())
    
    recommended = []
    
    for role_info in top_roles:
        role_name = role_info.get('role', '')
        if not role_name:
            continue
        
        # Get jobs for this role (cache-first strategy)
        jobs = _get_jobs_for_role(role_name)
        
        # Score each job against user skills
        scored_jobs = []
        for job in jobs[:10]:  # Only score top 10
            match_score = _calculate_match_score(job, user_skills, role_info.get('match_percentage', 50))
            scored_jobs.append({
                **job.to_dict(),
                'match_score': match_score
            })
        
        # Sort by match score
        scored_jobs.sort(key=lambda j: j['match_score'], reverse=True)
        
        recommended.append({
            'role': role_name,
            'role_match': role_info.get('match_percentage', 0),
            'jobs': scored_jobs[:5]  # Return top 5 per role
        })
    
    # Log the search
    _log_search(user_id, ', '.join([r['role'] for r in recommended]))
    
    return {
        'recommended_jobs': recommended,
        'total_jobs': sum(len(r['jobs']) for r in recommended),
        'cached': True,  # Will be updated if any API calls were made
        'fetched_at': datetime.utcnow().isoformat()
    }


def search_jobs(role: str, location: str = 'india', user_id: int = None) -> dict:
    """
    Search jobs by role name. Used for manual search endpoint.
    """
    if user_id and not _check_rate_limit(user_id):
        return {
            'error': 'Daily job search limit reached (50/day). Please try again tomorrow.',
            'rate_limited': True
        }
    
    jobs = _get_jobs_for_role(role, location)
    results = [j.to_dict() for j in jobs[:20]]
    
    if user_id:
        _log_search(user_id, role)
    
    return {
        'jobs': results,
        'role': role,
        'total': len(results),
        'fetched_at': datetime.utcnow().isoformat()
    }


# ═══════════════════════════════════════════════════════════════
#  CACHE-FIRST JOB FETCHING
# ═══════════════════════════════════════════════════════════════

def _get_jobs_for_role(role: str, location: str = 'india'):
    """
    Smart cache-first strategy:
    1. Check DB for jobs matching role fetched within CACHE_TTL
    2. If cache hit → return cached results
    3. If cache miss → fetch from Adzuna → store → return
    """
    from models import JobListing
    
    if not _app or not _db:
        return []
    
    with _app.app_context():
        cache_cutoff = datetime.utcnow() - timedelta(hours=CACHE_TTL_HOURS)
        role_normalized = role.strip().lower()
        
        # Check cache
        cached = JobListing.query.filter(
            _db.func.lower(JobListing.role) == role_normalized,
            JobListing.fetched_at > cache_cutoff
        ).order_by(JobListing.salary_max.desc().nullslast()).all()
        
        if cached and len(cached) >= 3:
            print(f"💼 Cache HIT for '{role}' — {len(cached)} jobs")
            return cached
        
        # Cache miss — fetch from Adzuna
        print(f"💼 Cache MISS for '{role}' — fetching from Adzuna...")
        new_jobs = _fetch_from_adzuna(role, location)
        
        if new_jobs:
            _store_jobs(new_jobs, role)
            # Re-query to get ORM objects
            cached = JobListing.query.filter(
                _db.func.lower(JobListing.role) == role_normalized,
                JobListing.fetched_at > cache_cutoff
            ).order_by(JobListing.salary_max.desc().nullslast()).all()
            return cached
        
        # If Adzuna fails, return whatever stale cache we have
        stale = JobListing.query.filter(
            _db.func.lower(JobListing.role) == role_normalized
        ).order_by(JobListing.fetched_at.desc()).limit(20).all()
        
        return stale


def _get_adzuna_credentials():
    """Get Adzuna app_id, app_key, and DB key IDs from key_manager, fall back to env."""
    try:
        import key_manager as km
        app_id, app_key, id_key_id, key_key_id = km.get_adzuna_credentials()
        if app_id and app_key:
            return app_id, app_key, id_key_id, key_key_id
    except Exception:
        pass
    # Fallback to environment variables
    return (
        os.environ.get('ADZUNA_APP_ID', ''),
        os.environ.get('ADZUNA_APP_KEY', ''),
        None, None,
    )


def _fetch_from_adzuna(role: str, location: str = 'india') -> list:
    """
    Fetch job listings from Adzuna API using the single active credential pair.
    No auto-switching — admin controls which pair is ON via the dashboard.
    Returns list of dicts with job data.
    """
    adzuna_app_id, adzuna_app_key, id_key_id, key_key_id = _get_adzuna_credentials()

    if not adzuna_app_id or not adzuna_app_key:
        print("⚠️  Adzuna API credentials not configured — no active pair turned ON")
        return []

    try:
        url = f"{ADZUNA_BASE_URL}/{ADZUNA_COUNTRY}/search/1"
        params = {
            'app_id': adzuna_app_id,
            'app_key': adzuna_app_key,
            'results_per_page': MAX_RESULTS_PER_PAGE,
            'what': role,
            'where': location,
            'sort_by': 'relevance',
            'content-type': 'application/json',
        }

        start = time.time()
        response = requests.get(url, params=params, timeout=15)
        elapsed = int((time.time() - start) * 1000)

        if response.status_code == 429:
            print(f"⚠️  Adzuna rate limited for '{role}' — admin should switch to a different API key pair")
            if id_key_id and key_key_id:
                try:
                    import key_manager as km
                    km.report_adzuna_failure(id_key_id, key_key_id, '429', 'Rate limit exceeded — switch key in Admin Panel')
                except Exception:
                    pass
            return []

        if response.status_code != 200:
            print(f"⚠️  Adzuna API error {response.status_code} for '{role}': {response.text[:200]}")
            return []

        # Success — log it
        if id_key_id and key_key_id:
            try:
                import key_manager as km
                km.report_adzuna_success(id_key_id, key_key_id, response_time_ms=elapsed)
            except Exception:
                pass

        data = response.json()
        results = data.get('results', [])

        jobs = []
        for item in results:
            jobs.append({
                'title': item.get('title', 'Untitled'),
                'company': item.get('company', {}).get('display_name', ''),
                'location': item.get('location', {}).get('display_name', 'India'),
                'salary_min': item.get('salary_min'),
                'salary_max': item.get('salary_max'),
                'description': item.get('description', ''),
                'apply_url': item.get('redirect_url', ''),
                'adzuna_id': str(item.get('id', '')),
            })

        print(f"✅ Adzuna returned {len(jobs)} jobs for '{role}'")
        return jobs

    except requests.exceptions.Timeout:
        print(f"⚠️  Adzuna API timeout for '{role}'")
        return []
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Adzuna API request error for '{role}': {e}")
        return []
    except Exception as e:
        print(f"⚠️  Adzuna fetch error for '{role}': {e}")
        return []


def _store_jobs(jobs: list, role: str):
    """Store fetched jobs in database. Uses upsert logic on adzuna_id."""
    from models import JobListing
    
    if not _app or not _db:
        return
    
    with _app.app_context():
        now = datetime.utcnow()
        expires = now + timedelta(hours=CACHE_TTL_HOURS)
        stored = 0
        
        for job_data in jobs:
            adzuna_id = job_data.get('adzuna_id', '')
            
            if adzuna_id:
                # Check if exists
                existing = JobListing.query.filter_by(adzuna_id=adzuna_id).first()
                if existing:
                    # Update existing
                    existing.role = role.strip().lower()
                    existing.title = job_data['title']
                    existing.company = job_data.get('company', '')
                    existing.location = job_data.get('location', 'India')
                    existing.salary_min = job_data.get('salary_min')
                    existing.salary_max = job_data.get('salary_max')
                    existing.description = job_data.get('description', '')
                    existing.apply_url = job_data.get('apply_url', '')
                    existing.fetched_at = now
                    existing.expires_at = expires
                    stored += 1
                    continue
            
            # Insert new
            new_job = JobListing(
                role=role.strip().lower(),
                title=job_data['title'],
                company=job_data.get('company', ''),
                location=job_data.get('location', 'India'),
                salary_min=job_data.get('salary_min'),
                salary_max=job_data.get('salary_max'),
                description=job_data.get('description', ''),
                apply_url=job_data.get('apply_url', ''),
                source='adzuna',
                adzuna_id=adzuna_id or None,
                fetched_at=now,
                expires_at=expires,
                created_at=now,
            )
            _db.session.add(new_job)
            stored += 1
        
        try:
            _db.session.commit()
            print(f"💾 Stored/updated {stored} jobs for '{role}'")
        except Exception as e:
            _db.session.rollback()
            print(f"⚠️  DB error storing jobs for '{role}': {e}")


# ═══════════════════════════════════════════════════════════════
#  JOB MATCH SCORING
# ═══════════════════════════════════════════════════════════════

def _calculate_match_score(job, user_skills: set, role_match_pct: int = 50) -> int:
    """
    Calculate how well a job matches the user's resume skills.
    
    Scoring:
    - 40% weight: Skill keyword overlap with job description
    - 30% weight: Role match percentage from AI analysis
    - 20% weight: Title similarity to target role
    - 10% weight: Salary availability bonus
    
    Returns score 0-100.
    """
    score = 0.0
    
    # 1. Skill keyword matching (40%)
    description = (job.description or '').lower()
    title = (job.title or '').lower()
    combined_text = f"{title} {description}"
    
    if user_skills:
        matches = sum(1 for skill in user_skills if skill in combined_text)
        skill_ratio = min(matches / max(len(user_skills), 1), 1.0)
        score += skill_ratio * 40
    
    # 2. Role match from AI (30%)
    score += (role_match_pct / 100) * 30
    
    # 3. Title similarity (20%)
    role_name = (job.role or '').lower()
    title_sim = SequenceMatcher(None, role_name, title).ratio()
    score += title_sim * 20
    
    # 4. Salary disclosure bonus (10%)
    if job.salary_min or job.salary_max:
        score += 10
    
    return min(round(score), 100)


# ═══════════════════════════════════════════════════════════════
#  RATE LIMITING
# ═══════════════════════════════════════════════════════════════

def _check_rate_limit(user_id: int) -> bool:
    """Check if user has remaining job searches today. Max 10/day."""
    from models import JobSearchLog
    
    if not _app or not _db:
        return True
    
    with _app.app_context():
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        count = JobSearchLog.query.filter(
            JobSearchLog.user_id == user_id,
            JobSearchLog.created_at >= today_start
        ).count()
        return count < MAX_SEARCHES_PER_USER_PER_DAY


def _log_search(user_id: int, query: str):
    """Log a job search for rate limiting."""
    from models import JobSearchLog
    
    if not _app or not _db:
        return
    
    with _app.app_context():
        try:
            log = JobSearchLog(
                user_id=user_id,
                search_query=query[:200],
                created_at=datetime.utcnow()
            )
            _db.session.add(log)
            _db.session.commit()
        except Exception as e:
            _db.session.rollback()
            print(f"Warning: Could not log job search: {e}")


# ═══════════════════════════════════════════════════════════════
#  BACKGROUND SCHEDULER — Pre-fetch popular roles every 6 hours
# ═══════════════════════════════════════════════════════════════

def _start_background_scheduler():
    """Start background thread that pre-fetches popular roles periodically."""
    global _scheduler_started
    
    with _scheduler_lock:
        if _scheduler_started:
            return
        _scheduler_started = True
    
    def scheduler_loop():
        # Wait 30 seconds after startup before first run
        time.sleep(30)
        while True:
            try:
                _prefetch_popular_roles()
                _cleanup_expired_jobs()
            except Exception as e:
                print(f"⚠️  Job scheduler error: {e}")
            
            # Sleep for 6 hours
            time.sleep(CACHE_TTL_HOURS * 3600)
    
    thread = threading.Thread(target=scheduler_loop, daemon=True, name='job-prefetch-scheduler')
    thread.start()
    print("🔄 Job pre-fetch scheduler started (every 6 hours)")


def _prefetch_popular_roles():
    """Fetch jobs for most popular roles to warm cache."""
    if not _app or not _db:
        return
    
    print("🔄 Pre-fetching jobs for popular roles...")
    fetched = 0
    
    for role in POPULAR_ROLES:
        try:
            jobs = _fetch_from_adzuna(role)
            if jobs:
                _store_jobs(jobs, role)
                fetched += len(jobs)
            # Small delay between API calls to be respectful
            time.sleep(2)
        except Exception as e:
            print(f"⚠️  Pre-fetch error for '{role}': {e}")
    
    print(f"✅ Pre-fetched {fetched} total jobs across {len(POPULAR_ROLES)} roles")


def _cleanup_expired_jobs():
    """Remove job listings older than 24 hours to keep DB clean."""
    from models import JobListing
    
    if not _app or not _db:
        return
    
    with _app.app_context():
        try:
            cutoff = datetime.utcnow() - timedelta(hours=24)
            expired = JobListing.query.filter(JobListing.fetched_at < cutoff).all()
            count = len(expired)
            for job in expired:
                _db.session.delete(job)
            _db.session.commit()
            if count > 0:
                print(f"🗑️  Cleaned up {count} expired job listings")
        except Exception as e:
            _db.session.rollback()
            print(f"⚠️  Job cleanup error: {e}")


# ═══════════════════════════════════════════════════════════════
#  UTILITY
# ═══════════════════════════════════════════════════════════════

def get_cache_stats() -> dict:
    """Get statistics about the job cache (for admin dashboard)."""
    from models import JobListing, JobSearchLog
    
    if not _app or not _db:
        return {}
    
    with _app.app_context():
        total_jobs = JobListing.query.count()
        cache_cutoff = datetime.utcnow() - timedelta(hours=CACHE_TTL_HOURS)
        fresh_jobs = JobListing.query.filter(JobListing.fetched_at > cache_cutoff).count()
        unique_roles = _db.session.query(_db.func.count(_db.func.distinct(JobListing.role))).scalar()
        searches_today = JobSearchLog.query.filter(
            JobSearchLog.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        ).count()
        
        return {
            'total_cached_jobs': total_jobs,
            'fresh_jobs': fresh_jobs,
            'stale_jobs': total_jobs - fresh_jobs,
            'unique_roles_cached': unique_roles,
            'searches_today': searches_today,
            'cache_ttl_hours': CACHE_TTL_HOURS,
            'adzuna_configured': bool(_get_adzuna_credentials()[0] and _get_adzuna_credentials()[1]),
        }
