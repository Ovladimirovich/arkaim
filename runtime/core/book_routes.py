"""
book_routes — Book Intelligence API (композитный роутер).
Составные части: routes/book.py, routes/visual.py, routes/reader.py.
Монтируется на /book/.
"""
import logging

from fastapi import APIRouter

from core.routes.book import router as book_router
from core.routes.visual import router as visual_router
from core.routes.reader import router as reader_router
from book_os.api_routes import router as book_os_router
from knowledge_graph.api_routes import router as graph_router
from pulse.api_routes import router as evolution_router

log = logging.getLogger("hermes.book_routes")

router = APIRouter(
    prefix="/book",
    tags=["Book Intelligence"],
    responses={429: {"description": "Rate limit exceeded"}, 500: {"description": "Internal server error"}},
)

# Подроутеры
router.include_router(book_router)
router.include_router(visual_router)
router.include_router(reader_router)
router.include_router(book_os_router)
router.include_router(graph_router)
router.include_router(evolution_router)

# Presence — после router создаётся
from core.presence_manager import wire_presence_routes
wire_presence_routes(router)

# Telegram message endpoint
from fastapi import Depends, HTTPException
from auth.rbac import require_role
from core.dto.requests import TelegramMessageRequest
from core.adc_deps import get_telegram_stub, get_event_logger


@router.post("/telegram/message", summary="Обработка Telegram сообщения", dependencies=[Depends(require_role("editor"))])
async def telegram_message(req: TelegramMessageRequest, telegram_stub=Depends(get_telegram_stub), event_logger=Depends(get_event_logger)):
    result = await telegram_stub.handle_message(req.message, req.user_id)
    event_logger.log_event({
        "event_type": "telegram_message",
        "topic": req.message[:100],
        "user_sentiment": "neutral",
        "system_action": "draft_created",
        "outcome": result["status"],
    })
    return result
