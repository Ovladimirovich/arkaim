"""R-4: идемпотентность фактов и связей при повторной обработке документа.

Дефект (замер в TMP, 2026-11-02): повторный ingest одного документа
(КНИГА.md) через IngestionOrchestrator:
  факты:          157 → 314
  связи:          300 → 600
  живая база НЕ затронута.

Причина: Fact.id / Relationship.id = uuid4() на каждый новый объект;
FactStore.add / RelationshipStore.add имели дедуп только по id.

Решение (хранение, независимо от вызывающего):
  факт: key (entity_id, doc_id, normalized_statement) — при совпадении
        возвращается существующая запись (id/provenance/confidence не
        меняются);
  связь: key (source_id, target_id, type) — при совпадении возвращается
        существующая связь; связь с другим type между теми же
        сущностями сохраняется отдельной записью.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_CORE = _PROJECT_ROOT / "core" / "CORE"
if str(_CORE) not in sys.path:
    sys.path.insert(0, str(_CORE))

from schemas.fact import Fact  # noqa: E402
from schemas.relationship import Relationship  # noqa: E402
from book_os.fact_store import FactStore  # noqa: E402
from book_os.relationship_store import RelationshipStore  # noqa: E402


# ── 1–2. Повторное добавление не увеличивает количество ───────


def test_repeat_fact_add_keeps_count_and_existing_id(tmp_path):
    store = FactStore(data_dir=tmp_path)

    first = store.add(Fact(
        statement="Аркаим находится на Южном Урале",
        entity_id="e1", doc_id="doc1",
        provenance="source", confidence=0.9,
    ))

    # Объект с НОВЫМ uuid, но идентичным содержанием — повторный ingest.
    second = Fact(
        statement="Аркаим находится на Южном Урале",
        entity_id="e1", doc_id="doc1",
        provenance="source", confidence=0.9,
    )
    assert second.id != first.id, "предпосылка теста: id новый"

    result = store.add(second)

    assert result.id == first.id, "должна вернуться существующая запись"
    assert len(store.list()) == 1, "количество фактов не увеличилось"
    # provenance/confidence существующей записи не изменены
    existing = store.list()[0]
    assert existing.provenance == "source"
    assert existing.confidence == 0.9
    # на диске тоже одна запись
    assert len(json.loads((tmp_path / "graph" / "facts.json").read_text(encoding="utf-8"))) == 1


def test_repeat_relationship_add_keeps_count_and_existing_id(tmp_path):
    store = RelationshipStore(data_dir=tmp_path)

    first = store.add(Relationship(
        source_id="e1", target_id="e2", type="related_to", doc_id="doc1",
    ))
    second = Relationship(
        source_id="e1", target_id="e2", type="related_to", doc_id="doc1",
    )
    assert second.id != first.id

    result = store.add(second)

    assert result.id == first.id, "должна вернуться существующая связь"
    assert len(store.list()) == 1, "количество связей не увеличилось"


# ── 3. Разные содержательные записи сохраняются ───────────────


def test_different_statements_are_not_merged(tmp_path):
    """Разные факты (даже об одной сущности и одном документе) — обе
    записи остаются; похожего текста для слияния недостаточно."""
    store = FactStore(data_dir=tmp_path)
    a = store.add(Fact(
        statement="Велик родился в конце апреля",
        entity_id="e1", doc_id="doc1", provenance="source",
    ))
    b = store.add(Fact(
        statement="Велик вырос в степи за один сезон",
        entity_id="e1", doc_id="doc1", provenance="source",
    ))
    assert a.id != b.id
    assert len(store.list()) == 2, "содержательно разные факты не должны сливаться"


def test_same_entity_name_fact_from_other_doc_kept(tmp_path):
    """Ключ содержит doc_id: тот же statement из другого документа —
    отдельное происхождение, не склеивается."""
    store = FactStore(data_dir=tmp_path)
    store.add(Fact(
        statement="Световит — учитель Великосвета",
        entity_id="e1", doc_id="doc1", provenance="source",
    ))
    store.add(Fact(
        statement="Световит — учитель Великосвета",
        entity_id="e1", doc_id="doc2", provenance="source",
    ))
    assert len(store.list()) == 2


def test_relationship_pair_with_other_type_is_kept(tmp_path):
    """Связь между теми же сущностями с другим типом — отдельная запись."""
    store = RelationshipStore(data_dir=tmp_path)
    store.add(Relationship(
        source_id="e1", target_id="s", type="related_to", doc_id="doc1",
    ))
    store.add(Relationship(
        source_id="e1", target_id="s", type="conflicts_with", doc_id="doc1",
    ))
    assert len(store.list()) == 2


def test_fact_legacy_overwrite_by_id_unchanged(tmp_path):
    """Историческая семантика: add с существующим id перезаписывает."""
    store = FactStore(data_dir=tmp_path)
    f1 = Fact(id="fixed-id", statement="Да", entity_id="e", doc_id="d",
              provenance="source")
    store.add(f1)
    f2 = Fact(id="fixed-id", statement="Исправлено", entity_id="e",
              doc_id="d", provenance="source")
    store.add(f2)
    [fact] = store.list()
    assert fact.statement == "Исправлено"
    assert len(store.list()) == 1


def test_whitespace_normalization_merges_only_whitespace_variants(tmp_path):
    """Тот же смысл отличается только пробелами → merge; содержательные
    различия (регистр/пунктуация) — не merge."""
    store = FactStore(data_dir=tmp_path)
    store.add(Fact(statement="Аркаим  находится  на   Южном Урале",
                   entity_id="e", doc_id="d", provenance="source"))
    store.add(Fact(statement="Аркаим находится на Южном Урале",
                   entity_id="e", doc_id="d", provenance="source"))
    assert len(store.list()) == 1, "пробельные варианты — одна запись"

    store2 = FactStore(data_dir=tmp_path / "case")
    store2.add(Fact(statement="аркaim найден", entity_id="e", doc_id="d",
                    provenance="source"))
    store2.add(Fact(statement="Аркаим найден", entity_id="e", doc_id="d",
                    provenance="source"))
    assert len(store2.list()) == 2, "регистр — содержательное различие"


# ── 6. Интеграционно: повторный ingest того же документа ──────


def _make_orchestrator(tmp_path: Path):
    import shutil

    from book_os.source_store import SourceStore
    from book_os.entity_store import EntityStore
    from book_os.fact_store import FactStore
    from book_os.relationship_store import RelationshipStore
    from book_os.pipeline.orchestrator import IngestionOrchestrator

    os_dir = tmp_path / "os"
    if os_dir.exists():
        shutil.rmtree(os_dir)

    from book_os.provenance_tracker import ProvenanceTracker

    return IngestionOrchestrator(
        source_store=SourceStore(data_dir=os_dir),
        entity_store=EntityStore(data_dir=os_dir),
        fact_store=FactStore(data_dir=os_dir),
        relationship_store=RelationshipStore(data_dir=os_dir),
        provenance_tracker=ProvenanceTracker(data_dir=os_dir),
        index_engine=None,
    ), os_dir


def _tiny_source(tmp_path: Path) -> Path:
    src = tmp_path / "tiny_book.md"
    src.write_text(
        "## Глава 1 — Степь\n\n"
        "Велик шёл через степь и думал о Судьбе.\n\n"
        "## Глава 2 — Город\n\n"
        "Световит наставлял Великосвета о Цикле времён.\n",
        encoding="utf-8",
    )
    return src


def test_repeat_ingest_does_not_grow_facts_or_rels(tmp_path):
    """Повторный (и тройной) ingest одного документа: факты/связи
    не растут; entity id/провenance остаются те же."""
    orch, os_dir = _make_orchestrator(tmp_path)
    src = _tiny_source(tmp_path)

    r1 = orch.ingest(src)
    assert r1["status"] == "ok", r1
    facts_after_1 = len(json.loads(
        (os_dir / "graph" / "facts.json").read_text(encoding="utf-8")))
    rels_after_1 = len(json.loads(
        (os_dir / "graph" / "relationships.json").read_text(encoding="utf-8")))
    ents_after_1 = json.loads(
        (os_dir / "graph" / "entities.json").read_text(encoding="utf-8"))
    facts_1 = json.loads(
        (os_dir / "graph" / "facts.json").read_text(encoding="utf-8"))
    assert facts_after_1 > 0, "инжест должен создать факты"

    # Повторный ingest ×2 и ×3 — идемпотентно.
    r2 = orch.ingest(src)
    assert r2["status"] == "ok"
    r3 = orch.ingest(src)
    assert r3["status"] == "ok"

    facts_after_3 = len(json.loads(
        (os_dir / "graph" / "facts.json").read_text(encoding="utf-8")))
    rels_after_3 = len(json.loads(
        (os_dir / "graph" / "relationships.json").read_text(encoding="utf-8")))
    ents_after_3 = json.loads(
        (os_dir / "graph" / "entities.json").read_text(encoding="utf-8"))
    facts_3 = json.loads(
        (os_dir / "graph" / "facts.json").read_text(encoding="utf-8"))

    assert facts_after_3 == facts_after_1, (
        f"повторный ingest дублирует факты: {facts_after_1} → {facts_after_3}"
    )
    assert rels_after_3 == rels_after_1, (
        f"повторный ingest дублирует связи: {rels_after_1} → {rels_after_3}"
    )
    assert ents_after_3 == ents_after_1, "сущности не должны удваиваться"
    assert facts_3 == facts_1, "id/содержание фактов должны остаться те же"
    docs = list((os_dir / "documents").glob("*.json"))
    assert len(docs) == 1, f"документ не должен дублироваться: {len(docs)}"
