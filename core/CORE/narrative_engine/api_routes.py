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
        result = explorer.explore(request)
        return {
            "ok": True,
            "data": _serialize_result(result),
            "summary": result.summary,
        }
    except Exception as e:
        log.error("exploration_error error=%s", e)
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
        result = explorer.explore_from_hypothesis(hypothesis, branch_count=branch_count)
        return {
            "ok": True,
            "data": _serialize_result(result),
            "summary": result.summary,
        }
    except Exception as e:
        log.error("exploration_error error=%s", e)
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
