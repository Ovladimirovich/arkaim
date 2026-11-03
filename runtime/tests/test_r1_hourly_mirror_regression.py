"""R-1: регрессия «часовой» шедулер → пустые зеркала в KNOWLEDGE.

Воспроизводит инцидент 2026-11-02 00:38: scheduled job
``knowledge_expansion_check`` (интервал 3600s) после рестарта backend
находил ``_source_hashes`` пустым → первый же check запускал все
модули → JSONExtractor извлекал записи-сайты из ARCHAEOLOGY.json
без содержимого (``content=""``), и KnowledgeStore дописывал пустые
зеркала в ARCHAEOLOGY_DEEP.json / GEOGRAPHY.json с ложным
``confidence: 1.0`` (default dataclass).

Фикс (три точки):
  1. extractor не создаёт RawKnowledge без содержимого;
  2. confidence берётся только из источника (default модели 0.0);
  3. store не сохраняет записи с пустым content (страховка).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_CORE = _PROJECT_ROOT / "core" / "CORE"
if str(_CORE) not in sys.path:
    sys.path.insert(0, str(_CORE))

from knowledge_expansion.extractors.json_extractor import JSONExtractor  # noqa: E402
from knowledge_expansion.models import RawKnowledge, ValidatedKnowledge  # noqa: E402
from knowledge_expansion.pipeline import KnowledgeExpansionPipeline  # noqa: E402
from knowledge_expansion.scheduler import KnowledgeScheduler  # noqa: E402
from knowledge_expansion.store.knowledge_store import KnowledgeStore  # noqa: E402


# ── Фикстуры ─────────────────────────────────────────────────


def make_source_file(tmp_path: Path) -> Path:
    """Источник в духе ARCHAEOLOGY.json: сайт без description (зеркало)
    + содержательная запись."""
    source = tmp_path / "SOURCE.json"
    source.write_text(
        json.dumps(
            {
                "sites": [
                    {
                        # профиль реального зеркала: имя есть, содержимого нет
                        "name": "Зеркальный сайт",
                        "location": "где-то",
                        "facts": ["факт без отдельного description"],
                        "book_connection": "связь с книгой",
                    },
                    {
                        # содержательная запись: description заполнен
                        "name": "Содержательная тема",
                        "description": "Реальное описание с текстом знания",
                    },
                ]
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return source


class CountingStore:
    """Подмена graph-сторов: считает, что в них реально записали."""

    instances: list["CountingStore"] = []

    def __init__(self):
        self.items: list[object] = []
        CountingStore.instances.append(self)

    def add(self, item: object) -> None:
        self.items.append(item)


def make_pipeline(tmp_path: Path, source: Path, monkeypatch):
    """Пайплайн с tmp-стором и подменёнными graph-сторами."""
    import book_os.entity_store as entity_store
    import book_os.fact_store as fact_store
    import book_os.relationship_store as relationship_store

    CountingStore.instances = []
    monkeypatch.setattr(entity_store, "EntityStore", CountingStore)
    monkeypatch.setattr(relationship_store, "RelationshipStore", CountingStore)
    monkeypatch.setattr(fact_store, "FactStore", CountingStore)

    pipeline = KnowledgeExpansionPipeline(llm_client=None)
    pipeline.store = KnowledgeStore(knowledge_dir=tmp_path)
    output = tmp_path / ("SOURCE_DEEP.json")
    pipeline.register_module(
        "r1_regression_module",
        {
            "description": "R-1 regression",
            "source_files": [source],
            "output_file": output,
        },
    )
    return pipeline, output


def read_items(output: Path) -> list[dict]:
    data = json.loads(output.read_text(encoding="utf-8"))
    return data if isinstance(data, list) else data.get("items", [])


# ── 1. Экстрактор: пустые зеркала не извлекаются ──────────────


async def test_extractor_skips_empty_site_mirrors(tmp_path):
    source = make_source_file(tmp_path)
    extractor = JSONExtractor()

    raw = await extractor.extract(source)

    assert len(raw) == 1, f"ожидалась только содержательная запись, получено {raw}"
    assert raw[0].topic == "Содержательная тема"
    assert raw[0].content.strip()


async def test_extractor_empty_dict_yields_nothing(tmp_path):
    """dict с именем, но без содержимого → RawKnowledge не создаётся."""
    extractor = JSONExtractor()
    raw = await extractor.extract({"name": "Ромашка", "comment": "без description"})
    assert raw == []


# ── 2. Confidence: не автоматически 1.0 ──────────────────────


def test_default_confidence_is_not_1():
    """Default модели — 0.0: наличие в источнике ≠ подтверждение."""
    raw = RawKnowledge(source="test", topic="Тема", content="Текст")
    assert raw.confidence == 0.0


def test_confidence_taken_from_source_when_declared():
    extractor = JSONExtractor()
    raw_with = extractor._extract_from_dict({"topic": "Т", "content": "Текст", "confidence": 0.6})
    assert len(raw_with) == 1
    assert raw_with[0].confidence == 0.6

    raw_without = extractor._extract_from_dict({"topic": "Т", "content": "Текст"})
    assert len(raw_without) == 1
    assert raw_without[0].confidence == 0.0, "присутствие в источнике не подтверждает знание"


# ── 3. Store: страховка от пустых записей ────────────────────


async def test_store_skips_empty_content(tmp_path):
    store = KnowledgeStore(knowledge_dir=tmp_path)
    output = tmp_path / "OUT.json"

    mirror = ValidatedKnowledge(source="x", topic="Зеркало", content="")
    result = await store.save([mirror], output)

    assert result.success is True
    assert result.items_saved == 0
    assert result.items_skipped == 1
    assert json.loads(output.read_text(encoding="utf-8")) == []


# ── 4. Часовая регрессия: рестарт + первый check ─────────────


async def test_scheduler_restartup_run_writes_no_mirrors(tmp_path, monkeypatch):
    """Точная копия сценария 00:38: рестарт (пустой scheduler) →
    первый check запускает модуль → в файле нет зеркал и нет
    confidence=1.0; второй check — идемпотентен (ничего не пишет)."""
    source = make_source_file(tmp_path)
    pipeline, output = make_pipeline(tmp_path, source, monkeypatch)

    scheduler = KnowledgeScheduler(pipeline)

    # Первый check "после рестарта" — модуль запускается (изменение
    # обнаружено по пустому _source_hashes).
    await scheduler.check_and_run()
    first_runs = sorted(scheduler.get_status()["last_run"].keys())
    assert first_runs == ["r1_regression_module"], "первый check должен запустить модуль"

    # Убедимся: пустых зеркал нет, содержательная запись одна.
    items = read_items(output)
    assert len(items) == 1
    item = items[0]
    assert item["topic"] == "Содержательная тема"
    assert str(item["content"]).strip(), "запись с пустым content не должна была попасть"
    assert float(item["confidence"]) != 1.0, "нельзя автоматически присваивать confidence 1.0"

    # Второй check без изменений источника — не запускает модуль.
    runs_after_first = len(scheduler.get_status()["last_run"].keys())
    await scheduler.check_and_run()
    assert len(scheduler.get_status()["last_run"].keys()) == runs_after_first, "второй check не должен перезапускать модуль (идемпотентность)"
    assert len(read_items(output)) == 1, "файл не должен расти без изменений источника"


async def test_repeated_module_run_is_idempotent(tmp_path, monkeypatch):
    """Повторный run_module (как после рестарта шедулера) не удваивает
    записи и не добавляет зеркал: dedup по topic]."""
    source = make_source_file(tmp_path)
    pipeline, output = make_pipeline(tmp_path, source, monkeypatch)

    result1 = await pipeline.run_module("r1_regression_module")
    assert result1.items_saved == 1

    result2 = await pipeline.run_module("r1_regression_module")
    assert result2.items_saved == 0, "повторный запуск сохраняет дубликаты"

    items = read_items(output)
    assert len(items) == 1
    assert all(str(i["content"]).strip() for i in items)
