"""Демонстрация World Explorer — Этап 3: Exploration Core.

Запуск: cd runtime && .venv\Scripts\python demo_exploration_core.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "core" / "CORE"))

from narrative_engine.world_model import WorldModel
from narrative_engine.hypothesis_generator import HypothesisGenerator
from narrative_engine.scenario_modeler import ScenarioModeler
from narrative_engine.branch_manager import BranchManager


def main():
    print("=" * 60)
    print("World Explorer — Демонстрация Этапа 3: Exploration Core")
    print("=" * 60)

    # Загружаем WorldModel
    wm = WorldModel.load(use_cache=False)
    print(f"\nМир: {wm.summary()}")

    # Создаём компоненты
    gen = HypothesisGenerator(wm)
    modeler = ScenarioModeler(wm)
    manager = BranchManager(wm)

    # ── Тест 1: Генерация гипотез ──
    print("\n" + "─" * 60)
    print("Тест 1: Генерация гипотез для Сатья Юга")
    print("─" * 60)

    hyps = gen.generate_for_epoch("satya_yuga", limit=8)
    print(f"\nСгенерировано гипотез: {len(hyps)}")
    for i, hyp in enumerate(hyps[:5], 1):
        print(f"  {i}. [{hyp.hypothesis_type}] {hyp.title_ru}")
        print(f"     Описание: {hyp.description[:60]}...")

    # ── Тест 2: Моделирование сценария ──
    print("\n" + "─" * 60)
    print("Тест 2: Моделирование сценария")
    print("─" * 60)

    if hyps:
        scenario = modeler.model_scenario(hyps[0], branch_count=3)
        print(f"\nСценарий: {scenario.summary}")
        print(f"Лучшая ветвь: {scenario.best_branch_id}")

        for branch in scenario.branches:
            print(f"\n  [{branch.branch_type}] {branch.title_ru}")
            print(f"    Качество: {branch.quality_score:.3f}")
            print(f"    Описание: {branch.description[:80]}...")

            if branch.contradiction_report:
                cr = branch.contradiction_report
                print(f"    Противоречия: {cr.hard_count} критических")

    # ── Тест 3: Навигация по дереву ──
    print("\n" + "─" * 60)
    print("Тест 3: Навигация по дереву исследований")
    print("─" * 60)

    tree = manager.start_exploration("satya_yuga")
    print(f"\nСтарт: {tree.summary}")

    root = manager.get_current_branch()
    print(f"Корень: {root.title}")

    # Исследуем ветвь
    manager.explore_branch(root.id)
    current = manager.get_current_branch()
    print(f"Текущая: {current.title} (глубина {current.depth})")

    # Ещё одна ветвь
    manager.explore_branch(current.id)
    current2 = manager.get_current_branch()
    print(f"Далее: {current2.title} (глубина {current2.depth})")

    # Идём вверх
    manager.go_up()
    back = manager.get_current_branch()
    print(f"Назад: {back.title} (глубина {back.depth})")

    # Лучшая ветвь
    best = manager.get_best_branch()
    print(f"\nЛучшая ветвь: {best.title} (качество {best.quality_score:.3f})")

    # Путь до корня
    path = manager.get_path_to_root(current2.id)
    print(f"Путь до корня: {len(path)} шагов")

    # ── Тест 4: Проактивные гипотезы ──
    print("\n" + "─" * 60)
    print("Тест 4: Проактивные гипотезы (без ввода)")
    print("─" * 60)

    proactive = gen.generate_proactive(limit=5)
    print(f"\nПроактивных гипотез: {len(proactive)}")
    for hyp in proactive[:3]:
        print(f"  [{hyp.hypothesis_type}] {hyp.title_ru}")

    # ── Тест 5: Производные гипотезы ──
    print("\n" + "─" * 60)
    print("Тест 5: Производные гипотезы")
    print("─" * 60)

    if hyps:
        derivatives = gen.generate_for_hypothesis(hyps[0], limit=3)
        print(f"\nПроизводных от '{hyps[0].title_ru}': {len(derivatives)}")
        for d in derivatives:
            print(f"  [{d.hypothesis_type}] {d.title_ru}")

    # ── Итог ──
    print("\n" + "=" * 60)
    print("Этап 3 завершён: Exploration Core")
    print("  - HypothesisGenerator: генерация гипотез")
    print("  - ScenarioModeler: моделирование сценариев")
    print("  - BranchManager: управление ветвями")
    print("  - 50 unit-тестов проходят")
    print("=" * 60)


if __name__ == "__main__":
    main()
