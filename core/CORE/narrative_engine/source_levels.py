"""Уровни источников и протокол provenance для каждого факта мира."""

from enum import Enum
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class SourceLevel(str, Enum):
    """Каждый факт должен иметь метку происхождения.

    Уровни упорядочены по убыванию достоверности (вес для совместимости):
    CANON=1.0, AUTHOR_INTERPRETATION=0.85, HISTORICAL=0.8, MYTHOLOGICAL=0.7,
    SCIENTIFIC=0.6, SYSTEM_INTERPRETATION=0.5, USER_HYPOTHESIS=0.3.
    """
    CANON = "CANON"
    AUTHOR_INTERPRETATION = "AUTHOR_INTERPRETATION"
    HISTORICAL = "HISTORICAL"
    MYTHOLOGICAL = "MYTHOLOGICAL"
    SCIENTIFIC = "SCIENTIFIC"
    SYSTEM_INTERPRETATION = "SYSTEM_INTERPRETATION"
    USER_HYPOTHESIS = "USER_HYPOTHESIS"


# Веса источников для расчёта CompatibilityScore
SOURCE_LEVEL_WEIGHTS: dict[SourceLevel, float] = {
    SourceLevel.CANON: 1.0,
    SourceLevel.AUTHOR_INTERPRETATION: 0.85,
    SourceLevel.HISTORICAL: 0.8,
    SourceLevel.MYTHOLOGICAL: 0.7,
    SourceLevel.SCIENTIFIC: 0.6,
    SourceLevel.SYSTEM_INTERPRETATION: 0.5,
    SourceLevel.USER_HYPOTHESIS: 0.3,
}


class ProvenanceTag(BaseModel):
    """Протокол происхождения факта."""
    source_level: SourceLevel
    source_url: Optional[str] = None
    source_title: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)
    added_at: datetime = Field(default_factory=lambda: datetime.now(tz=timezone.utc))
    added_by: str = "system"
    notes: Optional[str] = None


SOURCE_LEVEL_LABELS = {
    SourceLevel.CANON: {"label": "Канон книги", "color": "green", "description": "Прямо из текста"},
    SourceLevel.AUTHOR_INTERPRETATION: {"label": "Авторская интерпретация", "color": "blue", "description": "Материалы автора"},
    SourceLevel.HISTORICAL: {"label": "Исторические источники", "color": "orange", "description": "Летописи, археология"},
    SourceLevel.MYTHOLOGICAL: {"label": "Мифологические источники", "color": "purple", "description": "Эпосы, легенды"},
    SourceLevel.SCIENTIFIC: {"label": "Научные гипотезы", "color": "cyan", "description": "Исследования"},
    SourceLevel.SYSTEM_INTERPRETATION: {"label": "Интерпретация системы", "color": "geekblue", "description": "Выводы анализа"},
    SourceLevel.USER_HYPOTHESIS: {"label": "Гипотеза пользователя", "color": "magenta", "description": "Идеи читателей"},
}
