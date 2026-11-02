"""
JSON Extractor — извлечение знаний из существующих JSON-файлов.
"""
import json
import logging
from pathlib import Path
from typing import Any

from . import BaseExtractor
from ..models import RawKnowledge

log = logging.getLogger("hermes.knowledge_expansion.json_extractor")


class JSONExtractor(BaseExtractor):
    """Извлекает знания из JSON-файлов проекта."""

    async def extract(self, source: Any) -> list[RawKnowledge]:
        """
        Извлечь знания из JSON-файла.

        Args:
            source: Path к JSON-файлу или dict с данными
        """
        if isinstance(source, (str, Path)):
            return self._extract_from_file(Path(source))
        elif isinstance(source, dict):
            return self._extract_from_dict(source)
        else:
            raise ValueError(f"Unsupported source type: {type(source)}")

    def _extract_from_file(self, path: Path) -> list[RawKnowledge]:
        """Извлечь знания из файла."""
        if not path.exists():
            log.warning("file_not_found path=%s", path)
            return []

        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return self._extract_from_dict(data, source=str(path))
        except Exception as e:
            log.error("extract_error path=%s error=%s", path, e)
            return []

    def _extract_from_dict(self, data: dict, source: str = "dict") -> list[RawKnowledge]:
        """Извлечь знания из словаря."""
        results = []

        # Если это список — обработать каждый элемент
        if isinstance(data, list):
            for i, item in enumerate(data):
                if isinstance(item, dict):
                    results.extend(self._extract_from_dict(item, source=f"{source}[{i}]"))
            return results

        # Извлечь тему и содержание
        topic = data.get("name", data.get("topic", data.get("title", "")))
        content = data.get("description", data.get("content", data.get("text", "")))
        layers = data.get("layers", {})
        cross_refs = data.get("cross_references", data.get("related", []))

        # R-1: «пустое зеркало» — dict с именем (name), но без содержимого.
        # Наличие записи в источнике — НЕ подтверждение знания, поэтому такая
        # запись экстрактором не создаётся (зеркала в ARCHAEOLOGY_DEEP /
        # GEOGRAPHY появлялись именно из-за отсутствия этого условия).
        layer_literal = layers.get("literal", "") if isinstance(layers, dict) else ""
        has_content = bool(str(content or "").strip() or str(layer_literal or "").strip())

        # R-1: confidence берём ТОЛЬКО из источника, если тот её объявил.
        # Подставлять 1.0 автоматически запрещено; при отсутствии сведений
        # действует честный default модели (0.0).
        src_confidence = data.get("confidence")
        try:
            src_confidence = float(src_confidence) if src_confidence is not None else None
        except (TypeError, ValueError):
            src_confidence = None
        if src_confidence is not None and not (0.0 <= src_confidence <= 1.0):
            log.warning(
                "invalid_source_confidence source=%s value=%s", source, src_confidence
            )
            src_confidence = None

        if (topic or content) and has_content:
            kwargs: dict[str, Any] = {}
            if src_confidence is not None:
                kwargs["confidence"] = src_confidence
            results.append(RawKnowledge(
                source=source,
                topic=str(topic),
                content=str(content),
                metadata={
                    "layers": layers,
                    "cross_references": cross_refs,
                    "keys": list(data.keys()),
                },
                **kwargs,
            ))
        elif topic and not has_content:
            log.info("empty_mirror_skipped source=%s topic=%s", source, topic)

        # Рекурсивно обработать вложенные объекты
        for key, value in data.items():
            if isinstance(value, dict) and key not in ("layers", "metadata"):
                results.extend(self._extract_from_dict(value, source=f"{source}.{key}"))
            elif isinstance(value, list):
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        results.extend(self._extract_from_dict(item, source=f"{source}.{key}[{i}]"))

        return results
