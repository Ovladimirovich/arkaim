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
    CHATPDF_KEY: str = os.getenv("CHATPDF_KEY", "")
    PROVIDER_CHAIN = os.getenv("PROVIDER_CHAIN", "gigachat,openrouter,huggingface").split(",")
    PROVIDER_FAILURE_THRESHOLD: int = int(os.getenv("PROVIDER_FAILURE_THRESHOLD", "3"))
    PROVIDER_COOLDOWN_SECONDS: int = int(os.getenv("PROVIDER_COOLDOWN_SECONDS", "60"))

    # ── API (Book Intelligence) ─────────────────────────
    API_PORT: int = int(os.getenv("API_PORT", "9090"))  # legacy standalone Book API
    API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
    DEFAULT_LLM_MODEL: str = "GigaChat-Pro"
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "intfloat/multilingual-e5-small")

    # ── Безопасность / Аутентификация ───────────────────
    ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    API_KEYS: list = [k.strip() for k in os.getenv("API_KEYS", "").split(",") if k.strip()]
    SESSION_SECRET: str = os.getenv("SESSION_SECRET", "change-me-in-production")
    AUTH_DB_PATH: str = os.getenv("AUTH_DB_PATH", str(RUNTIME_DIR / "memory" / "data" / "auth.db"))

    # ── Telegram / Google OAuth ─────────────────────────
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_BOT_USERNAME: str = os.getenv("TELEGRAM_BOT_USERNAME", "")
    TELEGRAM_ADMIN_CHAT_ID: str = os.getenv("TELEGRAM_ADMIN_CHAT_ID", "")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv("GOOGLE_REDIRECT_URI", "")

    # ── VK интеграция ───────────────────────────────────
    VK_GROUP_ID: str = os.getenv("VK_GROUP_ID", "")
    VK_ACCESS_TOKEN: str = os.getenv("VK_ACCESS_TOKEN", "")
    VK_CONFIRMATION_CODE: str = os.getenv("VK_CONFIRMATION_CODE", "")

    # ── Rate limiting ───────────────────────────────────
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", "100"))
    RATE_LIMIT_BURST: int = int(os.getenv("RATE_LIMIT_BURST", "20"))

    # ── Book Identity ───────────────────────────────────
    GENOME_VERSION: str = "1.0.0"
    MIN_VALIDATION_SCORE: float = 0.7


shared = SharedSettings()
SharedSettings.validate()
