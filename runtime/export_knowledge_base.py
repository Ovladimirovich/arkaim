"""
World Engine Knowledge Base Export — экспорт базы знаний.

Экспортирует все данные World Engine в единый JSON-файл.
"""
import sys
sys.path.insert(0, '../core/CORE')

import json
from pathlib import Path
from datetime import datetime


OUTPUT_DIR = Path(__file__).parent / "knowledge_base"


def export_knowledge_base():
    """Экспорт базы знаний."""
    from narrative_engine.world_engine import WorldEngine
    
    engine = WorldEngine()
    engine.initialize()
    
    OUTPUT_DIR.mkdir(exist_ok=True)
    
    # Основной экспорт
    export_data = {
        "metadata": {
            "exported_at": datetime.now().isoformat(),
            "version": "1.0.0",
            "description": "World Engine Knowledge Base - вычислимая модель мира книги «Наследие Аркаима»",
        },
        "statistics": engine.get_stats(),
        "entities": {},
        "relations": [],
        "forms": {},
        "rules": [],
        "modes": [],
    }
    
    # Экспорт сущностей
    for category in engine._world_model.get_categories():
        items = engine._world_model.get_category(category)
        export_data["entities"][category] = items
    
    # Экспорт связей
    if engine._relation_graph:
        for rel in engine._relation_graph._relations.values():
            export_data["relations"].append(rel.to_dict())
    
    # Экспорт форм
    if engine._form_engine:
        export_data["forms"] = engine._form_engine.get_available_forms()
    
    # Экспорт правил
    if engine._consistency_engine:
        rules = engine._consistency_engine.get_rules()
        export_data["rules"] = [
            {
                "id": r.id,
                "name": r.name,
                "name_ru": r.name_ru,
                "description": r.description,
                "description_ru": r.description_ru,
                "rule_type": r.rule_type.value,
                "severity": r.severity.value,
            }
            for r in rules
        ]
    
    # Экспорт режимов
    if engine._experience_engine:
        modes = engine._experience_engine.get_available_modes()
        export_data["modes"] = modes
    
    # Сохранение
    output_file = OUTPUT_DIR / f"knowledge_base_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(export_data, ensure_ascii=False, indent=2), encoding="utf-8")
    
    print(f"База знаний экспортирована: {output_file}")
    print(f"  Сущностей: {sum(len(v) for v in export_data['entities'].values())}")
    print(f"  Связей: {len(export_data['relations'])}")
    print(f"  Форм: {sum(len(v) for v in export_data['forms'].values())}")
    print(f"  Правил: {len(export_data['rules'])}")
    print(f"  Режимов: {len(export_data['modes'])}")
    
    return output_file


def main():
    """Главная функция."""
    print("=" * 60)
    print(" ЭКСПОРТ БАЗЫ ЗНАНИЙ")
    print("=" * 60)
    
    export_knowledge_base()
    
    print("\n" + "=" * 60)
    print(" ГОТОВО")
    print("=" * 60)


if __name__ == "__main__":
    main()
