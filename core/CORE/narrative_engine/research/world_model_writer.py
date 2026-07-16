"""World Model Writer — применение находок к World Model."""

import logging
from typing import Optional
from datetime import datetime, timezone

from narrative_engine.world_model import WorldModel
from narrative_engine.research.cross_referencer import ResearchFinding

log = logging.getLogger("hermes.narrative.world_model_writer")


def apply_finding_to_world_model(finding: ResearchFinding,
                                  world_model: WorldModel) -> bool:
    """Применить находку к World Model."""
    if not finding.suggested_fact:
        return False

    fact = finding.suggested_fact
    entity_type = fact.get("entity_type", "")
    entity_name = fact.get("entity_name", "")
    description = fact.get("description", "")

    if entity_type == "location":
        # Добавляем локацию, если её нет
        loc_id = entity_name.lower().replace(" ", "_")
        existing = world_model.get_location(loc_id)
        if not existing:
            world_model._locations.append(
                world_model._locations[0].__class__(
                    id=loc_id,
                    name=entity_name,
                    name_ru=entity_name,
                    type="other",
                    description=description,
                    epochs_present=[],
                    source_level=finding.source_level,
                    provenance=[],
                )
            )
            log.info("location_added id=%s", loc_id)

    elif entity_type == "character":
        # Добавляем персонажа в characters_living, если эпоха определена
        pass  # Requires epoch context

    elif entity_type == "technology":
        tech_id = entity_name.lower().replace(" ", "_")
        existing_techs = {t.id for t in world_model._technologies}
        if tech_id not in existing_techs:
            from narrative_engine.world_model import Technology
            world_model._technologies.append(Technology(
                id=tech_id,
                name=entity_name,
                name_ru=entity_name,
                description=description,
                source_level=finding.source_level,
            ))
            log.info("technology_added id=%s", tech_id)

    elif entity_type == "concept":
        # Концепции добавляются как правила или описания
        pass

    return True


def apply_findings(findings: list[ResearchFinding],
                   world_model: WorldModel) -> dict:
    """Применить список находок к World Model."""
    applied = 0
    failed = 0
    for finding in findings:
        try:
            if apply_finding_to_world_model(finding, world_model):
                applied += 1
            else:
                failed += 1
        except Exception as e:
            log.error("apply_finding_error finding=%s error=%s", finding.id, e)
            failed += 1

    # Сохраняем обновлённую модель
    if applied > 0:
        world_model.save()
        world_model.reload()

    return {"applied": applied, "failed": failed, "total": len(findings)}
