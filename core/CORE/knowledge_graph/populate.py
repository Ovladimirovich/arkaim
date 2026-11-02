"""
Populate — заполнение Knowledge Graph из генома и BOOK OS хранилищ.
"""
import json
import uuid
from pathlib import Path
from typing import Callable, Optional

from book_os.entity_store import EntityStore
from book_os.relationship_store import RelationshipStore
from book_os.fact_store import FactStore
from schemas.entity import Entity
from schemas.relationship import Relationship
from schemas.fact import Fact

BASE = Path(__file__).resolve().parents[2]
GENOME_PATH = BASE / "GENOME" / "GENOME_v1.0.0.json"
OS_DATA_DIR = BASE / "OS_DATA"


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def populate_from_genome(
    entity_store: EntityStore,
    rel_store: RelationshipStore,
    fact_store: FactStore,
    genome_path: Optional[Path] = None,
):
    """Заполнить хранилища из генома.
    Сущности: персонажи, локации, концепции, символы.
    Связи: персонаж ↔ ценности, конфликты, символы.
    Факты: описания и атрибуты.

    R-3 (идемпотентность повторного запуска):
    Существующие сущности переиспользуются по устойчивому ключу
    (name, type) — точное совпадение, без нормализации регистра,
    чтобы не объединять разные сущности из-за похожих названий.
    Уже существующие записи не перезаписываются: их id, description,
    aliases и остальные данные сохраняются как есть.

    Связи и факты создаются заново (id — свежий UUID), но
    RelationshipStore.add / FactStore.add дедуплицируют по ключам
    (source_id, target_id, type) и
    (entity_id, doc_id, normalized_statement) соответственно (R-4),
    поэтому повторный запуск не увеличивает их количество.
    Счётчики учитывают только реально созданные записи.
    """
    path = genome_path or GENOME_PATH
    if not path.exists():
        return 0, 0, 0

    genome = json.loads(path.read_text(encoding="utf-8"))
    modules = genome.get("modules", {})
    world = genome.get("world_entities", [])
    entities_added = 0
    rels_added = 0
    facts_added = 0

    # Существующие сущности: (name, type) -> id (reuse, без перезаписи).
    existing: dict = {}
    for e in entity_store.list():
        existing[(e.name, e.type)] = e.id

    entity_map: dict = {}

    def ensure_entity(
        prefix: str, etype: str, make: Callable[[str], Entity]
    ) -> str:
        """Вернуть id сущности по (название, тип): существующей —
        reuse id без изменения записи; отсутствующей — создать.
        entity_map[name] обновляется в обоих случаях, как и раньше.
        """
        entity = make(_new_id(prefix))
        key = (entity.name, etype)
        eid = existing.get(key)
        if eid is None:
            entity_store.add(entity)
            eid = entity.id
            existing[key] = eid
            nonlocal entities_added
            entities_added += 1
        entity_map[entity.name] = eid
        return eid

    # 1. Characters → entities
    for ch in modules.get("characters", []):
        ensure_entity("char", "character", lambda eid, c=ch: Entity(
            id=eid, name=c["name"], type="character",
            aliases=c.get("aliases", []), description=c.get("description", "")))

    # 2. Themes → entities
    for th in modules.get("themes", []):
        ensure_entity("theme", "theme", lambda eid, t=th: Entity(
            id=eid, name=t["name"], type="theme", description=t.get("description", "")))

    # 3. Symbols → entities
    for sym in modules.get("symbols", []):
        ensure_entity("sym", "symbol", lambda eid, s=sym: Entity(
            id=eid, name=s["name"], type="symbol", description=s.get("meaning", "")))

    # 4. Conflicts → entities
    for conf in modules.get("conflicts", []):
        ensure_entity("conf", "conflict", lambda eid, c=conf: Entity(
            id=eid, name=c["name"], type="conflict", description=c.get("type", "")))

    # 5. Values → entities
    for val in modules.get("values", []):
        ensure_entity("val", "value", lambda eid, v=val: Entity(
            id=eid, name=v["name"], type="value", description=v.get("description", "")))

    # 6. World entities
    for we in world:
        ensure_entity("we", we.get("type", "concept"), lambda eid, w=we: Entity(
            id=eid, name=w["name"], type=w.get("type", "concept"),
            description=w.get("description", ""), values=w.get("values", []),
            related_to=w.get("related_to", []), conflict_with=w.get("conflict_with", [])))

    # 7. Relationships from genome
    for ch in modules.get("characters", []):
        src = entity_map.get(ch["name"])
        if not src:
            continue
        for vname in ch.get("values", []):
            tgt = entity_map.get(vname)
            if tgt:
                rel = Relationship(source_id=src, target_id=tgt, type="embodies")
                result = rel_store.add(rel)
                if result.id == rel.id:
                    rels_added += 1

    for we in world:
        src = entity_map.get(we["name"])
        if not src:
            continue
        for rel_name in we.get("related_to", []):
            tgt = entity_map.get(rel_name)
            if tgt:
                rel = Relationship(source_id=src, target_id=tgt, type="related_to")
                result = rel_store.add(rel)
                if result.id == rel.id:
                    rels_added += 1
        for conf_name in we.get("conflict_with", []):
            tgt = entity_map.get(conf_name)
            if tgt:
                rel = Relationship(source_id=src, target_id=tgt, type="conflicts_with")
                result = rel_store.add(rel)
                if result.id == rel.id:
                    rels_added += 1

    # 8. Facts from genome
    for ch in modules.get("characters", []):
        eid = entity_map.get(ch["name"])
        if eid and ch.get("description"):
            fact = Fact(statement=f"Персонаж {ch['name']}: {ch['description']}",
                        entity_id=eid, doc_id="genome", provenance="genome", confidence=0.9)
            result = fact_store.add(fact)
            if result.id == fact.id:
                facts_added += 1
    for we in world:
        eid = entity_map.get(we["name"])
        if eid and we.get("description"):
            fact = Fact(statement=f"{we['name']}: {we['description']}",
                        entity_id=eid, doc_id="genome", provenance="genome", confidence=0.9)
            result = fact_store.add(fact)
            if result.id == fact.id:
                facts_added += 1

    return entities_added, rels_added, facts_added


def populate_from_book_os(entity_store: EntityStore, rel_store: RelationshipStore):
    """Построить граф из уже существующих BOOK OS хранилищ.
    Просто триггерит build() — данные уже есть в entity/relationship store.
    Счётчики показывают, сколько уже есть."""
    return entity_store.get_stats()["total"], rel_store.get_stats()["total"]
