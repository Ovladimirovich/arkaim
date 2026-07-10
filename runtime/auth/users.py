from datetime import datetime, timezone
from pathlib import Path
import uuid

import aiosqlite

from core.config import settings
from core.database import get_db_manager


DB_PATH = Path(settings.AUTH_DB_PATH)
DB_DIR = DB_PATH.parent
MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


class UserStore:
    def __init__(self, db_path: str | None = None):
        self._db_path = str(db_path or DB_PATH)
        self._conn: aiosqlite.Connection | None = None

    async def _ensure_db(self):
        if self._conn is not None:
            return
        if self._db_path == ":memory:":
            # Для :memory: создаём схему напрямую (миграции не работают с :memory:)
            self._conn = await aiosqlite.connect(":memory:")
            self._conn.row_factory = aiosqlite.Row
            await self._conn.executescript("""
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY, provider TEXT NOT NULL, provider_user_id TEXT NOT NULL,
                    username TEXT, display_name TEXT, role TEXT NOT NULL DEFAULT 'reader',
                    is_active BOOLEAN NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_uid ON users(provider, provider_user_id);
                CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL,
                    expires_at TEXT NOT NULL, created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
                CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
                CREATE TABLE IF NOT EXISTS api_keys (
                    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, key_prefix TEXT NOT NULL,
                    key_hash TEXT NOT NULL, name TEXT, last_used_at TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT 1, created_at TEXT NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
                CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
            """)
        else:
            db_manager = get_db_manager()
            self._conn = await db_manager.get_connection(
                db_path=self._db_path,
                migrations_dir=MIGRATIONS_DIR,
            )

    async def close(self):
        if self._conn is not None:
            await self._conn.close()
        self._conn = None

    async def get_user_by_provider(self, provider: str, provider_user_id: str) -> dict | None:
        await self._ensure_db()
        cursor = await self._conn.execute(
            "SELECT id, provider, provider_user_id, username, display_name, role, is_active, created_at, updated_at "
            "FROM users WHERE provider = ? AND provider_user_id = ?",
            (provider, provider_user_id),
        )
        row = await cursor.fetchone()
        if not row:
            return None
        return dict(row)

    async def upsert_user(
        self,
        provider: str,
        provider_user_id: str,
        username: str | None = None,
        display_name: str | None = None,
        role: str = "reader",
    ) -> dict:
        await self._ensure_db()
        now = datetime.now(tz=timezone.utc).isoformat()
        existing = await self.get_user_by_provider(provider, provider_user_id)
        if existing:
            await self._conn.execute(
                "UPDATE users SET username = COALESCE(?, username), display_name = COALESCE(?, display_name), "
                "role = ?, updated_at = ? WHERE id = ?",
                (username, display_name, role, now, existing["id"]),
            )
            await self._conn.commit()
            return await self.get_user_by_provider(provider, provider_user_id)
        user_id = uuid.uuid4().hex
        await self._conn.execute(
            "INSERT INTO users (id, provider, provider_user_id, username, display_name, role, is_active, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
            (user_id, provider, provider_user_id, username, display_name, role, now, now),
        )
        await self._conn.commit()
        return await self.get_user_by_provider(provider, provider_user_id)

    async def get_user(self, user_id: str) -> dict | None:
        await self._ensure_db()
        cursor = await self._conn.execute(
            "SELECT id, provider, provider_user_id, username, display_name, role, is_active, created_at, updated_at "
            "FROM users WHERE id = ?",
            (user_id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None

    async def list_users(self, limit: int = 100, offset: int = 0) -> list[dict]:
        await self._ensure_db()
        cursor = await self._conn.execute(
            "SELECT id, provider, provider_user_id, username, display_name, role, is_active, created_at, updated_at "
            "FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (limit, offset),
        )
        return [dict(row) for row in await cursor.fetchall()]

    async def set_role(self, user_id: str, role: str) -> bool:
        await self._ensure_db()
        cursor = await self._conn.execute(
            "UPDATE users SET role = ?, updated_at = ? WHERE id = ?",
            (role, datetime.now(tz=timezone.utc).isoformat(), user_id),
        )
        await self._conn.commit()
        return cursor.rowcount > 0

    async def set_active(self, user_id: str, is_active: bool) -> bool:
        await self._ensure_db()
        cursor = await self._conn.execute(
            "UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?",
            (1 if is_active else 0, datetime.now(tz=timezone.utc).isoformat(), user_id),
        )
        await self._conn.commit()
        return cursor.rowcount > 0

    async def save_session(self, session_id: str, user_id: str, token_hash: str, expires_at: datetime):
        await self._ensure_db()
        now = datetime.now(tz=timezone.utc).isoformat()
        await self._conn.execute(
            "INSERT OR REPLACE INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)",
            (session_id, user_id, token_hash, expires_at.isoformat(), now),
        )
        await self._conn.commit()

    async def get_session(self, session_id: str) -> dict | None:
        await self._ensure_db()
        cursor = await self._conn.execute(
            "SELECT id, user_id, token_hash, expires_at, created_at FROM sessions WHERE id = ?",
            (session_id,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None

    async def delete_session(self, session_id: str) -> bool:
        await self._ensure_db()
        cursor = await self._conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        await self._conn.commit()
        return cursor.rowcount > 0

    async def save_api_key(self, user_id: str, key_prefix: str, key_hash: str, name: str | None = None) -> str:
        await self._ensure_db()
        key_id = uuid.uuid4().hex
        now = datetime.now(tz=timezone.utc).isoformat()
        await self._conn.execute(
            "INSERT INTO api_keys (id, user_id, key_prefix, key_hash, name, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (key_id, user_id, key_prefix, key_hash, name, now),
        )
        await self._conn.commit()
        return key_id

    async def list_api_keys(self, user_id: str) -> list[dict]:
        await self._ensure_db()
        cursor = await self._conn.execute(
            "SELECT id, user_id, key_prefix, key_hash, name, last_used_at, is_active, created_at "
            "FROM api_keys WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        )
        return [dict(row) for row in await cursor.fetchall()]

    async def get_api_key_by_hash(self, key_hash: str) -> dict | None:
        await self._ensure_db()
        cursor = await self._conn.execute(
            "SELECT id, user_id, key_prefix, key_hash, name, last_used_at, is_active, created_at "
            "FROM api_keys WHERE key_hash = ?",
            (key_hash,),
        )
        row = await cursor.fetchone()
        return dict(row) if row else None

    async def revoke_api_key(self, key_id: str) -> bool:
        await self._ensure_db()
        cursor = await self._conn.execute("UPDATE api_keys SET is_active = 0 WHERE id = ?", (key_id,))
        await self._conn.commit()
        return cursor.rowcount > 0

    async def touch_api_key(self, key_id: str):
        await self._ensure_db()
        now = datetime.now(tz=timezone.utc).isoformat()
        await self._conn.execute("UPDATE api_keys SET last_used_at = ? WHERE id = ?", (now, key_id))
        await self._conn.commit()

    # ── Admin methods ─────────────────────────────────

    async def delete_user_sessions(self, user_id: str) -> int:
        """Удалить все сессии пользователя."""
        await self._ensure_db()
        cursor = await self._conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        await self._conn.commit()
        return cursor.rowcount

    async def delete_user_api_keys(self, user_id: str) -> int:
        """Удалить все API-ключи пользователя."""
        await self._ensure_db()
        cursor = await self._conn.execute("DELETE FROM api_keys WHERE user_id = ?", (user_id,))
        await self._conn.commit()
        return cursor.rowcount

    async def list_sessions(self, limit: int = 200) -> list[dict]:
        """Список всех сессий."""
        await self._ensure_db()
        cursor = await self._conn.execute(
            "SELECT id, user_id, expires_at, created_at FROM sessions ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        return [dict(row) for row in await cursor.fetchall()]

    async def list_all_api_keys(self, limit: int = 200) -> list[dict]:
        """Список всех API-ключей."""
        await self._ensure_db()
        cursor = await self._conn.execute(
            "SELECT id, user_id, key_prefix, name, last_used_at, is_active, created_at "
            "FROM api_keys ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        return [dict(row) for row in await cursor.fetchall()]
