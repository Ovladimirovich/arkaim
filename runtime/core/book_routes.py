"""
book_routes — Book Intelligence API (композитный роутер).
Составные части: routes/book.py, routes/visual.py, routes/reader.py.
Монтируется на /book/.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.routes.book import router as book_router
from core.routes.visual import router as visual_router
from core.routes.assets import router as assets_router
from core.routes.film_studio import router as film_studio_router
from core.routes.reader import router as reader_router
from book_os.api_routes import router as book_os_router
from knowledge_graph.api_routes import router as graph_router
from pulse.api_routes import router as evolution_router
from auth.rbac import require_role

log = logging.getLogger("hermes.book_routes")

router = APIRouter(
    prefix="/book",
    tags=["Book Intelligence"],
    responses={429: {"description": "Rate limit exceeded"}, 500: {"description": "Internal server error"}},
)

# Подроутеры
from narrative_engine.api_routes import router as world_engine_router
from narrative_engine.story.api_routes import router as story_engine_router
from narrative_engine.research.api_routes import router as research_engine_router
from core.routes.world_engine import router as world_engine_api_router
from core.routes.temporal import router as temporal_router
from core.routes.temporal_updates import router as temporal_updates_router

# G-1: ComfyUI-маршрут исключён из основной публикации (реестр G-1, W-2/B).
# Подключаем роутер только если модуль присутствует (режим доп. интеграции).
try:
    from core.routes.comfyui import router as comfyui_router
except ImportError:  # pragma: no cover — comfyui.py отсутствует в чистой публикации
    comfyui_router = None
    log.warning("comfyui route disabled: core/routes/comfyui.py excluded from this snapshot")

router.include_router(book_router)
router.include_router(visual_router)
router.include_router(assets_router)
router.include_router(film_studio_router)
router.include_router(reader_router)
router.include_router(book_os_router)
router.include_router(graph_router)
router.include_router(evolution_router)
router.include_router(world_engine_router)
router.include_router(story_engine_router)
router.include_router(research_engine_router)
router.include_router(world_engine_api_router)
router.include_router(temporal_router)
router.include_router(temporal_updates_router)
if comfyui_router is not None:
    router.include_router(comfyui_router)

# POST /book/research-engine/apply/{job_id} — RBAC (editor/admin) + gate odobreniya.
# Вынесен из research_engine_router: core не знает про auth.rbac,
# поэтому гейт ставится на уровне runtime (паттерн telegram_message ниже).
from narrative_engine.research.api_routes import _apply_findings_internal, ApplyRequest


@router.post(
    "/research-engine/apply/{job_id}",
    summary="Применение находок к World Model (редактор/администратор)",
)
async def apply_research_findings(
    job_id: str,
    user: dict = Depends(require_role("editor", "admin")),
    body: ApplyRequest | None = None,
):
    """Применить находки к World Model только после явного человеческого одобрения.

    RBAC: editor/admin (require_role в подписи). Gate: body.approved_by
    обязателен — без него World Model не изменяется (strictly suggest-only,
    инвариант M10). Является единственной точкой записи в канонический
    WORLD_MODEL.json через Research Engine.
    """
    return _apply_findings_internal(job_id, user, body)


# Presence — после router создаётся
from core.presence_manager import wire_presence_routes

wire_presence_routes(router)

# Telegram message endpoint
from core.dto.requests import TelegramMessageRequest
from core.adc_deps import get_telegram_stub, get_event_logger


@router.post("/telegram/message", summary="Обработка Telegram сообщения", dependencies=[Depends(require_role("editor"))])
async def telegram_message(req: TelegramMessageRequest, telegram_stub=Depends(get_telegram_stub), event_logger=Depends(get_event_logger)):
    result = await telegram_stub.handle_message(req.message, req.user_id)
    event_logger.log_event(
        {
            "event_type": "telegram_message",
            "topic": req.message[:100],
            "user_sentiment": "neutral",
            "system_action": "draft_created",
            "outcome": result["status"],
        }
    )
    return result


# ── World Engine model для /story ────────────────────────────────────
# Фронтенд вызывает GET /book/world-engine/model и ожидает
# {data: {epochs, locations, canonical_events, causal_rules}}.


class _WorldModelItem(BaseModel):
    id: str
    name: str
    name_ru: str | None = None
    description: str = ""
    type: str | None = None
    order: int | None = None


class _WorldEventItem(BaseModel):
    id: str
    title: str | None = None
    title_ru: str | None = None
    epoch: str | None = None


class _WorldRuleItem(BaseModel):
    id: str
    description: str = ""
    rule_type: str | None = None


class _WorldModelResponse(BaseModel):
    epochs: list[_WorldModelItem] = []
    locations: list[_WorldModelItem] = []
    canonical_events: list[_WorldEventItem] = []
    causal_rules: list[_WorldRuleItem] = []


@router.get(
    "/world-engine/model",
    response_model=_WorldModelResponse,
    summary="Модель мира для движка повествования (/story)",
)
async def world_engine_model():
    """Вернуть эпохи, локации, события и правила мира для /story."""
    from narrative_engine.world_model import WorldModel as _WM

    wm = _WM.load()
    return _WorldModelResponse(
        epochs=[
            _WorldModelItem(
                id=e.id,
                name=e.name,
                name_ru=e.name_ru,
                description=e.description,
                order=e.order,
            )
            for e in wm.get_epochs()
        ],
        locations=[
            _WorldModelItem(
                id=loc.id,
                name=loc.name,
                name_ru=loc.name_ru,
                description=loc.description,
                type=loc.type,
            )
            for loc in wm.get_locations()
        ],
        canonical_events=[
            _WorldEventItem(
                id=ev.id,
                title=ev.title,
                title_ru=ev.title_ru,
                epoch=ev.epoch,
            )
            for ev in wm.get_events()
        ],
        causal_rules=[
            _WorldRuleItem(
                id=r.id,
                description=r.description,
                rule_type=str(r.rule_type) if r.rule_type else None,
            )
            for r in wm.get_rules()
        ],
    )


# ── Notifications для /notifications ─────────────────────────────────
# Фронтенд вызывает /notifications/* (без /book/). Next.js реврайт
# проксирует их на /book/notifications/*. Здесь только заглушки
# (best-effort, без постоянного хранилища) для cheткой работы страниц.


class _Suggestion(BaseModel):
    id: str
    topic: str
    reason: str | None = None
    suggested_action: str | None = None
    status: str = "pending"
    created_at: str | None = None


class _TrendingTopic(BaseModel):
    keyword: str
    hits: int
    sources: list[str] = []


class _EmailDraft(BaseModel):
    id: str
    subject: str
    status: str
    created_at: str
    approved_at: str | None = None
    sent_at: str | None = None


class _Subscriber(BaseModel):
    email: str
    subscribed_at: str


_suggestions: list[_Suggestion] = [
    _Suggestion(
        id="sugg_1",
        topic="Дополнить главу о гиперборейцах",
        reason="Читатели спрашивают о деталях бытия в Сатья Юге",
        suggested_action="Добавить карточку знаний о быте гиперборейцев",
        status="pending",
    ),
    _Suggestion(
        id="sugg_2",
        topic="Уточнить дату основания Аркаима",
        reason="Расхождение в источниках между главами 3 и 7",
        suggested_action="Проверить через WorldModel и внести поправку",
        status="pending",
    ),
]

_trending: list[_TrendingTopic] = [
    _TrendingTopic(keyword="Гиперборея", hits=42, sources=["genome", "world_engine"]),
    _TrendingTopic(keyword="Велик", hits=38, sources=["genome", "ask"]),
    _TrendingTopic(keyword="Аркаим", hits=35, sources=["world", "map"]),
]

_email_drafts: list[_EmailDraft] = []

_subscribers: list[_Subscriber] = []


@router.get(
    "/notifications/suggestions",
    response_model=dict,
    summary="Список предложений читателей",
)
async def get_suggestions():
    return {"data": [s.model_dump() for s in _suggestions]}


@router.post(
    "/notifications/suggestions/{suggestion_id}/approve",
    response_model=dict,
    summary="Одобрить предложение",
)
async def approve_suggestion(suggestion_id: str):
    for s in _suggestions:
        if s.id == suggestion_id:
            s.status = "approved"
            return {"ok": True}
    raise HTTPException(404, f"Suggestion '{suggestion_id}' not found")


@router.post(
    "/notifications/suggestions/{suggestion_id}/reject",
    response_model=dict,
    summary="Отклонить предложение",
)
async def reject_suggestion(suggestion_id: str):
    for s in _suggestions:
        if s.id == suggestion_id:
            s.status = "rejected"
            return {"ok": True}
    raise HTTPException(404, f"Suggestion '{suggestion_id}' not found")


@router.get(
    "/notifications/trending",
    response_model=dict,
    summary="Трендовые темы",
)
async def get_trending():
    return {"data": [t.model_dump() for t in _trending]}


@router.get(
    "/notifications/email/drafts",
    response_model=dict,
    summary="Черновики email-рассылок",
)
async def get_email_drafts():
    return {"data": [d.model_dump() for d in _email_drafts]}


@router.post(
    "/notifications/email/drafts",
    response_model=dict,
    summary="Создать черновик email-рассылки",
)
async def create_email_draft(draft: _EmailDraft):
    _email_drafts.append(draft)
    return {"ok": True, "draft": draft.model_dump()}


@router.post(
    "/notifications/email/drafts/{draft_id}/send",
    response_model=dict,
    summary="Отправить черновик",
)
async def send_email_draft(draft_id: str):
    for d in _email_drafts:
        if d.id == draft_id:
            d.status = "sent"
            return {"ok": True}
    raise HTTPException(404, f"Draft '{draft_id}' not found")


@router.get(
    "/notifications/email/subscribers",
    response_model=dict,
    summary="Подписчики email-рассылки",
)
async def get_subscribers():
    return {"data": [s.model_dump() for s in _subscribers]}
