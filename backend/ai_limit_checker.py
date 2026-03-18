"""
ai_limit_checker.py
Centralized AI feature gate + rate-limit middleware.

Usage in any route:
    from ai_limit_checker import check_ai_limit, log_ai_usage

    # Before the AI call:
    allowed, err_response, err_code = check_ai_limit(user_id, 'resume_analyzer')
    if not allowed:
        return err_response, err_code

    # After a successful AI call:
    log_ai_usage(user_id, 'resume_analyzer', tokens=0, status='success')
"""

from datetime import datetime
from flask import jsonify
from models import db, AIFeatureSetting, AIUsageLog


def _ensure_defaults():
    """Seed default feature rows if none exist."""
    if AIFeatureSetting.query.count() == 0:
        for feat in AIFeatureSetting.FEATURE_DEFAULTS:
            db.session.add(AIFeatureSetting(**feat))
        db.session.commit()


def check_ai_limit(user_id: int, feature_name: str):
    """
    Check whether the user may use the given AI feature.

    Returns:
        (allowed: bool, error_response, status_code)
        If allowed is True, error_response and status_code are None.
    """
    _ensure_defaults()

    setting = AIFeatureSetting.query.filter_by(feature_name=feature_name).first()

    # If no setting row exists, allow by default
    if not setting:
        return True, None, None

    # ── Feature disabled globally ──
    if not setting.is_enabled:
        return False, jsonify({
            "message": f"{setting.display_name} is currently unavailable. Please try again later."
        }), 503

    # ── Limits disabled → allow ──
    if not setting.limit_enabled:
        return True, None, None

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # ── Per-user daily limit ──
    if setting.daily_limit_per_user and setting.daily_limit_per_user > 0:
        user_daily = AIUsageLog.query.filter(
            AIUsageLog.user_id == user_id,
            AIUsageLog.feature_name == feature_name,
            AIUsageLog.request_status == 'success',
            AIUsageLog.created_at >= today_start,
        ).count()
        if user_daily >= setting.daily_limit_per_user:
            return False, jsonify({
                "message": f"Daily limit reached for {setting.display_name} ({setting.daily_limit_per_user}/day). Try again tomorrow."
            }), 429

    # ── Per-user monthly limit ──
    if setting.monthly_limit_per_user and setting.monthly_limit_per_user > 0:
        user_monthly = AIUsageLog.query.filter(
            AIUsageLog.user_id == user_id,
            AIUsageLog.feature_name == feature_name,
            AIUsageLog.request_status == 'success',
            AIUsageLog.created_at >= month_start,
        ).count()
        if user_monthly >= setting.monthly_limit_per_user:
            return False, jsonify({
                "message": f"Monthly limit reached for {setting.display_name} ({setting.monthly_limit_per_user}/month). Resets next month."
            }), 429

    # ── Global daily limit ──
    if setting.global_daily_limit and setting.global_daily_limit > 0:
        global_daily = AIUsageLog.query.filter(
            AIUsageLog.feature_name == feature_name,
            AIUsageLog.request_status == 'success',
            AIUsageLog.created_at >= today_start,
        ).count()
        if global_daily >= setting.global_daily_limit:
            return False, jsonify({
                "message": f"{setting.display_name} has reached its global daily capacity. Please try again tomorrow."
            }), 429

    return True, None, None


def log_ai_usage(user_id: int, feature_name: str, tokens: int = 0,
                 status: str = 'success', provider: str = 'gemini',
                 error_msg: str = None):
    """Log a single AI feature usage event."""
    try:
        entry = AIUsageLog(
            user_id=user_id,
            feature_name=feature_name,
            api_provider=provider,
            tokens_used=tokens,
            request_status=status,
            error_message=error_msg[:500] if error_msg else None,
        )
        db.session.add(entry)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"[AI Usage Log Error] {e}")
