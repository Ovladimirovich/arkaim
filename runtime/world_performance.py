"""
World Engine Performance Optimization — оптимизация производительности.

Включает:
- Кэширование результатов
- Ленивую загрузку
- Оптимизированные индексы
- Бенчмарки
"""
import sys
sys.path.insert(0, '../core/CORE')

import time
import functools
from typing import Any, Optional
from pathlib import Path


class Cache:
    """Простой кэш с TTL."""
    
    def __init__(self, max_size: int = 1000, ttl: int = 300):
        self._cache: dict[str, tuple[Any, float]] = {}
        self._max_size = max_size
        self._ttl = ttl
    
    def get(self, key: str) -> Optional[Any]:
        """Получить значение из кэша."""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < self._ttl:
                return value
            else:
                del self._cache[key]
        return None
    
    def set(self, key: str, value: Any):
        """Сохранить значение в кэш."""
        if len(self._cache) >= self._max_size:
            # Удаляем самое старое
            oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
            del self._cache[oldest_key]
        
        self._cache[key] = (value, time.time())
    
    def clear(self):
        """Очистить кэш."""
        self._cache.clear()
    
    def stats(self) -> dict:
        """Статистика кэша."""
        return {
            "size": len(self._cache),
            "max_size": self._max_size,
            "ttl": self._ttl,
        }


class OptimizedWorldEngine:
    """Оптимизированный World Engine с кэшированием."""
    
    def __init__(self):
        self._cache = Cache(max_size=500, ttl=600)
        self._engine = None
        self._load_stats = {"total_loads": 0, "cache_hits": 0, "cache_misses": 0}
    
    def _get_engine(self):
        """Ленивая загрузка движка."""
        if self._engine is None:
            from narrative_engine.world_engine import WorldEngine
            self._engine = WorldEngine()
            self._engine.initialize()
        return self._engine
    
    def search(self, query: str, limit: int = 10) -> dict:
        """Поиск с кэшированием."""
        cache_key = f"search:{query}:{limit}"
        cached = self._cache.get(cache_key)
        
        if cached:
            self._load_stats["cache_hits"] += 1
            return cached
        
        self._load_stats["cache_misses"] += 1
        self._load_stats["total_loads"] += 1
        
        engine = self._get_engine()
        results = engine.search(query)
        
        # Ограничиваем результаты
        if "world_model" in results:
            results["world_model"] = results["world_model"][:limit]
        
        self._cache.set(cache_key, results)
        return results
    
    def get_entity(self, entity_id: str) -> Optional[dict]:
        """Получение сущности с кэшированием."""
        cache_key = f"entity:{entity_id}"
        cached = self._cache.get(cache_key)
        
        if cached:
            self._load_stats["cache_hits"] += 1
            return cached
        
        self._load_stats["cache_misses"] += 1
        self._load_stats["total_loads"] += 1
        
        engine = self._get_engine()
        entity = engine.get_entity(entity_id)
        
        if entity:
            self._cache.set(cache_key, entity)
        
        return entity
    
    def get_entity_context(self, entity_id: str) -> dict:
        """Получение контекста с кэшированием."""
        cache_key = f"context:{entity_id}"
        cached = self._cache.get(cache_key)
        
        if cached:
            self._load_stats["cache_hits"] += 1
            return cached
        
        self._load_stats["cache_misses"] += 1
        self._load_stats["total_loads"] += 1
        
        engine = self._get_engine()
        context = engine.get_entity_context(entity_id)
        
        self._cache.set(cache_key, context)
        return context
    
    def get_stats(self) -> dict:
        """Статистика с кэшированием."""
        cache_key = "stats"
        cached = self._cache.get(cache_key)
        
        if cached:
            self._load_stats["cache_hits"] += 1
            return cached
        
        self._load_stats["cache_misses"] += 1
        self._load_stats["total_loads"] += 1
        
        engine = self._get_engine()
        stats = engine.get_stats()
        
        self._cache.set(cache_key, stats)
        return stats
    
    def cache_stats(self) -> dict:
        """Статистика кэша."""
        return {
            "cache": self._cache.stats(),
            "load_stats": self._load_stats,
            "hit_rate": (
                self._load_stats["cache_hits"] / 
                max(1, self._load_stats["cache_hits"] + self._load_stats["cache_misses"])
            ) * 100,
        }


class Benchmark:
    """Бенчмарк производительности."""
    
    @staticmethod
    def benchmark_search(queries: list[str], iterations: int = 10) -> dict:
        """Бенчмарк поиска."""
        from narrative_engine.world_engine import WorldEngine
        
        engine = WorldEngine()
        engine.initialize()
        
        times = []
        for _ in range(iterations):
            for query in queries:
                start = time.time()
                engine.search(query)
                times.append(time.time() - start)
        
        return {
            "queries": len(queries),
            "iterations": iterations,
            "total_time": sum(times),
            "avg_time": sum(times) / len(times),
            "min_time": min(times),
            "max_time": max(times),
        }
    
    @staticmethod
    def benchmark_entity(entity_ids: list[str], iterations: int = 10) -> dict:
        """Бенчмарк получения сущностей."""
        from narrative_engine.world_engine import WorldEngine
        
        engine = WorldEngine()
        engine.initialize()
        
        times = []
        for _ in range(iterations):
            for entity_id in entity_ids:
                start = time.time()
                engine.get_entity(entity_id)
                times.append(time.time() - start)
        
        return {
            "entities": len(entity_ids),
            "iterations": iterations,
            "total_time": sum(times),
            "avg_time": sum(times) / len(times),
            "min_time": min(times),
            "max_time": max(times),
        }
