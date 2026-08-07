"""Visual Genome — эндпоинты визуализации (/book/visual-*)."""
import hashlib
import base64
import logging

from fastapi import APIRouter, HTTPException, Depends, Query

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




@router.post("/visual-genome/auto-generate", response_model=SuccessResponse)
async def auto_generate_scenes(config=Depends(get_config), force: bool = Query(False)):
    """Auto-generate scenes from book meaning + conflict palettes.
    
    If force=true, removes old auto-generated scenes first.
    """
    from visualization.meaning_to_visual import generate_visuals_from_meaning
    from visualization.conflict_palettes import generate_all_conflict_scenes

    genome = _load_genome_full(config)
    modules = genome.setdefault("modules", {})

    # If force, remove old auto-generated scenes
    if force:
        scenes = modules.get("scenes", [])
        modules["scenes"] = [s for s in scenes if not s.get("scene_id", "").startswith("meaning_auto_")]

    # 1. Generate from meaning
    meaning_scenes, style_presets = generate_visuals_from_meaning(genome)

    # 2. Generate from conflicts
    conflict_scenes = generate_all_conflict_scenes(genome)

    all_scenes = meaning_scenes + conflict_scenes

    # Add to genome (skip existing)
    existing_ids = {s.get("scene_id") for s in modules.get("scenes", [])}
    new_scenes = [s for s in all_scenes if s.get("scene_id") not in existing_ids]
    modules.setdefault("scenes", []).extend(new_scenes)

    # Add style presets
    for sp in style_presets:
        modules.setdefault("style_presets", {})[sp["preset_id"]] = sp

    _save_genome(genome, config)

    return SuccessResponse(data={
        "created": len(new_scenes),
        "skipped": len(all_scenes) - len(new_scenes),
        "total": len(modules.get("scenes", [])),
        "scenes": new_scenes,
    })

@router.get("/comfyui/status", summary="ComfyUI connection status")
async def comfyui_status():
    """Check if ComfyUI is accessible."""
    from core.adc_deps import registry
    try:
        provider_chain = registry.get("image_provider")
        comfyui_provider = provider_chain.providers[0]
        healthy = await comfyui_provider.health()
        return {
            "status": "connected" if healthy else "disconnected",
            "url": comfyui_provider._base_url,
            "provider": "comfyui"
        }
    except Exception as e:
        return {"status": "error", "error": str(e), "provider": "comfyui"}



@router.get("/comfyui/config", summary="Get ComfyUI configuration")
async def comfyui_config():
    """Return current ComfyUI URL and provider info."""
    import os
    url = os.getenv("COMFYUI_URL", "http://127.0.0.1:8188")
    return {
        "url": url,
        "is_local": "127.0.0.1" in url or "localhost" in url,
    }


@router.post("/comfyui/config", summary="Update ComfyUI URL")
async def comfyui_config_update(body: dict):
    """Set a new ComfyUI URL at runtime (no restart needed) and persist to runtime/.env."""
    import os
    from pathlib import Path

    new_url = body.get("url", "").strip()
    if not new_url:
        from fastapi import HTTPException
        raise HTTPException(400, "URL is required")

    # Apply to current process immediately
    os.environ["COMFYUI_URL"] = new_url

    # Persist to runtime/.env so it survives a backend restart
    try:
        env_path = Path(os.getcwd()) / ".env"
        if not env_path.exists():
            env_path = Path(__file__).resolve().parents[1] / ".env"  # runtime/.env
        lines = []
        if env_path.exists():
            lines = env_path.read_text("utf-8").splitlines()
        key = "COMFYUI_URL"
        found = False
        for i, ln in enumerate(lines):
            if ln.strip().startswith(key + "="):
                lines[i] = f"{key}={new_url}"
                found = True
                break
        if not found:
            lines.append(f"{key}={new_url}")
        env_path.write_text("\n".join(lines) + "\n", "utf-8")
        log.info("comfyui_url_persisted url=%s", new_url)
    except Exception as e:
        log.warning("comfyui_url_persist_failed: %s", e)

    return {"ok": True, "url": new_url}


@router.get("/providers/list", summary="List available image providers")
async def list_providers():
    """Get list of available image providers with their names and kinds."""
    from core.adc_deps import registry
    
    try:
        provider_chain = registry.get("image_provider")
        providers_info = []
        
        for provider in provider_chain.providers:
            provider_name = provider_chain._provider_name(provider)
            provider_kind = provider_chain._provider_kind(provider)
            
            # Try to get additional info from provider if available
            info = {
                "name": provider_name,
                "kind": provider_kind,
            }
            
            # Add URL for ComfyUI if available
            if hasattr(provider, "_base_url"):
                info["url"] = provider._base_url
            
            providers_info.append(info)
        
        return {"providers": providers_info}
    except Exception as e:
        log.error("list_providers_error: %s", e)
        raise HTTPException(500, f"Ошибка получения списка провайдеров: {e}")


@router.get("/providers/status", summary="Get status of all image providers")
async def providers_status():
    """Get health status of all available image providers."""
    from core.adc_deps import registry
    
    try:
        provider_chain = registry.get("image_provider")
        providers_status = []
        
        for provider in provider_chain.providers:
            provider_name = provider_chain._provider_name(provider)
            provider_kind = provider_chain._provider_kind(provider)
            
            try:
                is_healthy = await provider.health()
                status = "healthy" if is_healthy else "unhealthy"
                error = None
            except Exception as e:
                status = "error"
                error = str(e)
            
            status_info = {
                "name": provider_name,
                "kind": provider_kind,
                "status": status,
            }
            
            if error:
                status_info["error"] = error
            
            if hasattr(provider, "_base_url"):
                status_info["url"] = provider._base_url
            
            providers_status.append(status_info)
        
        return {"providers": providers_status}
    except Exception as e:
        log.error("providers_status_error: %s", e)
        raise HTTPException(500, f"Ошибка получения статуса провайдеров: {e}")
