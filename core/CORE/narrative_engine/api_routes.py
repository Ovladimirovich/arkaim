"""World Explorer API Routes — /book/world-explorer/*.

Полный pipeline исследования мира:
  Request → Hypothesis → Scenario → Impact → Contradictions → Delta → Quality → Response
"""

import json
import logging
import time
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from narrative_engine.world_model import WorldModel
from narrative_engine.world_explorer import (
    WorldExplorer,
    ExplorationRequest,
    ExplorationResult,
)
from narrative_engine.hypothesis_generator import Hypothesis, HypothesisGraph
from narrative_engine.compatibility_checker import CompatibilityReport
from narrative_engine.constraint_engine import StoryRequest
from narrative_engine.exploration_ws import exploration_notifier

log = logging.getLogger("hermes.narrative.world_explorer_api")

router = APIRouter(prefix="/world-explorer", tags=["World Explorer"])


def _get_world_model() -> WorldModel:
    from narrative_engine.world_model import WorldModel as WM
    return WM.load()


# ── Эндпоинты ────────────────────────────────────────────


@router.post("/explore", summary="Исследование мира (полный pipeline)")
async def explore(request: ExplorationRequest):
    """Исследовать альтернативные развития для идеи.

    Pipeline:
    1. Проверка совместимости (6 осей)
    2. Генерация гипотез
    3. Моделирование сценариев (2-5 ветвей)
    4. Оценка влияния на мир
    5. Обнаружение противоречий
    6. Расчёт изменений мира
    7. Оценка качества (5 критериев)
    8. Ранжирование альтернатив
    """
    wm = _get_world_model()
    explorer = WorldExplorer(wm)

    try:
        result = explorer.explore(request, ws_notifier=exploration_notifier)
        return {
            "ok": True,
            "data": _serialize_result(result),
            "summary": result.summary,
        }
    except Exception as e:
        log.error("exploration_error error=%s", e)
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(exploration_notifier.notify_error(str(e)))
        except Exception:
            pass
        raise HTTPException(500, detail=str(e))


@router.post("/explore/hypothesis", summary="Исследование от гипотезы")
async def explore_from_hypothesis(
    hypothesis_id: str,
    epoch: str = "satya_yuga",
    branch_count: int = 3,
):
    """Исследовать от конкретной гипотезы."""
    wm = _get_world_model()
    explorer = WorldExplorer(wm)

    # Получаем гипотезы
    hypotheses = explorer.get_hypotheses(epoch, limit=10)
    hypothesis = None
    for h in hypotheses:
        if h.id == hypothesis_id:
            hypothesis = h
            break

    if not hypothesis:
        raise HTTPException(404, detail=f"Гипотеза '{hypothesis_id}' не найдена")

    try:
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(exploration_notifier.notify_started(
                    f"hyp_{hypothesis_id}", hypothesis.title, epoch, branch_count
                ))
        except Exception:
            pass

        result = explorer.explore_from_hypothesis(hypothesis, branch_count=branch_count)

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(exploration_notifier.notify_complete(
                    result.summary, len(result.ranked_branches),
                    result.ranked_branches[0].quality_report.overall_score if result.ranked_branches else 0.0,
                    result.duration_ms,
                ))
        except Exception:
            pass

        return {
            "ok": True,
            "data": _serialize_result(result),
            "summary": result.summary,
        }
    except Exception as e:
        log.error("exploration_error error=%s", e)
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.ensure_future(exploration_notifier.notify_error(str(e)))
        except Exception:
            pass
        raise HTTPException(500, detail=str(e))


@router.get("/hypotheses/{epoch_id}", summary="Гипотезы для эпохи")
async def get_hypotheses(epoch_id: str, limit: int = 10):
    """Получить гипотезы для конкретной эпохи."""
    wm = _get_world_model()
    explorer = WorldExplorer(wm)

    hypotheses = explorer.get_hypotheses(epoch_id, limit=limit)
    return {
        "ok": True,
        "data": [_serialize_hypothesis(h) for h in hypotheses],
        "count": len(hypotheses),
    }


@router.get("/possibilities/{epoch_id}", summary="Возможности эпохи")
async def get_possibilities(epoch_id: str, limit: int = 10):
    """Получить возможности для конкретной эпохи."""
    wm = _get_world_model()
    explorer = WorldExplorer(wm)

    possibilities = explorer.get_possibilities(epoch_id, limit=limit)
    return {
        "ok": True,
        "data": [p.model_dump() for p in possibilities],
        "count": len(possibilities),
    }


@router.post("/validate", summary="Проверка совместимости идеи")
async def validate_idea(request: StoryRequest):
    """Проверить идею на совместимость с каноном (6 осей)."""
    wm = _get_world_model()
    from narrative_engine.compatibility_checker import CompatibilityChecker

    checker = CompatibilityChecker(wm)
    report = checker.check(request)

    return {
        "ok": True,
        "data": _serialize_compatibility(report),
        "overall_score": report.overall_score,
        "is_compatible": report.is_compatible,
        "risk_level": report.risk_level,
    }


@router.get("/epochs", summary="Список эпох для исследования")
async def get_epochs():
    """Получить список всех эпох, доступных для исследования."""
    wm = _get_world_model()
    epochs = wm.get_epochs()
    return {
        "ok": True,
        "data": [
            {
                "id": e.id,
                "name": e.name,
                "name_ru": e.name_ru,
                "order": e.order,
            }
            for e in epochs
        ],
    }


@router.get("/stats", summary="Статистика World Explorer")
async def get_stats():
    """Получить статистику системы."""
    wm = _get_world_model()
    from narrative_engine.planners.cause_effect import PATTERN_CHAINS

    return {
        "ok": True,
        "data": {
            "world_model": wm.summary(),
            "patterns_count": len(PATTERN_CHAINS),
            "epochs_count": len(wm.get_epochs()),
            "locations_count": len(wm.get_locations()),
            "events_count": len(wm.get_events()),
        },
    }


# ── История исследований ──────────────────────────────────


@router.get("/history", summary="История исследований")
async def get_history(limit: int = 50, offset: int = 0):
    """Получить список прошлых исследований (для текущего пользователя)."""
    try:
        from core.memory.exploration_store import get_exploration_store
        store = get_exploration_store()
        items = await store.list_by_user(user_id="dev", limit=limit, offset=offset)
        return {"ok": True, "data": items, "count": len(items)}
    except Exception as e:
        log.warning("history_load_error error=%s", e)
        return {"ok": True, "data": [], "count": 0}


@router.get("/history/{exploration_id}", summary="Детали исследования")
async def get_history_item(exploration_id: int):
    """Получить полные данные конкретного исследования."""
    try:
        from core.memory.exploration_store import get_exploration_store
        store = get_exploration_store()
        item = await store.get(exploration_id)
        if not item:
            raise HTTPException(404, detail="Исследование не найдено")
        # Парсим result_json обратно в dict
        if "result_json" in item and isinstance(item["result_json"], str):
            try:
                item["result"] = json.loads(item["result_json"])
            except Exception:
                item["result"] = None
            del item["result_json"]
        return {"ok": True, "data": item}
    except HTTPException:
        raise
    except Exception as e:
        log.error("history_item_error error=%s", e)
        raise HTTPException(500, detail=str(e))


@router.delete("/history/{exploration_id}", summary="Удалить исследование")
async def delete_history_item(exploration_id: int):
    """Удалить исследование из истории."""
    try:
        from core.memory.exploration_store import get_exploration_store
        store = get_exploration_store()
        deleted = await store.delete(exploration_id, user_id="dev")
        if not deleted:
            raise HTTPException(404, detail="Исследование не найдено")
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        log.error("history_delete_error error=%s", e)
        raise HTTPException(500, detail=str(e))


class SaveExplorationRequest(BaseModel):
    prompt: str
    epoch: Optional[str] = None
    branch_count: int = 3
    hypothesis_id: Optional[str] = None
    hypothesis_title: Optional[str] = None
    result_json: str
    summary: str = ""
    overall_score: float = 0.0
    branch_count_actual: int = 0
    duration_ms: float = 0.0


@router.post("/history", summary="Сохранить исследование")
async def save_history(request: SaveExplorationRequest):
    """Сохранить результат исследования в историю."""
    try:
        from core.memory.exploration_store import get_exploration_store
        store = get_exploration_store()
        item_id = await store.save(
            user_id="dev",
            prompt=request.prompt,
            epoch=request.epoch,
            branch_count=request.branch_count,
            hypothesis_id=request.hypothesis_id,
            hypothesis_title=request.hypothesis_title,
            result_json=request.result_json,
            summary=request.summary,
            overall_score=request.overall_score,
            branch_count_actual=request.branch_count_actual,
            duration_ms=request.duration_ms,
        )
        return {"ok": True, "id": item_id}
    except Exception as e:
        log.error("history_save_error error=%s", e)
        raise HTTPException(500, detail=str(e))


# ── Сериализация ──────────────────────────────────────────


def _serialize_result(result: ExplorationResult) -> dict:
    """Сериализовать результат исследования."""
    return {
        "request": result.request.model_dump(),
        "hypothesis": _serialize_hypothesis(result.hypothesis) if result.hypothesis else None,
        "scenario": {
            "branch_count": result.scenario.branch_count if result.scenario else 0,
            "best_branch_id": result.scenario.best_branch_id if result.scenario else "",
            "summary": result.scenario.summary if result.scenario else "",
        },
        "ranked_branches": [
            {
                "rank": rb.rank,
                "branch_type": rb.branch.branch_type,
                "title": rb.branch.title_ru,
                "quality_score": rb.quality_report.overall_score,
                "quality_summary": rb.quality_report.summary,
                "strengths": rb.quality_report.strengths,
                "weaknesses": rb.quality_report.weaknesses,
                "impact_score": rb.impact_report.overall_impact_score if rb.impact_report else 0.0,
                "contradictions": rb.contradiction_report.hard_count if rb.contradiction_report else 0,
                "delta_changes": rb.world_delta.total_changes if rb.world_delta else 0,
            }
            for rb in result.ranked_branches
        ],
        "duration_ms": result.duration_ms,
        "summary": result.summary,
    }


def _serialize_hypothesis(h: Hypothesis) -> dict:
    """Сериализовать гипотезу."""
    return {
        "id": h.id,
        "title": h.title_ru,
        "description": h.description,
        "type": h.hypothesis_type.value if hasattr(h.hypothesis_type, 'value') else str(h.hypothesis_type),
        "epoch": h.epoch,
        "confidence": h.confidence,
        "tags": h.tags,
    }


def _serialize_compatibility(report: CompatibilityReport) -> dict:
    """Сериализовать отчёт о совместимости."""
    return {
        "overall_score": report.overall_score,
        "is_compatible": report.is_compatible,
        "risk_level": report.risk_level,
        "axis_scores": [
            {
                "axis": ax.axis,
                "score": ax.score,
                "violations_count": len(ax.violations),
                "warnings_count": len(ax.warnings),
            }
            for ax in report.axis_scores
        ],
        "violations_count": len(report.violations),
        "warnings_count": len(report.warnings),
        "recommendations": report.recommendations,
    }
