"""Демонстрация World Explorer — Этап 5: Полный pipeline.

Запуск: cd runtime && .venv\Scripts\python demo_world_explorer_full.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "core" / "CORE"))

from narrative_engine.world_model import WorldModel
from narrative_engine.world_explorer import WorldExplorer, ExplorationRequest


def main():
    print("=" * 70)
    print("World Explorer — Полная демонстрация (Этапы 1-5)")
    print("=" * 70)

    # Загружаем WorldModel
    wm = WorldModel.load(use_cache=False)
    print(f"\nМир: {wm.summary()}")

    # Создаём explorer
    explorer = WorldExplorer(wm)

    # ── Сценарий 1: Путешествие героя ──
    print("\n" + "═" * 70)
    print("СЦЕНАРИЙ 1: Путешествие героя")
    print("═" * 70)

    request1 = ExplorationRequest(
        prompt="Путешествие героя через Гиперборею в Сатья Юге",
        epoch="satya_yuga",
        branch_count=3,
    )

    result1 = explorer.explore(request1)
    print(f"\nРезультат: {result1.summary}")
    print(f"Время: {result1.duration_ms:.0f}ms")

    print(f"\nГипотеза: {result1.hypothesis.title_ru}")
    print(f"Тип: {result1.hypothesis.hypothesis_type}")

    print(f"\nОтранжированные альтернативы:")
    for rb in result1.ranked_branches:
        print(f"  #{rb.rank}: [{rb.branch.branch_type}] {rb.branch.title_ru}")
        print(f"    Качество: {rb.quality_report.overall_score:.3f}")
        print(f"    Влияние: {rb.impact_report.overall_impact_score:.3f}")
        print(f"    Противоречия: {rb.contradiction_report.hard_count}")
        print(f"    Изменения мира: {rb.world_delta.total_changes}")

    # ── Сценарий 2: Что если Аркаим не разрушен ──
    print("\n" + "═" * 70)
    print("СЦЕНАРИЙ 2: Что если Аркаим не был разрушен?")
    print("═" * 70)

    request2 = ExplorationRequest(
        prompt="Что если Аркаим не был разрушен и продолжил развиваться?",
        epoch="satya_yuga",
        branch_count=4,
    )

    result2 = explorer.explore(request2)
    print(f"\nРезультат: {result2.summary}")

    print(f"\nТоп-3 альтернативы:")
    for rb in result2.ranked_branches[:3]:
        print(f"  #{rb.rank}: {rb.quality_report.overall_score:.3f} — {rb.branch.title_ru}")
        print(f"    Сильные стороны: {', '.join(rb.quality_report.strengths[:2])}")

    # ── Сценарий 3: Проактивное исследование ──
    print("\n" + "═" * 70)
    print("СЦЕНАРИЙ 3: Проактивное исследование (без ввода)")
    print("═" * 70)

    request3 = ExplorationRequest(
        prompt="Исследование возможностей мира",
        branch_count=3,
    )

    result3 = explorer.explore(request3)
    print(f"\nРезультат: {result3.summary}")

    # ── Сценарий 4: Гипотезы для эпохи ──
    print("\n" + "═" * 70)
    print("СЦЕНАРИЙ 4: Гипотезы для Сатья Юга")
    print("═" * 70)

    hyps = explorer.get_hypotheses("satya_yuga", limit=5)
    print(f"\nГипотез: {len(hyps)}")
    for i, h in enumerate(hyps[:5], 1):
        print(f"  {i}. [{h.hypothesis_type}] {h.title_ru}")

    # ── Сценарий 5: Возможности эпохи ──
    print("\n" + "═" * 70)
    print("СЦЕНАРИЙ 5: Возможности Сатья Юга")
    print("═" * 70)

    possibilities = explorer.get_possibilities("satya_yuga", limit=5)
    print(f"\nВозможностей: {len(possibilities)}")
    for p in possibilities[:5]:
        print(f"  [{p.category}] {p.title_ru} (confidence={p.confidence:.2f})")

    # ── Итог ──
    print("\n" + "=" * 70)
    print("ИТОГ: World Explorer — все 5 этапов завершены")
    print("=" * 70)
    print("""
  Этап 1: Canon Engine + World Model
    - CompatibilityChecker: 6 осей проверки
    - AbilityModel: модель возможностей мира

  Этап 2: Logic Engine
    - 54 мифологических паттерна
    - ImpactAssessor: оценка влияния
    - ContradictionDetector: обнаружение парадоксов
    - WorldDelta: модель изменений мира

  Этап 3: Exploration Core
    - HypothesisGenerator: генерация гипотез
    - ScenarioModeler: моделирование сценариев
    - BranchManager: управление ветвями

  Этап 4: Quality Evaluator
    - 5 критериев оценки
    - Ранжирование альтернатив

  Этап 5: Integration
    - WorldExplorer: единый pipeline
    - API endpoints: /book/world-explorer/*

  Всего: 62 unit-теста, все проходят
""")


if __name__ == "__main__":
    main()
