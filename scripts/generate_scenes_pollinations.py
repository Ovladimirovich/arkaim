"""
generate_scenes_pollinations.py — генерация изображений через Pollinations.ai (бесплатно, без ключа).

Pollinations.ai — бесплатный AI-сервис для генерации изображений.
Не требует API ключа, не требует GPU.

Запуск:
    python scripts/generate_scenes_pollinations.py
"""
import json
import sys
import time
import urllib.parse
from pathlib import Path
import httpx

PROJECT_ROOT = Path(__file__).resolve().parent.parent
KNOWLEDGE_DIR = PROJECT_ROOT / "core" / "KNOWLEDGE"
OUTPUT_DIR = PROJECT_ROOT / "docs" / "images" / "scenes"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

API_URL = "https://image.pollinations.ai/prompt/{prompt}"


def generate_image(prompt: str, width: int = 1024, height: int = 1024) -> bytes | None:
    """Сгенерировать изображение через Pollinations.ai."""
    encoded = urllib.parse.quote(prompt)
    url = f"{API_URL.format(prompt=encoded)}?width={width}&height={height}&nologo=true&seed=42"

    with httpx.Client(timeout=120, follow_redirects=True) as client:
        r = client.get(url)
        if r.status_code == 200 and len(r.content) > 1000:
            return r.content
        return None


def main():
    # Загружаем промпты
    prompts_file = KNOWLEDGE_DIR / "SCENE_PROMPTS.json"
    data = json.loads(prompts_file.read_text(encoding="utf-8"))
    scenes = data["scenes"]
    print(f"Found {len(scenes)} scenes to generate")
    print(f"API: Pollinations.ai (free, no key required)")
    print(f"Output: {OUTPUT_DIR}")

    results = []
    for i, scene in enumerate(scenes, 1):
        scene_id = scene["id"]
        title = scene["title"]
        prompt = scene["prompt"]

        print(f"\n[{i}/{len(scenes)}] {title}")
        print(f"  Prompt: {prompt[:80]}...")

        try:
            start = time.time()
            image_bytes = generate_image(prompt)
            elapsed = time.time() - start

            if image_bytes:
                output_path = OUTPUT_DIR / f"{scene_id}.jpg"
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
                    "error": "No image returned",
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

        # Пауза между запросами
        if i < len(scenes):
            time.sleep(3)

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
