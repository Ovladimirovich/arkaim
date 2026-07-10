"""Visual Genome — эндпоинты визуализации (/book/visual-*)."""
import hashlib
import base64
import logging

from fastapi import APIRouter, HTTPException, Depends

from auth.rbac import require_role
from core.dto.requests import (
    VisualSceneRequest, VisualCharacterRequest, VisualLocationRequest,
    VisualFromSpeechRequest, VisualizeRequest,
)
from core.dto.responses import VisualizeResponse, SuccessResponse
from core.adc_deps import (
    get_config, get_voice,
    get_reader_memory, get_scene_engine, get_prompt_builder, get_image_provider,
)
from core.routes.book import _load_genome_full, _save_genome

log = logging.getLogger("hermes.routes.visual")

router = APIRouter(tags=["Visual Genome"])


@router.post("/visualize", response_model=VisualizeResponse, summary="Визуализация сцены", dependencies=[Depends(require_role("reader"))])
async def visualize_scene(
    req: VisualizeRequest,
    reader_memory=Depends(get_reader_memory),
    scene_engine=Depends(get_scene_engine),
    prompt_builder=Depends(get_prompt_builder),
    image_provider=Depends(get_image_provider),
):
    scene = scene_engine.get_scene(req.chapter, req.scene_id)
    if not scene:
        raise HTTPException(404, "Scene not found")

    char_visuals = {}
    for char_id in scene.get("characters", []):
        cv = scene_engine.get_character_visual(char_id)
        if cv:
            char_visuals[char_id] = cv

    location = scene_engine.get_location_visual(scene.get("location", ""))
    if not location:
        location = {"type": "unknown", "atmosphere": "", "architecture": "", "lighting": ""}

    prompt = prompt_builder.build_scene_prompt(scene, char_visuals, location)
    image_bytes = await image_provider.generate(prompt)

    visual_spec_hash = hashlib.sha256(prompt.encode()).hexdigest()[:16]
    image_hash = hashlib.sha256(image_bytes).hexdigest()[:16]

    if req.reader_id:
        await reader_memory.save_visual_memory(
            reader_id=req.reader_id,
            scene_id=req.scene_id,
            image_hash=image_hash,
            visual_spec_hash=visual_spec_hash,
        )

    return VisualizeResponse(
        prompt=prompt,
        image_bytes=base64.b64encode(image_bytes).decode("utf-8"),
        content_type="image/svg+xml",
    )


@router.post("/visual-genome/scene", response_model=SuccessResponse, dependencies=[Depends(require_role("editor"))])
async def save_visual_scene(req: VisualSceneRequest, config=Depends(get_config)):
    genome = _load_genome_full(config)
    modules = genome.setdefault("modules", {})
    scenes = modules.setdefault("scenes", [])
    scene_id = f"ui_scene_{len(scenes) + 1:03d}"
    scene = {
        "chapter": req.chapter,
        "scene_id": scene_id,
        "title": req.title,
        "characters": req.characters,
        "location": req.location,
        "emotion": req.emotion,
        "meaning_tags": req.meaning_tags,
        "color_palette": req.color_palette or None,
        "source": "ui_form",
    }
    scenes.append(scene)
    _save_genome(genome, config)
    return SuccessResponse(data={"scene_id": scene_id, "scene": scene})


@router.post("/visual-genome/character", response_model=SuccessResponse, dependencies=[Depends(require_role("editor"))])
async def save_visual_character(req: VisualCharacterRequest, config=Depends(get_config)):
    genome = _load_genome_full(config)
    modules = genome.setdefault("modules", {})
    visuals = modules.setdefault("character_visuals", [])
    palette = [v for v in req.color_palette if v] if req.color_palette else ["earth tones"]
    visual = {
        "character_id": req.character_id,
        "name": req.name,
        "archetype": req.archetype,
        "color_palette": palette,
        "visual_description": req.visual_description,
        "source": "ui_form",
    }
    for i, v in enumerate(visuals):
        if v.get("character_id") == req.character_id:
            visuals[i] = visual
            break
    else:
        visuals.append(visual)
    _save_genome(genome, config)
    return SuccessResponse(data=visual)


@router.post("/visual-genome/location", response_model=SuccessResponse, dependencies=[Depends(require_role("editor"))])
async def save_visual_location(req: VisualLocationRequest, config=Depends(get_config)):
    genome = _load_genome_full(config)
    modules = genome.setdefault("modules", {})
    visuals = modules.setdefault("location_visuals", [])
    visual = {
        "location_id": req.location_id,
        "name": req.name,
        "atmosphere": req.atmosphere or "нейтральная",
        "architecture": req.architecture or "не описана",
        "lighting": req.lighting or "естественный",
    }
    for i, v in enumerate(visuals):
        if v.get("location_id") == req.location_id:
            visuals[i] = visual
            break
    else:
        visuals.append(visual)
    _save_genome(genome, config)
    return SuccessResponse(data=visual)


@router.post("/visual-genome/from-speech", response_model=SuccessResponse, dependencies=[Depends(require_role("editor"))])
async def visual_from_speech(req: VisualFromSpeechRequest, config=Depends(get_config), voice=Depends(get_voice)):
    """Голосовой ввод — LLM преобразует описание в Visual Genome."""
    if not hasattr(voice, "extract_visual_from_speech"):
        raise HTTPException(501, "Голосовой ввод не поддерживается")

    try:
        result = await voice.extract_visual_from_speech(req.text)
        if result:
            genome = _load_genome_full(config)
            modules = genome.setdefault("modules", {})
            if "scenes" in result:
                modules.setdefault("scenes", []).extend(result["scenes"])
            if "character_visuals" in result:
                modules.setdefault("character_visuals", []).extend(result["character_visuals"])
            if "location_visuals" in result:
                modules.setdefault("location_visuals", []).extend(result["location_visuals"])
            _save_genome(genome, config)
            scene = result.get("scenes", [None])[0] if result.get("scenes") else None
            return SuccessResponse(data=scene)
        raise HTTPException(422, "Не удалось распознать визуальные элементы")
    except HTTPException:
        raise
    except Exception as e:
        log.error("visual_from_speech_error: %s", e)
        raise HTTPException(500, "Ошибка обработки")


@router.post(
    "/visual-genome/from-image",
    response_model=SuccessResponse,
    dependencies=[Depends(require_role("editor"))],
    deprecated=True,
    summary="[Заглушка] VLM pipeline",
)
async def visual_from_image():
    """VLM pipeline — будет подключён в следующем обновлении."""
    return SuccessResponse(data={"message": "VLM-пайплайн будет подключён позже"})
