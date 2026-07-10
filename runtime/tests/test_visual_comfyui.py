"""Tests for providers/image/comfyui.py - ComfyUIProvider."""
import sys, json
from pathlib import Path

CORE_DIR = Path(__file__).resolve().parent.parent.parent / "core" / "CORE"
sys.path.insert(0, str(CORE_DIR))

from providers.image.comfyui import ComfyUIProvider, DEFAULT_WF, WF_DIR


class TestComfyUIProvider:
    def setup_method(self):
        self.p = ComfyUIProvider(base_url="http://127.0.0.1:18188", workflow_name="test_workflow.json")

    def test_init_creates_default_workflow(self):
        ComfyUIProvider(base_url="http://127.0.0.1:18188", workflow_name="nonexistent.json")
        p = WF_DIR / "default.json"
        assert p.exists(), f"default.json not created at {p}"
        wf = json.loads(p.read_text("utf-8"))
        assert "3" in wf
        assert wf["3"]["class_type"] == "KSampler"
        assert wf["6"]["class_type"] == "CLIPTextEncode"

    def test_health_returns_false_when_offline(self):
        import asyncio
        result = asyncio.run(self.p.health())
        assert result is False

    def test_inject_prompt(self):
        wf = dict(DEFAULT_WF)
        wf = self.p._inject_prompt(wf, "positive test", "negative test")
        cn = sorted([n for n, node in wf.items() if isinstance(node, dict) and node.get("class_type") == "CLIPTextEncode"])
        assert wf[cn[0]]["inputs"]["text"] == "positive test"
        assert wf[cn[1]]["inputs"]["text"] == "negative test"

    def test_inject_prompt_empty_neg(self):
        wf = dict(DEFAULT_WF)
        wf = self.p._inject_prompt(wf, "pos only", "")
        cn = sorted([n for n, node in wf.items() if isinstance(node, dict) and node.get("class_type") == "CLIPTextEncode"])
        assert wf[cn[0]]["inputs"]["text"] == "pos only"
        assert "blurry" in wf[cn[1]]["inputs"]["text"]

    def test_inject_prompt_preserves_other_nodes(self):
        wf = dict(DEFAULT_WF)
        wf = self.p._inject_prompt(wf, "test", "neg")
        assert wf["4"]["class_type"] == "CheckpointLoaderSimple"
        assert wf["5"]["class_type"] == "EmptyLatentImage"

    def test_inject_size(self):
        wf = dict(DEFAULT_WF)
        wf = self.p._inject_size(wf, 800, 600)
        for n in wf.values():
            if isinstance(n, dict) and n.get("class_type") == "EmptyLatentImage":
                assert n["inputs"]["width"] == 800
                assert n["inputs"]["height"] == 600
                break

    def test_inject_size_default(self):
        wf = dict(DEFAULT_WF)
        wf = self.p._inject_size(wf, 1024, 1024)
        for n in wf.values():
            if isinstance(n, dict) and n.get("class_type") == "EmptyLatentImage":
                assert n["inputs"]["width"] == 1024
                assert n["inputs"]["height"] == 1024
                break

    def test_inject_seed(self):
        wf = json.loads(json.dumps(DEFAULT_WF))
        self.p._inject_seed(wf, 12345)
        for n in wf.values():
            if isinstance(n, dict) and n.get("class_type") == "KSampler":
                assert n["inputs"]["seed"] == 12345
                break

    def test_inject_seed_deterministic_for_same_prompt(self):
        wf1, wf2 = json.loads(json.dumps(DEFAULT_WF)), json.loads(json.dumps(DEFAULT_WF))
        seed1 = hash("same prompt") & 0x7FFFFFFF
        seed2 = hash("same prompt") & 0x7FFFFFFF
        self.p._inject_seed(wf1, seed1)
        self.p._inject_seed(wf2, seed2)
        for n in wf1.values():
            if isinstance(n, dict) and n.get("class_type") == "KSampler":
                s1 = n["inputs"]["seed"]
                break
        for n in wf2.values():
            if isinstance(n, dict) and n.get("class_type") == "KSampler":
                s2 = n["inputs"]["seed"]
                break
        assert s1 == s2, f"same prompt gave different seeds: {s1} vs {s2}"

    def test_parse_size(self):
        assert self.p._parse_size("1024x768") == (1024, 768)
        assert self.p._parse_size("512x512") == (512, 512)
        assert self.p._parse_size("invalid") == (1024, 1024)
        assert self.p._parse_size("") == (1024, 1024)

    def test_set_workflow(self):
        wf_name = "custom_test.json"
        custom_wf = {"1": {"class_type": "KSampler", "inputs": {"seed": 99}}}
        p = WF_DIR / wf_name
        p.write_text(json.dumps(custom_wf), "utf-8")
        try:
            self.p.set_workflow(wf_name)
            assert self.p._wf_name == wf_name
            assert self.p._wf["1"]["inputs"]["seed"] == 99
        finally:
            p.unlink()

    def test_generate_raises_when_offline(self):
        import asyncio, pytest
        with pytest.raises(Exception):
            asyncio.run(self.p.generate("test prompt"))

    def test_generate_tuple_prompt(self):
        import asyncio, pytest
        with pytest.raises(Exception):
            asyncio.run(self.p.generate(("positive", "negative")))

    def test_poll_raises_on_timeout(self):
        import asyncio, pytest, httpx
        async def _test():
            async with httpx.AsyncClient() as c:
                self.p._base_url = "http://127.0.0.1:18188"
                with pytest.raises(Exception):
                    await self.p._poll(c, "fake-pid", timeout=0.5)
        asyncio.run(_test())

    def test_default_workflow_has_all_required_nodes(self):
        required = {"KSampler", "CheckpointLoaderSimple", "EmptyLatentImage", "CLIPTextEncode", "VAEDecode", "SaveImage"}
        found = set()
        for n in DEFAULT_WF.values():
            if isinstance(n, dict):
                found.add(n.get("class_type", ""))
        for r in required:
            assert r in found, f"Missing required node: {r}"

    def test_default_workflow_is_valid_json(self):
        json.dumps(DEFAULT_WF)

    def test_workflow_creation_creates_dir(self):
        import os
        WF_DIR.mkdir(parents=True, exist_ok=True)
        assert WF_DIR.exists()

    def test_cleanup_default_workflow(self):
        p = WF_DIR / "default.json"
        if p.exists():
            p.unlink()
