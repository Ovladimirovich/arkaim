"""Community API — FastAPI routes для интерпретаций и артефактов читателей."""

import json
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth.rbac import require_role
from community.interpretations import InterpretationStore
from community.artifacts import ArtifactStore

log = logging.getLogger("hermes.community_api")

router = APIRouter(prefix="/book/community", tags=["Community"])

# Stores (инициализируются при первом запросе)
_interp_store: InterpretationStore | None = None
_artifact_store: ArtifactStore | None = None


def _get_interp_store() -> InterpretationStore:
    global _interp_store
    if _interp_store is None:
        _interp_store = InterpretationStore()
    return _interp_store


def _get_artifact_store() -> ArtifactStore:
    global _artifact_store
    if _artifact_store is None:
        _artifact_store = ArtifactStore()
    return _artifact_store


# ── Request models ──────────────────────────────────────


class InterpretationRequest(BaseModel):
    text: str
    themes: list[str] = Field(default_factory=list)
    characters: list[str] = Field(default_factory=list)


class ArtifactRequest(BaseModel):
    title: str
    description: str
    category: str
    source: str
    connection_to_book: str
    related_themes: list[str] = Field(default_factory=list)
    related_characters: list[str] = Field(default_factory=list)
    location: str = ""
    url: str = ""


# ── Интерпретации ──────────────────────────────────────


@router.get("/interpretations")
async def list_interpretations(
    status: str | None = None,
    sort: str = Query("newest", regex="^(newest|oldest|popular)$"),
    limit: int = Query(50, ge=1, le=200),
):
    """Получить список интерпретаций."""
    store = _get_interp_store()
    items = await store.get_all(status=status)

    # Сортировка
    if sort == "newest":
        items.sort(key=lambda i: i.created_at, reverse=True)
    elif sort == "oldest":
        items.sort(key=lambda i: i.created_at)
    elif sort == "popular":
        items.sort(key=lambda i: i.likes, reverse=True)

    return {
        "interpretations": [i.to_dict() for i in items[:limit]],
        "count": len(items),
    }


@router.get("/interpretations/mine")
async def my_interpretations(user: dict = Depends(require_role("reader"))):
    """Мои интерпретации."""
    store = _get_interp_store()
    items = await store.get_by_reader(user["user_id"])
    items.sort(key=lambda i: i.created_at, reverse=True)
    return {"interpretations": [i.to_dict() for i in items]}


@router.post("/interpretations")
async def submit_interpretation(
    request: InterpretationRequest,
    user: dict = Depends(require_role("reader")),
):
    """Отправить интерпретацию на модерацию."""
    store = _get_interp_store()
    interp = await store.submit(
        reader_id=user["user_id"],
        reader_name=user.get("display_name") or user.get("username", ""),
        text=request.text,
        themes=request.themes,
        characters=request.characters,
    )
    return {"ok": True, "interpretation": interp.to_dict()}


@router.post("/interpretations/{interp_id}/like")
async def like_interpretation(interp_id: str):
    """Поставить лайк интерпретации."""
    store = _get_interp_store()
    ok = await store.like(interp_id)
    if not ok:
        raise HTTPException(404, "Интерпретация не найдена")
    return {"ok": True}


@router.post("/interpretations/{interp_id}/approve")
async def approve_interpretation(interp_id: str, user: dict = Depends(require_role("admin"))):
    """Одобрить интерпретацию (admin)."""
    store = _get_interp_store()
    ok = await store.approve(interp_id)
    if not ok:
        raise HTTPException(404, "Интерпретация не найдена")
    return {"ok": True}


@router.post("/interpretations/{interp_id}/reject")
async def reject_interpretation(interp_id: str, user: dict = Depends(require_role("admin"))):
    """Отклонить интерпретацию (admin)."""
    store = _get_interp_store()
    ok = await store.reject(interp_id)
    if not ok:
        raise HTTPException(404, "Интерпретация не найдена")
    return {"ok": True}


@router.delete("/interpretations/{interp_id}")
async def delete_interpretation(interp_id: str, user: dict = Depends(require_role("admin"))):
    """Удалить интерпретацию (admin)."""
    store = _get_interp_store()
    ok = await store.delete(interp_id)
    if not ok:
        raise HTTPException(404, "Интерпретация не найдена")
    return {"ok": True}


@router.get("/interpretations/stats")
async def interpretation_stats():
    """Статистика интерпретаций."""
    store = _get_interp_store()
    return store.get_stats()


# ── Артефакты ──────────────────────────────────────────


@router.get("/artifacts")
async def list_artifacts(
    status: str | None = None,
    category: str | None = None,
    sort: str = Query("newest", regex="^(newest|oldest|popular)$"),
    limit: int = Query(50, ge=1, le=200),
):
    """Получить список артефактов."""
    store = _get_artifact_store()
    items = await store.get_all(status=status, category=category)

    # Сортировка
    if sort == "newest":
        items.sort(key=lambda a: a.created_at, reverse=True)
    elif sort == "oldest":
        items.sort(key=lambda a: a.created_at)
    elif sort == "popular":
        items.sort(key=lambda a: a.likes, reverse=True)

    return {
        "artifacts": [a.to_dict() for a in items[:limit]],
        "count": len(items),
    }


@router.get("/artifacts/mine")
async def my_artifacts(user: dict = Depends(require_role("reader"))):
    """Мои артефакты."""
    store = _get_artifact_store()
    items = await store.get_by_reader(user["user_id"])
    items.sort(key=lambda a: a.created_at, reverse=True)
    return {"artifacts": [a.to_dict() for a in items]}


@router.post("/artifacts")
async def submit_artifact(
    request: ArtifactRequest,
    user: dict = Depends(require_role("reader")),
):
    """Отправить артефакт на модерацию."""
    store = _get_artifact_store()
    artifact = await store.submit(
        reader_id=user["user_id"],
        reader_name=user.get("display_name") or user.get("username", ""),
        title=request.title,
        description=request.description,
        category=request.category,
        source=request.source,
        connection_to_book=request.connection_to_book,
        related_themes=request.related_themes,
        related_characters=request.related_characters,
        location=request.location,
        url=request.url,
    )
    return {"ok": True, "artifact": artifact.to_dict()}


@router.post("/artifacts/{artifact_id}/like")
async def like_artifact(artifact_id: str):
    """Поставить лайк артефакту."""
    store = _get_artifact_store()
    ok = await store.like(artifact_id)
    if not ok:
        raise HTTPException(404, "Артефакт не найден")
    return {"ok": True}


@router.post("/artifacts/{artifact_id}/approve")
async def approve_artifact(artifact_id: str, user: dict = Depends(require_role("admin"))):
    """Одобрить артефакт (admin)."""
    store = _get_artifact_store()
    ok = await store.approve(artifact_id)
    if not ok:
        raise HTTPException(404, "Артефакт не найден")
    return {"ok": True}


@router.post("/artifacts/{artifact_id}/reject")
async def reject_artifact(artifact_id: str, user: dict = Depends(require_role("admin"))):
    """Отклонить артефакт (admin)."""
    store = _get_artifact_store()
    ok = await store.reject(artifact_id)
    if not ok:
        raise HTTPException(404, "Артефакт не найден")
    return {"ok": True}


@router.delete("/artifacts/{artifact_id}")
async def delete_artifact(artifact_id: str, user: dict = Depends(require_role("admin"))):
    """Удалить артефакт (admin)."""
    store = _get_artifact_store()
    ok = await store.delete(artifact_id)
    if not ok:
        raise HTTPException(404, "Артефакт не найден")
    return {"ok": True}


@router.get("/artifacts/stats")
async def artifact_stats():
    """Статистика артефактов."""
    store = _get_artifact_store()
    return store.get_stats()


# ── Knowledge Expansion ──────────────────────────────────────


@router.post("/knowledge/refresh")
async def refresh_knowledge(user: dict = Depends(require_role("admin"))):
    """Принудительное обогащение знаний."""
    from knowledge_expansion.pipeline import create_default_pipeline
    pipeline = create_default_pipeline()
    results = await pipeline.run_all()
    return {
        "ok": True,
        "results": {k: {"saved": v.items_saved, "skipped": v.items_skipped} for k, v in results.items()},
    }


@router.get("/knowledge/status")
async def knowledge_status():
    """Статус пайплайна знаний."""
    from knowledge_expansion.pipeline import create_default_pipeline
    pipeline = create_default_pipeline()
    return pipeline.get_status()


# ── Map & Timeline ──────────────────────────────────────


@router.get("/map-data")
async def get_map_data():
    """Получить данные для интерактивной карты."""
    map_file = Path("core/KNOWLEDGE/MAP_DATA.json")
    if map_file.exists():
        data = json.loads(map_file.read_text(encoding="utf-8"))
        return data
    return {"regions": [], "routes": [], "energy_lines": []}


@router.get("/timeline")
async def get_timeline():
    """Получить хронологию событий книги."""
    timeline = [
        {"year": "~7000 до н.э.", "title": "Гиперборея (расцвет)", "type": "civilization"},
        {"year": "~5000 до н.э.", "title": "Строительство городов", "type": "city"},
        {"year": "~4000 до н.э.", "title": "Аркаим", "type": "city"},
        {"year": "~3000 до н.э.", "title": "Гардарика", "type": "city"},
        {"year": "~2000 до н.э.", "title": "Миграция на юг", "type": "migration"},
        {"year": "~1000 до н.э.", "title": "Кали Юга", "type": "event"},
        {"year": "Настоящее", "title": "Аркаим открыт", "type": "event"},
    ]
    return {"events": timeline}
