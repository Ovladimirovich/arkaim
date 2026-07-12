"""Тест LLM клиента напрямую."""
import asyncio
import sys
import os

# Загрузить .env
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / ".env")

# Добавить CORE/ в sys.path
sys.path.insert(0, str(Path(__file__).parent.parent / "core" / "CORE"))

from llm_client import LLMClient


async def test():
    print("=" * 50)
    print("Тест LLM клиента")
    print("=" * 50)

    client = LLMClient()
    print(f"URL: {client.url}")
    print(f"Model: {client.model}")
    print(f"Verify SSL: {client.verify_ssl}")

    print("\n--- Тест авторизации ---")
    try:
        token = await client._token.acquire(client._client)
        print(f"Token: {token[:20]}..." if token else "Token: EMPTY")
    except Exception as e:
        print(f"Auth ERROR: {type(e).__name__}: {e}")
        return

    print("\n--- Тест chat ---")
    try:
        result = await client.chat([{"role": "user", "content": "Привет! Кратко ответь."}])
        print(f"OK: {result[:200]}")
    except Exception as e:
        print(f"Chat ERROR: {type(e).__name__}: {e}")


if __name__ == "__main__":
    asyncio.run(test())
