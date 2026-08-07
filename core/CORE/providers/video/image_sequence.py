"""ImageSequenceVideoProvider — генерация видео из последовательности кадров через ffmpeg."""
from __future__ import annotations

import asyncio
import logging
import os
import shutil
import tempfile
from typing import Any

from . import VideoProvider

log = logging.getLogger("visual_assets.video.image_sequence")


class ImageSequenceVideoProvider(VideoProvider):
    """Генерирует видео из последовательности изображений через ffmpeg.

    Использует ImageProvider для генерации кадров, затем собирает через ffmpeg.
    """

    def __init__(self, image_provider: Any):
        self._image_provider = image_provider

    async def generate(self, prompt: str, duration: float = 8.0, size: str = "1024x576", fps: int = 24) -> bytes:
        total_frames = int(fps * duration)

        with tempfile.TemporaryDirectory() as tmpdir:
            # Генерируем кадры
            for i in range(total_frames):
                frame_prompt = f"{prompt}, frame {i+1} of {total_frames}, cinematic"
                try:
                    frame_bytes = await self._image_provider.generate(frame_prompt, size=size)
                except Exception as e:
                    log.warning("frame_gen_failed frame=%d error=%s", i, e)
                    # Генерируем placeholder
                    frame_bytes = self._create_placeholder_frame(size)

                frame_path = os.path.join(tmpdir, f"frame_{i:04d}.png")
                with open(frame_path, "wb") as f:
                    f.write(frame_bytes)

            # Собрать видео через ffmpeg
            output_path = os.path.join(tmpdir, "output.mp4")
            cmd = (
                f'ffmpeg -y -framerate {fps} '
                f'-i "{tmpdir}/frame_%04d.png" '
                f'-c:v libx264 -pix_fmt yuv420p -crf 18 '
                f'-movflags +faststart '
                f'"{output_path}"'
            )
            proc = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode != 0:
                raise RuntimeError(f"ffmpeg failed: {stderr.decode()[:500]}")

            with open(output_path, "rb") as f:
                return f.read()

    async def health(self) -> bool:
        # Проверяем наличие ffmpeg
        try:
            proc = await asyncio.create_subprocess_shell(
                "ffmpeg -version", stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            await proc.communicate()
            return proc.returncode == 0
        except Exception:
            return False

    def _create_placeholder_frame(self, size: str) -> bytes:
        """Создать SVG placeholder кадр."""
        w, h = (1024, 576)
        if "x" in size:
            try:
                w, h = map(int, size.split("x"))
            except ValueError:
                pass
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}">
            <rect width="100%" height="100%" fill="#1a1a2e"/>
            <text x="50%" y="50%" text-anchor="middle" fill="#e0e0e0" font-size="24">
                Generating...
            </text>
        </svg>'''
        return svg.encode("utf-8")
