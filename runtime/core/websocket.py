"""
websocket — real-time уведомления для дашборда.

Через WebSocket приходят:
- Новые вопросы читателей
- Новые предложения Presence
- Статус сервисов
- Pulse-бит (каждые 5 минут)
"""
import json
import logging
from typing import Set

from fastapi import WebSocket, WebSocketDisconnect

log = logging.getLogger("hermes.websocket")


class ConnectionManager:
    """Управляет WebSocket-соединениями."""

    def __init__(self):
        self._connections: Set[WebSocket] = set()

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self._connections.add(ws)
        log.info("ws_connected total=%d", len(self._connections))

    def disconnect(self, ws: WebSocket):
        self._connections.discard(ws)
        log.info("ws_disconnected total=%d", len(self._connections))

    async def broadcast(self, event: str, data: dict):
        """Разослать событие всем подключённым клиентам."""
        message = json.dumps({"event": event, "data": data}, ensure_ascii=False)
        dead = set()
        for ws in self._connections:
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._connections.discard(ws)

    @property
    def count(self) -> int:
        return len(self._connections)


manager = ConnectionManager()


async def ws_endpoint(ws: WebSocket):
    """WebSocket эндпоинт для дашборда."""
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)


# ── Фоновые уведомления ──────────────────────────

async def notify_pulse_beat(pulse_state: dict):
    """Разослать информацию о Pulse-бите."""
    await manager.broadcast("pulse_beat", pulse_state)


async def notify_new_suggestion(suggestion: dict):
    """Уведомить о новом предложении Presence."""
    await manager.broadcast("new_suggestion", suggestion)


async def notify_service_status(statuses: dict):
    """Уведомить об изменении статуса сервисов."""
    await manager.broadcast("service_status", statuses)


async def notify_new_question(question: str, topic: str):
    """Уведомить о новом вопросе читателя."""
    await manager.broadcast("new_question", {
        "question": question[:100],
        "topic": topic,
        "count": 0,
    })


async def notify_crowdfunding_milestone(alert: dict):
    """Уведомить о достижении майлстоуна краудфандинга."""
    await manager.broadcast("crowdfunding_milestone", alert)


__all__ = [
    "manager", "ws_endpoint",
    "notify_pulse_beat", "notify_new_suggestion",
    "notify_service_status", "notify_new_question",
]
