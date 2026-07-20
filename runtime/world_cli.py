"""
World Engine CLI — интерфейс командной строки.

Использование:
    python world_cli.py search "Аркаим"
    python world_cli.py entity region_arkaim
    python world_cli.py visual region_arkaim --style cinematic
    python world_cli.py rules
    python world_cli.py modes
    python world_cli.py stats
    python world_cli.py interactive
"""
import sys
sys.path.insert(0, '../core/CORE')

import argparse
from narrative_engine.world_engine import WorldEngine


def init_engine():
    """Инициализировать World Engine."""
    print("Инициализация World Engine...")
    engine = WorldEngine()
    engine.initialize()
    print("Готово!\n")
    return engine


def cmd_search(args, engine):
    """Поиск по миру."""
    results = engine.search(args.query)
    print(f"Результаты поиска: '{args.query}'")
    print(f"Найдено: {results['total']} результатов\n")
    
    for item in results.get("world_model", [])[:args.limit]:
        print(f"[{item.get('category')}] {item.get('name', 'N/A')}")
        print(f"  {item.get('description', '')[:100]}")
        print()


def cmd_entity(args, engine):
    """Получить сущность."""
    entity = engine.get_entity(args.entity_id)
    if not entity:
        print(f"Сущность '{args.entity_id}' не найдена")
        return
    
    print(f"Сущность: {entity.get('name', args.entity_id)}")
    print(f"Категория: {entity.get('category')}")
    print(f"Описание: {entity.get('description', '')}")
    print()
    
    # Контекст
    context = engine.get_entity_context(args.entity_id)
    relations = context.get("relations", {})
    print(f"Связи:")
    print(f"  Исходящих: {relations.get('outgoing_count', 0)}")
    print(f"  Входящих: {relations.get('incoming_count', 0)}")


def cmd_visual(args, engine):
    """Генерировать визуальный промпт."""
    prompt = engine.form_engine.generate_visual_prompt(args.entity_id, args.style)
    if not prompt:
        print(f"Нет визуального промпта для '{args.entity_id}'")
        return
    
    print(f"Визуальный промпт ({args.style}):")
    print(f"{prompt}")


def cmd_rules(args, engine):
    """Показать правила."""
    rules = engine.consistency.get_rules()
    print(f"Правила консистентности ({len(rules)}):\n")
    
    for rule in rules:
        print(f"[{rule.rule_type.value}] {rule.name_ru}")
        print(f"  {rule.description_ru}")
        print()


def cmd_modes(args, engine):
    """Показать режимы работы."""
    modes = engine.experience.get_available_modes()
    print(f"Режимы работы ({len(modes)}):\n")
    
    for mode in modes:
        print(f"  {mode['mode']}: {mode['name']}")
        print(f"    {mode['description']}")
        print()


def cmd_stats(args, engine):
    """Показать статистику."""
    print(engine.summary())
    print()
    
    stats = engine.get_stats()
    print("Статистика:")
    print(f"  World Model: {stats['world_model']['total_entities']} сущностей")
    print(f"  Relation Graph: {stats['relation_graph'].get('total_relations', 'N/A')} связей")
    print(f"  Form Engine: {stats.get('form_engine', 'N/A')}")


def cmd_categories(args, engine):
    """Показать категории."""
    categories = engine._world_model.get_categories()
    print(f"Категории мира ({len(categories)}):\n")
    
    for cat in categories:
        items = engine._world_model.get_category(cat)
        print(f"  {cat}: {len(items)} сущностей")


def cmd_interactive(args, engine):
    """Интерактивный режим."""
    print("Интерактивный режим World Engine")
    print("Команды: search <query>, entity <id>, visual <id>, rules, modes, stats, categories, exit")
    print()
    
    while True:
        try:
            line = input("world> ").strip()
            if not line:
                continue
            
            parts = line.split(maxsplit=1)
            cmd = parts[0].lower()
            arg = parts[1] if len(parts) > 1 else ""
            
            if cmd == "exit" or cmd == "quit":
                print("Выход...")
                break
            elif cmd == "search":
                results = engine.search(arg)
                print(f"Найдено: {results['total']} результатов")
                for item in results.get("world_model", [])[:3]:
                    print(f"  [{item.get('category')}] {item.get('name', 'N/A')}")
            elif cmd == "entity":
                entity = engine.get_entity(arg)
                if entity:
                    print(f"{entity.get('name', arg)}: {entity.get('description', '')[:100]}")
                else:
                    print(f"Не найдено: {arg}")
            elif cmd == "visual":
                prompt = engine.form_engine.generate_visual_prompt(arg)
                print(prompt[:200] if prompt else "Нет промпта")
            elif cmd == "rules":
                rules = engine.consistency.get_rules()
                for r in rules[:5]:
                    print(f"  {r.name_ru}")
            elif cmd == "modes":
                modes = engine.experience.get_available_modes()
                for m in modes:
                    print(f"  {m['mode']}: {m['name']}")
            elif cmd == "stats":
                print(engine.summary())
            elif cmd == "categories":
                categories = engine._world_model.get_categories()
                for cat in categories:
                    items = engine._world_model.get_category(cat)
                    print(f"  {cat}: {len(items)}")
            else:
                print(f"Неизвестная команда: {cmd}")
        
        except KeyboardInterrupt:
            print("\nВыход...")
            break
        except EOFError:
            break


def main():
    """Главная функция."""
    parser = argparse.ArgumentParser(description="World Engine CLI")
    subparsers = parser.add_subparsers(dest="command", help="Команда")
    
    # search
    search_parser = subparsers.add_parser("search", help="Поиск по миру")
    search_parser.add_argument("query", help="Поисковый запрос")
    search_parser.add_argument("--limit", type=int, default=10, help="Лимит результатов")
    
    # entity
    entity_parser = subparsers.add_parser("entity", help="Получить сущность")
    entity_parser.add_argument("entity_id", help="ID сущности")
    
    # visual
    visual_parser = subparsers.add_parser("visual", help="Визуальный промпт")
    visual_parser.add_argument("entity_id", help="ID сущности")
    visual_parser.add_argument("--style", default="cinematic", help="Стиль")
    
    # rules
    subparsers.add_parser("rules", help="Показать правила")
    
    # modes
    subparsers.add_parser("modes", help="Показать режимы")
    
    # stats
    subparsers.add_parser("stats", help="Статистика")
    
    # categories
    subparsers.add_parser("categories", help="Категории")
    
    # interactive
    subparsers.add_parser("interactive", help="Интерактивный режим")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    engine = init_engine()
    
    commands = {
        "search": cmd_search,
        "entity": cmd_entity,
        "visual": cmd_visual,
        "rules": cmd_rules,
        "modes": cmd_modes,
        "stats": cmd_stats,
        "categories": cmd_categories,
        "interactive": cmd_interactive,
    }
    
    if args.command in commands:
        commands[args.command](args, engine)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
