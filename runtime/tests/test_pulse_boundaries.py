# -*- coding: utf-8 -*-
"""Границы честности Pulse: тишина вне книги + смысловая маршрутизация.

Регрессионные тесты по плану ARKAIM_CONCEPT.md (Этапы 2–3):
- test_ask_refuses_out_of_domain   — вопросы вне книги => SILENCE (None);
- test_meaning_reachable_via_listen — смысловые вопросы => meaning:main_message;
- test_identity_self               — «кто ты» => identity:self;
- test_no_empty_markup             — в ответах нет артефакта «[]»;
- test_themes_bounded              — сводка тем не вываливает все темы разом.

Проверяется полный маршрут BookPulse.listen() (не слой напрямую), чтобы
порядок слоёв и guard-маршрутизация реально влияли на поведение.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_CORE_DIR = Path(__file__).resolve().parent.parent.parent / "core" / "CORE"
_RUNTIME = Path(__file__).resolve().parent.parent
for _p in (str(_CORE_DIR), str(_RUNTIME)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from pulse.pulse import BookPulse  # noqa: E402

GENOME = _CORE_DIR.parent / "GENOME" / "GENOME_v1.0.0.json"


@pytest.fixture(scope="module")
def pulse() -> BookPulse:
    bp = BookPulse(genome_path=GENOME)
    assert bp.load(), "геном не загрузился"
    return bp


class TestRefusesOutOfDomain:
    """Вопросы вне книги не должны получать уверенный нерелевантный ответ."""

    @pytest.mark.parametrize(
        "query",
        [
            "Сколько стоит билет до Москвы?",
            "Как приготовить борщ?",
            "Кто президент Франции?",
            "Что такое квантовая хромодинамика?",
            "Как настроить Wi-Fi роутер?",
            "Напиши код на Python для сортировки списка",
            "Какая погода завтра в Москве?",
        ],
    )
    def test_ask_refuses_out_of_domain(self, pulse: BookPulse, query: str):
        assert pulse.listen(query) is None, f"ожидалась тишина (None) для: {query}"


class TestMeaningReachable:
    """Смысловые формулировки доходят до meaning/mission, а не до фрагментов."""

    @pytest.mark.parametrize(
        "query",
        [
            "Какова главная мысль книги?",
            "В чём замысел книги?",
            "В чём смысл этой книги?",
            "Для чего написана книга?",
            "Зачем написана эта книга?",
        ],
    )
    def test_meaning_reachable_via_listen(self, pulse: BookPulse, query: str):
        resp = pulse.listen(query)
        assert resp is not None, f"смысловой вопрос не получил ответ: {query}"
        assert resp.source in (
            "meaning:main_message",
            "mission:mission",
            "meaning:idea",
        ), f"не тот слой для смыслового вопроса {query!r}: {resp.source}"

    def test_o_chem_eta_kniga_goes_to_main_message(self, pulse: BookPulse):
        resp = pulse.listen("О чём эта книга?")
        assert resp is not None
        assert resp.source == "meaning:main_message"

    def test_identity_self(self, pulse: BookPulse):
        resp = pulse.listen("Кто ты?")
        assert resp is not None
        assert resp.source == "identity:self"


class TestResponseHygiene:
    def test_no_empty_markup(self, pulse: BookPulse):
        """Артефакт «[]» из пустого chapter не должен попадать в текст."""
        for q in ["Какова главная мысль книги?", "О чём эта книга?", "Кто ты?"]:
            resp = pulse.listen(q)
            assert resp is not None
            assert "[]" not in resp.text, f"артефакт '[]' в ответе на {q!r}"

    def test_themes_bounded(self, pulse: BookPulse):
        """Сводка тем не должна вываливать все темы одним сообщением."""
        resp = pulse.listen("Какие темы в книге?")
        assert resp is not None
        # 138 тем не помещаются в один компактный ответ
        bullet_count = resp.text.count("•")
        assert bullet_count <= 12, f"слишком много тем в одном ответе: {bullet_count}"
        assert "и ещё" in resp.text or bullet_count >= 5
