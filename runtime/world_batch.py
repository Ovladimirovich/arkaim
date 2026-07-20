"""
World Engine Batch Processing & Validation — пакетная обработка и валидация.

Использование:
    python world_batch.py validate
    python world_batch.py export --format json
    python world_batch.py stats
    python world_batch.py check-consistency
"""
import sys
sys.path.insert(0, '../core/CORE')

import json
from pathlib import Path
from datetime import datetime


WORLD_MODEL_DIR = Path(__file__).parent.parent / "core" / "CORE" / "WORLD_MODEL"
OUTPUT_DIR = Path(__file__).parent / "world_engine_output"


def ensure_output_dir():
    """Создать директорию для вывода."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def validate_data():
    """Валидация всех данных мира."""
    print("=" * 60)
    print(" ВАЛИДАЦИЯ ДАННЫХ МИРА")
    print("=" * 60)
    
    issues = []
    stats = {"total_files": 0, "total_items": 0, "valid": 0, "invalid": 0}
    
    for json_file in WORLD_MODEL_DIR.glob("*.json"):
        stats["total_files"] += 1
        category = json_file.stem.lower()
        
        try:
            data = json.loads(json_file.read_text(encoding="utf-8-sig"))
            if not isinstance(data, list):
                data = [data]
            
            for item in data:
                stats["total_items"] += 1
                
                # Проверяем обязательные поля
                if not item.get("id"):
                    issues.append(f"[{category}] Отсутствует id")
                    stats["invalid"] += 1
                elif not item.get("name"):
                    issues.append(f"[{category}] Отсутствует name: {item.get('id')}")
                    stats["invalid"] += 1
                else:
                    stats["valid"] += 1
        
        except Exception as e:
            issues.append(f"[{category}] Ошибка чтения: {e}")
            stats["invalid"] += 1
    
    print(f"\nФайлов: {stats['total_files']}")
    print(f"Всего сущностей: {stats['total_items']}")
    print(f"Валидных: {stats['valid']}")
    print(f"Невалидных: {stats['invalid']}")
    
    if issues:
        print(f"\nПроблемы ({len(issues)}):")
        for issue in issues[:20]:
            print(f"  - {issue}")
    else:
        print("\nВсе данные валидны!")
    
    return stats, issues


def export_data(format="json"):
    """Экспорт данных в различные форматы."""
    ensure_output_dir()
    
    print("=" * 60)
    print(f" ЭКСПОРТ ДАННЫХ ({format.upper()})")
    print("=" * 60)
    
    from narrative_engine.world_engine import WorldEngine
    engine = WorldEngine()
    engine.initialize()
    
    # Экспорт в JSON
    output_file = OUTPUT_DIR / f"world_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    export_data = {
        "metadata": {
            "exported_at": datetime.now().isoformat(),
            "world_engine_version": "1.0.0",
            "stats": engine.get_stats(),
        },
        "entities": {},
        "relations": [],
    }
    
    # Экспорт сущностей
    for category in engine._world_model.get_categories():
        items = engine._world_model.get_category(category)
        export_data["entities"][category] = items
    
    # Экспорт связей
    if engine._relation_graph:
        for rel in engine._relation_graph._relations.values():
            export_data["relations"].append(rel.to_dict())
    
    output_file.write_text(json.dumps(export_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nЭкспортировано в: {output_file}")
    print(f"Сущностей: {sum(len(v) for v in export_data['entities'].values())}")
    print(f"Связей: {len(export_data['relations'])}")
    
    return output_file


def show_stats():
    """Показать детальную статистику."""
    print("=" * 60)
    print(" ДЕТАЛЬНАЯ СТАТИСТИКА")
    print("=" * 60)
    
    from narrative_engine.world_engine import WorldEngine
    engine = WorldEngine()
    engine.initialize()
    
    # World Model
    wm_stats = engine._world_model.get_stats()
    print(f"\nWorld Model:")
    print(f"  Всего сущностей: {wm_stats['total_entities']}")
    print(f"  Категорий: {wm_stats['total_categories']}")
    for cat, count in sorted(wm_stats['by_category'].items(), key=lambda x: -x[1]):
        print(f"    {cat}: {count}")
    
    # Relation Graph
    if engine._relation_graph:
        rg_stats = engine._relation_graph.get_stats()
        print(f"\nRelation Graph:")
        print(f"  Всего связей: {rg_stats['total_relations']}")
        for rt, count in rg_stats['by_type'].items():
            print(f"    {rt}: {count}")
    
    # Form Library
    if engine._form_engine:
        fl_stats = engine._form_engine._form_library.get_stats()
        print(f"\nForm Library:")
        print(f"  Всего форм: {fl_stats['total_forms']}")
        print(f"  Категорий: {fl_stats['total_categories']}")
    
    # Consistency
    if engine._consistency_engine:
        rules = engine._consistency_engine.get_rules()
        print(f"\nConsistency:")
        print(f"  Правил: {len(rules)}")
    
    # Experience
    if engine._experience_engine:
        modes = engine._experience_engine.get_available_modes()
        print(f"\nExperience:")
        print(f"  Режимов: {len(modes)}")


def check_consistency():
    """Проверка консистентности всех данных."""
    print("=" * 60)
    print(" ПРОВЕРКА КОНСИСТЕНТНОСТИ")
    print("=" * 60)
    
    from narrative_engine.world_engine import WorldEngine
    engine = WorldEngine()
    engine.initialize()
    
    total_entities = 0
    valid_entities = 0
    issues = []
    
    for category in engine._world_model.get_categories():
        items = engine._world_model.get_category(category)
        for item in items:
            total_entities += 1
            report = engine.consistency.validate_entity(item)
            if report.is_valid:
                valid_entities += 1
            else:
                for v in report.violations:
                    issues.append(f"[{category}] {item.get('name', item.get('id'))}: {v.description}")
    
    print(f"\nВсего сущностей: {total_entities}")
    print(f"Валидных: {valid_entities}")
    print(f"С проблемами: {total_entities - valid_entities}")
    
    if issues:
        print(f"\nПроблемы ({len(issues)}):")
        for issue in issues[:20]:
            print(f"  - {issue}")
    else:
        print("\nВсе данные консистентны!")


def main():
    """Главная функция."""
    import argparse
    
    parser = argparse.ArgumentParser(description="World Engine Batch Processing")
    subparsers = parser.add_subparsers(dest="command", help="Команда")
    
    subparsers.add_parser("validate", help="Валидация данных")
    
    export_parser = subparsers.add_parser("export", help="Экспорт данных")
    export_parser.add_argument("--format", default="json", help="Формат экспорта")
    
    subparsers.add_parser("stats", help="Детальная статистика")
    subparsers.add_parser("check-consistency", help="Проверка консистентности")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    if args.command == "validate":
        validate_data()
    elif args.command == "export":
        export_data(args.format)
    elif args.command == "stats":
        show_stats()
    elif args.command == "check-consistency":
        check_consistency()


if __name__ == "__main__":
    main()
