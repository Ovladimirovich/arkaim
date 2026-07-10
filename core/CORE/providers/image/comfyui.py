"""
ComfyUI Provider — генерация изображений через ComfyUI API (POST /prompt).
"""
import asyncio
import json
import logging
from pathlib import Path
import httpx
from providers.image import ImageProvider
from config import config

log = logging.getLogger("hermes.visualization.comfyui")
WF_DIR = config.GENOME_DIR / "workflows"
WF_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_WF = {
    "3": {"class_type": "KSampler", "inputs": {"seed": 42, "steps": 30, "cfg": 7.0, "sampler_name": "euler", "scheduler": "normal", "denoise": 1.0, "model": ["4", 0], "positive": ["6", 0], "negative": ["7", 0], "latent_image": ["5", 0]}},
    "4": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": "sd_xl_base_1.0.safetensors"}},
    "5": {"class_type": "EmptyLatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
    "6": {"class_type": "CLIPTextEncode", "inputs": {"text": "", "clip": ["4", 1]}},
    "7": {"class_type": "CLIPTextEncode", "inputs": {"text": "blurry, low quality", "clip": ["4", 1]}},
    "8": {"class_type": "VAEDecode", "inputs": {"samples": ["3", 0], "vae": ["4", 2]}},
    "9": {"class_type": "SaveImage", "inputs": {"filename_prefix": "arkaim", "images": ["8", 0]}},
}

class ComfyUIProvider(ImageProvider):
    def __init__(self, base_url="http://127.0.0.1:8188", workflow_name="default.json"):
        self._base_url = base_url.rstrip("/")
        self._wf_name = workflow_name
        self._wf = self._load(workflow_name)

    def _load(self, name):
        p = WF_DIR / name
        if p.exists():
            log.info("comfyui_loaded name=%s", name)
            return json.loads(p.read_text("utf-8"))
        log.warning("comfyui_not_found name=%s, using default", name)
        dp = WF_DIR / "default.json"
        if not dp.exists():
            dp.write_text(json.dumps(DEFAULT_WF, indent=2), "utf-8")
        return dict(DEFAULT_WF)

    def _inject_prompt(self, wf, pos, neg):
        wf = json.loads(json.dumps(wf))
        cn = sorted([n for n, node in wf.items() if isinstance(node, dict) and node.get("class_type") == "CLIPTextEncode"])
        if cn: wf[cn[0]]["inputs"]["text"] = pos
        if len(cn) > 1: wf[cn[1]]["inputs"]["text"] = neg or "blurry, low quality"
        return wf

    def _inject_size(self, wf, w, h):
        wf = json.loads(json.dumps(wf))
        for n in wf.values():
            if isinstance(n, dict) and n.get("class_type") == "EmptyLatentImage":
                n["inputs"]["width"] = w; n["inputs"]["height"] = h; break
        return wf

    def set_workflow(self, name):
        self._wf = self._load(name); self._wf_name = name

    def _inject_seed(self, wf, seed):
        for n in wf.values():
            if isinstance(n, dict) and n.get("class_type") == "KSampler":
                n["inputs"]["seed"] = seed

    async def generate(self, prompt, size="1024x1024"):
        w, h = self._parse_size(size); neg = ""
        if isinstance(prompt, tuple): prompt, neg = prompt
        wf = self._inject_prompt(self._wf, prompt, neg)
        wf = self._inject_size(wf, w, h)
        self._inject_seed(wf, hash(prompt) & 0x7FFFFFFF)
        async with httpx.AsyncClient(timeout=180) as c:
            r = await c.post(f"{self._base_url}/prompt", json={"prompt": wf})
            r.raise_for_status()
            pid = r.json().get("prompt_id", "")
            if not pid: raise RuntimeError(f"no prompt_id: {r.json()}")
            return await self._poll(c, pid)

    async def health(self):
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                return (await c.get(f"{self._base_url}/system_stats")).status_code == 200
        except Exception: return False

    async def _poll(self, c, pid, timeout=180):
        start = asyncio.get_event_loop().time()
        while True:
            if asyncio.get_event_loop().time() - start > timeout:
                raise TimeoutError(f"comfyui_timeout pid={pid}")
            await asyncio.sleep(1)
            r = await c.get(f"{self._base_url}/history/{pid}")
            if r.status_code != 200: continue
            h = r.json().get(pid, {})
            for no in h.get("outputs", {}).values():
                imgs = no.get("images", [])
                if imgs:
                    vr = await c.get(f"{self._base_url}/view", params={"filename": imgs[0]["filename"], "subfolder": imgs[0].get("subfolder", ""), "type": "output"})
                    vr.raise_for_status(); return vr.content
            if h.get("status", {}).get("status_str") == "error":
                raise RuntimeError(f"comfyui_error pid={pid}")

    @staticmethod
    def _parse_size(s):
        try: w, h = s.split("x"); return int(w), int(h)
        except: return 1024, 1024
