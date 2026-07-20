"""World Engine — центральный координатор вычислимой модели мира."""
from __future__ import annotations

import logging
from typing import Any, Optional

from .world_model_ext import WorldModelExt, get_world_model_ext
from .relation_models import RelationGraph, WorldRelation, RelationType
from .relation_extractor import extract_relations

log = logging.getLogger("hermes.world_engine")


class WorldEngine:
    """Движок мира — центральный координатор.
    
    Интегрирует:
    - WorldModelExt — данные о мире (13 категорий, 406 сущностей)
    - RelationGraph — граф связей (287 связей)
    - FormEngine — визуальные формы (55 форм, 11 категорий)
    - ConsistencyEngine — проверка допустимости
    - ExperienceEngine — 10 режимов работы
    """
    
    def __init__(self):
        self._world_model = get_world_model_ext()
        self._relation_graph: Optional[RelationGraph] = None
        self._form_engine = None
        self._consistency_engine = None
        self._experience_engine = None
        self._initialized = False
    
    def initialize(self):
        """Инициализировать движок (загрузить данные)."""
        if self._initialized:
            return
        
        log.info("world_engine_initializing")
        
        # Загружаем граф связей
        self._relation_graph = extract_relations()
        
        # Создаём поддвижки
        from .form_engine import FormEngine
        from .consistency_engine import ConsistencyEngine
        from .experience_engine import ExperienceEngine
        
        self._form_engine = FormEngine(self)
        self._consistency_engine = ConsistencyEngine(self)
        self._experience_engine = ExperienceEngine(self)
        
        self._initialized = True
        log.info("world_engine_initialized %s", self.summary())
    
    @property
    def world_model(self) -> WorldModelExt:
        return self._world_model
    
    @property
    def relation_graph(self) -> RelationGraph:
        if self._relation_graph is None:
            self.initialize()
        return self._relation_graph
    
    @property
    def form_engine(self):
        if self._form_engine is None:
            self.initialize()
        return self._form_engine
    
    @property
    def consistency(self):
        if self._consistency_engine is None:
            self.initialize()
        return self._consistency_engine
    
    @property
    def experience(self):
        if self._experience_engine is None:
            self.initialize()
        return self._experience_engine
    
    # ── Поиск ──────────────────────────────────────────────────
    
    def search(self, query: str) -> dict:
        """Поиск по всему миру."""
        # Ищем в WorldModel
        wm_results = self._world_model.search(query)
        
        # Ищем в графе связей
        graph_results = []
        if self._relation_graph:
            for entity_id in self._relation_graph._by_source:
                if query.lower() in entity_id.lower():
                    context = self._relation_graph.get_entity_context(entity_id)
                    graph_results.append(context)
        
        return {
            "world_model": wm_results,
            "relations": graph_results,
            "total": len(wm_results) + len(graph_results),
        }
    
    def get_entity(self, entity_id: str) -> Optional[dict]:
        """Получить сущность по ID."""
        # Ищем в WorldModel
        for category in self._world_model.get_categories():
            items = self._world_model.get_category(category)
            for item in items:
                if item.get("id") == entity_id:
                    return {
                        "category": category,
                        **item,
                    }
        return None
    
    def get_entity_context(self, entity_id: str) -> dict:
        """Получить контекст сущности — все её связи."""
        entity = self.get_entity(entity_id)
        
        relations = {}
        if self._relation_graph:
            relations = self._relation_graph.get_entity_context(entity_id)
        
        # Добавляем визуальную форму
        form_context = None
        if self._form_engine:
            form_context = self._form_engine.build_form_context(entity_id)
        
        return {
            "entity": entity,
            "relations": relations,
            "form_context": form_context,
        }
    
    # ── Статистика ─────────────────────────────────────────────
    
    def get_stats(self) -> dict:
        """Статистика мира."""
        wm_stats = self._world_model.get_stats()
        graph_stats = self._relation_graph.get_stats() if self._relation_graph else {}
        
        return {
            "world_model": wm_stats,
            "relation_graph": graph_stats,
            "form_engine": self._form_engine.summary() if self._form_engine else "",
            "initialized": self._initialized,
        }
    
    def summary(self) -> str:
        """Текстовая сводка."""
        wm_summary = self._world_model.summary()
        graph_summary = self._relation_graph.summary() if self._relation_graph else " граф не загружен"
        form_summary = self._form_engine.summary() if self._form_engine else ""
        return f"World Engine: {wm_summary}{graph_summary}, {form_summary}"


# ── Фабрика ────────────────────────────────────────────────────

_world_engine_cache: Optional[WorldEngine] = None

def get_world_engine() -> WorldEngine:
    """Получить singleton WorldEngine."""
    global _world_engine_cache
    if _world_engine_cache is None:
        _world_engine_cache = WorldEngine()
        _world_engine_cache.initialize()
    return _world_engine_cache

def invalidate_world_engine():
    """Сбросить кэш."""
    global _world_engine_cache
    _world_engine_cache = None
