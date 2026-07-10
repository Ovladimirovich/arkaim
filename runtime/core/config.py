"""
config — совместимость: проксирует shared_config.shared + добавляет 2 поля.
Импорты типа `from core.config import settings` продолжают работать.
"""
import os

from shared_config import shared


class Settings:
    """Прокси к SharedSettings с двумя дополнительными полями."""

    def __getattr__(self, name: str):
        return getattr(shared, name)

    # Дополнительные поля, которых нет в shared_config
    HERMES_SKILLS_PATH: str = os.getenv("HERMES_SKILLS_PATH", "")
    BUSINESS_PACK: str = os.getenv("BUSINESS_PACK", "")


settings = Settings()
