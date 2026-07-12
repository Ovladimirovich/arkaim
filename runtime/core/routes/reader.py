"""Reader Memory — эндпоинты профиля читателя (/book/reader/*)."""
from fastapi import APIRouter, Depends, Request

from auth.rbac import require_role, get_current_user
from core.dto.responses import ReaderProfileResponse, ReaderContextResponse, ReaderStatsResponse
from core.adc_deps import get_reader_memory

router = APIRouter(prefix="/reader", tags=["Reader Memory"])


@router.get("/profile", response_model=ReaderProfileResponse, dependencies=[Depends(require_role("reader"))])
async def reader_profile(request: Request, reader_memory=Depends(get_reader_memory)):
    user = await get_current_user(request)
    profile = await reader_memory.get_or_create(
        reader_id=user["user_id"],
        display_name=user.get("display_name", ""),
        provider=user.get("provider", ""),
    )
    return ReaderProfileResponse(
        reader_id=profile.reader_id,
        display_name=profile.display_name,
        questions_total=profile.questions_total,
        conversation_count=profile.conversation_count,
        last_topic=profile.last_topic,
        topics=[
            {"name": t.name, "depth": t.depth, "questions": t.questions_count}
            for t in sorted(profile.topics.values(), key=lambda x: x.depth, reverse=True)
        ],
    )


@router.get("/context", response_model=ReaderContextResponse, dependencies=[Depends(require_role("reader"))])
async def reader_context(request: Request, reader_memory=Depends(get_reader_memory)):
    user = await get_current_user(request)
    context = await reader_memory.build_reader_context(user["user_id"])
    return ReaderContextResponse(context=context)


@router.get("/stats", response_model=ReaderStatsResponse, dependencies=[Depends(require_role("admin"))])
async def reader_stats(reader_memory=Depends(get_reader_memory)):
    stats = await reader_memory.get_stats()
    return ReaderStatsResponse(**stats)


# ── History endpoints ────────────────────────────────


@router.get("/history", dependencies=[Depends(require_role("reader"))])
async def reader_history(request: Request, limit: int = 50):
    """История вопросов текущего пользователя."""
    from memory.store import MemoryStore
    user = await get_current_user(request)
    store = MemoryStore()
    try:
        history = await store.get_user_history(user["user_id"], limit=limit)
        return {"ok": True, "data": history, "total": len(history)}
    finally:
        await store.close()


@router.get("/history/full", dependencies=[Depends(require_role("reader"))])
async def reader_history_full(request: Request, session_id: str | None = None, limit: int = 100):
    """Полная история (user + assistant) для текущего пользователя."""
    from memory.store import MemoryStore
    user = await get_current_user(request)
    store = MemoryStore()
    try:
        history = await store.get_user_history_full(user["user_id"], session_id=session_id, limit=limit)
        return {"ok": True, "data": history, "total": len(history)}
    finally:
        await store.close()


@router.get("/history/sessions", dependencies=[Depends(require_role("reader"))])
async def reader_sessions(request: Request):
    """Список сессий пользователя."""
    from memory.store import MemoryStore
    user = await get_current_user(request)
    store = MemoryStore()
    try:
        sessions = await store.get_user_sessions(user["user_id"])
        return {"ok": True, "data": sessions}
    finally:
        await store.close()


@router.get("/history/stats", dependencies=[Depends(require_role("reader"))])
async def reader_history_stats(request: Request):
    """Статистика истории пользователя."""
    from memory.store import MemoryStore
    user = await get_current_user(request)
    store = MemoryStore()
    try:
        stats = await store.get_user_stats(user["user_id"])
        return {"ok": True, **stats}
    finally:
        await store.close()
