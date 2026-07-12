"""
LLM Client — единый интерфейс для LLM (OpenRouter).

Используется Voice для озвучки, KeeperAgent для формулировок.
"""
from typing import List, Dict, Optional, AsyncIterator
import httpx
import os


class LLMClient:
    """
    Клиент для OpenRouter API.

    Voice использует этот клиент как микрофон.
    """

    def __init__(self):
        self.url = "https://openrouter.ai/api/v1"
        self.api_key = os.getenv("OPENROUTER_API_KEY", "")
        self.model = os.getenv("OPENROUTER_MODEL", "qwen/qwen-2.5-7b-instruct")
        limits = httpx.Limits(
            max_keepalive_connections=20,
            max_connections=100,
            keepalive_expiry=30.0,
        )
        self._client = httpx.AsyncClient(
            timeout=120.0,
            limits=limits,
        )

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> str:
        """
        Отправить запрос к OpenRouter API.

        Voice вызывает этот метод для формулировки ответа.
        """
        try:
            response = await self._client.post(
                f"{self.url}/chat/completions",
                json={
                    "messages": messages,
                    "model": model or self.model,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://arkaim.ru",
                    "X-Title": "Наследие Аркаима",
                },
            )
            response.raise_for_status()
            data = response.json()
            if "error" in data:
                raise RuntimeError(f"LLM service error: {data['error']}")
            if "choices" not in data or not data["choices"]:
                raise RuntimeError("LLM empty response")
            return data["choices"][0]["message"]["content"]
        except httpx.HTTPStatusError as e:
            error_detail = ""
            try:
                error_detail = e.response.json()
            except Exception:
                error_detail = e.response.text[:200]
            if e.response.status_code == 429:
                raise RuntimeError("LLM rate_limit_exceeded")
            raise RuntimeError(f"LLM HTTP {e.response.status_code}: {error_detail}")
        except Exception as e:
            raise RuntimeError(f"LLM request failed: {e}")

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
    ) -> AsyncIterator[str]:
        """Потоковый чат для Voice."""
        try:
            async with self._client.stream(
                "POST",
                f"{self.url}/chat/completions",
                json={
                    "messages": messages,
                    "model": model or self.model,
                    "stream": True,
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://arkaim.ru",
                    "X-Title": "Наследие Аркаима",
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        yield line
        except Exception as e:
            raise RuntimeError(f"LLM stream failed: {e}")

    async def health(self) -> dict:
        """Проверка здоровья OpenRouter."""
        try:
            resp = await self._client.get(
                f"{self.url}/models",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=5.0,
            )
            if resp.status_code == 200:
                return {"status": "ok", "provider": "openrouter"}
            return {"status": "error", "detail": f"HTTP {resp.status_code}"}
        except Exception as e:
            return {"status": "error", "detail": str(e)}

    async def close(self):
        await self._client.aclose()


# Singleton
llm = LLMClient()
