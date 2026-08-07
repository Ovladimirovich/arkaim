"""Visual Assets — эндпоинты генерации изображений и видео (/book/assets/*)."""
from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import FileResponse

from auth.rbac import require_role
from core.adc_deps import get_config, get_scene_engine, get_prompt_builder, get_image_provider
from core.dto.responses import SuccessResponse

log = logging.getLogger("routes.assets")

router = APIRouter(
    tags=["Visual Assets"],
    dependencies=[Depends(require_role("reader"))],
)


def _get_asset_store():
    from core.adc_deps import registry
    return registry.get("asset_store")


def _get_generation_pipeline():
    from core.adc_deps import registry
    return registry.get("generation_pipeline")


def _get_generation_queue():
    from core.adc_deps import registry
    return registry.get("generation_queue")


# ── Генерация ──────────────────────────────────────────

@router.post("/assets/generate", dependencies=[Depends(require_role("editor"))], summary="Генерация изображения или видео сцены")
async def generate_asset(
    chapter: int = Query(..., ge=1),
    scene_id: str = Query(..., min_length=1),
    asset_type: str = Query("image", pattern="^(image|video)$"),
    style: str = Query("cinematic_fantasy"),
    mood: str = Query("neutral"),
    provider: str = Query("auto"),
    reader_id: str | None = Query(None),
    size: str = Query("1024x1024"),
    negative_prompt: str = Query(""),
    quality: str = Query("standard", pattern="^(draft|standard|high|ultra)$"),
):
    """Генерировать изображение или видео для сцены."""
    try:
        from visual_assets.schemas import AssetType

        pipeline = _get_generation_pipeline()
        overrides = {
            "style": style,
            "mood": mood,
            "provider": provider,
            "reader_id": reader_id,
            "generation": {
                "size": size,
                "negative_prompt": [negative_prompt] if negative_prompt else [],
                "quality": quality,
            },
        }

        if asset_type == "image":
            asset = await pipeline.generate_image(chapter, scene_id, overrides)
        else:
            asset = await pipeline.generate_video(chapter, scene_id, overrides)

        return SuccessResponse(data=asset.model_dump(mode="json"))
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        log.error("generate_asset_error: %s", e)
        raise HTTPException(500, f"Ошибка генерации: {e}")


@router.post("/assets/generate-async", dependencies=[Depends(require_role("editor"))], summary="Асинхронная генерация (очередь)")
async def generate_asset_async(
    chapter: int = Query(..., ge=1),
    scene_id: str = Query(..., min_length=1),
    asset_type: str = Query("image", pattern="^(image|video)$"),
    style: str = Query("cinematic_fantasy"),
    mood: str = Query("neutral"),
    provider: str = Query("auto"),
    reader_id: str | None = Query(None),
    size: str = Query("1024x1024"),
    negative_prompt: str = Query(""),
    quality: str = Query("standard", pattern="^(draft|standard|high|ultra)$"),
):
    """Поставить генерацию в очередь (не блокирует запрос)."""
    try:
        from visual_assets.schemas import AssetType

        queue = _get_generation_queue()
        at = AssetType.IMAGE if asset_type == "image" else AssetType.VIDEO
        task_id = await queue.enqueue(
            chapter=chapter, scene_id=scene_id,
            asset_type=at, overrides={
                "style": style,
                "mood": mood,
                "provider": provider,
                "reader_id": reader_id,
                "generation": {
                    "size": size,
                    "negative_prompt": [negative_prompt] if negative_prompt else [],
                    "quality": quality,
                },
            },
        )
        return SuccessResponse(data={"task_id": task_id, "status": "queued"})
    except Exception as e:
        log.error("generate_async_error: %s", e)
        raise HTTPException(500, f"Ошибка: {e}")


@router.post("/assets/generate-context", dependencies=[Depends(require_role("editor"))], summary="Генерация из VisualContext (новый пайплайн)")
async def generate_from_context(
    chapter: int = Query(..., ge=1),
    scene_id: str = Query(..., min_length=1),
    time_of_day: str = Query("dawn"),
    generator: str = Query("comfyui"),
    size: str = Query("1024x576"),
    reader_id: str | None = Query(None),
):
    """Генерировать изображение из VisualContext (новый пайплайн).
    
    Собирает VisualContext из Genome + VISUAL_KNOWLEDGE, затем генерирует
    изображение через PromptComposer для выбранного генератора.
    """
    try:
        from core.adc_deps import registry
        
        pipeline = _get_generation_pipeline()
        visual_ctx_builder = registry.get("visual_context_builder")
        
        # 1. Build VisualContext
        ctx = await visual_ctx_builder.build(chapter, scene_id, time_of_day)
        
        # 2. Generate image from context
        asset = await pipeline.generate_image_from_context(
            ctx, generator=generator, size=size, reader_id=reader_id,
        )
        
        return SuccessResponse(data=asset.model_dump(mode="json"))
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        log.error("generate_from_context_error: %s", e)
        raise HTTPException(500, f"Ошибка генерации: {e}")


@router.post("/assets/generate-character", dependencies=[Depends(require_role("editor"))], summary="Генерация портрета персонажа")
async def generate_character(
    character_id: str = Query(..., min_length=1),
    time_of_day: str = Query("dawn"),
    generator: str = Query("comfyui"),
    size: str = Query("1024x1024"),
    reader_id: str | None = Query(None),
):
    """Генерировать изображение персонажа по character_id."""
    try:
        from core.adc_deps import registry

        pipeline = _get_generation_pipeline()
        visual_ctx_builder = registry.get("visual_context_builder")

        ctx = await visual_ctx_builder.build_for_character(character_id, time_of_day)
        asset = await pipeline.generate_image_from_context(
            ctx, generator=generator, size=size, reader_id=reader_id,
        )
        return SuccessResponse(data=asset.model_dump(mode="json"))
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        log.error("generate_character_error: %s", e)
        raise HTTPException(500, f"Ошибка генерации: {e}")


@router.post("/assets/generate-location", dependencies=[Depends(require_role("editor"))], summary="Генерация изображения локации")
async def generate_location(
    location_id: str = Query(..., min_length=1),
    time_of_day: str = Query("dawn"),
    generator: str = Query("comfyui"),
    size: str = Query("1024x1024"),
    reader_id: str | None = Query(None),
):
    """Генерировать изображение локации по location_id."""
    try:
        from core.adc_deps import registry

        pipeline = _get_generation_pipeline()
        visual_ctx_builder = registry.get("visual_context_builder")

        ctx = await visual_ctx_builder.build_for_location(location_id, time_of_day)
        asset = await pipeline.generate_image_from_context(
            ctx, generator=generator, size=size, reader_id=reader_id,
        )
        return SuccessResponse(data=asset.model_dump(mode="json"))
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        log.error("generate_location_error: %s", e)
        raise HTTPException(500, f"Ошибка генерации: {e}")


@router.post("/assets/batch", dependencies=[Depends(require_role("editor"))], summary="Пакетная генерация для главы")
async def batch_generate(
    chapter: int | None = Query(None, ge=1),
    asset_type: str = Query("image", pattern="^(image|video)$"),
    limit: int = Query(20, ge=1, le=50),
):
    """Пакетная генерация для всех сцен в главе."""
    try:
        from visual_assets.schemas import AssetType

        queue = _get_generation_queue()
        at = AssetType.IMAGE if asset_type == "image" else AssetType.VIDEO
        task_ids = await queue.enqueue_batch(chapter=chapter, asset_type=at, limit=limit)
        return SuccessResponse(data={"task_ids": task_ids, "count": len(task_ids)})
    except Exception as e:
        log.error("batch_generate_error: %s", e)
        raise HTTPException(500, f"Ошибка: {e}")


# ── Просмотр ──────────────────────────────────────────

@router.get("/assets", summary="Список ассетов")
async def list_assets(
    chapter: int | None = Query(None, ge=1),
    asset_type: str | None = Query(None, pattern="^(image|video)$"),
    status: str | None = Query(None, pattern="^(pending|generating|completed|failed)$"),
    scene_id: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Получить список сгенерированных ассетов."""
    try:
        from visual_assets.schemas import AssetType, AssetStatus

        store = _get_asset_store()
        at = AssetType(asset_type) if asset_type else None
        st = AssetStatus(status) if status else None
        assets = await store.list_assets(chapter=chapter, asset_type=at, status=st, scene_id=scene_id, limit=limit, offset=offset)
        return SuccessResponse(data=[a.model_dump(mode="json") for a in assets])
    except Exception as e:
        log.error("list_assets_error: %s", e)
        raise HTTPException(500, f"Ошибка: {e}")


@router.get("/assets/{asset_id}", summary="Метаданные ассета")
async def get_asset(asset_id: str):
    """Получить метаданные конкретного ассета."""
    store = _get_asset_store()
    asset = await store.get(asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")
    return SuccessResponse(data=asset.model_dump(mode="json"))


@router.get("/assets/{asset_id}/file", summary="Файл ассета")
async def get_asset_file(asset_id: str):
    """Скачать файл ассета (изображение или видео)."""
    store = _get_asset_store()
    asset = await store.get(asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")

    file_path = store.get_file_path(asset)
    if not file_path:
        raise HTTPException(404, "File not found")

    media_type = "image/png" if asset.asset_type.value == "image" else "video/mp4"
    return FileResponse(str(file_path), media_type=media_type)


@router.get("/assets/{asset_id}/thumbnail", summary="Thumbnail ассета")
async def get_asset_thumbnail(asset_id: str):
    """Получить thumbnail ассета."""
    store = _get_asset_store()
    asset = await store.get(asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")

    thumb_path = store.get_thumbnail_path(asset)
    if not thumb_path:
        raise HTTPException(404, "Thumbnail not found")

    return FileResponse(str(thumb_path), media_type="image/png")


# ── Управление ──────────────────────────────────────────

@router.delete("/assets/{asset_id}", dependencies=[Depends(require_role("admin"))], summary="Удалить ассет")
async def delete_asset(asset_id: str):
    """Удалить ассет и его файлы."""
    store = _get_asset_store()
    if not await store.delete(asset_id):
        raise HTTPException(404, "Asset not found")
    return SuccessResponse(data={"deleted": asset_id})


@router.post("/assets/delete-all", dependencies=[Depends(require_role("admin"))], summary="Удалить все ассеты (пакетное удаление)")
async def delete_all_assets(
    chapter: int | None = Query(None, ge=1),
    asset_type: str | None = Query(None, pattern="^(image|video)$"),
    status: str | None = Query(None, pattern="^(pending|generating|completed|failed)$"),
):
    """Удалить ассеты по фильтрам. Без фильтров — удалить все."""
    from visual_assets.schemas import AssetType, AssetStatus
    store = _get_asset_store()
    at = AssetType(asset_type) if asset_type else None
    st = AssetStatus(status) if status else None
    assets = await store.list_assets(chapter=chapter, asset_type=at, status=st, limit=10000)
    deleted = 0
    for asset in assets:
        await store.delete(asset.asset_id)
        deleted += 1
    return SuccessResponse(data={"deleted": deleted})


@router.post("/assets/{asset_id}/regenerate", dependencies=[Depends(require_role("editor"))], summary="Перегенерировать ассет")
async def regenerate_asset(
    asset_id: str,
    style: str = Query("cinematic_fantasy"),
    quality: str = Query("standard", pattern="^(draft|standard|high|ultra)$"),
):
    """Перегенерировать ассет с новыми параметрами."""
    store = _get_asset_store()
    asset = await store.get(asset_id)
    if not asset:
        raise HTTPException(404, "Asset not found")

    try:
        pipeline = _get_generation_pipeline()
        overrides = {"style": style, "provider": "auto", "reader_id": asset.reader_id,
                     "generation": {"quality": quality}}

        if asset.asset_type.value == "image":
            new_asset = await pipeline.generate_image(asset.chapter, asset.scene_id, overrides)
        else:
            new_asset = await pipeline.generate_video(asset.chapter, asset.scene_id, overrides)

        await store.delete(asset_id)
        return SuccessResponse(data=new_asset.model_dump(mode="json"))
    except Exception as e:
        log.error("regenerate_error: %s", e)
        raise HTTPException(500, f"Ошибка перегенерации: {e}")


# ── Очередь ──────────────────────────────────────────

@router.get("/assets/queue/status", summary="Статус очереди генерации")
async def queue_status():
    """Получить статус очереди генерации."""
    queue = _get_generation_queue()
    return SuccessResponse(data=queue.get_queue_stats())


@router.get("/assets/queue/task/{task_id}", summary="Статус задачи")
async def task_status(task_id: str):
    """Получить статус конкретной задачи в очереди."""
    queue = _get_generation_queue()
    return SuccessResponse(data=queue.get_status(task_id))

