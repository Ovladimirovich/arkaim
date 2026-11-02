"""W-9 — дедупликация сущностей при повторном/аддитивном ingest.

Дефект (зафиксирован 2026-11-01, §5 W-9 / D-4):
``EntityExtractor.extract`` игнорировал параметр ``existing_entities``, поэтому
при повторном/аддитивном ingest одно и то же имя превращалось в новый экземпляр
``Entity`` со свежим ``uuid4()``. В результате в ``EntityStore`` накапливались
дубликаты имён, а факты/связи привязывались к случайному из них.

Исправление: если имя уже есть в ``existing_entities`` (карта
``имя.lower() -> Entity`` из ``EntityStore.list()``), извлечение возвращает
существующую сущность с её прежним id — дубликат не создаётся, идентификаторы и
связи сохраняются.
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CORE_PATH = PROJECT_ROOT / "core" / "CORE"
for path in (str(CORE_PATH), str(PROJECT_ROOT)):
    if path not in sys.path:
        sys.path.insert(0, path)

from book_os.pipeline.extractors import EntityExtractor
from schemas.entity import Entity


def _chunk(*, chars=(), themes=(), symbols=()):
    return {
        "enriched_characters": list(chars),
        "enriched_themes": list(themes),
        "enriched_symbols": list(symbols),
    }


def test_no_duplicate_when_name_already_exists():
    """Повторное извлечение существующего имени не создаёт дубликат и сохраняет id."""
    existing = {
        "аркаим": Entity(id="e-ark", name="Аркаим", type="concept", aliases=["Аркаим"])
    }
    chunks = [
        _chunk(chars=["Аркаим", "Велик"]),
        _chunk(chars=["Аркаим"], themes=["Судьба"], symbols=["Камень"]),
    ]
    result = EntityExtractor.extract(chunks, existing)

    ark = [e for e in result if e.name.lower() == "аркаим"]
    # Существующая сущность возвращена один раз и с прежним id.
    assert len(ark) == 1
    assert ark[0].id == "e-ark"

    # Новые имена получают собственные (новые) сущности.
    names = {e.name for e in result}
    assert "Велик" in names
    assert "Судьба" in names
    assert "Камень" in names


def test_no_duplicate_across_separate_extractions_same_batch():
    """Один и тот же ингест не производит дубликатов уже в пределах вызова."""
    # Без existing: разные чанки с одним именем должны дать ровно одну сущность.
    chunks = [
        _chunk(chars=["Велик"]),
        _chunk(chars=["Велик"]),
        _chunk(chars=["Велик"]),
    ]
    result = EntityExtractor.extract(chunks)
    velik = [e for e in result if e.name == "Велик"]
    assert len(velik) == 1


def test_none_existing_behaves_as_empty():
    """Если existing_entities не передан — поведение прежнее (все новые)."""
    chunks = [_chunk(chars=["Велик"])]
    result = EntityExtractor.extract(chunks)
    assert len(result) == 1
    assert result[0].name == "Велик"
    assert result[0].id  # id сгенерирован


def test_existing_keyed_case_insensitive():
    """Ключ existing_entities — имя в нижнем регистре, совпадение без учёта регистра."""
    existing = {
        "аркаим": Entity(id="e-ark", name="Аркаим", type="concept", aliases=["Аркаим"])
    }
    result = EntityExtractor.extract([_chunk(chars=["АРКАИМ"])], existing)
    ark = [e for e in result if e.name.lower() == "аркаим"]
    assert len(ark) == 1
    assert ark[0].id == "e-ark"


def test_entity_store_add_does_not_duplicate_existing_id():
    """EntityStore.add по существующему id перезаписывает, а не умножает."""
    from book_os.entity_store import EntityStore
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        store = EntityStore(data_dir=Path(tmp))
        e1 = Entity(id="e-ark", name="Аркаим", type="concept")
        store.add(e1)
        # Повторный add того же id — не создаёт второй записи.
        store.add(Entity(id="e-ark", name="Аркаим", type="concept"))
        assert store.get_stats()["total"] == 1
        assert len(store.list()) == 1


def test_reingest_preserves_existing_id_for_facts():
    """Повторный «ингест» ( extract → entity_map ) сохраняет прежний id, факты привязываются к нему.

    Имитирует цикл оркестратора (§5 шаг 5-6):
      existing = {e.name.lower(): e for e in store.list()}
      entities = extractor.extract(chunks, existing)
      for entity in entities: mapper[entity.name.lower()] = entity.id  (после add)
    В角色 существующей выступает сущность, заранее помещённая в store.
    """
    from book_os.entity_store import EntityStore
    from book_os.pipeline.extractors import FactExtractor
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        store = EntityStore(data_dir=Path(tmp))
        # «Первый ингест»: создали сущность complex через extract.
        chunks = [_chunk(chars=["Велик"], themes=["Судьба"])]
        first = EntityExtractor.extract(chunks)
        ids = {}
        for entity in first:
            store.add(entity)
            ids[entity.name.lower()] = entity.id

        # «Второй ингест» того же документа: extract должен вернуть ТЕ ЖЕ id.
        existing = {e.name.lower(): e for e in store.list()}
        second = EntityExtractor.extract(chunks, existing)
        assert {e.id for e in second} == set(ids.values()), "id не должны измениться при повторном извлечении"

        # Факты второго ингеста привязываются к прежним id (сохранение происхождения).
        facts = FactExtractor.extract(chunks, "doc-2", ids)
        assert facts, "факты должны извлечься"
        for fact in facts:
            assert fact.entity_id in ids.values(), "факт привязан к случайному/новому id"
