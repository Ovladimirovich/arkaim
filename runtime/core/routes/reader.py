"""Reader Memory — эндпоинты профиля читателя (/book/reader/*)."""
from fastapi import APIRouter, Depends, Request

from auth.rbac import require_role, get_current_user
from core.dto.responses import ReaderProfileResponse, ReaderContextResponse, ReaderStatsResponse
from core.adc_deps import get_reader_memory

router = APIRouter(tags=["Reader Memory"])


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
