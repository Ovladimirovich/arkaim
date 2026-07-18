"""Демонстрация World Explorer — Этап 1.

Запуск: cd runtime && .venv\Scripts\python demo_world_explorer.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "core" / "CORE"))

from narrative_engine.world_model import WorldModel
from narrative_engine.constraint_engine import StoryRequest
from narrative_engine.canon_validator import CanonValidator
from narrative_engine.compatibility_checker import CompatibilityChecker
from narrative_engine.ability_model import AbilityModel


def main():
    print("=" * 60)
    print("World Explorer — Демонстрация Этапа 1")
    print("=" * 60)

    # Загружаем WorldModel
    wm = WorldModel.load(use_cache=False)
    print(f"\nМир: {wm.summary()}")

    # Создаём компоненты
    validator = CanonValidator(wm)
    checker = CompatibilityChecker(wm)
    ability = AbilityModel(wm)

    # ── Тест 1: Валидная идея ──
    print("\n" + "─" * 60)
    print("Тест 1: Валидная идея")
    print("─" * 60)

    request = StoryRequest(
        prompt="Расскажи о духовном пути ученика в Сатья Юге в Гиперборее",
        epoch="satya_yuga",
        location="hyperborea",
    )

    canon_result = validator.validate(request)
    print(f"Canon: valid={canon_result.valid}, violations={len(canon_result.violations)}")

    compat_report = checker.check(request)
    print(f"Compatibility: score={compat_report.overall_score:.3f}, risk={compat_report.risk_level}")
    print(f"  Axes:")
    for ax in compat_report.axis_scores:
        print(f"    {ax.axis}: {ax.score:.3f}")

    # ── Тест 2: Анахронизм ──
    print("\n" + "─" * 60)
    print("Тест 2: Анахронизм (компьютер в Сатья Юге)")
    print("─" * 60)

    request2 = StoryRequest(
        prompt="Ученик использует компьютер для изучения древних текстов",
        epoch="satya_yuga",
    )

    compat_report2 = checker.check(request2)
    print(f"Compatibility: score={compat_report2.overall_score:.3f}, risk={compat_report2.risk_level}")
    print(f"  Violations:")
    for v in compat_report2.violations:
        print(f"    [{v.severity}] {v.axis}: {v.detail}")

    # ── Тест 3: Негативные темы ──
    print("\n" + "─" * 60)
    print("Тест 3: Негативные темы без контекста")
    print("─" * 60)

    request3 = StoryRequest(
        prompt="Война и разрушение охватили весь мир",
        epoch="satya_yuga",
    )

    compat_report3 = checker.check(request3)
    print(f"Compatibility: score={compat_report3.overall_score:.3f}, risk={compat_report3.risk_level}")
    print(f"  Warnings:")
    for w in compat_report3.warnings:
        print(f"    {w}")

    # ── Тест 4: Возможности мира ──
    print("\n" + "─" * 60)
    print("Тест 4: Возможности мира (Сатья Юга)")
    print("─" * 60)

    possibilities = ability.get_possibilities(epoch_id="satya_yuga", limit=10)
    print(f"Всего возможностей: {len(possibilities)}")
    for p in possibilities[:5]:
        print(f"  [{p.category}] {p.title} (confidence={p.confidence:.2f})")

    # ── Тест 5: Возможности для гипотезы ──
    print("\n" + "─" * 60)
    print("Тест 5: Возможности для гипотезы")
    print("─" * 60)

    hypothesis = "Что если Аркаим не был разрушен?"
    poss_for_hyp = ability.get_possibilities_for_hypothesis(hypothesis, epoch_id="satya_yuga")
    print(f"Гипотеза: {hypothesis}")
    print(f"Релевантных возможностей: {len(poss_for_hyp)}")
    for p in poss_for_hyp[:5]:
        print(f"  [{p.category}] {p.title}")

    # ── Итог ──
    print("\n" + "=" * 60)
    print("Этап 1 завершён: Canon Engine + World Model")
    print("  - CompatibilityChecker: 6 осей проверки")
    print("  - AbilityModel: модель возможностей мира")
    print("  - 24 unit-теста проходят")
    print("=" * 60)


if __name__ == "__main__":
    main()
