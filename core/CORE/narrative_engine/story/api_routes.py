"""Story Engine API Routes — /book/story-engine/*."""

import json
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from narrative_engine.world_model import WorldModel
from narrative_engine.constraint_engine import StoryRequest, build_constraints, parse_prompt
from narrative_engine.story.writer import build_writer_brief, format_story_prompt
from narrative_engine.story.post_validator import validate_story

log = logging.getLogger("hermes.narrative.story_api")

router = APIRouter(prefix="/story-engine", tags=["Story Engine"])

from narrative_engine.story import store


class GenerateRequest(BaseModel):
    prompt: str
    epoch: str | None = None
    location: str | None = None
    character_type: str | None = None
    max_length: int = 2000
    style: str = "literary"


@router.post("/parse", summary="Парсинг промпта")
async def parse(request: StoryRequest):
    parsed = parse_prompt(request.prompt)
    return {"ok": True, "data": parsed.model_dump()}


@router.post("/constraints", summary="Построение модели ограничений")
async def get_constraints(request: StoryRequest):
    wm = WorldModel.load()
    constraints = build_constraints(request, wm)
    return {"ok": True, "data": constraints.model_dump()}


@router.post("/generate", summary="Генерация истории (SSE streaming)")
async def generate(request: GenerateRequest):
    """Генерация истории с SSE streaming. Возвращает:
    - data: {"type": "constraints", "data": ...} — модель ограничений
    - data: {"type": "chunk", "text": "..."} — кусочки текста
    - data: {"type": "done", "id": "...", "validation": ..., "word_count": N}
    - data: [DONE]
    """
    # Парсим промпт
    parsed = parse_prompt(request.prompt)
    if request.epoch:
        parsed.epoch = request.epoch
    if request.location:
        parsed.location = request.location
    if request.character_type:
        parsed.character_type = request.character_type
    parsed.max_length = request.max_length
    parsed.style = request.style

    # Строим ограничения
    wm = WorldModel.load()
    constraints = build_constraints(parsed, wm)

    # Формируем brief
    brief = build_writer_brief(constraints)
    full_prompt = format_story_prompt(brief)

    # Story ID
    story_id = str(uuid.uuid4())[:8]

    async def event_stream() -> AsyncGenerator[str, None]:
        # 1. Отправляем ограничения
        yield f"data: {json.dumps({'type': 'constraints', 'data': constraints.model_dump()}, default=str)}\n\n"

        # 2. Генерируем текст через LLM (или заглушку)
        full_text = []
        try:
            async for chunk in _stream_generation(full_prompt, brief):
                full_text.append(chunk)
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
        except Exception as e:
            log.error("story_generation_error error=%s", e)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        # 3. Собираем полный текст и валидируем
        story_text = "".join(full_text)
        validation = validate_story(story_text, constraints, wm)

        # 4. Сохраняем в историю
        story_record = {
            "id": story_id,
            "text": story_text,
            "word_count": len(story_text.split()),
            "prompt": request.prompt,
            "constraints": constraints.model_dump(),
            "validation": validation.model_dump(),
            "generated_at": datetime.now(tz=timezone.utc).isoformat(),
        }
        store.save_story(story_record)

        # 5. Отправляем финальный результат
        yield f"data: {json.dumps({'type': 'done', 'id': story_id, 'validation': validation.model_dump(), 'word_count': story_record['word_count']}, default=str)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/history", summary="История сгенерированных историй")
async def get_history(limit: int = 20):
    return {"ok": True, "data": store.get_stories(limit)}


@router.get("/history/{story_id}", summary="Конкретная история")
async def get_story(story_id: str):
    story = store.get_story(story_id)
    if story:
        return {"ok": True, "data": story}
    raise HTTPException(404, "Story not found")


@router.post("/validate", summary="Валидация текста по ограничениям")
async def validate_text(text: str, request: StoryRequest):
    wm = WorldModel.load()
    constraints = build_constraints(request, wm)
    validation = validate_story(text, constraints, wm)
    return {"ok": True, "data": validation.model_dump()}


async def _stream_generation(prompt: str, brief: dict) -> AsyncGenerator[str, None]:
    """
    Генерация текста через LLM с streaming.
    Пытается использовать ProviderRegistry, при ошибке — заглушка.
    """
    try:
        from providers.registry import ProviderRegistry
        from providers.base import ChatMessage

        messages = [
            {"role": "system", "content": brief.get("system_instruction", "")},
            {"role": "user", "content": prompt},
        ]

        # Пробуем gigachat -> openrouter -> huggingface
        for provider_name in ["gigachat", "openrouter", "huggingface"]:
            try:
                provider = ProviderRegistry.get(provider_name)
                if not provider:
                    continue
                async for token in provider.stream(messages):
                    if token.startswith("data: "):
                        try:
                            chunk = json.loads(token[6:])
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                                await asyncio.sleep(0)  # yield control
                        except (json.JSONDecodeError, IndexError, KeyError):
                            pass
                    elif token.startswith("data: [DONE]"):
                        continue
                    elif token and not token.startswith("data:"):
                        yield token
                        await asyncio.sleep(0)
                return  # Success — exit loop
            except Exception as e:
                log.warning("story_provider_failed provider=%s error=%s", provider_name, e)
                continue

        # All providers failed — use stub
        async for chunk in _stream_stub(prompt, brief):
            yield chunk

    except ImportError:
        # ProviderRegistry not available — use stub
        async for chunk in _stream_stub(prompt, brief):
            yield chunk


async def _stream_stub(prompt: str, brief: dict) -> AsyncGenerator[str, None]:
    """Заглушка для генерации — имитирует streaming текста."""
    # Формируем stub на основе контекста из brief
    epoch_label = "Сатья Юга"
    loc_label = "Гиперборея"
    world_ctx = brief.get("world_context", "")
    if "ЭПОХА:" in world_ctx:
        epoch_label = world_ctx.split("ЭПОХА:")[1].split("\n")[0].strip()
    if "ЛОКАЦИЯ:" in world_ctx:
        loc_label = world_ctx.split("ЛОКАЦИЯ:")[1].split("\n")[0].strip()

    # Определяем тип персонажа из prompt
    char_label = "ученик"
    prompt_lower = prompt.lower()
    if "жрец" in prompt_lower:
        char_label = "жрец"
    elif "воин" in prompt_lower:
        char_label = "воин"
    elif "мудрец" in prompt_lower:
        char_label = "мудрец"
    elif "странник" in prompt_lower:
        char_label = "странник"
    elif "учитель" in prompt_lower:
        char_label = "учитель"
    elif "царь" in prompt_lower or "князь" in prompt_lower:
        char_label = "князь"

    stub_text = (
        f"В древней {loc_label}, в эпоху {epoch_label}, жил молодой {char_label}. "
        f"Каждое утро он поднимался на вершину холма, чтобы встретить рассвет. "
        f"Солнечные лучи касались его лица, и он чувствовал древнюю мудрость, "
        f"пронизывающую каждую травинку, каждый камень.\n\n"
        f"«Сегодня ты узнаешь нечто важное», — сказал ему Учитель. "
        f"«Мир помнит то, что люди забыли. И ты должен стать мостом между прошлым и будущим.»\n\n"
        f"{char_label.capitalize()} не понял слов, но почувствовал их глубину. "
        f"Он знал: путь познания — это не цель, а сам процесс движения."
    )

    # Simulate streaming — yield by paragraph
    paragraphs = stub_text.split("\n\n")
    for para in paragraphs:
        # Yield word by word for realistic streaming
        words = para.split()
        for i in range(0, len(words), 3):
            chunk = " ".join(words[i:i+3]) + " "
            yield chunk
            await asyncio.sleep(0.05)  # Simulate LLM latency
        yield "\n\n"
        await asyncio.sleep(0.1)



