"""
World Engine — Демонстрация всех возможностей.

Запуск: python demo_world_engine.py
"""
import sys
sys.path.insert(0, '../core/CORE')

from narrative_engine.world_engine import WorldEngine
from narrative_engine.experience_engine import ExperienceMode


def print_separator(title=""):
    if title:
        print(f"\n{'='*60}")
        print(f" {title}")
        print(f"{'='*60}")
    else:
        print(f"{'-'*60}")


def demo_world_model(engine):
    """Демонстрация World Model."""
    print_separator("1. WORLD MODEL")
    
    stats = engine._world_model.get_stats()
    print(f"Всего сущностей: {stats['total_entities']}")
    print(f"Категорий: {stats['total_categories']}")
    print()
    
    print("Категории:")
    for cat, count in sorted(stats['by_category'].items(), key=lambda x: -x[1]):
        print(f"  {cat}: {count}")


def demo_search(engine):
    """Демонстрация поиска."""
    print_separator("2. ПОИСК ПО МИРУ")
    
    queries = ["Аркаим", "Гиперборея", "технологии", "религия"]
    
    for query in queries:
        results = engine.search(query)
        print(f"\nЗапрос: '{query}'")
        print(f"  Найдено: {results['total']} результатов")
        
        for item in results.get("world_model", [])[:2]:
            print(f"    - [{item.get('category')}] {item.get('name', 'N/A')}")


def demo_entity(engine):
    """Демонстрация работы с сущностями."""
    print_separator("3. СУЩНОСТИ МИРА")
    
    entities = ["region_arkaim", "region_hyperborea", "tech_аркаим"]
    
    for entity_id in entities:
        entity = engine.get_entity(entity_id)
        if entity:
            print(f"\nСущность: {entity.get('name', entity_id)}")
            print(f"  Категория: {entity.get('category')}")
            print(f"  Описание: {entity.get('description', '')[:100]}...")
            
            # Контекст
            context = engine.get_entity_context(entity_id)
            relations = context.get("relations", {})
            print(f"  Связей: исходящих: {relations.get('outgoing_count', 0)}, входящих: {relations.get('incoming_count', 0)}")


def demo_visual(engine):
    """Демонстрация визуальных промптов."""
    print_separator("4. ВИЗУАЛЬНЫЕ ПРОМПТЫ")
    
    entities = ["region_arkaim", "region_hyperborea"]
    styles = ["cinematic", "realistic", "ethereal"]
    
    for entity_id in entities:
        entity = engine.get_entity(entity_id)
        if not entity:
            continue
        
        print(f"\nСущность: {entity.get('name', entity_id)}")
        
        for style in styles:
            prompt = engine.form_engine.generate_visual_prompt(entity_id, style)
            print(f"  [{style}] {prompt[:150]}...")


def demo_consistency(engine):
    """Демонстрация проверки консистентности."""
    print_separator("5. ПРОВЕРКА КОНСИСТЕНТНОСТИ")
    
    rules = engine.consistency.get_rules()
    print(f"Правил: {len(rules)}")
    for rule in rules[:3]:
        print(f"  - {rule.name_ru} ({rule.rule_type.value})")
    
    # Проверка тестовой сущности
    test_entity = {
        "id": "test_event",
        "name": "Тестовое событие",
        "category": "event",
        "description": "Тестовое событие для проверки"
    }
    
    report = engine.consistency.validate_entity(test_entity)
    print(f"\nПроверка тестовой сущности:")
    print(f"  Валидно: {report.is_valid}")
    print(f"  Оценка: {report.score:.2f}")
    print(f"  Нарушений: {len(report.violations)}")
    print(f"  Предупреждений: {len(report.warnings)}")


def demo_experience(engine):
    """Демонстрация режимов работы."""
    print_separator("6. РЕЖИМЫ РАБОТЫ")
    
    modes = engine.experience.get_available_modes()
    print(f"Доступно режимов: {len(modes)}")
    for mode in modes:
        print(f"  - {mode['mode']}: {mode['name']}")
    
    # Создание пути
    path = engine.experience.create_path(ExperienceMode.DIALOG)
    print(f"\nСоздан путь: {path.id} (режим: {path.mode.value})")


def demo_relations(engine):
    """Демонстрация графа связей."""
    print_separator("7. ГРАФ СВЯЗЕЙ")
    
    stats = engine._relation_graph.get_stats()
    print(f"Всего связей: {stats['total_relations']}")
    print(f"По типам:")
    for rt, count in stats['by_type'].items():
        print(f"  {rt}: {count}")
    
    # Соседи Аркаима
    neighbors = engine._relation_graph.get_neighbors("region_arkaim")
    print(f"\nСоседи Аркаима: {len(neighbors)}")
    for neighbor_id in list(neighbors.keys())[:5]:
        print(f"  - {neighbor_id}")


def demo_summary(engine):
    """Демонстрация сводки."""
    print_separator("8. СВОДКА МИРА")
    
    print(engine.summary())
    print()
    
    stats = engine.get_stats()
    print("Статистика:")
    print(f"  World Model: {stats['world_model']['total_entities']} сущностей")
    print(f"  Relation Graph: {stats['relation_graph'].get('total_relations', 'N/A')} связей")
    print(f"  Form Engine: {stats.get('form_engine', 'N/A')}")


def main():
    """Главная функция демонстрации."""
    print("=" * 60)
    print(" WORLD ENGINE — ДЕМОНСТРАЦИЯ")
    print("=" * 60)
    
    # Создаём и инициализируем движок
    print("\nИнициализация World Engine...")
    engine = WorldEngine()
    engine.initialize()
    print("Готово!")
    
    # Запускаем демонстрации
    demo_world_model(engine)
    demo_search(engine)
    demo_entity(engine)
    demo_visual(engine)
    demo_consistency(engine)
    demo_experience(engine)
    demo_relations(engine)
    demo_summary(engine)
    
    print_separator()
    print("ДЕМОНСТРАЦИЯ ЗАВЕРШЕНА")
    print("=" * 60)


if __name__ == "__main__":
    main()
