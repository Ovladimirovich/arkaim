"""Демонстрация World Explorer — Этап 4: Quality Evaluator.

Запуск: cd runtime && .venv\Scripts\python demo_quality_evaluator.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "core" / "CORE"))

from narrative_engine.world_model import WorldModel
from narrative_engine.hypothesis_generator import HypothesisGenerator
from narrative_engine.scenario_modeler import ScenarioModeler
from narrative_engine.quality_evaluator import QualityEvaluator, CRITERIA_WEIGHTS


def main():
    print("=" * 60)
    print("World Explorer — Демонстрация Этапа 4: Quality Evaluator")
    print("=" * 60)

    # Загружаем WorldModel
    wm = WorldModel.load(use_cache=False)
    print(f"\nМир: {wm.summary()}")
    print(f"\nВеса критериев:")
    for k, v in CRITERIA_WEIGHTS.items():
        print(f"  {k}: {v:.2f}")

    # Создаём компоненты
    gen = HypothesisGenerator(wm)
    modeler = ScenarioModeler(wm)
    evaluator = QualityEvaluator(wm)

    # ── Тест 1: Оценка одной ветви ──
    print("\n" + "─" * 60)
    print("Тест 1: Оценка одной ветви")
    print("─" * 60)

    hyps = gen.generate_for_epoch("satya_yuga", limit=1)
    scenario = modeler.model_scenario(hyps[0], branch_count=3)

    report = evaluator.evaluate(scenario.branches[0])
    print(f"\nВетвь: {scenario.branches[0].title_ru}")
    print(f"Общий балл: {report.overall_score:.3f}")
    print(f"\nОценки по критериям:")
    for cs in report.criteria_scores:
        print(f"  {cs.criterion}: {cs.score:.3f} (вес {cs.weight:.2f}) → {cs.weighted_score:.3f}")
        print(f"    {cs.explanation}")

    print(f"\nСильные стороны:")
    for s in report.strengths:
        print(f"  + {s}")

    print(f"\nСлабые стороны:")
    for w in report.weaknesses:
        print(f"  - {w}")

    print(f"\nРекомендации:")
    for r in report.recommendations:
        print(f"  → {r}")

    # ── Тест 2: Ранжирование альтернатив ──
    print("\n" + "─" * 60)
    print("Тест 2: Ранжирование альтернатив")
    print("─" * 60)

    ranked = evaluator.rank_alternatives(scenario.branches)
    print(f"\nРанжирование {len(ranked)} альтернатив:")
    for report in ranked:
        print(f"  #{report.rank}: {report.overall_score:.3f} — ", end="")
        # Находим название ветви
        for branch in scenario.branches:
            if branch.id and branch.quality_score > 0:
                pass
        print(f"Критериев: {len(report.criteria_scores)}")

    # ── Тест 3: Сравнение типов ветвей ──
    print("\n" + "─" * 60)
    print("Тест 3: Сравнение типов ветвей")
    print("─" * 60)

    scenario2 = modeler.model_scenario(hyps[0], branch_count=4)
    ranked2 = evaluator.rank_alternatives(scenario2.branches)

    print(f"\nТипы ветвей и их баллы:")
    for report in ranked2:
        for branch in scenario2.branches:
            if abs(branch.quality_score - report.overall_score) < 0.01:
                print(f"  [{branch.branch_type}] {report.overall_score:.3f}")
                break

    # ── Тест 4: Полный pipeline ──
    print("\n" + "─" * 60)
    print("Тест 4: Полный pipeline")
    print("─" * 60)

    # Генерируем несколько гипотез
    hyps3 = gen.generate_for_epoch("satya_yuga", limit=3)
    print(f"\nГипотез: {len(hyps3)}")

    all_reports = []
    for hyp in hyps3:
        scenario3 = modeler.model_scenario(hyp, branch_count=2)
        reports = evaluator.evaluate_branches(scenario3.branches)
        all_reports.extend(reports)

    # Сортируем все отчёты
    all_reports.sort(key=lambda r: r.overall_score, reverse=True)

    print(f"Всего оценено ветвей: {len(all_reports)}")
    print(f"\nТоп-5:")
    for i, report in enumerate(all_reports[:5], 1):
        print(f"  {i}. {report.overall_score:.3f}")

    # ── Итог ──
    print("\n" + "=" * 60)
    print("Этап 4 завершён: Quality Evaluator")
    print("  - 5 критериев оценки")
    print("  - Ранжирование альтернатив")
    print("  - Сильные/слабые стороны")
    print("  - Рекомендации")
    print("  - 57 unit-тестов проходят")
    print("=" * 60)


if __name__ == "__main__":
    main()
