"""Tests for visual asset provider selection and metadata."""
import sys
from pathlib import Path

CORE_DIR = Path(__file__).resolve().parent.parent.parent / "core" / "CORE"
sys.path.insert(0, str(CORE_DIR))

import pytest

from providers.image import ImageProviderChain
from visual_assets.pipeline import AssetGenerationPipeline


class StubProvider:
    def __init__(self, name: str, payload: bytes = b"img", healthy: bool = True):
        self.name = name
        self.payload = payload
        self.healthy = healthy

    async def generate(self, prompt: str, size: str = "1024x1024") -> bytes:
        return self.payload

    async def health(self) -> bool:
        return self.healthy


class FakeAssetStore:
    def __init__(self):
        self.saved_assets = []

    async def save(self, asset):
        self.saved_assets.append(asset)

    def save_file(self, asset_id, asset_type, data):
        return f"/tmp/{asset_id}.png"


class FakeSceneEngine:
    def get_scene(self, chapter, scene_id):
        return {
            "title": "Moonlit Gate",
            "emotion": "mysterious",
            "characters": [],
            "location": "ruins",
            "objects": [],
            "meaning_tags": [],
            "color_palette": ["#111111"],
        }

    def get_character_visual(self, char_id):
        return None

    def get_location_visual(self, location_id):
        return {"type": "ruins", "atmosphere": "mist", "architecture": "stone", "lighting": "moonlight"}


@pytest.mark.asyncio
async def test_image_provider_chain_returns_provider_metadata():
    chain = ImageProviderChain([
        StubProvider("mock", payload=b"mock", healthy=True),
        StubProvider("pollinations", payload=b"real", healthy=True),
    ])

    result = await chain.generate_with_metadata("prompt", preferred_provider="pollinations")

    assert result.provider_name == "pollinations"
    assert result.provider_kind == "real"
    assert result.bytes == b"real"


@pytest.mark.asyncio
async def test_pipeline_records_provider_in_asset_metadata():
    chain = ImageProviderChain([
        StubProvider("mock", payload=b"mock", healthy=True),
        StubProvider("pollinations", payload=b"real", healthy=True),
    ])
    store = FakeAssetStore()
    pipeline = AssetGenerationPipeline(
        scene_engine=FakeSceneEngine(),
        prompt_builder=None,
        image_provider=chain,
        asset_store=store,
    )

    asset = await pipeline.generate_image(1, "scene-1", {"provider": "pollinations"})

    assert asset.generation.provider == "pollinations"
    assert asset.status.value == "completed"
    assert asset.file_path is not None
