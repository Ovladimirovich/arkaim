"""
book_intelligence — Hermes Skill для вопросов о книге "Наследие Аркаима".
Использует BookPulse + Voice для ответов.

КЛЮЧЕВОЕ ПРАВИЛО: книга отвечает ТОЛЬКО из базы знаний (Pulse).
Если Pulse не знает — книга честно говорит «не знаю», не галлюцинирует.
"""

import logging

from skills.base import Skill, SkillContext, SkillResult

log = logging.getLogger("hermes.skills.book_intelligence")

# Минимальная уверенность Pulse для прямого ответа без LLM
MIN_CONFIDENCE_DIRECT = 0.6


class BookIntelligenceSkill(Skill):
    name = "book_intelligence"
    priority = 50

    async def execute(self, ctx: SkillContext) -> SkillResult:
        text = ctx.user_text.lower()

        book_keywords = [
            "аркаим",
            "книг",
            "персонаж",
            "глава",
            "велик",
            "гиперборе",
            "сюжет",
            "герой",
            "цивилизаци",
            "архат",
            "славный",
            "влад",
            "вера",
            "мирослав",
            "световит",
            "святослав",
            "любомир",
            "велиусмус",
            "яснобор",
            "хранител",
        ]
        if not any(kw in text for kw in book_keywords):
            return SkillResult(handled=False)

        try:
            # Использовать общий Pulse/Voice из pulse_manager (не создавать свой!)
            from core.pulse_manager import get_voice, get_pulse

            voice = get_voice()
            pulse = get_pulse()

            if not pulse or not pulse.is_loaded:
                log.warning("book_pulse_not_loaded")
                return SkillResult(handled=True, response="Книга ещё не загружена. Попробуйте позже.")

            utterance = await voice.speak(ctx.user_text)

            confidence = utterance.pulse_response.confidence
            source = utterance.source
            # Структурированная неопределённость Pulse — ровно то, что Keeper
            # отдаёт в POST /book/ask. Без неё чат не отличит «partial» от
            # «confirmed» и соврёт читателю про полноту знания из книги.
            uncertainty = self._serialize_uncertainty(utterance.pulse_response)

            # CASE 1: Pulse знает ответ с высокой уверенностью — возвращаем напрямую
            if confidence >= MIN_CONFIDENCE_DIRECT and source != "silence":
                log.info("book_direct_answer source=%s confidence=%.2f", source, confidence)
                return SkillResult(
                    handled=True,
                    response=utterance.text,
                    metadata={
                        "source": source,
                        "llm_used": utterance.llm_used,
                        "confidence": confidence,
                        "uncertainty": uncertainty,
                        "routing": "direct",
                    },
                )

            # CASE 2: Pulse ответил, но с низкой уверенностью — передаём LLM с строгими правилами
            if source != "silence":
                _book_context = pulse.build_context()
                log.info("book_llm_assisted source=%s confidence=%.2f", source, confidence)
                return SkillResult(
                    handled=True,
                    response=utterance.text,
                    system_prompt=(
                        "Ты — голос книги «Наследие Аркаима». Твоя ЕДИНСТВЕННАЯ задача — "
                        "перефразировать ответ, который уже дан ниже. НЕ добавляй ничего от себя. "
                        "НЕ используй свои знания. Если информации мало — скажи об этом.\n\n"
                        f"ОТВЕТ ИЗ КНИГИ:\n{utterance.text}"
                    ),
                    metadata={
                        "source": source,
                        "llm_used": utterance.llm_used,
                        "confidence": confidence,
                        "uncertainty": uncertainty,
                        "routing": "llm_assisted",
                    },
                )

            # CASE 3: Pulse не знает ответ — честно говорим «не знаю»
            # НЕ передаём LLM — он будет галлюцинировать
            log.info("book_honest_ignorance query=%s", ctx.user_text[:80])
            return SkillResult(
                handled=True,
                response=self._ignorance_response(ctx.user_text),
                metadata={
                    "source": "silence",
                    "llm_used": False,
                    "confidence": 0.0,
                    "uncertainty": uncertainty,
                    "routing": "honest_ignorance",
                },
            )
        except Exception as e:
            log.warning("book_intelligence_error trace_id=%s error=%s", ctx.trace_id, e)
            return SkillResult(
                handled=True,
                response="Извините, произошла ошибка при обращении к книге. Попробуйте спросить о персонажах, темах или событиях книги.",
            )

    @staticmethod
    def _serialize_uncertainty(pulse_response) -> dict | None:
        """UncertaintyFlag → JSON-контракт AskAnswer.uncertainty.

        Повторяет сериализацию KeeperAgent.act (has_unknowns / unknown_aspects /
        confidence_breakdown). None, когда неопределённости нет: отсутствие
        данных не подменяется выдуманным значением.
        """
        u = getattr(pulse_response, "uncertainty", None)
        if u is None:
            return None
        return {
            "has_unknowns": bool(getattr(u, "has_unknowns", False)),
            "unknown_aspects": list(getattr(u, "unknown_aspects", None) or []),
            "confidence_breakdown": list(getattr(u, "confidence_breakdown", None) or []),
        }

    def _ignorance_response(self, query: str) -> str:
        """Честный ответ, когда книга не знает."""
        q = query.lower()
        # Если вопрос很明显 не о книге — направить
        if any(w in q for w in ["погода", "курс", "новости", "спорт", "политик", "bitcoin"]):
            return (
                "Я — Хранитель книги «Наследие Аркаима» и отвечаю только на вопросы по содержанию книги. "
                "Спросите о персонажах, темах, философии или событиях книги."
            )
        return (
            "Я не нахожу ответа на этот вопрос в книге «Наследие Аркаима». "
            "Могу рассказать о персонажах, темах, символах или событиях книги. "
            "Попробуйте спросить иначе — возможно, ответ уже есть в знаниях книги."
        )


skill = BookIntelligenceSkill()
