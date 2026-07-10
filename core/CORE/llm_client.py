"""
LLM Client — единый интерфейс для LLM через Hermes Gateway.

Используется Voice для озвучки, KeeperAgent для формулировок.
Connection pooling, HTTP/2, поддержка stream.
"""
from typing import List, Dict, Optional, AsyncIterator
import httpx
from config import config


class LLMClient:
    """
    Клиент для LLM через Hermes Gateway.

    Не хранит состояние. Каждый вызов создаёт свой HTTP-запрос.
    Voice использует этот клиент как микрофон.
    """

    def __init__(self, hermes_url: Optional[str] = None, api_key: Optional[str] = None):
        self.url = (hermes_url or config.HERMES_URL).rstrip("/")
        self.api_key = api_key or config.HERMES_API_KEY
        self.model = "GigaChat-Pro"
        limits = httpx.Limits(
            max_keepalive_connections=20,
            max_connections=100,
            keepalive_expiry=30.0,
        )
        self._client = httpx.AsyncClient(
            timeout=120.0,
            limits=limits,
            http2=True,
        )

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> str:
        """
        Отправить запрос к Hermes → GigaChat.

        Voice вызывает этот метод для формулировки ответа.
        Pulse уже знает, что сказать. LLM только формулирует.
        """
        try:
            response = await self._client.post(
                f"{self.url}/v1/chat",
                json={
                    "messages": messages,
                    "model": model or self.model,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
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
                f"{self.url}/v1/chat",
                json={
                    "messages": messages,
                    "model": model or self.model,
                    "stream": True,
                },
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        yield line
        except Exception as e:
            raise RuntimeError(f"LLM stream failed: {e}")

    async def health(self) -> dict:
        """Проверка здоровья Hermes."""
        try:
            resp = await self._client.get(
                f"{self.url}/health",
                timeout=5.0,
            )
            if resp.status_code == 200:
                return {"status": "ok", "provider": "gigachat"}
            return {"status": "error", "detail": f"HTTP {resp.status_code}"}
        except Exception as e:
            return {"status": "error", "detail": str(e)}

    async def close(self):
        await self._client.aclose()


# Singleton
llm = LLMClient()
