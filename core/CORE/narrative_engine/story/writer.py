"""Writer — формирование brief для LLM и генерация текста."""

import logging
from typing import Optional

from narrative_engine.constraint_engine import ConstraintModel

log = logging.getLogger("hermes.narrative.writer")


def build_writer_brief(constraints: ConstraintModel) -> dict:
    """Построить brief для LLM-писателя."""
    req = constraints.story_request
    ctx = constraints.resolved_context

    # Системная инструкция
    system_parts = [
        "Ты — писатель, создающий историю в мире книги «Наследие Аркаима».",
        "Ты НЕ создаёшь мир — ты пишешь ВНУТРИ него.",
        "Следуй всем ограничениям строго.",
        "",
        "ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА:",
    ]
    for i, rule in enumerate(constraints.hard_constraints, 1):
        system_parts.append(f"{i}. {rule}")
    if constraints.forbidden_elements:
        system_parts.append("")
        system_parts.append("ЗАПРЕЩЕНО:")
        for f in constraints.forbidden_elements:
            system_parts.append(f"- {f}")
    if constraints.soft_constraints:
        system_parts.append("")
        system_parts.append("СТИЛЬ:")
        for s in constraints.soft_constraints:
            system_parts.append(f"- {s}")

    # Контекст мира
    world_parts = []
    if ctx.epoch:
        world_parts.append(f"ЭПОХА: {ctx.epoch['name_ru']}")
        world_parts.append(f"  Описание: {ctx.epoch.get('description', '')}")
    if ctx.location:
        world_parts.append(f"ЛОКАЦИЯ: {ctx.location['name_ru']}")
        world_parts.append(f"  Описание: {ctx.location.get('description', '')}")
    if ctx.characters_alive:
        world_parts.append("ПЕРСОНАЖИ В ЭТОЙ ЭПОХЕ:")
        for ch in ctx.characters_alive[:8]:
            world_parts.append(f"  - {ch['character_name']} ({ch['status']})")
    if ctx.technologies_available:
        world_parts.append("ТЕХНОЛОГИИ:")
        for tech in ctx.technologies_available[:5]:
            world_parts.append(f"  - {tech['name_ru']}")
    if ctx.nearby_events_before:
        world_parts.append("ПРОШЛЫЕ СОБЫТИЯ:")
        for ev in ctx.nearby_events_before[:5]:
            world_parts.append(f"  - {ev['title_ru']}")

    return {
        "system_instruction": "\n".join(system_parts),
        "world_context": "\n".join(world_parts) if world_parts else "Контекст мира не определён.",
        "hard_constraints": constraints.hard_constraints,
        "soft_constraints": constraints.soft_constraints,
        "user_prompt": req.prompt,
        "style_guide": f"Стиль: {req.style}. Максимум слов: {req.max_length}.",
    }


def format_story_prompt(brief: dict) -> str:
    """Сформировать полный промпт для LLM."""
    parts = [
        brief["system_instruction"],
        "",
        "КОНТЕКСТ МИРА:",
        brief["world_context"],
        "",
        brief["style_guide"],
        "",
        "ЗАДАНИЕ:",
        brief["user_prompt"],
        "",
        "Напиши историю, строго следуя всем ограничениям.",
        "Не нарушай канон мира. Не придумывай то, чего нет в контексте.",
    ]
    return "\n".join(parts)
