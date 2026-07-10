"""Book Intelligence — основные эндпоинты (/book/*)."""
import json
import logging

from fastapi import APIRouter, HTTPException, Depends

from auth.rbac import require_role
from core.dto.requests import BookAskRequest, BookGenerateRequest
from core.dto.responses import (
    HealthResponse, BookAskResponse, BookGenomeResponse,
    BookLayersResponse, SuccessResponse,
)
from core.adc_deps import (
    get_config, get_pulse, get_keeper, get_herald,
    get_event_logger, get_drafts,
)

log = logging.getLogger("hermes.routes.book")

router = APIRouter(tags=["Book Intelligence"])


def _load_genome(config_obj=None):
    if config_obj is None:
        config_obj = get_config()
    path = config_obj.GENOME_DIR / f"GENOME_v{config_obj.GENOME_VERSION}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return None


def _load_genome_full(config_obj) -> dict:
    path = config_obj.GENOME_DIR / f"GENOME_v{config_obj.GENOME_VERSION}.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {}


def _save_genome(genome: dict, config_obj):
    path = config_obj.GENOME_DIR / f"GENOME_v{config_obj.GENOME_VERSION}.json"
    path.write_text(json.dumps(genome, ensure_ascii=False, indent=2), encoding="utf-8")


@router.get("/health", response_model=HealthResponse)
async def health(config=Depends(get_config)):
    return HealthResponse(status="ok", version=config.APP_VERSION)


@router.get("/", dependencies=[Depends(require_role("reader"))])
async def root(config=Depends(get_config)):
    return {
        "name": "Book Intelligence",
        "version": config.APP_VERSION,
        "endpoints": {
            "health": "GET /book/health",
            "genome": "GET /book/genome",
            "layers": "GET /book/layers",
            "ask": "POST /book/ask",
            "generate": "POST /book/generate",
            "drafts": "GET /book/drafts",
            "draft_approve": "POST /book/drafts/{draft_id}/approve",
            "memory_stats": "GET /book/memory/stats",
        },
    }


@router.get("/genome", response_model=BookGenomeResponse, dependencies=[Depends(require_role("reader"))])
async def get_genome(config=Depends(get_config)):
    genome = _load_genome(config)
    if genome is None:
        raise HTTPException(404, "Геном не найден")
    return BookGenomeResponse(
        themes=genome["modules"].get("themes", [])[:10],
        characters=genome["modules"].get("characters", [])[:10],
        values=genome["modules"].get("values", [])[:10],
        world_entities=genome.get("world_entities", []),
        author_intent=genome.get("author_intent", {}),
    )


@router.get("/layers", response_model=BookLayersResponse, dependencies=[Depends(require_role("reader"))])
async def get_layers_endpoint(pulse=Depends(get_pulse)):
    if not pulse or not pulse.is_loaded:
        raise HTTPException(503, "Pulse не загружен")
    k = pulse.layers.get("knowledge")
    m = pulse.layers.get("meaning")
    i = pulse.layers.get("identity")
    ms = pulse.layers.get("mission")
    return BookLayersResponse(
        knowledge_layer=k.summary if k else "",
        meaning_layer=m.summary if m else "",
        identity_layer=i.summary if i else "",
        mission_layer=ms.summary if ms else "",
    )


@router.post("/ask", response_model=SuccessResponse, summary="Задать вопрос книге")
async def ask(
    req: BookAskRequest,
    user: dict = Depends(require_role("reader")),
    keeper=Depends(get_keeper),
    event_logger=Depends(get_event_logger),
):
    from core.presence_manager import register_question
    result = await keeper.act({
        "question": req.question,
        "context": req.context,
        "reader_id": user.get("user_id", ""),
        "reader_name": user.get("display_name", "") or user.get("username", ""),
    })
    event_logger.log_event({
        "event_type": "api_ask", "topic": req.question[:100],
        "user_sentiment": "neutral", "system_action": "keeper_response", "outcome": "ok",
    })
    register_question(req.question[:60], req.question, result.get("answer", ""))
    return SuccessResponse(data=result)


@router.post("/generate", response_model=SuccessResponse, summary="Генерация контента", dependencies=[Depends(require_role("editor"))])
async def generate(
    req: BookGenerateRequest,
    herald=Depends(get_herald),
    drafts=Depends(get_drafts),
):
    draft = await herald.act({"content_type": req.type, "topic": req.topic})
    from community.telegram import Draft as DraftModel
    d = DraftModel(id=draft["id"], content=draft["draft"], target="", source="herald", status="pending")
    drafts.save_draft(d)
    return SuccessResponse(data=draft)


@router.get("/drafts", response_model=SuccessResponse, summary="Получить черновики", dependencies=[Depends(require_role("reader"))])
async def get_drafts_endpoint(status: str | None = None, drafts=Depends(get_drafts)):
    if status == "pending":
        return SuccessResponse(data=drafts.get_pending_drafts())
    return SuccessResponse(data=drafts.get_all_drafts())


@router.post("/drafts/{draft_id}/approve", response_model=SuccessResponse, summary="Одобрить черновик", dependencies=[Depends(require_role("editor"))])
async def approve_draft(draft_id: str, drafts=Depends(get_drafts)):
    if drafts.approve_draft(draft_id):
        return SuccessResponse(data={"status": "approved", "draft_id": draft_id})
    raise HTTPException(404, "Черновик не найден")


@router.get("/memory/stats", response_model=SuccessResponse, summary="Статистика памяти", dependencies=[Depends(require_role("admin"))])
async def get_memory_stats(event_logger=Depends(get_event_logger)):
    return SuccessResponse(data=event_logger.get_statistics())
