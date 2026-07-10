"""
SemanticChunker — структурный чанкинг книги по абзацам и главам.
Источник: BOOK_DOCUMENT.json (17 глав, 824 параграфа).
"""

import json
import hashlib
from pathlib import Path
from typing import List, Dict, Optional

BASE = Path(__file__).resolve().parents[2]
DOC_PATH = BASE / "KNOWLEDGE" / "BOOK_DOCUMENT.json"


class SemanticChunker:
    def __init__(self, doc_path: Optional[Path] = None):
        self.doc_path = doc_path or DOC_PATH
        self._document = None
        self._load_document()

    def _load_document(self):
        if self.doc_path.exists():
            self._document = json.loads(self.doc_path.read_text(encoding="utf-8"))

    def get_chapters(self) -> List[Dict]:
        if not self._document:
            return []
        return self._document.get("content", {}).get("chapters", [])

    def get_paragraphs(self) -> List[Dict]:
        if not self._document:
            return []
        return self._document.get("content", {}).get("paragraphs", [])

    def chunk_by_paragraph(self) -> List[Dict]:
        """
        Создаёт чанки по одному абзацу из BOOK_DOCUMENT.
        Каждый чанк содержит:
          - id: уникальный идентификатор
          - text: текст абзаца
          - chapter_id: какая глава
          - chapter_title: заголовок главы
          - paragraph_id: номер абзаца
          - char_start/char_end: позиции в исходном тексте
        """
        paragraphs = self.get_paragraphs()
        chapters_map = {ch["id"]: ch for ch in self.get_chapters()}

        chunks = []
        for p in paragraphs:
            ch = chapters_map.get(p["chapter_id"], {})
            chunk_id = hashlib.md5(p["text"].encode()).hexdigest()[:12]
            chunks.append({
                "id": f"chunk_{p['id']}_{chunk_id}",
                "text": p["text"],
                "chapter_id": p["chapter_id"],
                "chapter_title": ch.get("title", ""),
                "chapter_number": ch.get("number", -1),
                "paragraph_id": p["id"],
                "char_start": p.get("char_start", 0),
                "char_end": p.get("char_end", 0),
                "source": "book",
            })
        return chunks

    def chunk_by_chapter(self) -> List[Dict]:
        """
        Создаёт чанки по одной главе.
        """
        chunks = []
        for ch in self.get_chapters():
            chunk_id = hashlib.md5(ch["text"].encode()).hexdigest()[:12]
            chunks.append({
                "id": f"chapter_{ch['id']}_{chunk_id}",
                "text": ch["text"],
                "chapter_id": ch["id"],
                "chapter_title": ch.get("title", ""),
                "chapter_number": ch.get("number", -1),
                "paragraph_id": "all",
                "char_start": ch.get("char_start", 0),
                "char_end": ch.get("char_end", 0),
                "source": "book",
            })
        return chunks

    def chunk_hybrid(self) -> List[Dict]:
        """
        Гибридный чанкинг:
        - Каждый абзац — отдельный чанк (для точного поиска)
        + Каждая глава целиком — отдельный чанк (для контекста)
        """
        return self.chunk_by_paragraph() + self.chunk_by_chapter()

    def get_stats(self) -> Dict:
        chapters = self.get_chapters()
        paragraphs = self.get_paragraphs()
        return {
            "total_chapters": len(chapters),
            "total_paragraphs": len(paragraphs),
            "total_chars": self._document.get("source", {}).get("total_chars", 0) if self._document else 0,
            "status": "loaded" if self._document else "no_document",
        }
