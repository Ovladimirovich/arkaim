# -*- coding: utf-8 -*-
"""P0 — Сквозная неопределённость Pulse: три состояния ответа.

Проверяет, что `confidence_state` (confirmed / partial / insufficient)
вычисляется в keeper по фактическому источнику и флагам неопределённости
Pulse, проходит через BookVoice (и без него), и доходит до API /book/ask —
без обращения к LLM. Состояние НЕ выводится арифметически из confidence.

Полный путь: слой → PulseResponse.uncertainty → keeper.confidence_state →
API data.confidence_state (сквозной сигнал до UI).
"""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi.testclient import TestClient

_CORE_DIR = Path(__file__).resolve().parent.parent.parent / "core" / "CORE"
_RUNTIME = Path(__file__).resolve().parent.parent
for _p in (str(_CORE_DIR), str(_RUNTIME)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from pulse.pulse import BookPulse  # noqa: E402
from pulse.voice import BookVoice  # noqa: E402

GENOME = _CORE_DIR.parent / "GENOME" / "GENOME_v1.0.0.json"


# ── Классификация состояний ────────────────────────────────


class TestDeriveConfidenceState:
    """Keeper классифицирует ответ по фактическим признакам, а не по confidence."""

    def _derive(self, source: str, uncertainty: dict | None):
        from agents.keeper import KeeperAgent

        return KeeperAgent._derive_confidence_state(source, uncertainty)

    def test_confirmed_without_uncertainty(self):
        assert self._derive("knowledge:character", None) == "confirmed"
        assert self._derive("knowledge:character", {"has_unknowns": False}) == "confirmed"

    def test_silence_is_insufficient(self):
        assert self._derive("", None) == "insufficient"
        assert self._derive("silence", None) == "insufficient"

    def test_has_unknowns_is_partial(self):
        assert self._derive("knowledge:catalog_text", {"has_unknowns": True}) == "partial"
        assert self._derive("knowledge:catalog_text", {"has_unknowns": True, "unknown_aspects": ["x"]}) == "partial"

    def test_state_not_derived_from_confidence_arithmetically(self):
        # Два одинаковых confidence с разными признаками дают РАЗНЫЕ состояния:
        # доказывает, что состояние не выводится из числа 0..1.
        from agents.keeper import KeeperAgent

        a = KeeperAgent._derive_confidence_state("knowledge:character", {"has_unknowns": False})
        b = KeeperAgent._derive_confidence_state("knowledge:character", {"has_unknowns": True})
        assert a == "confirmed"
        assert b == "partial"
        assert a != b


# ── Три состояния сквозь keeper (реальный BookPulse + BookVoice без LLM) ──


class TestKeeperConfidenceStateE2E:
    """keeper.act() возвращает confidence_state для всех трёх типов вопросов."""

    @classmethod
    def _keeper(cls, with_voice=True):
        from agents.keeper import KeeperAgent

        pulse = BookPulse(genome_path=GENOME)
        assert pulse.load(), "геном не загрузился"
        voice = BookVoice(pulse) if with_voice else None
        return KeeperAgent(pulse=pulse, voice=voice)

    async def _act(self, question: str, with_voice=True):
        return await self._keeper(with_voice).act({"question": question})

    async def test_confirmed_knowledge_question(self):
        """Подтверждённое знание (персонаж) → confirmed."""
        for voice in (True, False):
            r = await self._act("Кто такой Велик?", with_voice=voice)
            assert r["source"] == "knowledge:character", r["source"]
            assert r["confidence_state"] == "confirmed", r

    async def test_confirmed_meaning_question(self):
        """Смысловой вопрос книги → confirmed."""
        for voice in (True, False):
            r = await self._act("В чём замысел книги?", with_voice=voice)
            assert r["confidence_state"] == "confirmed", (r["source"], r)

    async def test_confirmed_identity_question(self):
        """«Кто ты?» → confirmed (самопредставление из книги)."""
        r = await self._act("Кто ты?", with_voice=False)
        assert r["confidence_state"] == "confirmed", r

    async def test_insufficient_out_of_book(self):
        """Вопрос вне книги → insufficient (тишина, честное незнание)."""
        for voice in (True, False):
            r = await self._act("Как приготовить борщ?", with_voice=voice)
            assert r["source"] == "silence", r["source"]
            assert r["confidence_state"] == "insufficient", r

    async def test_insufficient_bus_ticket(self):
        """Бытовой вопрос (билет до Москвы) → insufficient."""
        r = await self._act("Сколько стоит билет до Москвы?", with_voice=False)
        assert r["source"] == "silence", r["source"]
        assert r["confidence_state"] == "insufficient", r


# ── Partial-состояние: catalog_text несёт явную неопределённость ──


class TestCatalogTextPartial:
    """Фрагмент книги (catalog_text) — честное «частичное знание», а не silence."""

    def test_catalog_text_has_explicit_uncertainty(self):
        """Лексический запрос в каталог возвращает явный UncertaintyFlag(has_unknowns=True)."""
        pulse = BookPulse(genome_path=GENOME)
        assert pulse.load()
        # Многословный запрос по тексту каталога (фрагмент про мириады звёздных систем)
        resp = pulse.listen("мириад звездных систем окраине")
        assert resp is not None, "ожидался ответ каталога"
        assert resp.source.startswith("knowledge:catalog_text"), resp.source
        assert resp.uncertainty is not None, "у catalog_text должна быть явная неопределённость"
        assert resp.uncertainty.has_unknowns is True

    async def test_catalog_text_keeper_state_is_partial(self):
        """Keeper помечает фрагмент книги как partial (и через voice, и напрямую)."""
        from agents.keeper import KeeperAgent

        for with_voice in (True, False):
            pulse = BookPulse(genome_path=GENOME)
            assert pulse.load()
            voice = BookVoice(pulse) if with_voice else None
            keeper = KeeperAgent(pulse=pulse, voice=voice)
            r = await keeper.act({"question": "мириад звездных систем окраине"})
            assert r["source"].startswith("knowledge:catalog_text"), r["source"]
            assert r["confidence_state"] == "partial", (r["source"], r["confidence_state"])
            assert r["uncertainty"]["has_unknowns"] is True


# ── Сквозной сигнал до API /book/ask ─────────────────────


class TestConfidenceStateThroughApi:
    """confidence_state и uncertainty доходят до API без потерь (keeper→API)."""

    async def test_state_survives_api_route(self, isolated_kernel):
        """Реальный keeper (pulse+voice) → POST /book/ask несёт confidence_state."""
        from core.adc_deps import get_keeper
        from core.main import app

        from agents.keeper import KeeperAgent

        pulse = BookPulse(genome_path=GENOME)
        assert pulse.load()
        real_keeper = KeeperAgent(pulse=pulse, voice=BookVoice(pulse))

        previous = app.dependency_overrides.get(get_keeper)
        app.dependency_overrides[get_keeper] = lambda: real_keeper
        client = TestClient(app)

        def _ask(question: str) -> dict:
            resp = client.post("/book/ask", json={"question": question})
            assert resp.status_code == 200, resp.text
            return resp.json()["data"]

        try:
            # Подтверждённое знание
            confirmed = _ask("Кто такой Велик?")
            assert confirmed["confidence_state"] == "confirmed"

            # Тишина вне книги
            outside = _ask("Как приготовить борщ?")
            assert outside["source"] == "silence"
            assert outside["confidence_state"] == "insufficient"

            # Не выдумываем источник, которого нет: API отвечает без LLM
            assert confirmed["llm_used"] is False or confirmed["llm_used"] is None
        finally:
            if previous is None:
                app.dependency_overrides.pop(get_keeper, None)
            else:
                app.dependency_overrides[get_keeper] = previous

    async def test_voice_less_keeper_classifies_real_pulse(self):
        """Путь без voice (legacy keeper) классифицирует по реальному ответу Pulse.

        В не-voice ветке keeper раньше маскировал источник как «pulse»; теперь
        источник берётся из PulseResponse, поэтому и состояние определяется
        честно (а не по умолчанию).
        """
        from agents.keeper import KeeperAgent

        pulse = BookPulse(genome_path=GENOME)
        assert pulse.load()
        # Прямой pulse без voice: response из listen, state известен
        keeper = KeeperAgent(pulse=pulse, voice=None)
        r = await keeper.act({"question": "Кто такой Велик?"})
        assert r["source"] == "knowledge:character"
        assert r["confidence_state"] == "confirmed"
