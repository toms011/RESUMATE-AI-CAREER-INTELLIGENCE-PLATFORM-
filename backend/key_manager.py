"""
Centralized API Key Manager — handles selection, rotation, failover,
in-memory caching, usage logging, and auto-recovery of exhausted keys.

All AI modules MUST go through this service to get a working API key.
No direct API key usage anywhere else.
"""

import threading
import time
from datetime import datetime, timedelta

# These will be bound once the Flask app is ready (via init_key_manager)
_db = None
_app = None

# ── In-memory cache ─────────────────────────────────────────────
_cache_lock = threading.Lock()
_cached_keys = []           # list of {id, decrypted_key, provider, priority, status}
_cache_expiry = 0           # unix timestamp when cache expires
_CACHE_TTL = 60             # seconds

# ── Constants ───────────────────────────────────────────────────
RATE_LIMIT_ERRORS = {'429', 'quota_exceeded', 'resource_exhausted', 'rate_limit'}


def init_key_manager(app, db):
    """Call once from app.py after db.init_app(app). Seeds .env keys if table is empty."""
    global _app, _db
    _app = app
    _db = db

    with app.app_context():
        _seed_env_keys()
        _seed_adzuna_env_keys()
        _refresh_cache()


# ═══════════════════════════════════════════════════════════════
#  PUBLIC API — used by ai_service.py and admin routes
# ═══════════════════════════════════════════════════════════════

def get_active_key(provider='gemini'):
    """
    Return the best available API key (decrypted) for the given provider.
    Selects by: status=active → lowest priority number → least usage.
    Returns (key_id, decrypted_key) or (None, None).
    """
    keys = _get_cached_keys(provider)
    for k in keys:
        if k['status'] == 'active':
            return k['id'], k['decrypted_key']
    return None, None


def get_adzuna_credentials():
    """
    Return (app_id, app_key, id_key_db_id, key_key_db_id) for the single
    currently-active Adzuna pair. Only ONE pair can be active at a time
    (admin controls which one is ON).
    Returns (None, None, None, None) if none is active.
    """
    id_keys = _get_cached_keys('adzuna_id')
    key_keys = _get_cached_keys('adzuna_key')

    # Find the single active id-key
    active_id = next((k for k in id_keys if k['status'] == 'active'), None)
    if not active_id:
        return None, None, None, None

    # Match it with the key-part at the same priority
    active_key = next((k for k in key_keys if k['status'] == 'active' and k['priority'] == active_id['priority']), None)
    if not active_key:
        # Fallback: any active key
        active_key = next((k for k in key_keys if k['status'] == 'active'), None)
    if not active_key:
        return None, None, None, None

    return active_id['decrypted_key'], active_key['decrypted_key'], active_id['id'], active_key['id']


def activate_adzuna_pair(id_key_id):
    """
    Exclusively activate one Adzuna credential pair (by the adzuna_id key's DB id).
    Deactivates ALL other Adzuna pairs first, then activates the chosen one.
    Returns the activated pair info dict or None.
    """
    from models import ApiKey
    with _app.app_context():
        target_id_key = ApiKey.query.get(id_key_id)
        if not target_id_key or target_id_key.provider_name != 'adzuna_id':
            return None

        target_priority = target_id_key.priority

        # Deactivate ALL adzuna keys (both id and key entries)
        ApiKey.query.filter(
            ApiKey.provider_name.in_(['adzuna_id', 'adzuna_key'])
        ).update({ApiKey.status: 'inactive', ApiKey.updated_at: datetime.utcnow()}, synchronize_session='fetch')

        # Activate only the chosen pair (same priority = same pair)
        target_id_key.status = 'active'
        target_id_key.last_error = None
        target_id_key.updated_at = datetime.utcnow()

        matching_key = ApiKey.query.filter_by(
            provider_name='adzuna_key',
            priority=target_priority
        ).first()
        if matching_key:
            matching_key.status = 'active'
            matching_key.last_error = None
            matching_key.updated_at = datetime.utcnow()

        _db.session.commit()
        _invalidate_cache()

        return {
            'activated_pair': {
                'id_key_id': target_id_key.id,
                'key_key_id': matching_key.id if matching_key else None,
                'label': target_id_key.label,
                'priority': target_priority,
            }
        }


def deactivate_adzuna_pair(id_key_id):
    """
    Deactivate a specific Adzuna credential pair (by adzuna_id key's DB id).
    After this, NO Adzuna pair will be active (Job Finder disabled).
    """
    from models import ApiKey
    with _app.app_context():
        target_id_key = ApiKey.query.get(id_key_id)
        if not target_id_key or target_id_key.provider_name != 'adzuna_id':
            return None

        target_priority = target_id_key.priority

        target_id_key.status = 'inactive'
        target_id_key.updated_at = datetime.utcnow()

        matching_key = ApiKey.query.filter_by(
            provider_name='adzuna_key',
            priority=target_priority
        ).first()
        if matching_key:
            matching_key.status = 'inactive'
            matching_key.updated_at = datetime.utcnow()

        _db.session.commit()
        _invalidate_cache()

        return {'deactivated': True, 'id_key_id': id_key_id}


def get_adzuna_pairs():
    """
    Return all Adzuna credential pairs with their status for admin display.
    Each pair has: id_key_id, key_key_id, label, priority, status, masked_id, masked_key, stats.
    """
    from models import ApiKey
    with _app.app_context():
        id_keys = ApiKey.query.filter_by(provider_name='adzuna_id').order_by(ApiKey.priority.asc()).all()
        key_keys = ApiKey.query.filter_by(provider_name='adzuna_key').order_by(ApiKey.priority.asc()).all()

        key_by_priority = {k.priority: k for k in key_keys}

        pairs = []
        for idk in id_keys:
            matched_key = key_by_priority.get(idk.priority)
            pairs.append({
                'id_key_id': idk.id,
                'key_key_id': matched_key.id if matched_key else None,
                'label': (idk.label or '').replace(' - App ID', ''),
                'priority': idk.priority,
                'status': idk.status,  # active or inactive
                'is_on': idk.status == 'active',
                'masked_id': idk._mask_key(),
                'masked_key': matched_key._mask_key() if matched_key else 'N/A',
                'usage_count': (idk.usage_count or 0) + (matched_key.usage_count or 0 if matched_key else 0),
                'success_count': (idk.success_count or 0) + (matched_key.success_count or 0 if matched_key else 0),
                'failure_count': (idk.failure_count or 0) + (matched_key.failure_count or 0 if matched_key else 0),
                'last_used_at': idk.last_used_at.isoformat() if idk.last_used_at else None,
                'last_error': idk.last_error,
                'created_at': idk.created_at.isoformat() if idk.created_at else None,
            })

        return pairs


def report_adzuna_failure(id_key_id, key_key_id, error_code='429', error_message='Rate limit'):
    """
    Record a failed Adzuna API call. Does NOT auto-switch keys —
    admin must manually toggle to a different pair.
    Returns (None, None, None, None) always.
    """
    _log_usage(id_key_id, 'adzuna_search', success=False, error_code=error_code, error_message=error_message)
    _log_usage(key_key_id, 'adzuna_search', success=False, error_code=error_code, error_message=error_message)
    _update_key_stats(id_key_id, success=False, error_msg=error_message)
    _update_key_stats(key_key_id, success=False, error_msg=error_message)
    # Record the error on the key
    from models import ApiKey
    try:
        with _app.app_context():
            k = ApiKey.query.get(id_key_id)
            if k:
                k.last_error = f'{error_code}: {error_message}'
                k.updated_at = datetime.utcnow()
                _db.session.commit()
    except Exception:
        pass
    return None, None, None, None


def report_adzuna_success(id_key_id, key_key_id, response_time_ms=None):
    """Record successful Adzuna API call for both credential entries."""
    _log_usage(id_key_id, 'adzuna_search', success=True, response_time_ms=response_time_ms)
    _log_usage(key_key_id, 'adzuna_search', success=True, response_time_ms=response_time_ms)
    _update_key_stats(id_key_id, success=True)
    _update_key_stats(key_key_id, success=True)


def report_success(key_id, endpoint, response_time_ms=None):
    """Record a successful AI request."""
    _log_usage(key_id, endpoint, success=True, response_time_ms=response_time_ms)
    _update_key_stats(key_id, success=True)


def report_failure(key_id, endpoint, error_code='', error_message='', response_time_ms=None):
    """
    Record a failed AI request.
    If the error is a quota/rate-limit issue, mark the key as exhausted
    and attempt failover.
    Returns (new_key_id, new_decrypted_key) or (None, None) if no fallback.
    """
    _log_usage(key_id, endpoint, success=False, error_code=error_code,
               error_message=error_message, response_time_ms=response_time_ms)
    _update_key_stats(key_id, success=False, error_msg=error_message)

    # Determine if we should mark exhausted
    normalized = error_code.lower().replace(' ', '_').replace('-', '_') if error_code else ''
    is_quota = normalized in RATE_LIMIT_ERRORS or '429' in str(error_code) or 'quota' in (error_message or '').lower() or 'exhausted' in (error_message or '').lower()

    if is_quota:
        _mark_exhausted(key_id)
        # find next available
        return get_active_key()

    return None, None


def get_all_keys_safe(provider=None):
    """Return all keys with masked values (for admin dashboard)."""
    from models import ApiKey
    with _app.app_context():
        q = ApiKey.query
        if provider:
            q = q.filter_by(provider_name=provider)
        keys = q.order_by(ApiKey.priority.asc(), ApiKey.id.asc()).all()
        return [k.to_safe_dict() for k in keys]


def add_key(provider, raw_key, label=None, priority=10, monthly_limit=None, daily_limit=None):
    """Admin: add a new API key (will be encrypted)."""
    from models import ApiKey
    from key_encryption import encrypt_api_key
    with _app.app_context():
        enc = encrypt_api_key(raw_key)
        k = ApiKey(
            provider_name=provider,
            label=label,
            encrypted_key=enc,
            status='active',
            priority=priority,
            monthly_limit=monthly_limit,
            daily_limit=daily_limit,
        )
        _db.session.add(k)
        _db.session.commit()
        _invalidate_cache()
        return k.to_safe_dict()


def update_key(key_id, **fields):
    """Admin: update priority, label, limits, status."""
    from models import ApiKey
    with _app.app_context():
        k = ApiKey.query.get(key_id)
        if not k:
            return None
        for field in ('label', 'priority', 'monthly_limit', 'daily_limit', 'status'):
            if field in fields and fields[field] is not None:
                setattr(k, field, fields[field])
        k.updated_at = datetime.utcnow()
        _db.session.commit()
        _invalidate_cache()
        return k.to_safe_dict()


def activate_key(key_id):
    """Set a key as active."""
    return update_key(key_id, status='active')


def deactivate_key(key_id):
    """Set a key as inactive."""
    return update_key(key_id, status='inactive')


def set_as_primary(key_id):
    """Make this key the highest-priority (priority=1), push others down."""
    from models import ApiKey
    with _app.app_context():
        # Set all others for same provider to priority >= 10
        target = ApiKey.query.get(key_id)
        if not target:
            return None
        # Bump all keys of same provider
        ApiKey.query.filter(
            ApiKey.provider_name == target.provider_name,
            ApiKey.id != key_id
        ).update({ApiKey.priority: ApiKey.priority + 1})
        target.priority = 1
        target.status = 'active'
        target.updated_at = datetime.utcnow()
        _db.session.commit()
        _invalidate_cache()
        return target.to_safe_dict()


def delete_key(key_id):
    """Permanently remove a key."""
    from models import ApiKey
    with _app.app_context():
        k = ApiKey.query.get(key_id)
        if not k:
            return False
        _db.session.delete(k)
        _db.session.commit()
        _invalidate_cache()
        return True


def get_usage_logs(key_id=None, limit=100):
    """Fetch recent usage logs (for admin)."""
    from models import ApiKeyLog
    with _app.app_context():
        q = ApiKeyLog.query
        if key_id:
            q = q.filter_by(api_key_id=key_id)
        logs = q.order_by(ApiKeyLog.created_at.desc()).limit(limit).all()
        return [{
            'id': l.id,
            'api_key_id': l.api_key_id,
            'endpoint': l.endpoint_used,
            'success': l.success,
            'error_code': l.error_code,
            'error_message': l.error_message,
            'response_time_ms': l.response_time_ms,
            'created_at': l.created_at.isoformat() if l.created_at else None,
        } for l in logs]


def get_key_stats():
    """Aggregate stats for the admin dashboard."""
    from models import ApiKey, ApiKeyLog
    from sqlalchemy import func
    with _app.app_context():
        total = ApiKey.query.count()
        active = ApiKey.query.filter_by(status='active').count()
        exhausted = ApiKey.query.filter_by(status='exhausted').count()
        inactive = ApiKey.query.filter_by(status='inactive').count()

        # Last 24h stats
        since = datetime.utcnow() - timedelta(hours=24)
        recent_total = ApiKeyLog.query.filter(ApiKeyLog.created_at >= since).count()
        recent_success = ApiKeyLog.query.filter(ApiKeyLog.created_at >= since, ApiKeyLog.success == True).count()
        recent_fail = ApiKeyLog.query.filter(ApiKeyLog.created_at >= since, ApiKeyLog.success == False).count()

        return {
            'total_keys': total,
            'active_keys': active,
            'exhausted_keys': exhausted,
            'inactive_keys': inactive,
            'requests_24h': recent_total,
            'success_24h': recent_success,
            'failures_24h': recent_fail,
            'success_rate_24h': round(recent_success / recent_total * 100, 1) if recent_total > 0 else 100,
        }


def try_reset_exhausted():
    """Auto-reset any keys that were exhausted > 1 hour ago (quota may have recovered)."""
    from models import ApiKey
    with _app.app_context():
        threshold = datetime.utcnow() - timedelta(hours=1)
        exhausted = ApiKey.query.filter_by(status='exhausted').filter(
            ApiKey.updated_at < threshold
        ).all()
        count = 0
        for k in exhausted:
            k.status = 'active'
            k.last_error = None
            k.updated_at = datetime.utcnow()
            count += 1
        if count:
            _db.session.commit()
            _invalidate_cache()
        return count


# ═══════════════════════════════════════════════════════════════
#  INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════

def _seed_env_keys():
    """On first run, import any keys from .env into the DB so they're managed."""
    import os
    from models import ApiKey
    from key_encryption import encrypt_api_key

    if ApiKey.query.count() > 0:
        return  # already seeded

    env_keys = []
    for var in ('GEMINI_API_KEY', 'GEMINI_API_KEY_2'):
        val = os.environ.get(var)
        if val:
            env_keys.append(val)

    # Deduplicate
    seen = set()
    for i, raw in enumerate(env_keys):
        if raw in seen:
            continue
        seen.add(raw)
        k = ApiKey(
            provider_name='gemini',
            label=f'Gemini Key {i+1} (from .env)',
            encrypted_key=encrypt_api_key(raw),
            status='active',
            priority=i + 1,
        )
        _db.session.add(k)

    _db.session.commit()
    print(f"[KeyManager] Seeded {len(seen)} API key(s) from environment.")


def _refresh_cache():
    """Reload keys from DB into memory."""
    from models import ApiKey
    from key_encryption import decrypt_api_key

    with _cache_lock:
        global _cached_keys, _cache_expiry
        try:
            keys = ApiKey.query.order_by(ApiKey.priority.asc(), ApiKey.usage_count.asc()).all()
            _cached_keys = []
            for k in keys:
                try:
                    dec = decrypt_api_key(k.encrypted_key)
                except Exception:
                    dec = None
                _cached_keys.append({
                    'id': k.id,
                    'decrypted_key': dec,
                    'provider': k.provider_name,
                    'priority': k.priority,
                    'status': k.status,
                })
            _cache_expiry = time.time() + _CACHE_TTL
        except Exception as e:
            print(f"[KeyManager] Cache refresh error: {e}")


def _seed_adzuna_env_keys():
    """Seed both Adzuna credential pairs into the DB."""
    from models import ApiKey
    from key_encryption import encrypt_api_key

    # Skip if already have adzuna entries
    if ApiKey.query.filter_by(provider_name='adzuna_id').count() > 0:
        return

    # Two credential pairs — priority matches id to key
    pairs = [
        {'app_id': 'a975bfd9', 'app_key': '766dcb4e4b2dc3d783bc8bdffaa1bd4e', 'label': 'Adzuna Pair 1', 'priority': 1},
        {'app_id': 'ef524084', 'app_key': '5eff0447053a114357e05291adf14ff4', 'label': 'Adzuna Pair 2', 'priority': 2},
    ]

    seeded = 0
    for p in pairs:
        _db.session.add(ApiKey(
            provider_name='adzuna_id',
            label=f"{p['label']} - App ID",
            encrypted_key=encrypt_api_key(p['app_id']),
            status='active',
            priority=p['priority'],
        ))
        _db.session.add(ApiKey(
            provider_name='adzuna_key',
            label=f"{p['label']} - App Key",
            encrypted_key=encrypt_api_key(p['app_key']),
            status='active',
            priority=p['priority'],
        ))
        seeded += 2

    if seeded:
        _db.session.commit()
        _invalidate_cache()
        print(f"[KeyManager] Seeded {seeded} Adzuna credential entries (2 pairs).")


def _get_cached_keys(provider='gemini'):
    """Return cached key list, refreshing if stale."""
    if time.time() > _cache_expiry:
        try:
            with _app.app_context():
                _refresh_cache()
        except Exception:
            pass
    with _cache_lock:
        return [k for k in _cached_keys if k['provider'] == provider]


def _invalidate_cache():
    """Force next access to reload from DB."""
    global _cache_expiry
    _cache_expiry = 0


def _mark_exhausted(key_id):
    """Mark a key as exhausted in both DB and cache."""
    from models import ApiKey
    try:
        with _app.app_context():
            k = ApiKey.query.get(key_id)
            if k:
                k.status = 'exhausted'
                k.last_error = 'Quota/rate limit exceeded'
                k.updated_at = datetime.utcnow()
                _db.session.commit()
    except Exception as e:
        print(f"[KeyManager] Error marking key exhausted: {e}")
    _invalidate_cache()


def _update_key_stats(key_id, success=True, error_msg=None):
    """Increment usage counters on a key."""
    from models import ApiKey
    try:
        with _app.app_context():
            k = ApiKey.query.get(key_id)
            if k:
                k.usage_count = (k.usage_count or 0) + 1
                k.daily_usage = (k.daily_usage or 0) + 1
                k.last_used_at = datetime.utcnow()
                if success:
                    k.success_count = (k.success_count or 0) + 1
                else:
                    k.failure_count = (k.failure_count or 0) + 1
                    if error_msg:
                        k.last_error = str(error_msg)[:255]
                # Daily reset check
                if k.last_daily_reset is None or k.last_daily_reset.date() < datetime.utcnow().date():
                    k.daily_usage = 1 if not success else 1
                    k.last_daily_reset = datetime.utcnow()
                _db.session.commit()
    except Exception as e:
        print(f"[KeyManager] Stats update error: {e}")


def _log_usage(key_id, endpoint, success=True, error_code=None, error_message=None, response_time_ms=None):
    """Write an audit row to api_key_log."""
    from models import ApiKeyLog
    try:
        with _app.app_context():
            log = ApiKeyLog(
                api_key_id=key_id,
                endpoint_used=endpoint,
                success=success,
                error_code=error_code,
                error_message=str(error_message)[:500] if error_message else None,
                response_time_ms=response_time_ms,
            )
            _db.session.add(log)
            _db.session.commit()
    except Exception as e:
        print(f"[KeyManager] Log write error: {e}")
