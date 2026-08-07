"""
generate_scenes_hf.py — генерация изображений через HuggingFace Inference API (бесплатно).

Использует бесплатный тариф HuggingFace для генерации изображений через Stable Diffusion.

Запуск:
    set HF_API_TOKEN=your_token_here
    python scripts/generate_scenes_hf.py

Получение токена:
    1. Зарегистрируйтесь на huggingface.co
    2. Перейдите в Settings → Access Tokens
    3. Создайте токен с правами "read"
"""
import json
import sys
import time
from pathlib import Path
import httpx

PROJECT_ROOT = Path(__file__).resolve().parent.parent
KNOWLEDGE_DIR = PROJECT_ROOT / "core" / "KNOWLEDGE"
OUTPUT_DIR = PROJECT_ROOT / "docs" / "images" / "scenes"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Модель для генерации (бесплатная на HF Inference)
MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
# Альтернатива (легче): "runwayml/stable-diffusion-v1-5"

API_URL = "https://api-inference.huggingface.co/models/{model}"


def generate_image(prompt: str, negative_prompt: str, token: str, model: str = MODEL) -> bytes | None:
    """Сгенерировать изображение через HF Inference API."""
    url = API_URL.format(model=model)
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "inputs": prompt,
        "parameters": {
            "negative_prompt": negative_prompt,
            "width": 1024,
            "height": 1024,
            "num_inference_steps": 25,
            "guidance_scale": 7.0,
        },
    }

    with httpx.Client(timeout=300) as client:
        r = client.post(url, json=payload, headers=headers)

        # Если модель загружается — ждём
        if r.status_code == 503:
            info = r.json()
            wait_time = info.get("estimated_time", 30)
            print(f"  Model loading, waiting {wait_time:.0f}s...")
            time.sleep(min(wait_time, 60))
            r = client.post(url, json=payload, headers=headers)

        if r.status_code == 200:
            return r.content
        else:
            print(f"  API error {r.status_code}: {r.text[:200]}")
            return None


def main():
    # Проверяем токен
    import os
    token = os.getenv("HF_API_TOKEN", "")
    if not token:
        print("ERROR: HF_API_TOKEN not set")
        print("Get your token at: https://huggingface.co/settings/tokens")
        print("Then run: set HF_API_TOKEN=your_token")
        sys.exit(1)

    # Загружаем промпты
    prompts_file = KNOWLEDGE_DIR / "SCENE_PROMPTS.json"
    data = json.loads(prompts_file.read_text(encoding="utf-8"))
    scenes = data["scenes"]
    print(f"Found {len(scenes)} scenes to generate")
    print(f"Model: {MODEL}")
    print(f"Output: {OUTPUT_DIR}")

    negative = "blurry, low quality, deformed, ugly, bad anatomy, watermark, text, signature, extra limbs"

    results = []
    for i, scene in enumerate(scenes, 1):
        scene_id = scene["id"]
        title = scene["title"]
        prompt = scene["prompt"]

        print(f"\n[{i}/{len(scenes)}] {title}")
        print(f"  Prompt: {prompt[:80]}...")

        try:
            start = time.time()
            image_bytes = generate_image(prompt, negative, token)
            elapsed = time.time() - start

            if image_bytes:
                output_path = OUTPUT_DIR / f"{scene_id}.png"
                output_path.write_bytes(image_bytes)
                results.append({
                    "id": scene_id,
                    "title": title,
                    "path": str(output_path),
                    "size": len(image_bytes),
                    "time": round(elapsed, 1),
                    "status": "ok",
                })
                print(f"  OK: {output_path.name} ({len(image_bytes)} bytes, {elapsed:.1f}s)")
            else:
                results.append({
                    "id": scene_id,
                    "title": title,
                    "status": "error",
                    "error": "API returned no image",
                })
                print(f"  ERROR: No image returned")

        except Exception as e:
            results.append({
                "id": scene_id,
                "title": title,
                "status": "error",
                "error": str(e),
            })
            print(f"  ERROR: {e}")

        # Пауза между запросами (rate limit)
        if i < len(scenes):
            time.sleep(2)

    # Сохраняем отчёт
    report_path = OUTPUT_DIR / "generation_report.json"
    report_path.write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Итоги
    ok = sum(1 for r in results if r["status"] == "ok")
    errors = sum(1 for r in results if r["status"] == "error")
    print(f"\n{'='*50}")
    print(f"Generated: {ok}/{len(scenes)} scenes")
    if errors:
        print(f"Errors: {errors}")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Report: {report_path}")


if __name__ == "__main__":
    main()
