"""
ReaderMemory — книга помнит каждого читателя.

Профиль читателя, история тем, глубина погружения.
Позволяет книге отвечать «расскажи подробнее» без передачи контекста.
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

import aiosqlite

from core.database import get_db_manager


DB_DIR = Path(__file__).resolve().parent.parent / "memory" / "data"
DB_PATH = DB_DIR / "readers.db"
MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


@dataclass
class TopicMemory:
    name: str
    depth: float = 0.0          # 0.0–1.0 как глубоко ушли
    questions_count: int = 0
    last_asked: str = ""         # ISO datetime
    pulse_source: str = ""       # knowledge:character, meaning:values, ...


@dataclass
class ReaderProfile:
    reader_id: str
    display_name: str = ""
    provider: str = ""
    first_seen: str = ""
    last_seen: str = ""
    questions_total: int = 0
    topics: dict[str, TopicMemory] = field(default_factory=dict)
    last_topic: str = ""          # последняя тема для «расскажи подробнее»
    last_question: str = ""
    last_answer: str = ""
    conversation_count: int = 0


class ReaderMemoryStore:
    """
    Хранилище памяти читателей.

    Каждый читатель имеет профиль с историей тем.
    Книга «помнит», о чём с ним говорила.
    """

    def __init__(self, db_path: str | None = None):
        self._db_path = str(db_path or DB_PATH)
        self._conn: aiosqlite.Connection | None = None

    async def _ensure_db(self):
        if self._conn is not None:
            return
        db_manager = get_db_manager()
        self._conn = await db_manager.get_connection(
            db_path=self._db_path,
            migrations_dir=MIGRATIONS_DIR,
        )

    async def close(self):
        if self._conn is not None:
            await self._conn.close()
        self._conn = None

    # ── Профиль ────────────────────────────────────

    async def get_or_create(self, reader_id: str, display_name: str = "", provider: str = "") -> ReaderProfile:
        """Получить профиль читателя или создать новый."""
        await self._ensure_db()
        cursor = await self._conn.execute(
            "SELECT reader_id, display_name, provider, first_seen, last_seen, "
            "questions_total, last_topic, last_question, last_answer, conversation_count "
            "FROM readers WHERE reader_id = ?",
            (reader_id,),
        )
        row = await cursor.fetchone()

        now = datetime.now(tz=timezone.utc).isoformat()

        if not row:
            await self._conn.execute(
                "INSERT INTO readers (reader_id, display_name, provider, first_seen, last_seen) VALUES (?, ?, ?, ?, ?)",
                (reader_id, display_name, provider, now, now),
            )
            await self._conn.commit()
        else:
            display_name = display_name or row["display_name"]
            provider = provider or row["provider"]
            await self._conn.execute(
                "UPDATE readers SET display_name = COALESCE(NULLIF(?, ''), display_name), last_seen = ?, provider = COALESCE(NULLIF(?, ''), provider) WHERE reader_id = ?",
                (display_name, now, provider, reader_id),
            )
            await self._conn.commit()

        return await self._load_profile(reader_id)

    def _decay_depth(self, depth: float, last_asked: str) -> float:
        """Затухание глубины темы по времени."""
        if not last_asked or depth <= 0:
            return depth
        try:
            last_dt = datetime.fromisoformat(last_asked)
            now = datetime.now(tz=timezone.utc)
            days = (now - last_dt).days
            if days > 30:
                return depth * 0.2
            elif days > 7:
                return depth * 0.5
            return depth
        except Exception:
            return depth

    async def _load_profile(self, reader_id: str) -> ReaderProfile | None:
        cursor = await self._conn.execute(
            "SELECT * FROM readers WHERE reader_id = ?", (reader_id,)
        )
        row = await cursor.fetchone()
        if not row:
            return None

        profile = ReaderProfile(
            reader_id=row["reader_id"],
            display_name=row["display_name"] or "",
            provider=row["provider"] or "",
            first_seen=row["first_seen"],
            last_seen=row["last_seen"],
            questions_total=row["questions_total"],
            last_topic=row["last_topic"] or "",
            last_question=row["last_question"] or "",
            last_answer=row["last_answer"] or "",
            conversation_count=row["conversation_count"],
        )

        # Загрузить темы (с затуханием глубины)
        tc = await self._conn.execute(
            "SELECT name, depth, questions_count, last_asked, pulse_source FROM topics WHERE reader_id = ? ORDER BY depth DESC",
            (reader_id,),
        )
        for trow in await tc.fetchall():
            # Затухание глубины по времени
            decayed_depth = self._decay_depth(trow["depth"], trow["last_asked"] or "")
            profile.topics[trow["name"]] = TopicMemory(
                name=trow["name"],
                depth=decayed_depth,
                questions_count=trow["questions_count"],
                last_asked=trow["last_asked"] or "",
                pulse_source=trow["pulse_source"] or "",
            )

        return profile

    # ── Взаимодействие ─────────────────────────────

    async def record_interaction(
        self,
        reader_id: str,
        question: str,
        answer: str,
        topic: str = "",
        pulse_source: str = "",
    ):
        """Записать одно взаимодействие: вопрос-ответ."""
        await self._ensure_db()
        now = datetime.now(tz=timezone.utc).isoformat()

        # Обновить профиль
        await self._conn.execute(
            "UPDATE readers SET questions_total = questions_total + 1, "
            "last_seen = ?, last_topic = ?, last_question = ?, "
            "last_answer = ?, conversation_count = conversation_count + 1 "
            "WHERE reader_id = ?",
            (now, topic, question, answer, reader_id),
        )

        # Обновить или создать тему
        if topic:
            existing = await self._conn.execute(
                "SELECT depth, questions_count FROM topics WHERE reader_id = ? AND name = ?",
                (reader_id, topic),
            )
            row = await existing.fetchone()
            if row:
                new_depth = min(1.0, row["depth"] + 0.1)
                await self._conn.execute(
                    "UPDATE topics SET depth = ?, questions_count = questions_count + 1, "
                    "last_asked = ?, pulse_source = COALESCE(NULLIF(?, ''), pulse_source) "
                    "WHERE reader_id = ? AND name = ?",
                    (new_depth, now, pulse_source, reader_id, topic),
                )
            else:
                await self._conn.execute(
                    "INSERT INTO topics (reader_id, name, depth, questions_count, last_asked, pulse_source) "
                    "VALUES (?, ?, ?, 1, ?, ?)",
                    (reader_id, topic, 0.3, now, pulse_source),
                )

        await self._conn.commit()

    # ── «Расскажи подробнее» ───────────────────────

    async def get_last_topic_context(self, reader_id: str) -> dict:
        """
        Понять, о чём читатель спрашивал в прошлый раз.
        Возвращает контекст для «расскажи подробнее».
        """
        profile = await self._load_profile(reader_id)
        if not profile or not profile.last_topic:
            return {}

        topic = profile.topics.get(profile.last_topic)
        return {
            "topic": profile.last_topic,
            "depth": topic.depth if topic else 0.0,
            "last_question": profile.last_question,
            "last_answer": profile.last_answer,
            "source": topic.pulse_source if topic else "",
            "questions_count": topic.questions_count if topic else 0,
        }

    # ── Визуальная память ───────────────────────────

    async def save_visual_memory(
        self,
        reader_id: str,
        scene_id: str,
        image_hash: str,
        visual_spec_hash: str,
        character_id: str | None = None,
    ):
        """Сохранить запрос визуализации."""
        await self._ensure_db()
        now = datetime.now(tz=timezone.utc).isoformat()
        cached_until = (datetime.now(tz=timezone.utc) + timedelta(hours=24)).isoformat()

        await self._conn.execute(
            """
            INSERT OR REPLACE INTO visual_memory
                (reader_id, scene_id, character_id, image_hash, visual_spec_hash, created_at, cached_until)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (reader_id, scene_id, character_id, image_hash, visual_spec_hash, now, cached_until),
        )
        await self._conn.commit()

    async def get_visual_memory(self, reader_id: str, scene_id: str, character_id: str | None = None) -> dict | None:
        """Получить сохранённый визуал, если он ещё актуален."""
        await self._ensure_db()
        now = datetime.now(tz=timezone.utc).isoformat()

        query = """
            SELECT reader_id, scene_id, character_id, image_hash, visual_spec_hash, created_at, cached_until
            FROM visual_memory
            WHERE reader_id = ? AND scene_id = ? AND cached_until > ?
        """
        params: list = [reader_id, scene_id, now]
        if character_id is not None:
            query += " AND character_id = ?"
            params.append(character_id)
        else:
            query += " AND character_id IS NULL"

        cursor = await self._conn.execute(query, tuple(params))
        row = await cursor.fetchone()
        return dict(row) if row else None

    async def build_reader_context(self, reader_id: str) -> str:
        """
        Построить текстовый контекст читателя для Pulse/Voice.
        «Этот читатель уже спрашивал о Гиперборее. Ответить глубже.»
        """
        profile = await self._load_profile(reader_id)
        if not profile:
            return ""

        parts = [f"Читатель задал {profile.questions_total} вопросов."]

        if profile.topics:
            explored = sorted(profile.topics.values(), key=lambda t: t.depth, reverse=True)[:5]
            topic_desc = []
            for t in explored:
                level = "поверхностно" if t.depth < 0.4 else "в деталях" if t.depth > 0.7 else "умеренно"
                topic_desc.append(f"«{t.name}» ({level}, {t.questions_count} вопросов)")
            parts.append("Ранее обсуждал: " + ", ".join(topic_desc))

        if profile.last_topic:
            parts.append(f"Последняя тема: «{profile.last_topic}»")
            tc = profile.topics.get(profile.last_topic)
            if tc and tc.depth < 1.0:
                parts.append("Можно углубить эту тему.")

        return "\n".join(parts)

    # ── Очистка ─────────────────────────────────────

    async def prune_old_conversations(self, days: int = 30) -> dict:
        """Удалить диалоги старше N дней."""
        await self._ensure_db()
        cursor = await self._conn.execute(
            "DELETE FROM conversations WHERE created_at < datetime('now', ?)",
            (f"-{days} days",),
        )
        await self._conn.commit()
        return {"deleted": cursor.rowcount}

    # ── Статистика ─────────────────────────────────

    async def get_stats(self) -> dict:
        await self._ensure_db()
        cursor = await self._conn.execute("SELECT COUNT(*) as cnt FROM readers")
        readers = (await cursor.fetchone())["cnt"]
        tc = await self._conn.execute("SELECT COUNT(*) as cnt FROM topics")
        topics = (await tc.fetchone())["cnt"]
        qc = await self._conn.execute("SELECT COALESCE(SUM(questions_total), 0) as cnt FROM readers")
        questions = (await qc.fetchone())["cnt"]
        return {
            "total_readers": readers,
            "total_topics": topics,
            "total_questions": questions,
        }
