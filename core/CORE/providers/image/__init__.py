"""Image providers — генерация изображений для Visualization Layer."""
from typing import Optional
from abc import ABC, abstractmethod


class ImageProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str, size: str = "1024x1024") -> bytes:
        raise NotImplementedError()

    @abstractmethod
    async def health(self) -> bool:
        raise NotImplementedError()


class ImageProviderChain:
    def __init__(self, providers: list[ImageProvider]):
        self.providers = providers

    async def generate(self, prompt: str, size: str = "1024x1024") -> bytes:
        last_exc = None
        for provider in self.providers:
            try:
                if await provider.health():
                    return await provider.generate(prompt, size)
            except Exception as exc:
                last_exc = exc
                continue
        raise RuntimeError(f"All image providers failed, last error: {last_exc}")


from .mock import MockImageProvider
from .svg_template import SVGTemplateProvider
from .stable_diffusion import StableDiffusionProvider
from .comfyui import ComfyUIProvider

__all__ = ["ImageProvider", "ImageProviderChain", "MockImageProvider", "SVGTemplateProvider", "StableDiffusionProvider", "ComfyUIProvider"]