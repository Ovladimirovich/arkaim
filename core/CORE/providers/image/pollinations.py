"""
Pollinations.ai Provider — бесплатная генерация изображений без API ключа.

https://pollinations.ai — бесплатный AI-сервис для генерации изображений.
Не требует GPU, не требует ключа, работает из РФ.
Используется как fallback когда ComfyUI недоступен.
"""
import asyncio
import logging
import urllib.parse
import httpx

from providers.image import ImageProvider

log = logging.getLogger("hermes.visualization.pollinations")


class PollinationsProvider(ImageProvider):
    """Генерирует изображения через Pollinations.ai (бесплатно)."""

    def __init__(self, base_url: str = "https://image.pollinations.ai"):
        self._base_url = base_url

    async def generate(self, prompt: str, size: str = "1024x1024") -> bytes:
        width, height = self._parse_size(size)
        encoded = urllib.parse.quote(prompt)
        url = f"{self._base_url}/prompt/{encoded}?width={width}&height={height}&nologo=true&seed=42"

        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            if len(resp.content) < 1000:
                raise RuntimeError("Pollinations returned empty image")
            return resp.content

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                resp = await client.get(f"{self._base_url}/prompt/test?width=128&height=128&nologo=true")
                return resp.status_code == 200 and len(resp.content) > 1000
        except Exception:
            return False

    @staticmethod
    def _parse_size(size: str) -> tuple[int, int]:
        try:
            width, height = size.split("x")
            return int(width), int(height)
        except Exception:
            return 1024, 1024
