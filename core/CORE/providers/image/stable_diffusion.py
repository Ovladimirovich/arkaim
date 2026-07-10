"""Stable Diffusion Provider — обёртка над SD API (заглушка)."""
from typing import Optional
import httpx

from providers.image import ImageProvider


class StableDiffusionProvider(ImageProvider):
    """Генерирует изображения через Stable Diffusion API."""

    def __init__(self, base_url: str = "http://localhost:7860"):
        self._base_url = base_url

    async def generate(self, prompt: str, size: str = "1024x1024") -> bytes:
        width, height = self._parse_size(size)
        payload = {
            "prompt": prompt,
            "width": width,
            "height": height,
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self._base_url}/sdapi/v1/txt2img",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            images = data.get("images", [])
            if not images:
                raise RuntimeError("Empty response from SD API")
            import base64
            return base64.b64decode(images[0])

    async def health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self._base_url}/sdapi/v1/sd-models")
                return resp.status_code == 200 and len(resp.json()) > 0
        except Exception:
            return False

    @staticmethod
    def _parse_size(size: str) -> tuple[int, int]:
        try:
            w, h = size.split("x")
            return int(w), int(h)
        except Exception:
            return 1024, 1024