import logging
from datetime import timedelta
from html import escape as html_escape
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse, RedirectResponse

from auth.users import UserStore
from auth.oauth.telegram import verify_telegram_login
from auth.oauth.google import (
    exchange_code,
    verify_google_id_token,
    parse_google_user,
    get_google_auth_url,
    GoogleOAuthError,
)
from auth.rbac import require_role
from auth.tokens import create_access_token
from auth.api_keys import generate_api_key, mask_api_key
from core.config import settings

router = APIRouter(prefix="/auth", tags=["Auth"])
log = logging.getLogger("hermes.auth")
user_store = UserStore()


_LOGIN_HTML = Path(__file__).resolve().parent / "login.html"


@router.get("/login")
async def auth_login(request: Request):
    html = _LOGIN_HTML.read_text(encoding="utf-8")
    html = html.replace("{{TELEGRAM_BOT_USERNAME}}", html_escape(settings.TELEGRAM_BOT_USERNAME or ""))
    html = html.replace('data-auth-url="{{PUBLIC_BASE_URL}}/auth/telegram/callback"', 'data-auth-url="/auth/telegram/callback"')
    if not settings.GOOGLE_CLIENT_ID:
        html = html.replace('<a href="/auth/google"', '<a href="/auth/google" style="display:none"')
    return Response(content=html, media_type="text/html")


@router.post("/telegram/callback")
async def telegram_callback(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Некорректный JSON")

    telegram_data = verify_telegram_login(body)
    user = await user_store.upsert_user(
        provider=telegram_data["provider"],
        provider_user_id=telegram_data["provider_user_id"],
        username=telegram_data.get("username"),
        display_name=telegram_data.get("display_name"),
        role="reader",
    )
    token = create_access_token(
        subject=user["id"],
        role=user["role"],
        provider=user["provider"],
        expires_delta=timedelta(hours=12),
    )
    resp = JSONResponse({"ok": True, "user": {"id": user["id"], "role": user["role"], "username": user.get("username"), "display_name": user.get("display_name")}})
    is_secure = bool(settings.PUBLIC_BASE_URL.startswith("https://"))
    resp.set_cookie(
        "arkaim_session",
        token,
        httponly=True,
        secure=is_secure,
        samesite="Lax",
        max_age=3600 * 12,
        path="/",
    )
    log.info("user_logged_in provider=%s user_id=%s", telegram_data["provider"], user["id"])
    return resp


@router.get("/google")
async def google_login():
    redirect_uri = f"{settings.PUBLIC_BASE_URL}/auth/google/callback"
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth не настроен")
    auth_url = get_google_auth_url(redirect_uri)
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(request: Request, code: str | None = None):
    if not code:
        raise HTTPException(status_code=400, detail="Отсутствует code")
    try:
        redirect_uri = f"{settings.PUBLIC_BASE_URL}/auth/google/callback"
        tokens = await exchange_code(code, redirect_uri)
        id_token = tokens.get("id_token")
        if not id_token:
            raise HTTPException(status_code=400, detail="Отсутствует id_token")
        payload = verify_google_id_token(id_token)
        google_data = parse_google_user(payload)
        user = await user_store.upsert_user(
            provider=google_data["provider"],
            provider_user_id=google_data["provider_user_id"],
            username=google_data.get("username"),
            display_name=google_data.get("display_name"),
            role="reader",
        )
        token = create_access_token(
            subject=user["id"],
            role=user["role"],
            provider=user["provider"],
            expires_delta=timedelta(hours=12),
        )
        is_secure = bool(settings.PUBLIC_BASE_URL.startswith("https://"))
        resp = RedirectResponse(url="/_ui")
        resp.set_cookie(
            "arkaim_session",
            token,
            httponly=True,
            secure=is_secure,
            samesite="Lax",
            max_age=3600 * 12,
            path="/",
        )
        log.info("user_logged_in provider=google user_id=%s", user["id"])
        return resp
    except GoogleOAuthError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/logout")
async def auth_logout_post():
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("arkaim_session", path="/")
    return resp


@router.get("/logout")
async def auth_logout_get():
    resp = RedirectResponse(url="/auth/login")
    resp.delete_cookie("arkaim_session", path="/")
    return resp


@router.get("/me")
async def auth_me(request: Request):
    from auth.rbac import get_current_user
    user = await get_current_user(request)
    return JSONResponse({"user": {"id": user["user_id"], "role": user["role"], "username": user.get("username"), "display_name": user.get("display_name"), "provider": user.get("provider")}})


@router.post("/api-key")
async def create_api_key(request: Request, name: str | None = None):
    from auth.rbac import get_current_user
    user = await get_current_user(request)
    raw, key_hash, prefix = generate_api_key()
    key_id = await user_store.save_api_key(user_id=user["user_id"], key_prefix=prefix, key_hash=key_hash, name=name)
    return JSONResponse({"key_id": key_id, "key": raw, "key_masked": mask_api_key(raw)})


@router.get("/api-keys")
async def list_api_keys(request: Request):
    from auth.rbac import get_current_user
    user = await get_current_user(request)
    keys = await user_store.list_api_keys(user_id=user["user_id"])
    return JSONResponse([{k: v for k, v in key.items() if k != "key_hash"} for key in keys])


# ── Admin endpoints ──────────────────────────────────


@router.get("/admin/users", dependencies=[Depends(require_role("admin"))])
async def admin_list_users(request: Request):
    """Список всех пользователей (только admin)."""
    users = await user_store.list_users(limit=200)
    return JSONResponse([
        {
            "id": u["id"],
            "provider": u["provider"],
            "provider_user_id": u["provider_user_id"],
            "username": u["username"],
            "display_name": u["display_name"],
            "role": u["role"],
            "is_active": u["is_active"],
            "created_at": u["created_at"],
        }
        for u in users
    ])


@router.post("/admin/users/{user_id}/role", dependencies=[Depends(require_role("admin"))])
async def admin_set_role(user_id: str, role: str):
    """Сменить роль пользователя."""
    if role not in ("reader", "editor", "admin"):
        raise HTTPException(status_code=400, detail="Недопустимая роль")
    ok = await user_store.set_role(user_id, role)
    if not ok:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return {"ok": True, "user_id": user_id, "role": role}


@router.post("/admin/users/{user_id}/toggle", dependencies=[Depends(require_role("admin"))])
async def admin_toggle_user(user_id: str):
    """Активировать/деактивировать пользователя."""
    user = await user_store.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    new_state = not user["is_active"]
    await user_store.set_active(user_id, new_state)
    return {"ok": True, "user_id": user_id, "is_active": new_state}


@router.get("/admin/stats", dependencies=[Depends(require_role("admin"))])
async def admin_stats():
    """Общая статистика системы."""
    from core.presence_manager import get_observer, get_suggester, get_email_store
    users = await user_store.list_users()
    presence = get_observer()
    suggester = get_suggester()
    email = get_email_store()
    email_stats = await email.get_stats()
    return {
        "users": {
            "total": len(users),
            "by_role": {r: sum(1 for u in users if u["role"] == r) for r in ("reader", "editor", "admin")},
        },
        "reader_memory": {},  # будет заполнено ниже
        "presence": {
            "trending_topics": len(await presence.get_trending_topics(min_hits=1)) if hasattr(presence, "get_trending_topics") else 0,
            "pending_suggestions": len(suggester.list_pending()),
        },
        "email": email_stats,
    }


async def _get_reader_stats():
    try:
        from core.pulse_manager import get_reader_memory
        mem = get_reader_memory()
        return await mem.get_stats()
    except Exception:
        return {}
