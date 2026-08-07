"""
shared_config — единый источник конфигурации для Runtime и Book Intelligence.
Загружает .env из runtime/ один раз.
"""
from pathlib import Path
import os
from dotenv import load_dotenv

SHARED_ROOT = Path(__file__).resolve().parent           # runtime/
PROJECT_ROOT = SHARED_ROOT.parent                        # корень проекта
RUNTIME_DIR = SHARED_ROOT
BOOK_DIR = PROJECT_ROOT / "core"

dotenv_path = RUNTIME_DIR / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)


class SharedSettings:
    _validated = False

    @classmethod
    def validate(cls):
        """Проверить критические настройки при старте."""
        if cls._validated:
            return
        secret = cls.SESSION_SECRET
        if secret in ("change-me-in-production", "change-me", ""):
            raise RuntimeError(
                "SESSION_SECRET не изменён! "
                "Задайте безопасный случайный ключ в .env (SESSION_SECRET=<random>). "
                "Генерация: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )
        cls._validated = True
    # ── Gateway / Core ──────────────────────────────────
    GATEWAY_HOST: str = os.getenv("GATEWAY_HOST", "127.0.0.1")
    GATEWAY_PORT: int = int(os.getenv("GATEWAY_PORT", "8080"))
    CORE_HOST: str = os.getenv("CORE_HOST", "127.0.0.1")
    CORE_PORT: int = int(os.getenv("CORE_PORT", "8642"))

    # ── LLM / Hermes ────────────────────────────────────
    HERMES_URL: str = os.getenv("HERMES_URL", f"http://{GATEWAY_HOST}:{GATEWAY_PORT}")
    HERMES_API_KEY: str = os.getenv("HERMES_API_KEY", "hermes-local-dev-key")

    # ── Публичная сеть ─────────────────────────────────
    PUBLIC_BASE_URL: str = os.getenv("PUBLIC_BASE_URL", "")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "")  # For Telegram login links

    # ── GigaChat (Сбер) ─────────────────────────────────
    GIGACHAT_URL: str = os.getenv("GIGACHAT_URL", "https://gigachat.devices.sberbank.ru/api/v1")
    GIGACHAT_CLIENT_ID: str = os.getenv("GIGACHAT_CLIENT_ID", "")
    GIGACHAT_CLIENT_SECRET: str = os.getenv("GIGACHAT_CLIENT_SECRET", "")
    GIGACHAT_SCOPE: str = os.getenv("GIGACHAT_SCOPE", "GIGACHAT_API_PERS")
    GIGACHAT_TOKEN: str = os.getenv("GIGACHAT_TOKEN", "")
    GIGACHAT_VERIFY_SSL: bool = os.getenv("GIGACHAT_VERIFY_SSL", "true").lower() == "true"

    # ── Фоллбэки ───────────────────────────────────────
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "qwen/qwen-2.5-7b-instruct")
    HF_API_TOKEN: str = os.getenv("HF_API_TOKEN", "")
    HF_MODEL: str = os.getenv("HF_MODEL", "microsoft/Phi-3.5-mini-instruct")

    # ── Telegram ────────────────────────────────────────
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")

    # ── Auth / Security ─────────────────────────────────
    SESSION_SECRET: str = os.getenv("SESSION_SECRET", "change-me-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = int(os.getenv("JWT_EXPIRY_HOURS", "12"))

    # ── Database ────────────────────────────────────────
    AUTH_DB_PATH: str = os.getenv("AUTH_DB_PATH", str(RUNTIME_DIR / "memory" / "data" / "auth.db"))
    MEMORY_DB_PATH: str = os.getenv("MEMORY_DB_PATH", str(RUNTIME_DIR / "memory" / "data" / "memory.db"))

    # ── CORS ────────────────────────────────────────────
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

    # ── Google OAuth ────────────────────────────────────
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

    # ── Email ───────────────────────────────────────────
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "")

    # ComfyUI (Colab + Cloudflare Tunnel)
    COMFYUI_URL: str = os.getenv("COMFYUI_URL", "http://127.0.0.1:8188")

    # ── Genome (данные книги) ──────────────────────────
    GENOME_DIR: Path = Path(os.getenv("GENOME_DIR", str(BOOK_DIR / "genome")))
    GENOME_VERSION: str = os.getenv("GENOME_VERSION", "1.0.0")


settings = SharedSettings
