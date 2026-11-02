"""R-3: идемпотентность populate_from_genome.

Дефект (2026-11-02): populate_from_genome при каждом запуске создавал
сущности/связи/факты с новыми UUID (_new_id -> uuid4), данные генома
дублировались. Вызывается из ручного endpoint POST /graph/populate.

Фикс:
- существующие сущности переиспользуются по устойчивому ключу
  (name, type) — точное регистрочувствительное совпадение
  (обоснование: в геноме 14 имён живут в 2-3 типах, есть регистровая
  пара «Глобальные катаклизмы»/«глобальные катаклизмы» — матчинг по
  имени или name.lower() склеил бы разные сущности);
- существующие записи не перезаписываются (id/description/aliases —
  сохраняются);
- связи/факты дедуплицируются на уровне сторов (R-4): ключ связи
  (source_id, target_id, type), ключ факта
  (entity_id, doc_id, normalized_statement);
- счётчики возвращают только реально созданные записи.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_CORE = _PROJECT_ROOT / "core" / "CORE"
if str(_CORE) not in sys.path:
    sys.path.insert(0, str(_CORE))

from book_os.entity_store import EntityStore  # noqa: E402
from book_os.fact_store import FactStore  # noqa: E402
from book_os.relationship_store import RelationshipStore  # noqa: E402
from schemas.entity import Entity  # noqa: E402

# knowledge_graph/__init__.py импортирует api_routes (runtime/auth),
# недоступные в тестовом окружении — подключаем populate.py напрямую.
import importlib.util  # noqa: E402

_SPEC = importlib.util.spec_from_file_location(
    "kg_populate_direct",
    _PROJECT_ROOT / "core" / "CORE" / "knowledge_graph" / "populate.py",
)
_kg_populate = importlib.util.module_from_spec(_SPEC)
sys.modules.setdefault("kg_populate_direct", _kg_populate)
_SPEC.loader.exec_module(_kg_populate)
populate_from_genome = _kg_populate.populate_from_genome

MINI_GENOME = {
    "modules": {
        "characters": [
            {
                "name": "Велик",
                "aliases": ["Великосвет"],
                "description": "юноша из степи",
                "values": ["Долг"],
            }
        ],
        "themes": [
            {"name": "Судьба", "description": "тема судьбы"},
        ],
        "symbols": [
            {"name": "Круг", "meaning": "цикл времён"},
        ],
        "conflicts": [
            {"name": "Степь и Город", "type": "территориальный"},
        ],
        "values": [
            {"name": "Долг", "description": "верность долгу"},
        ],
    },
    "world_entities": [
        {
            "name": "Аркаим",
            "type": "civilization",
            "description": "город-крепость",
            "related_to": ["Судьба"],
            "conflict_with": [],
        },
    ],
}


def _mini_genome_file(tmp_path: Path) -> Path:
    p = tmp_path / "genome.json"
    p.write_text(json.dumps(MINI_GENOME, ensure_ascii=False), encoding="utf-8")
    return p


def _make_stores(tmp_path: Path):
    return (
        EntityStore(data_dir=tmp_path),
        RelationshipStore(data_dir=tmp_path),
        FactStore(data_dir=tmp_path),
    )


def _snapshot(stores) -> dict:
    """Полное сериализуемое состояние всех трёх сторов."""
    entities, rels, facts = stores
    return {
        "entities": {e.id: e.model_dump() for e in entities.list()},
        "relationships": {r.id: r.model_dump() for r in rels.list()},
        "facts": {f.id: f.model_dump() for f in facts.list()},
    }


# ── 1. Первый запуск создаёт ожидаемое ─────────────────────────


def test_first_run_creates_expected_records(tmp_path):
    stores = _make_stores(tmp_path)
    e1, r1, f1 = populate_from_genome(*stores, genome_path=_mini_genome_file(tmp_path))

    assert e1 == 6, f"ожидается 6 сущностей (5 секций + world), получено {e1}"
    assert r1 == 2, f"ожидается 2 связи (embodies + related_to), получено {r1}"
    assert f1 == 2, f"ожидается 2 факта (character+world), получено {f1}"

    entities, rels, facts = stores
    assert len(entities.list()) == 6
    assert len(rels.list()) == 2
    assert len(facts.list()) == 2

    by_type = {}
    for e in entities.list():
        by_type.setdefault(e.type, []).append(e.name)
    assert by_type.get("character") == ["Велик"]
    assert by_type.get("civilization") == ["Аркаим"]

    rel_types = {r.type for r in rels.list()}
    assert rel_types == {"embodies", "related_to"}
    for fact in facts.list():
        assert fact.doc_id == "genome"
        assert fact.provenance == "genome"


# ── 2–3. Второй и третий запуски не создают дублей ──────────────


def test_second_and_third_runs_add_nothing(tmp_path):
    stores = _make_stores(tmp_path)
    genome_path = _mini_genome_file(tmp_path)

    assert populate_from_genome(*stores, genome_path=genome_path) == (6, 2, 2)
    snap1 = _snapshot(stores)

    r2 = populate_from_genome(*stores, genome_path=genome_path)
    assert r2 == (0, 0, 0), f"второй запуск создал новые записи: {r2}"
    snap2 = _snapshot(stores)
    assert snap2 == snap1, "первое и второе состояние сторов не идентичны"

    r3 = populate_from_genome(*stores, genome_path=genome_path)
    assert r3 == (0, 0, 0), f"третий запуск создал новые записи: {r3}"
    assert _snapshot(stores) == snap1, "третье состояние отличилось"


# ── 4. Разные факты и типы связей сохраняются ───────────────────


def test_manually_added_fact_and_rel_survive_rerun(tmp_path):
    """Содержательно другие факт (statement) и связь (тип) с теми же
    ключами сущностей не должны выправляться/distеряться повторным
    запуском populate."""
    stores = _make_stores(tmp_path)
    genome_path = _mini_genome_file(tmp_path)
    populate_from_genome(*stores, genome_path=genome_path)
    entities, rels, facts = stores

    velik_id = next(e.id for e in entities.list() if e.name == "Велик")
    arkaim_id = next(e.id for e in entities.list() if e.name == "Аркаим")

    from schemas.fact import Fact
    from schemas.relationship import Relationship

    own_fact = facts.add(Fact(
        statement="Велик родился в конце апреля",
        entity_id=velik_id, doc_id="genome", provenance="genome",
    ))
    own_rel = rels.add(Relationship(
        source_id=arkaim_id, target_id=velik_id, type="related_to",
        doc_id="genome",
    ))

    populate_from_genome(*stores, genome_path=genome_path)

    assert own_fact.id in {f.id for f in facts.list()}, "собственный факт потерян"
    assert own_rel.id in {r.id for r in rels.list()}, "собственная связь потеряна"
    assert len(facts.list()) == 3, "счёт фактов изменился"
    assert len(rels.list()) == 3, "счёт связей изменился"


def test_distinct_facts_of_same_entity_all_kept(tmp_path):
    """Два разных statement про одну сущность — обе записи остаются."""
    from schemas.fact import Fact

    stores = _make_stores(tmp_path)
    entities, _, facts = stores
    gid = entities.add(Entity(id="v1", name="Велик", type="character")).id
    facts.add(Fact(statement="Велик — юноша", entity_id=gid, doc_id="genome",
                   provenance="genome"))
    facts.add(Fact(statement="Велик — наставник", entity_id=gid, doc_id="genome",
                   provenance="genome"))
    assert len(facts.list()) == 2


# ── 5. Существующие ID / данные не теряются ─────────────────────


def test_existing_entity_reused_with_id_and_data(tmp_path):
    """Сущность с ключом (name, type) уже есть: reuse её id,
    содержательные данные НЕ перезаписываются геномом."""
    stores = _make_stores(tmp_path)
    genome_path = _mini_genome_file(tmp_path)
    entities, rels, facts = stores

    pre = entities.add(Entity(
        id="custom_char_1", name="Велик", type="character",
        description="собственное описание из книги",
    ))

    e1, _, _ = populate_from_genome(*stores, genome_path=genome_path)
    assert e1 == 5, "существующая сущность не должна учитываться как новая"

    still = entities.get_by_id("custom_char_1")
    assert still is not None and still.id == pre.id
    assert still.description == "собственное описание из книги", (
        "данные существующей сущности перезаписаны геномом"
    )
    assert len(entities.list()) == 6, "дубль (name,type) создан вопреки reuse"

    # Связь/факт от character осели на существующем id.
    fact_entity_ids = {f.entity_id for f in facts.list()}
    assert "custom_char_1" in fact_entity_ids, (
        "факт персонажа не привязан к переиспользованному id"
    )


def test_existing_genome_fact_reused_not_duplicated(tmp_path):
    """Факт с doc_id=genome и тем же statement уже есть: не дублируется,
    его id/provenance сохраняются."""
    from schemas.fact import Fact

    stores = _make_stores(tmp_path)
    genome_path = _mini_genome_file(tmp_path)
    entities, _, facts = stores
    gid = entities.add(Entity(id="v1", name="Велик", type="character")).id
    pre_fact = facts.add(Fact(
        statement="Персонаж Велик: юноша из степи",
        entity_id=gid, doc_id="genome", provenance="genome", confidence=0.5,
    ))

    populate_from_genome(*stores, genome_path=genome_path)

    assert len(facts.list()) == 2, "существующий факт дублирован"
    cur = facts.get(pre_fact.id)
    assert cur.provenance == "genome"
    assert cur.confidence == 0.5, "confidence существующего факта изменён"


# ── 6. Похожие названия не склеиваются ──────────────────────────


def test_similar_name_other_case_not_merged(tmp_path):
    """«велик» (нижний регистр) и «Велик» из генома — разные сущности."""
    stores = _make_stores(tmp_path)
    genome_path = _mini_genome_file(tmp_path)
    entities, _, _ = stores
    entities.add(Entity(id="low_1", name="велик", type="character"))

    populate_from_genome(*stores, genome_path=genome_path)

    names = [e.name for e in entities.list()]
    assert names.count("велик") == 1
    assert names.count("Велик") == 1, "регистровый вариант был склеен/потерян"


def test_same_name_other_type_not_merged(tmp_path):
    """Существующая сущность с тем же именем, но другим типом (в геноме
    14 имён живут в 2-3 типах) — не переиспользуется для геномной."""
    stores = _make_stores(tmp_path)
    genome_path = _mini_genome_file(tmp_path)
    entities, rels, facts = stores
    entities.add(Entity(id="loc_1", name="Аркаим", type="location"))

    populate_from_genome(*stores, genome_path=genome_path)

    by_id = entities.get_by_id("loc_1")
    assert by_id.type == "location", "перезаписан тип существующей сущности"
    types = [e.type for e in entities.list() if e.name == "Аркаим"]
    assert types.count("civilization") == 1, "геномная civilization не создана"
    assert len(entities.list()) == 7, "сущности слились или задублировались"


# ── 7. Интеграционно: реальный геном, три запуска подряд ────────


_REAL_GENOME = _PROJECT_ROOT / "core" / "GENOME" / "GENOME_v1.0.0.json"


def test_real_genome_three_runs_idempotent(tmp_path):
    """На реальном GENOME_v1.0.0.json: первый запуск даёт стабильные
    счётчики, второй и третий — (0, 0, 0); состояние сторов не меняется."""
    if not _REAL_GENOME.exists():
        import pytest

        pytest.skip("GENOME_v1.0.0.json не найден (чистый клон)")

    stores = _make_stores(tmp_path)
    e1, r1, f1 = populate_from_genome(*stores, genome_path=_REAL_GENOME)
    assert (e1, r1, f1) == (277, 13, 34), f"ожидаемые счётчики генома: {(e1, r1, f1)}"
    snap1 = _snapshot(stores)

    assert populate_from_genome(*stores, genome_path=_REAL_GENOME) == (0, 0, 0)
    assert _snapshot(stores) == snap1

    assert populate_from_genome(*stores, genome_path=_REAL_GENOME) == (0, 0, 0)
    assert _snapshot(stores) == snap1
