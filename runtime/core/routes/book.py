"""Book Intelligence вЂ” РѕСЃРЅРѕРІРЅС‹Рµ СЌРЅРґРїРѕРёРЅС‚С‹ (/book/*)."""
import json
import logging
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, HTTPException, Depends, Query

from auth.rbac import require_role
from core.dto.requests import BookAskRequest, BookGenerateRequest
from core.dto.responses import (
    HealthResponse, BookAskResponse, BookGenomeResponse,
    BookLayersResponse, SuccessResponse,
)
from core.cache import genome_cache, chunks_cache
from core.adc_deps import (
    get_config, get_pulse, get_keeper, get_herald,
    get_event_logger, get_drafts,
)

log = logging.getLogger("hermes.routes.book")

router = APIRouter(tags=["Book Intelligence"])


@lru_cache(maxsize=1)
def _load_genome_raw() -> bytes | None:
    """Р§РёС‚Р°РµРј genome JSON РѕРґРёРЅ СЂР°Р·, РєСЌС€РёСЂСѓРµРј СЃС‹СЂРѕР№ Р±Р°Р№С‚."""
    config = get_config()
    path = config.GENOME_DIR / f"GENOME_v{config.GENOME_VERSION}.json"
    if path.exists():
        return path.read_bytes()
    return None


def _load_genome(config_obj=None) -> dict | None:
    data = _load_genome_raw()
    if data is None:
        return None
    return json.loads(data)


def _load_genome_full(config_obj=None) -> dict:
    return _load_genome(config_obj) or {}


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
        raise HTTPException(404, "Р“РµРЅРѕРј РЅРµ РЅР°Р№РґРµРЅ")
    return BookGenomeResponse(
        themes=genome["modules"].get("themes", []),
        characters=genome["modules"].get("characters", []),
        values=genome["modules"].get("values", []),
        world_entities=genome.get("world_entities", []),
        author_intent=genome.get("author_intent", {}),
    )


@router.get("/layers", response_model=BookLayersResponse, dependencies=[Depends(require_role("reader"))])
async def get_layers_endpoint(pulse=Depends(get_pulse)):
    if not pulse or not pulse.is_loaded:
        raise HTTPException(503, "Pulse РЅРµ Р·Р°РіСЂСѓР¶РµРЅ")
    k = pulse.layers.get("knowledge")
    m = pulse.layers.get("meaning")
    i = pulse.layers.get("identity")
    ms = pulse.layers.get("mission")
    w = pulse.layers.get("world_engine")
    return BookLayersResponse(
        knowledge_layer=k.summary if k else "",
        meaning_layer=m.summary if m else "",
        identity_layer=i.summary if i else "",
        mission_layer=ms.summary if ms else "",
        world_engine_layer=w.summary if w else "",
    )


@router.post("/ask", response_model=SuccessResponse, summary="Р—Р°РґР°С‚СЊ РІРѕРїСЂРѕСЃ РєРЅРёРіРµ")
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
        "messages": [{"role": m.role, "content": m.content} for m in (req.messages or [])],
        "reader_id": user.get("user_id", ""),
        "reader_name": user.get("display_name", "") or user.get("username", ""),
    })
    event_logger.log_event({
        "event_type": "api_ask", "topic": req.question[:100],
        "user_sentiment": "neutral", "system_action": "keeper_response", "outcome": "ok",
    })
    register_question(req.question[:60], req.question, result.get("answer", ""))

    # WebSocket СѓРІРµРґРѕРјР»РµРЅРёРµ
    from core.websocket import notify_new_question
    await notify_new_question(req.question, req.question[:60], user.get("user_id", ""))

    return SuccessResponse(data=result)


@router.post("/generate", response_model=SuccessResponse, summary="Р“РµРЅРµСЂР°С†РёСЏ РєРѕРЅС‚РµРЅС‚Р°", dependencies=[Depends(require_role("editor"))])
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


@router.get("/drafts", response_model=SuccessResponse, summary="РџРѕР»СѓС‡РёС‚СЊ С‡РµСЂРЅРѕРІРёРєРё", dependencies=[Depends(require_role("reader"))])
async def get_drafts_endpoint(status: str | None = None, drafts=Depends(get_drafts)):
    if status == "pending":
        return SuccessResponse(data=drafts.get_pending_drafts())
    return SuccessResponse(data=drafts.get_all_drafts())


@router.post("/drafts/{draft_id}/approve", response_model=SuccessResponse, summary="РћРґРѕР±СЂРёС‚СЊ С‡РµСЂРЅРѕРІРёРє", dependencies=[Depends(require_role("editor"))])
async def approve_draft(draft_id: str, drafts=Depends(get_drafts)):
    if drafts.approve_draft(draft_id):
        return SuccessResponse(data={"status": "approved", "draft_id": draft_id})
    raise HTTPException(404, "Р§РµСЂРЅРѕРІРёРє РЅРµ РЅР°Р№РґРµРЅ")


@router.get("/memory/stats", response_model=SuccessResponse, summary="РЎС‚Р°С‚РёСЃС‚РёРєР° РїР°РјСЏС‚Рё", dependencies=[Depends(require_role("admin"))])
async def get_memory_stats(event_logger=Depends(get_event_logger)):
    if hasattr(event_logger, "get_statistics"):
        return SuccessResponse(data=event_logger.get_statistics())
    return SuccessResponse(data={"total_events": 0, "status": "ok"})


# в”Ђв”Ђ Chapters: С‡С‚РµРЅРёРµ С‚РµРєСЃС‚Р° РєРЅРёРіРё в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ


@lru_cache(maxsize=1)
def _load_enriched_chunks(config_obj=None) -> list[dict]:
    """Р—Р°РіСЂСѓР·РёС‚СЊ enriched_chunks.json (СЂР°Р·Р±РёС‚С‹Рµ РЅР° РіР»Р°РІС‹ С‡Р°РЅРєРё)."""
    if config_obj is None:
        config_obj = get_config()
    path = config_obj.KNOWLEDGE_DIR / "enriched_chunks.json"
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _build_chapters_from_chunks(chunks: list[dict]) -> list[dict]:
    """РЎРіСЂСѓРїРїРёСЂРѕРІР°С‚СЊ С‡Р°РЅРєРё РїРѕ chapter_title РІ РіР»Р°РІС‹."""
    if not chunks:
        return []

    from collections import OrderedDict
    chapter_map: dict[str, list[dict]] = OrderedDict()

    for ch in chunks:
        title = ch.get("chapter_title", "Р‘РµР· РЅР°Р·РІР°РЅРёСЏ")
        if title not in chapter_map:
            chapter_map[title] = []
        chapter_map[title].append(ch)

    chapters = []
    for i, (title, parts) in enumerate(chapter_map.items()):
        # If there's a large chunk (full chapter text), use only it to avoid duplication
        large_parts = [p for p in parts if len(p.get("text", "")) > 1000]
        if large_parts:
            content = large_parts[0].get("text", "")
        else:
            content = "\n\n".join(p.get("text", "") for p in parts)
        chapters.append({
            "id": f"ch_{i:02d}",
            "title": title,
            "content": content,
            "char_count": len(content),
            "index": i,
        })

    return chapters


@lru_cache(maxsize=1)
def _load_chapters(config_obj=None) -> list[dict]:
    chunks = _load_enriched_chunks(config_obj)
    return _build_chapters_from_chunks(chunks)


@router.get("/chapters", dependencies=[Depends(require_role("reader"))])
async def get_chapters(config=Depends(get_config)):
    """РЎРїРёСЃРѕРє РіР»Р°РІ РєРЅРёРіРё (Р±РµР· РєРѕРЅС‚РµРЅС‚Р°)."""
    chapters = _load_chapters(config)
    return {
        "ok": True,
        "data": [
            {"id": ch["id"], "title": ch["title"], "char_count": ch["char_count"], "index": ch["index"]}
            for ch in chapters
        ],
        "total": len(chapters),
    }


@router.get("/chapters/{chapter_id}", dependencies=[Depends(require_role("reader"))])
async def get_chapter(chapter_id: str, config=Depends(get_config)):
    """РўРµРєСЃС‚ РєРѕРЅРєСЂРµС‚РЅРѕР№ РіР»Р°РІС‹."""
    chapters = _load_chapters(config)
    for ch in chapters:
        if ch["id"] == chapter_id:
            return {"ok": True, "data": ch}
    raise HTTPException(404, "Р“Р»Р°РІР° РЅРµ РЅР°Р№РґРµРЅР°")


@lru_cache(maxsize=1)
def _build_full_text(config_obj=None) -> str:
    """РЎРєР»РµРµРЅРЅС‹Р№ С‚РµРєСЃС‚ РІСЃРµР№ РєРЅРёРіРё вЂ” РєСЌС€РёСЂСѓРµС‚СЃСЏ РѕРґРёРЅ СЂР°Р·."""
    chunks = _load_enriched_chunks(config_obj)
    return "\n\n".join(ch.get("text", "") for ch in chunks)


@router.get("/text", dependencies=[Depends(require_role("reader"))])
async def get_book_text(offset: int = Query(0, ge=0), limit: int = Query(2000, ge=100, le=10000), config=Depends(get_config)):
    """Р¤СЂР°РіРјРµРЅС‚ С‚РµРєСЃС‚Р° РєРЅРёРіРё СЃ РїР°РіРёРЅР°С†РёРµР№ РїРѕ СЃРёРјРІРѕР»Р°Рј."""
    full_text = _build_full_text(config)
    if not full_text:
        raise HTTPException(404, "РўРµРєСЃС‚ РєРЅРёРіРё РЅРµ РЅР°Р№РґРµРЅ")
    total = len(full_text)
    chunk = full_text[offset:offset + limit]
    return {
        "ok": True,
        "data": chunk,
        "offset": offset,
        "limit": limit,
        "total": total,
        "has_more": offset + limit < total,
    }


# в”Ђв”Ђ Screenplay: РєРёРЅРѕСЃС†РµРЅР°СЂРёР№ в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ


@lru_cache(maxsize=1)
def _load_screenplay_text(config_obj=None) -> str:
    if config_obj is None:
        config_obj = get_config()
    path = config_obj.SOURCE_OF_TRUTH / "SYNOPSIS" / "РќР°СЃР»РµРґРёРµ_РђСЂРєР°РёРјР°_РЎС†РµРЅР°СЂРёР№_Full.md"
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8")


def _parse_screenplay_scenes(text: str) -> list[dict]:
    """Р Р°Р·Р±РёС‚СЊ СЃС†РµРЅР°СЂРёР№ РЅР° СЃС†РµРЅС‹ РїРѕ Р·Р°РіРѕР»РѕРІРєР°Рј (N. INT/EXT)."""
    import re
    if not text:
        return []

    lines = text.split("\n")
    scenes = []
    current_title = ""
    current_lines = []

    for line in lines:
        stripped = line.strip()
        if re.match(r"^\d+\.\s+(INT|EXT)", stripped):
            if current_lines and current_title:
                content = "\n".join(current_lines).strip()
                if content:
                    scenes.append({
                        "id": f"scene_{len(scenes):03d}",
                        "title": current_title,
                        "content": content,
                        "char_count": len(content),
                    })
            current_title = stripped
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines and current_title:
        content = "\n".join(current_lines).strip()
        if content:
            scenes.append({
                "id": f"scene_{len(scenes):03d}",
                "title": current_title,
                "content": content,
                "char_count": len(content),
            })

    for i, s in enumerate(scenes):
        s["id"] = f"scene_{i:03d}"
        s["index"] = i

    return scenes


@lru_cache(maxsize=1)
def _load_screenplay_scenes(config_obj=None) -> list[dict]:
    text = _load_screenplay_text(config_obj)
    return _parse_screenplay_scenes(text)


@router.get("/screenplay", dependencies=[Depends(require_role("reader"))])
async def get_screenplay_scenes(config=Depends(get_config)):
    """РЎРїРёСЃРѕРє СЃС†РµРЅ РєРёРЅРѕСЃС†РµРЅР°СЂРёСЏ."""
    scenes = _load_screenplay_scenes(config)
    return {
        "ok": True,
        "data": [
            {"id": s["id"], "title": s["title"], "char_count": s["char_count"], "index": s["index"]}
            for s in scenes
        ],
        "total": len(scenes),
    }


@router.get("/screenplay/{scene_id}", dependencies=[Depends(require_role("reader"))])
async def get_screenplay_scene(scene_id: str, config=Depends(get_config)):
    """РўРµРєСЃС‚ РєРѕРЅРєСЂРµС‚РЅРѕР№ СЃС†РµРЅС‹."""
    scenes = _load_screenplay_scenes(config)
    for s in scenes:
        if s["id"] == scene_id:
            return {"ok": True, "data": s}
    raise HTTPException(404, "РЎС†РµРЅР° РЅРµ РЅР°Р№РґРµРЅР°")



# ── Cache Stats ──────────────────────────────────────────

@router.get("/cache/stats", summary="Статистика кэша", dependencies=[Depends(require_role("reader"))])
async def cache_stats():
    """Показать статистику всех кэшей."""
    from core.cache import genome_cache, chunks_cache, world_model_cache, api_cache, rag_cache
    return {
        "ok": True,
        "data": {
            "genome": genome_cache.stats,
            "chunks": chunks_cache.stats,
            "world_model": world_model_cache.stats,
            "api": api_cache.stats,
            "rag": rag_cache.stats,
        }
    }
