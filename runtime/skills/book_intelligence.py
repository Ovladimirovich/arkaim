"""
book_intelligence — Hermes Skill для вопросов о книге "Наследие Аркаима".
Использует BookPulse + Voice для ответов.
"""
import logging

from skills.base import Skill, SkillContext, SkillResult

log = logging.getLogger("hermes.skills.book_intelligence")


class BookIntelligenceSkill(Skill):
    name = "book_intelligence"
    priority = 50

    async def execute(self, ctx: SkillContext) -> SkillResult:
        text = ctx.user_text.lower()

        book_keywords = ["аркаим", "книг", "персонаж", "глава", "велик", "гиперборе",
                         "сюжет", "герой", "цивилизаци", "архат", "славный"]
        if not any(kw in text for kw in book_keywords):
            return SkillResult(handled=False)

        try:
            from pulse.pulse import BookPulse
            from pulse.voice import BookVoice
            from core.config import config

            genome_path = config.GENOME_DIR / f"GENOME_v{config.GENOME_VERSION}.json"
            pulse = BookPulse(genome_path=genome_path)
            pulse.load()
            voice = BookVoice(pulse)

            utterance = await voice.speak(ctx.user_text)

            return SkillResult(
                handled=True,
                response=utterance.text,
                context="book_query",
                metadata={
                    "source": utterance.source,
                    "llm_used": utterance.llm_used,
                    "confidence": utterance.pulse_response.confidence,
                },
            )
        except Exception as e:
            log.warning("book_intelligence_error trace_id=%s error=%s", ctx.trace_id, e)
            return SkillResult(handled=True, response="Извините, не удалось найти информацию в книге.")


skill = BookIntelligenceSkill()
