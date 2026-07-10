"""
Слои сознания — активные классы.
Каждый слой может ответить на вопрос без LLM, используя геном.
"""
import re
from typing import Optional, Any
from dataclasses import dataclass, field

from config import config


GENOME_PATH = config.GENOME_DIR / "GENOME_v1.0.0.json"


@dataclass
class PulseResponse:
    text: str
    source: str
    confidence: float
    provenance: list[dict] = field(default_factory=list)


class BaseLayer:
    name: str = "base"

    def __init__(self, genome: dict, retriever: Any = None):
        self._genome = genome
        self._retriever = retriever

    def load(self, genome: dict):
        self._genome = genome

    def set_retriever(self, retriever: Any):
        self._retriever = retriever

    def respond_to(self, query: str) -> Optional[PulseResponse]:
        return None

    def _score(self, query: str, keywords: list[str]) -> float:
        q = query.lower()
        hits = sum(1 for kw in keywords if kw.lower() in q)
        return hits / len(keywords) if keywords else 0.0

    @property
    def summary(self) -> str:
        return ""


class KnowledgeLayer(BaseLayer):
    """
    Слой знаний: факты, персонажи, темы, символы, конфликты.
    Может отвечать на фактические вопросы, используя только геном.
    Поддерживает RAG-поиск через BookRetriever.
    """
    name = "knowledge"

    def __init__(self, genome: dict, retriever: Any = None):
        super().__init__(genome)
        self._retriever = retriever

    def set_retriever(self, retriever: Any):
        self._retriever = retriever

    def respond_to(self, query: str) -> Optional[PulseResponse]:
        q = query.lower()

        # Персонажи
        for ch in self._genome.get("modules", {}).get("characters", []):
            names = [ch["name"].lower()] + [a.lower() for a in ch.get("aliases", [])]
            if any(name in q for name in names):
                desc = ch.get("description", "")
                archetype = ch.get("archetype", "")
                values = ch.get("values", [])
                text = f"{ch['name']}"
                if archetype:
                    text += f" — {archetype}"
                if desc:
                    text += f". {desc}"
                if values:
                    text += f". Ценности: {', '.join(values)}"
                return PulseResponse(
                    text=text,
                    source="knowledge:character",
                    confidence=0.9,
                    provenance=[{"type": "character", "name": ch["name"]}],
                )

        # Темы
        for th in self._genome.get("modules", {}).get("themes", []):
            if th["name"].lower() in q:
                desc = th.get("description", "")
                text = f"Тема: {th['name']}"
                if desc:
                    text += f" — {desc}"
                return PulseResponse(
                    text=text,
                    source="knowledge:theme",
                    confidence=0.85,
                    provenance=[{"type": "theme", "name": th["name"]}],
                )

        # Символы
        for sym in self._genome.get("modules", {}).get("symbols", []):
            if sym["name"].lower() in q:
                meaning = sym.get("meaning", "")
                text = f"Символ: {sym['name']}"
                if meaning:
                    text += f" — {meaning}"
                return PulseResponse(
                    text=text,
                    source="knowledge:symbol",
                    confidence=0.85,
                    provenance=[{"type": "symbol", "name": sym["name"]}],
                )

        # Конфликты
        for conf in self._genome.get("modules", {}).get("conflicts", []):
            if conf["name"].lower() in q:
                text = f"Конфликт: {conf['name']} ({conf.get('type', '')})"
                return PulseResponse(
                    text=text,
                    source="knowledge:conflict",
                    confidence=0.8,
                    provenance=[{"type": "conflict", "name": conf["name"]}],
                )

        # Сущности мира
        for we in self._genome.get("world_entities", []):
            if we["name"].lower() in q:
                desc = we.get("description", "")
                values = we.get("values", [])
                text = f"{we['name']}"
                if desc:
                    text += f" — {desc}"
                if values:
                    text += f". Ценности: {', '.join(values)}"
                return PulseResponse(
                    text=text,
                    source="knowledge:world_entity",
                    confidence=0.9,
                    provenance=[{"type": "world_entity", "name": we["name"]}],
                )

        # Поиск по catalog_texts (RAG-тексты из книги, встроенные в геном)
        catalog = self._genome.get("catalog_texts", [])
        if catalog:
            query_words = {w.lower() for w in re.findall(r"\w{3,}", q)}
            if len(query_words) < 2:
                single = q.strip().lower()
                for entry in catalog:
                    entry_set = {w.lower() for w in re.findall(r"\w{3,}", entry.get("text", ""))}
                    if single in entry_set:
                        excerpt = entry["text"][:800]
                        chapter = entry.get("chapter", "")
                        meta = f" (глава: {chapter})" if chapter else ""
                        return PulseResponse(
                            text=f"Из книги{meta}:\n{excerpt}",
                            source="knowledge:catalog_text",
                            confidence=0.7,
                            provenance=[{"type": "catalog_text", "source": entry.get("source", "book")}],
                        )
                return None

            best_score = 0.0
            best_entry = None
            for idx, entry in enumerate(catalog):
                if idx >= 500:
                    break
                text = entry.get("text", "")
                if not text:
                    continue
                entry_words = {w.lower() for w in re.findall(r"\w{3,}", text)}
                if not entry_words:
                    continue
                intersection = query_words & entry_words
                union = query_words | entry_words
                score = len(intersection) / max(len(union), 1)
                if score > best_score:
                    best_score = score
                    best_entry = entry
            if best_entry and best_score >= 0.15:
                excerpt = best_entry["text"][:800]
                source_name = best_entry.get("source", "book")
                chapter = best_entry.get("chapter", "")
                meta = f" (глава: {chapter})" if chapter else ""
                return PulseResponse(
                    text=f"Из книги{meta}:\n{excerpt}",
                    source="knowledge:catalog_text",
                    confidence=min(best_score + 0.3, 0.95),
                    provenance=[{"type": "catalog_text", "source": source_name}],
                )

        # Поиск через ChromaDB retriever (если подключён)
        if self._retriever:
            try:
                rag_results = self._retriever.search(query, n_results=3)
                if rag_results:
                    best = rag_results[0]
                    text = best.get("text", "")[:800]
                    score = best.get("score", 0.5)
                    source = best.get("metadata", {}).get("source", "rag")
                    chapter = best.get("chapter_title", "")
                    meta = f" (глава: {chapter})" if chapter else ""
                    return PulseResponse(
                        text=f"Из книги{meta}:\n{text}",
                        source=f"knowledge:rag:{source}",
                        confidence=min(score + 0.2, 0.95),
                        provenance=[{"type": "rag_search", "source": source}],
                    )
            except Exception:
                pass

        return None

    @property
    def summary(self) -> str:
        """Краткое содержание слоя для system prompt."""
        m = self._genome.get("modules", {})
        parts = ["Книга: Наследие Аркаима"]
        themes = m.get("themes", [])
        if themes:
            parts.append(f"Темы: {', '.join(t['name'] for t in themes[:10])}")
        chars = m.get("characters", [])
        if chars:
            parts.append(f"Персонажи: {', '.join(c['name'] for c in chars[:10])}")
        conflicts = m.get("conflicts", [])
        if conflicts:
            parts.append(f"Конфликты: {', '.join(c['name'] for c in conflicts[:6])}")
        return "\n".join(parts)


# ── Visualization Layers ─────────────────────────────

class VisualStyleLayer(BaseLayer):
    """Слой визуального стиля. Возвращает стилистический preset."""
    name = "visual_style"

    @property
    def summary(self) -> str:
        presets = self._genome.get("modules", {}).get("style_presets", {})
        if presets:
            return "Стили: " + ", ".join(presets.keys())
        return "Стиль по умолчанию: cinematic_fantasy"

    def respond_to(self, query: str) -> Optional[PulseResponse]:
        # Ищем упоминание стиля в запросе
        q = query.lower()
        style_keywords = {
            "акварель": "watercolor",
            "карикатура": "sketch",
            "кино": "cinematic_fantasy",
            "фэнтези": "cinematic_fantasy",
            "реализм": "cinematic_fantasy",
        }
        matched_style = "cinematic_fantasy"
        for keyword, style in style_keywords.items():
            if keyword in q and style in self._genome.get("modules", {}).get("style_presets", {}):
                matched_style = style
                break

        # Берем preset из genome
        presets = self._genome.get("modules", {}).get("style_presets", {})
        preset = presets.get(matched_style)
        if preset:
            prompt_suffix = preset.get("prompt_suffix", "")
            return PulseResponse(
                text=prompt_suffix,
                source=f"visual_style:{matched_style}",
                confidence=1.0,
                provenance=[{"type": "style_preset", "preset_id": preset.get("preset_id", matched_style)}],
            )
        return None


class NarrativeArcLayer(BaseLayer):
    """Слой сюжетных дуг. Отвечает на вопросы о развитии сюжета."""
    name = "narrative_arc"

    @property
    def summary(self) -> str:
        arcs = self._genome.get("modules", {}).get("narrative_arcs", [])
        if not arcs:
            return "Сюжетные дуги не заданы"
        types = {}
        for a in arcs:
            types[a.get("type", "?")] = types.get(a.get("type", "?"), 0) + 1
        return f"Дуги: {', '.join(f'{k}={v}' for k,v in types.items())}"

    def respond_to(self, query: str) -> Optional[PulseResponse]:
        q = query.lower()
        arcs = self._genome.get("modules", {}).get("narrative_arcs", [])

        # Развитие персонажа
        for arc in arcs:
            if arc.get("type") != "character_arc":
                continue
            name = arc.get("name", "").lower()
            eid = arc.get("entity_id", "").lower()
            if eid in q or name in q:
                beats = arc.get("beats", [])
                if not beats:
                    continue
                ch_range = f"{beats[0]['chapter']}-{beats[-1]['chapter']}"
                return PulseResponse(
                    text=(f"Сюжетная дуга: {arc.get('name', '')} ({arc.get('arc_type', '')})\n"
                          f"Главы: {ch_range}, тактов: {len(beats)}\n"
                          f"Форма: {', '.join(set(b['state'] for b in beats))}\n"
                          f"Развязка: {arc.get('resolution', 'не указана')}"),
                    source=f"narrative_arc:character:{eid}",
                    confidence=0.85,
                    provenance=[{"type": "narrative_arc", "entity_id": eid}],
                )

        # Развитие конфликта
        for arc in arcs:
            if arc.get("type") != "plot_arc":
                continue
            name = arc.get("name", "").lower()
            eid = arc.get("entity_id", "").lower()
            if eid in q or name in q:
                return PulseResponse(
                    text=(f"Дуга конфликта: {arc.get('name', '')}\n"
                          f"Тип: {arc.get('arc_type', '')}\n"
                          f"Развязка: {arc.get('resolution', 'не указана')}"),
                    source=f"narrative_arc:conflict:{eid}",
                    confidence=0.8,
                    provenance=[{"type": "narrative_arc", "entity_id": eid}],
                )

        # Общее развитие сюжета
        if any(w in q for w in ["развитие", "сюжет", "дуга", "арка", "как меня", "эволюция"]):
            char_arcs = [a for a in arcs if a.get("type") == "character_arc"]
            plot_arcs = [a for a in arcs if a.get("type") == "plot_arc"]
            text = f"Сюжетных дуг: {len(char_arcs)} персонажей, {len(plot_arcs)} конфликтов\n"
            if char_arcs:
                names = [a.get("name", "?") for a in char_arcs[:5]]
                text += f"Персонажи: {', '.join(names)}"
            return PulseResponse(
                text=text,
                source="narrative_arc:overview",
                confidence=0.9,
                provenance=[{"type": "narrative_arc", "field": "overview"}],
            )

        return None


class SceneLayer(BaseLayer):
    """Слой сцен. Возвращает описание сцены из genome."""
    name = "scene"

    @property
    def summary(self) -> str:
        scenes = self._genome.get("modules", {}).get("scenes", [])
        if not scenes:
            return "Сцены не заданы"
        chapters = sorted({s.get("chapter", 0) for s in scenes})
        return f"Сцены глав: {', '.join(map(str, chapters))}"

    def respond_to(self, query: str) -> Optional[PulseResponse]:
        # Парсим номер главы из запроса
        import re
        chapter_match = re.search(r"глава\s+(\d+)", query.lower())
        if not chapter_match:
            return None

        chapter_num = int(chapter_match.group(1))
        scenes = self._genome.get("modules", {}).get("scenes", [])
        chapter_scenes = [s for s in scenes if s.get("chapter") == chapter_num]

        if not chapter_scenes:
            return None

        # Берем первую сцену из главы
        scene = chapter_scenes[0]
        characters = scene.get("characters", [])
        location = scene.get("location", "")
        emotion = scene.get("emotion", "")
        meaning = ", ".join(scene.get("meaning_tags", []))

        text = f"Сцена: {scene.get('title', '')}\n"
        if characters:
            text += f"Персонажи: {', '.join(characters)}\n"
        if location:
            text += f"Локация: {location}\n"
        if emotion:
            text += f"Эмоция: {emotion}\n"
        if meaning:
            text += f"Смысл: {meaning}"

        return PulseResponse(
            text=text,
            source=f"scene:chapter{chapter_num}:{scene.get('scene_id', '')}",
            confidence=1.0,
            provenance=[{"type": "scene", "chapter": chapter_num, "scene_id": scene.get("scene_id", "")}],
        )


class MeaningLayer(BaseLayer):
    """
    Слой смыслов: интерпретация, философия, авторский замысел.
    Отвечает на вопросы «почему», «зачем», «в чём смысл».
    """
    name = "meaning"

    def respond_to(self, query: str) -> Optional[PulseResponse]:
        q = query.lower()
        ai = self._genome.get("author_intent", {})

        # Главное послание
        if any(w in q for w in ["главн", "основн", "послание", "идея", "смысл", "чему учит"]):
            msg = ai.get("main_message", "")
            if msg:
                return PulseResponse(
                    text=f"Главное послание книги: {msg}",
                    source="meaning:main_message",
                    confidence=0.95,
                    provenance=[{"type": "author_intent", "field": "main_message"}],
                )

        # Трансформация читателя
        if any(w in q for w in ["трансформация", "изменение", "читател", "чему"]):
            trans = ai.get("desired_reader_transformation", [])
            if trans:
                text = "Книга стремится изменить читателя:\n• " + "\n• ".join(trans[:5])
                return PulseResponse(
                    text=text,
                    source="meaning:transformation",
                    confidence=0.9,
                    provenance=[{"type": "author_intent", "field": "transformation"}],
                )

        # Ценности
        if any(w in q for w in ["ценност", "важно"]):
            values = ai.get("core_values", [])
            if values:
                return PulseResponse(
                    text=f"Ключевые ценности книги: {', '.join(values)}",
                    source="meaning:values",
                    confidence=0.9,
                    provenance=[{"type": "author_intent", "field": "values"}],
                )

        # Вопросы для читателя
        if any(w in q for w in ["вопрос", "задумать"]):
            questions = ai.get("questions_for_reader", [])
            if questions:
                text = "Книга задаёт читателю вопросы:\n• " + "\n• ".join(questions[:5])
                return PulseResponse(
                    text=text,
                    source="meaning:questions",
                    confidence=0.85,
                    provenance=[{"type": "author_intent", "field": "questions"}],
                )

        return None

    @property
    def summary(self) -> str:
        ai = self._genome.get("author_intent", {})
        parts = []
        msg = ai.get("main_message", "")
        if msg:
            parts.append(f"Главное послание: {msg}")
        trans = ai.get("desired_reader_transformation", [])
        if trans:
            parts.append(f"Трансформация: {'; '.join(trans[:3])}")
        values = ai.get("core_values", [])
        if values:
            parts.append(f"Ценности: {', '.join(values)}")
        return "\n".join(parts)


class IdentityLayer(BaseLayer):
    """
    Слой идентичности: кто есть книга, что может, что не может.
    Отвечает на вопросы «кто ты», «что ты можешь».
    """
    name = "identity"

    FORBIDDEN = [
        # Маркетинг
        "купите", "закажите", "скидка", "акция", "предложение ограничено",
        "только сегодня", "спешите", "лучшая цена",
        "оффер", "конверсия", "воронка",
        # Факты вне книги
        "согласно последним исследованиям", "учёные доказали", "наука утверждает",
        "современная наука", "по статистике", "исследования показывают",
        "в интернете", "на сайте", "перейди по ссылке",
        "я думаю", "по моему мнению", "мне кажется",
        # Выход за рамки
        "рекомендую прочитать", "советую", "попробуйте",
        "запишись", "регистрируйся", "подпишись",
    ]

    def respond_to(self, query: str) -> Optional[PulseResponse]:
        q = query.lower()

        if any(w in q for w in ["кто ты", "кто вы", "ты кто", "вы кто", "представься", "расскажи о себе"]):
            return PulseResponse(
                text="Я — Хранитель идей книги «Наследие Аркаима». "
                     "Я говорю голосом книги, опираясь на её знание. "
                     "Моя задача — помогать людям понимать её смысл.",
                source="identity:self",
                confidence=1.0,
                provenance=[{"type": "identity", "field": "self_description"}],
            )

        if any(w in q for w in ["что ты можешь", "что умеешь", "функции", "возможности"]):
            return PulseResponse(
                text="Я могу:\n"
                     "• Отвечать на вопросы по содержанию книги\n"
                     "• Объяснять идеи, темы и символы\n"
                     "• Рассказывать о персонажах и их пути\n"
                     "• Помогать понять философию книги\n\n"
                     "Я не могу:\n"
                     "• Давать ответы, выходящие за рамки книги\n"
                     "• Генерировать маркетинговые материалы\n"
                     "• Действовать без подтверждения автора",
                source="identity:capabilities",
                confidence=1.0,
                provenance=[{"type": "identity", "field": "capabilities"}],
            )

        return None

    def validate(self, text: str) -> bool:
        """Проверить, что ответ не нарушает идентичность."""
        t = text.lower()
        for word in self.FORBIDDEN:
            if word in t:
                return False
        return True

    def validate_detail(self, text: str) -> dict:
        """Проверить и вернуть детали: прошел ли проверку, какое слово сработало."""
        t = text.lower()
        for word in self.FORBIDDEN:
            if word in t:
                return {"passed": False, "trigger": word}
        return {"passed": True, "trigger": ""}

    @property
    def summary(self) -> str:
        return (
            "Я — Хранитель идей книги 'Наследие Аркаима'. "
            "Я говорю спокойно, мудро, с уважением. "
            "Моя задача — просвещать, а не убеждать."
        )


class MissionLayer(BaseLayer):
    """
    Слой миссии: зачем книга существует, её цель в мире.
    Отвечает на вопросы «зачем эта книга», «какая цель».
    """
    name = "mission"

    def respond_to(self, query: str) -> Optional[PulseResponse]:
        q = query.lower()

        if any(w in q for w in ["зачем эта книга", "какая цель", "для чего", "миссия", "предназначение"]):
            return PulseResponse(
                text="Миссия книги «Наследие Аркаима» — сохранить и передать "
                     "древние знания, помочь человеку вспомнить свою духовную природу "
                     "и найти путь к гармонии. Она не развлекает — она пробуждает.",
                source="mission:purpose",
                confidence=0.95,
                provenance=[{"type": "mission", "field": "purpose"}],
            )

        if any(w in q for w in ["кому нужна", "для кого", "аудитория", "читатель"]):
            return PulseResponse(
                text="Эта книга для тех, кто ищет:\n"
                     "• Духовный путь и самопознание\n"
                     "• Понимание предыстории человечества\n"
                     "• Связь с культурным наследием предков\n"
                     "• Ответы на вопросы о смысле жизни",
                source="mission:audience",
                confidence=0.9,
                provenance=[{"type": "mission", "field": "audience"}],
            )

        return None

    @property
    def summary(self) -> str:
        return (
            "Миссия: сохранять и распространять идеи книги. "
            "Помогать людям понимать её смысл. "
            "Искать не клиентов, а единомышленников."
        )
