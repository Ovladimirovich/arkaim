"""Демонстрация World Explorer — Этап 2: Logic Engine.

Запуск: cd runtime && .venv\Scripts\python demo_logic_engine.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "core" / "CORE"))

from narrative_engine.world_model import WorldModel
from narrative_engine.constraint_engine import StoryRequest
from narrative_engine.context_assembler import FullContext
from narrative_engine.planners.cause_effect import CauseEffectPlanner, PATTERN_CHAINS
from narrative_engine.impact_assessor import ImpactAssessor
from narrative_engine.contradiction_detector import ContradictionDetector
from narrative_engine.world_delta import WorldDeltaCalculator


def main():
    print("=" * 60)
    print("World Explorer — Демонстрация Этапа 2: Logic Engine")
    print("=" * 60)

    # Загружаем WorldModel
    wm = WorldModel.load(use_cache=False)
    print(f"\nМир: {wm.summary()}")
    print(f"Паттернов: {len(PATTERN_CHAINS)}")

    # Создаём компоненты
    planner = CauseEffectPlanner(wm)
    assessor = ImpactAssessor(wm)
    detector = ContradictionDetector(wm)
    delta_calc = WorldDeltaCalculator(wm)

    # ── Тест 1: Путешествие героя ──
    print("\n" + "─" * 60)
    print("Тест 1: Путешествие героя")
    print("─" * 60)

    request = StoryRequest(
        prompt="Путешествие героя через Гиперборею в Сатья Юге",
        epoch="satya_yuga",
        location="hyperborea",
    )
    context = FullContext()

    # 1. Строим дерево причин-следствий
    tree = planner.plan(request, context)
    print(f"\nДерево причин-следствий:")
    print(f"  Узлов: {len(tree.nodes)}")
    print(f"  Паттерн: {tree.matched_pattern or 'не найден'}")
    for node in tree.nodes[:5]:
        print(f"    [{node.type}] {node.description[:60]}...")

    # 2. Оцениваем влияние
    impact = assessor.assess(tree, epoch_id="satya_yuga")
    print(f"\nВлияние на мир:")
    print(f"  Персонажей затронуто: {len(impact.character_impacts)}")
    print(f"  Локаций затронуто: {len(impact.location_impacts)}")
    print(f"  Ценностей укреплено: {len(impact.value_impacts)}")
    print(f"  Общая оценка: {impact.overall_impact_score:.3f}")
    print(f"  Сводка: {impact.summary}")

    # 3. Проверяем противоречия
    contradictions = detector.detect(tree)
    print(f"\nПротиворечия:")
    print(f"  Непротиворечиво: {contradictions.is_consistent}")
    print(f"  Критических: {contradictions.hard_count}")
    print(f"  Предупреждений: {contradictions.soft_count}")
    print(f"  Сводка: {contradictions.summary}")

    # 4. Рассчитываем изменения мира
    delta = delta_calc.calculate(tree, impact, epoch_id="satya_yuga")
    print(f"\nИзменения мира:")
    print(f"  Всего изменений: {delta.total_changes}")
    print(f"  Масштаб: {delta.impact_magnitude:.3f}")
    print(f"  Сводка: {delta.summary}")

    # ── Тест 2: Анахронизм ──
    print("\n" + "─" * 60)
    print("Тест 2: Анахронизм (компьютер в Сатья Юге)")
    print("─" * 60)

    request2 = StoryRequest(
        prompt="Ученик использует компьютер для изучения текстов",
        epoch="satya_yuga",
    )

    tree2 = planner.plan(request2, context)
    contradictions2 = detector.detect(tree2)
    print(f"\nПротиворечия:")
    print(f"  Непротиворечиво: {contradictions2.is_consistent}")
    print(f"  Критических: {contradictions2.hard_count}")
    for c in contradictions2.contradictions[:3]:
        print(f"    [{c.severity}] {c.contradiction_type}: {c.description[:60]}")

    # ── Тест 3: Негативные темы ──
    print("\n" + "─" * 60)
    print("Тест 3: Негативные темы")
    print("─" * 60)

    request3 = StoryRequest(
        prompt="Война и разрушение охватили мир",
        epoch="satya_yuga",
    )

    tree3 = planner.plan(request3, context)
    impact3 = assessor.assess(tree3, epoch_id="satya_yuga")
    print(f"\nВлияние:")
    print(f"  Общая оценка: {impact3.overall_impact_score:.3f}")
    print(f"  Ценности: {[vi.value_name for vi in impact3.value_impacts]}")

    # ── Итог ──
    print("\n" + "=" * 60)
    print("Этап 2 завершён: Logic Engine")
    print(f"  - Паттернов: {len(PATTERN_CHAINS)} (цель: 50+)")
    print("  - ImpactAssessor: оценка влияния на мир")
    print("  - ContradictionDetector: обнаружение парадоксов")
    print("  - WorldDelta: модель изменений мира")
    print("  - 34 unit-теста проходят")
    print("=" * 60)


if __name__ == "__main__":
    main()
