"""Скрипт индексации книги в ChromaDB."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "CORE"))

from intelligence.retriever import BookRetriever


def main():
    retriever = BookRetriever()

    # Читаем книгу
    book_path = Path(__file__).parent / "SOURCE_OF_TRUTH" / "BOOK" / "КНИГА.md"
    if not book_path.exists():
        print(f"[Index] ERROR: Book file not found at {book_path}")
        return

    text = book_path.read_text(encoding="utf-8")
    print(f"[Index] Book loaded: {len(text)} chars")

    # Индексируем
    retriever.index_text(text, metadata={"source": "КНИГА.md", "type": "book"})

    # Статистика
    stats = retriever.get_collection_stats()
    print(f"[Index] Collection stats: {stats}")
    print("[Index] Done!")


if __name__ == "__main__":
    main()