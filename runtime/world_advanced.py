"""
World Engine Advanced Features — расширенные возможности.

Включает:
- Умный поиск с фильтрацией
- Анализ связей
- Генерация отчётов
- Автоматическое обогащение данных
"""
import sys
sys.path.insert(0, '../core/CORE')

import json
from pathlib import Path
from datetime import datetime
from collections import Counter


class WorldAnalyzer:
    """Аналитик мира — анализ данных и генерация отчётов."""
    
    def __init__(self, world_engine):
        self._engine = world_engine
    
    def analyze_entity(self, entity_id: str) -> dict:
        """Анализ сущности — все связи, формы, контекст."""
        entity = self._engine.get_entity(entity_id)
        if not entity:
            return {"error": f"Entity '{entity_id}' not found"}
        
        context = self._engine.get_entity_context(entity_id)
        relations = context.get("relations", {})
        
        # Анализ связей
        outgoing = relations.get("outgoing", [])
        incoming = relations.get("incoming", [])
        
        relation_types = Counter()
        for rel in outgoing + incoming:
            relation_types[rel.get("relation_type", "unknown")] += 1
        
        return {
            "entity": entity,
            "relations": {
                "outgoing_count": len(outgoing),
                "incoming_count": len(incoming),
                "by_type": dict(relation_types),
            },
            "analysis": {
                "connected_to": len(set(
                    [r.get("target_id") for r in outgoing] +
                    [r.get("source_id") for r in incoming]
                )),
                "relation_diversity": len(relation_types),
            }
        }
    
    def find_related(self, entity_id: str, max_depth: int = 2) -> list[dict]:
        """Найти связанные сущности."""
        if not self._engine._relation_graph:
            return []
        
        neighbors = self._engine._relation_graph.get_neighbors(entity_id, max_depth)
        
        results = []
        for neighbor_id, relations in neighbors.items():
            entity = self._engine.get_entity(neighbor_id)
            if entity:
                results.append({
                    "entity": entity,
                    "relation_count": len(relations),
                    "relation_types": list(set(r.relation_type.value for r in relations)),
                })
        
        return sorted(results, key=lambda x: x["relation_count"], reverse=True)
    
    def generate_report(self) -> dict:
        """Генерация полного отчёта о мире."""
        wm_stats = self._engine._world_model.get_stats()
        rg_stats = self._engine._relation_graph.get_stats() if self._engine._relation_graph else {}
        
        # Анализ категорий
        category_analysis = {}
        for category in self._engine._world_model.get_categories():
            items = self._engine._world_model.get_category(category)
            category_analysis[category] = {
                "count": len(items),
                "with_description": sum(1 for i in items if i.get("description")),
                "with_properties": sum(1 for i in items if i.get("properties")),
            }
        
        # Анализ связей
        relation_analysis = {}
        if self._engine._relation_graph:
            for rel in self._engine._relation_graph._relations.values():
                rt = rel.relation_type.value
                if rt not in relation_analysis:
                    relation_analysis[rt] = {"count": 0, "avg_strength": 0}
                relation_analysis[rt]["count"] += 1
                relation_analysis[rt]["avg_strength"] += rel.strength
            
            for rt in relation_analysis:
                count = relation_analysis[rt]["count"]
                if count > 0:
                    relation_analysis[rt]["avg_strength"] /= count
        
        return {
            "timestamp": datetime.now().isoformat(),
            "world_model": {
                "total_entities": wm_stats["total_entities"],
                "total_categories": wm_stats["total_categories"],
                "categories": category_analysis,
            },
            "relation_graph": {
                "total_relations": rg_stats.get("total_relations", 0),
                "by_type": relation_analysis,
            },
            "form_engine": {
                "total_forms": 55,
                "total_categories": 11,
            },
            "consistency": {
                "total_rules": len(self._engine.consistency.get_rules()) if self._engine.consistency else 0,
            },
            "experience": {
                "total_modes": len(self._engine.experience.get_available_modes()) if self._engine.experience else 0,
            },
        }


class SmartSearch:
    """Умный поиск с фильтрацией и ранжированием."""
    
    def __init__(self, world_engine):
        self._engine = world_engine
    
    def search_with_filters(
        self,
        query: str,
        categories: list[str] | None = None,
        min_confidence: float = 0.0,
        limit: int = 10,
    ) -> dict:
        """Поиск с фильтрацией."""
        results = self._engine.search(query)
        
        filtered = []
        for item in results.get("world_model", []):
            # Фильтр по категориям
            if categories and item.get("category") not in categories:
                continue
            
            # Фильтр по уверенности
            if item.get("confidence", 1.0) < min_confidence:
                continue
            
            filtered.append(item)
        
        return {
            "query": query,
            "total": len(filtered),
            "results": filtered[:limit],
        }
    
    def search_by_relation_type(
        self,
        relation_type: str,
        limit: int = 10,
    ) -> list[dict]:
        """Поиск по типу связи."""
        if not self._engine._relation_graph:
            return []
        
        from narrative_engine.relation_models import RelationType
        
        try:
            rt = RelationType(relation_type)
        except ValueError:
            return []
        
        relations = self._engine._relation_graph.get_relations_of_type(rt)
        
        results = []
        for rel in relations[:limit]:
            source = self._engine.get_entity(rel.source_id)
            target = self._engine.get_entity(rel.target_id)
            results.append({
                "relation": rel.to_dict(),
                "source": source,
                "target": target,
            })
        
        return results


class DataEnricher:
    """Обогащение данных — добавление недостающих полей."""
    
    def __init__(self, world_engine):
        self._engine = world_engine
        self._world_model_dir = Path(__file__).parent.parent / "core" / "CORE" / "WORLD_MODEL"
    
    def enrich_category(self, category: str) -> dict:
        """Обогатить категорию недостающими данными."""
        items = self._engine._world_model.get_category(category)
        
        enriched = 0
        for item in items:
            # Добавляем description если отсутствует
            if not item.get("description") and item.get("name"):
                item["description"] = f"{item.get('name')} — элемент мира книги"
                enriched += 1
            
            # Добавляем properties если отсутствует
            if not item.get("properties"):
                item["properties"] = {}
                enriched += 1
        
        return {
            "category": category,
            "total": len(items),
            "enriched": enriched,
        }
    
    def enrich_all(self) -> dict:
        """Обогатить все категории."""
        results = {}
        for category in self._engine._world_model.get_categories():
            results[category] = self.enrich_category(category)
        return results
