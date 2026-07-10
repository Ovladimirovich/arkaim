"""Tests for Book Genome Extraction."""

from pathlib import Path

import pytest

from core.genome.schemas import BookGenome, WorldEntity, Archetype, Symbol
from core.genome.loader import load_book_structure


class TestBookLoader:
    def test_loads_book_structure(self):
        structure = load_book_structure()
        assert structure.title == "Наследие Аркаима"
        assert structure.author == "Автор: ОВладимирович"
        assert len(structure.chapters) > 0

    def test_chapters_have_content(self):
        structure = load_book_structure()
        for ch in structure.chapters[:5]:
            assert len(ch.paragraphs) > 0
            assert ch.number > 0

    def test_annotation_not_empty(self):
        structure = load_book_structure()
        assert len(structure.annotation) > 0


class TestGenomeSchemas:
    def test_book_genome_minimal(self):
        genome = BookGenome(
            themes=["духовное развитие"],
            core_values=["истина"],
            archetypes=[Archetype(name="Странник", role="поиск истины", characters=["Велик"])],
            symbols=[Symbol(name="Аркаим", meaning="место силы", chapters=[1])],
            conflicts=["Материя vs Дух"],
            mission_statement="Тест",
            world_entities=[WorldEntity(name="Гиперборея", type="civilization", description="тест")],
        )
        assert len(genome.themes) == 1
        assert genome.world_entities[0].name == "Гиперборея"

    def test_book_genome_serialization(self):
        genome = BookGenome(
            themes=["тест"],
            core_values=["тест"],
            archetypes=[Archetype(name="А", role="Р", characters=["П"])],
            symbols=[Symbol(name="С", meaning="З", chapters=[1])],
            conflicts=["К"],
            mission_statement="М",
            world_entities=[WorldEntity(name="Сущность", type="concept", description="описание")],
        )
        data = genome.model_dump(mode="json")
        restored = BookGenome(**data)
        assert restored.themes == genome.themes
        assert len(restored.archetypes) == 1


class TestGenomeExtractor:
    def test_extract_prompt_contains_book_text(self):
        from core.genome.extractor import _build_extract_prompt
        structure = load_book_structure()
        prompt = _build_extract_prompt(structure, max_chapters=1)
        assert "Глава 1" in prompt
        assert len(prompt) > 500

    def test_extract_prompt_includes_guidelines(self):
        from core.genome.extractor import _build_extract_prompt
        from core.genome.loader import BookStructure, BookChapter
        fake = BookStructure(
            title="Test",
            author="Author",
            annotation="Ann",
            chapters=[BookChapter(number=1, title="Test", paragraphs=["Hello world"])],
        )
        prompt = _build_extract_prompt(fake, max_chapters=1)
        assert "Hello world" in prompt
        assert "themes" in prompt.lower()
        assert "world_entities" in prompt.lower()

    def test_extract_genome_requires_provider(self):
        """Extractor fails gracefully without registered providers."""
        from core.genome.extractor import extract_genome
        with pytest.raises((ValueError, ImportError)):
            import asyncio
            asyncio.run(extract_genome(provider_name="nonexistent"))

    def test_load_genome_returns_none_when_missing(self):
        from core.genome.extractor import load_genome
        result = load_genome(Path("C:/nonexistent_genome.json"))
        assert result is None
