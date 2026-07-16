"""World Engine API Routes — /book/world-engine/*."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.rbac import require_role
from narrative_engine.world_model import WorldModel
from narrative_engine.constraint_engine import StoryRequest, build_constraints

log = logging.getLogger("hermes.narrative.world_engine_api")

router = APIRouter(prefix="/world-engine", tags=["World Engine"])


def _get_world_model() -> WorldModel:
    from narrative_engine.world_model import WorldModel as WM
    return WM.load()


@router.get("/model", summary="Полная модель мира")
async def get_model():
    wm = _get_world_model()
    return {"ok": True, "data": wm.data, "summary": wm.summary()}


@router.get("/epochs", summary="Список эпох")
async def get_epochs():
    wm = _get_world_model()
    return {"ok": True, "data": [e.model_dump() for e in wm.get_epochs()]}


@router.get("/epochs/{epoch_id}", summary="Детали эпохи")
async def get_epoch(epoch_id: str):
    wm = _get_world_model()
    epoch = wm.get_epoch(epoch_id)
    if not epoch:
        raise HTTPException(404, "Epoch not found")
    return {"ok": True, "data": epoch.model_dump()}


@router.get("/locations", summary="Локации")
async def get_locations(epoch_id: Optional[str] = None):
    wm = _get_world_model()
    locs = wm.get_locations(epoch_id)
    return {"ok": True, "data": [l.model_dump() for l in locs]}


@router.get("/locations/{location_id}", summary="Детали локации")
async def get_location(location_id: str):
    wm = _get_world_model()
    loc = wm.get_location(location_id)
    if not loc:
        raise HTTPException(404, "Location not found")
    return {"ok": True, "data": loc.model_dump()}


@router.get("/characters/{epoch_id}", summary="Персонажи эпохи")
async def get_characters(epoch_id: str):
    wm = _get_world_model()
    chars = wm.get_characters_alive(epoch_id)
    return {"ok": True, "data": [c.model_dump() for c in chars]}


@router.get("/events", summary="Канонические события")
async def get_events(epoch_id: Optional[str] = None):
    wm = _get_world_model()
    events = wm.get_events(epoch_id)
    return {"ok": True, "data": [e.model_dump() for e in events]}


@router.get("/constraints", summary="Причинно-следственные правила")
async def get_constraints():
    wm = _get_world_model()
    rules = wm.get_rules()
    return {"ok": True, "data": [r.model_dump() for r in rules]}


@router.post("/constraints/validate", summary="Валидация сценария")
async def validate_scenario(request: StoryRequest):
    wm = _get_world_model()
    constraints = build_constraints(request, wm)
    return {"ok": True, "data": constraints.model_dump()}


@router.post("/seed", summary="Заполнение World Model из genome",
             dependencies=[Depends(require_role("editor"))])
async def seed_model():
    from narrative_engine.world_model_data import seed_world_model
    from pathlib import Path
    data = seed_world_model()
    wm_path = Path("core/CORE/narrative_engine/data/WORLD_MODEL.json")
    wm_path.parent.mkdir(parents=True, exist_ok=True)
    import json
    wm_path.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    wm = WorldModel(data)
    return {"ok": True, "summary": wm.summary()}
