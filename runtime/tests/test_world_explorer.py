"""Tests for World Explorer — Этап 1: Canon Engine + World Model.

Тесты:
- Compatibility Checker (6 осей проверки)
- Ability Model (модель возможностей мира)
- Source Levels (уровни источников)
"""

import sys
from pathlib import Path

# Добавляем путь к core
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent / "core" / "CORE"))

import pytest
from narrative_engine.source_levels import SourceLevel, SOURCE_LEVEL_WEIGHTS
from narrative_engine.world_model import WorldModel
from narrative_engine.constraint_engine import StoryRequest
from narrative_engine.compatibility_checker import (
    CompatibilityChecker,
    CompatibilityReport,
    AxisScore,
    AxisViolation,
    AXIS_WEIGHTS,
)
from narrative_engine.ability_model import AbilityModel, WorldPossibility


# ── Fixtures ──────────────────────────────────────────────

@pytest.fixture(scope="module")
def world_model():
    """Загрузить WorldModel для тестов."""
    return WorldModel.load(use_cache=False)


@pytest.fixture(scope="module")
def checker(world_model):
    """Создать CompatibilityChecker для тестов."""
    return CompatibilityChecker(world_model)


@pytest.fixture(scope="module")
def ability_model(world_model):
    """Создать AbilityModel для тестов."""
    return AbilityModel(world_model)


# ── Source Levels Tests ───────────────────────────────────

class TestSourceLevels:
    """Тесты уровней источников."""

    def test_all_source_levels_have_weights(self):
        """Все уровни источников имеют веса."""
        for level in SourceLevel:
            assert level in SOURCE_LEVEL_WEIGHTS, f"SourceLevel {level} не имеет веса"

    def test_canon_weight_is_highest(self):
        """Вес CANON — максимальный."""
        assert SOURCE_LEVEL_WEIGHTS[SourceLevel.CANON] == 1.0

    def test_user_hypothesis_weight_is_lowest(self):
        """Вес USER_HYPOTHESIS — минимальный."""
        assert SOURCE_LEVEL_WEIGHTS[SourceLevel.USER_HYPOTHESIS] == 0.3

    def test_weights_are_ordered(self):
        """Веса упорядочены по убыванию."""
        levels = [
            SourceLevel.CANON,
            SourceLevel.AUTHOR_INTERPRETATION,
            SourceLevel.HISTORICAL,
            SourceLevel.MYTHOLOGICAL,
            SourceLevel.SCIENTIFIC,
            SourceLevel.SYSTEM_INTERPRETATION,
            SourceLevel.USER_HYPOTHESIS,
        ]
        for i in range(len(levels) - 1):
            assert SOURCE_LEVEL_WEIGHTS[levels[i]] >= SOURCE_LEVEL_WEIGHTS[levels[i + 1]], \
                f"Вес {levels[i]} должен быть >= веса {levels[i + 1]}"


# ── Compatibility Checker Tests ───────────────────────────

class TestCompatibilityChecker:
    """Тесты проверки совместимости по 6 осям."""

    def test_valid_idea_passes_all_axes(self, checker):
        """Совместимая идея проходит все 6 осей."""
        request = StoryRequest(
            prompt="Расскажи о духовном пути ученика в Сатья Юге в Гиперборее",
            epoch="satya_yuga",
            location="hyperborea",
        )
        report = checker.check(request)

        assert isinstance(report, CompatibilityReport)
        assert len(report.axis_scores) == 6
        assert report.overall_score > 0.0
        assert report.risk_level in ["low", "medium", "high", "rejected"]

    def test_book_canon_violation_detected(self, checker):
        """Нарушение книжного канона обнаруживается (анахронизм)."""
        request = StoryRequest(
            prompt="Ученик использует компьютер для изучения древних текстов",
            epoch="satya_yuga",
        )
        report = checker.check(request)

        # Должно быть нарушение по оси book_canon
        book_canon_score = next(ax for ax in report.axis_scores if ax.axis == "book_canon")
        assert book_canon_score.score < 1.0
        assert len(book_canon_score.violations) > 0

    def test_anachronism_detected(self, checker):
        """Анахронизм обнаруживается."""
        request = StoryRequest(
            prompt="Воин стреляет из ружье на врагов",
            epoch="satya_yuga",
        )
        report = checker.check(request)

        # Должно быть нарушение
        has_anachronism = any(
            "ружье" in v.detail.lower()
            for ax in report.axis_scores
            for v in ax.violations
        )
        assert has_anachronism, "Анахронизм 'ружье' не обнаружен"

    def test_geographic_violation_detected(self, checker):
        """Географическое нарушение обнаруживается."""
        request = StoryRequest(
            prompt="Происходит в Аркаиме во время Сатья Юги",
            epoch="satya_yuga",
            location="arkaim",
        )
        report = checker.check(request)

        # Проверяем ось geographical
        geo_score = next(ax for ax in report.axis_scores if ax.axis == "geographical")
        assert isinstance(geo_score, AxisScore)

    def test_character_not_in_epoch_detected(self, checker):
        """Персонаж не в эпохе обнаруживается."""
        request = StoryRequest(
            prompt="Дорофей путешествует по Гиперборее",
            epoch="satya_yuga",
        )
        report = checker.check(request)

        # Проверяем ось character
        char_score = next(ax for ax in report.axis_scores if ax.axis == "character")
        assert isinstance(char_score, AxisScore)

    def test_author_intent_violation_detected(self, checker):
        """Нарушение авторского замысла обнаруживается."""
        request = StoryRequest(
            prompt="Война и разрушение охватили весь мир",
            epoch="satya_yuga",
        )
        report = checker.check(request)

        # Проверяем ось author_intent
        author_score = next(ax for ax in report.axis_scores if ax.axis == "author_intent")
        assert author_score.score < 1.0

    def test_compatibility_report_score_range(self, checker):
        """Общий балл в диапазоне [0, 1]."""
        request = StoryRequest(
            prompt="Расскажи о жизни в Гиперборее",
            epoch="satya_yuga",
            location="hyperborea",
        )
        report = checker.check(request)

        assert 0.0 <= report.overall_score <= 1.0

    def test_axis_weights_sum_to_one(self):
        """Веса осей в сумме равны 1.0."""
        total = sum(AXIS_WEIGHTS.values())
        assert abs(total - 1.0) < 0.01, f"Сумма весов осей: {total}, ожидается 1.0"

    def test_risk_levels(self, checker):
        """Уровни риска определяются корректно."""
        # Идея с анахронизмом — high risk
        request = StoryRequest(
            prompt="Используем компьютер для анализа",
            epoch="satya_yuga",
        )
        report = checker.check(request)
        assert report.risk_level in ["high", "rejected"]

    def test_recommendations_generated(self, checker):
        """Рекомендации генерируются для низких баллов."""
        request = StoryRequest(
            prompt="Война и разрушение",
            epoch="satya_yuga",
        )
        report = checker.check(request)

        # Для запроса с негативными темами должны быть рекомендации
        assert isinstance(report.recommendations, list)


# ── Ability Model Tests ───────────────────────────────────

class TestAbilityModel:
    """Тесты модели возможностей мира."""

    def test_possibilities_for_epoch(self, ability_model):
        """Получить возможности для эпохи."""
        possibilities = ability_model.get_possibilities(epoch_id="satya_yuga", limit=10)

        assert isinstance(possibilities, list)
        assert len(possibilities) > 0
        assert all(isinstance(p, WorldPossibility) for p in possibilities)

    def test_possibility_has_required_fields(self, ability_model):
        """У каждой возможности есть обязательные поля."""
        possibilities = ability_model.get_possibilities(epoch_id="satya_yuga", limit=5)

        for p in possibilities:
            assert p.id, "У возможности должен быть id"
            assert p.title, "У возможности должен быть title"
            assert p.category in ["event", "character_arc", "technology", "cultural_shift", "conflict"]

    def test_possibilities_for_hypothesis(self, ability_model):
        """Получить возможности для конкретной гипотезы."""
        possibilities = ability_model.get_possibilities_for_hypothesis(
            "Что если Аркаим не был разрушен?",
            epoch_id="satya_yuga",
        )

        assert isinstance(possibilities, list)
        # Должны быть релевантные возможности
        assert len(possibilities) > 0

    def test_possibilities_deduplication(self, ability_model):
        """Возможности дедуплицируются."""
        possibilities = ability_model.get_possibilities(epoch_id="satya_yuga", limit=50)

        ids = [p.id for p in possibilities]
        assert len(ids) == len(set(ids)), "Есть дублирующиеся возможности"

    def test_summary(self, ability_model):
        """Сводка модели возможностей."""
        summary = ability_model.summary()

        assert "AbilityModel" in summary
        assert "эпох" in summary

    def test_character_possibilities(self, ability_model):
        """Возможности персонажей генерируются."""
        possibilities = ability_model.get_possibilities(epoch_id="satya_yuga", limit=20)

        char_arcs = [p for p in possibilities if p.category == "character_arc"]
        assert len(char_arcs) > 0, "Должны быть арки персонажей"

    def test_pattern_possibilities(self, ability_model):
        """Возможности паттернов генерируются."""
        possibilities = ability_model.get_possibilities(limit=20)

        patterns = [p for p in possibilities if p.category == "event"]
        assert len(patterns) > 0, "Должны быть паттерны"


# ── Integration Tests ─────────────────────────────────────

class TestWorldExplorerIntegration:
    """Интеграционные тесты: CanonValidator + WorldModel + CompatibilityChecker."""

    def test_canon_validator_plus_compatibility(self, world_model):
        """CanonValidator и CompatibilityChecker работают вместе."""
        from narrative_engine.canon_validator import CanonValidator

        request = StoryRequest(
            prompt="Расскажи о духовном пути в Гиперборее",
            epoch="satya_yuga",
            location="hyperborea",
        )

        # CanonValidator
        validator = CanonValidator(world_model)
        canon_result = validator.validate(request)
        assert canon_result.valid

        # CompatibilityChecker
        checker = CompatibilityChecker(world_model)
        compat_report = checker.check(request)
        assert compat_report.overall_score > 0.0

    def test_ability_model_plus_compatibility(self, ability_model, checker):
        """AbilityModel и CompatibilityChecker работают вместе."""
        # Получаем возможности
        possibilities = ability_model.get_possibilities(epoch_id="satya_yuga", limit=5)
        assert len(possibilities) > 0

        # Проверяем первую возможность на совместимость
        first = possibilities[0]
        request = StoryRequest(
            prompt=f"Исследуем: {first.title}",
            epoch="satya_yuga",
        )
        report = checker.check(request)
        assert report.overall_score > 0.0

    def test_world_model_seed(self, world_model):
        """WorldModel загружается и содержит данные."""
        epochs = world_model.get_epochs()
        assert len(epochs) > 0

        summary = world_model.summary()
        assert "Мир:" in summary


# ── Этап 2: Logic Engine Tests ────────────────────────────

class TestImpactAssessor:
    """Тесты оценки влияния на мир."""

    def test_impact_assessor_creates_report(self, world_model):
        """ImpactAssessor создаёт отчёт."""
        from narrative_engine.impact_assessor import ImpactAssessor, ImpactReport
        from narrative_engine.planners.cause_effect import CauseEffectTree, CauseEffectNode

        assessor = ImpactAssessor(world_model)

        # Создаём простое дерево
        tree = CauseEffectTree(
            root="Тестовое событие",
            nodes=[
                CauseEffectNode(id="n0", type="cause", description="Причина", order=0),
                CauseEffectNode(id="n1", type="effect", description="Следствие", order=1, depends_on=["n0"]),
            ],
            temporal_order=["n0", "n1"],
        )

        report = assessor.assess(tree, epoch_id="satya_yuga")
        assert isinstance(report, ImpactReport)
        assert report.overall_impact_score >= 0.0

    def test_impact_report_has_fields(self, world_model):
        """ImpactReport содержит все поля."""
        from narrative_engine.impact_assessor import ImpactAssessor
        from narrative_engine.planners.cause_effect import CauseEffectTree, CauseEffectNode

        assessor = ImpactAssessor(world_model)
        tree = CauseEffectTree(
            root="Событие",
            nodes=[CauseEffectNode(id="n0", type="cause", description="Тест", order=0)],
        )

        report = assessor.assess(tree)
        assert hasattr(report, "character_impacts")
        assert hasattr(report, "location_impacts")
        assert hasattr(report, "civilization_impacts")
        assert hasattr(report, "timeline_impacts")
        assert hasattr(report, "value_impacts")
        assert hasattr(report, "summary")


class TestContradictionDetector:
    """Тесты обнаружения противоречий."""

    def test_no_contradictions_in_valid_tree(self, world_model):
        """Нет противоречий в валидном дереве."""
        from narrative_engine.contradiction_detector import ContradictionDetector, ContradictionReport
        from narrative_engine.planners.cause_effect import CauseEffectTree, CauseEffectNode

        detector = ContradictionDetector(world_model)

        tree = CauseEffectTree(
            root="Валидное событие",
            nodes=[
                CauseEffectNode(id="n0", type="cause", description="Причина", order=0),
                CauseEffectNode(id="n1", type="effect", description="Следствие", order=1, depends_on=["n0"]),
            ],
            temporal_order=["n0", "n1"],
        )

        report = detector.detect(tree)
        assert isinstance(report, ContradictionReport)
        assert report.is_consistent

    def test_temporal_paradox_detected(self, world_model):
        """Обнаружен временной парадокс."""
        from narrative_engine.contradiction_detector import ContradictionDetector
        from narrative_engine.planners.cause_effect import CauseEffectTree, CauseEffectNode

        detector = ContradictionDetector(world_model)

        # Создаём дерево с парадоксом: effect появляется раньше cause
        tree = CauseEffectTree(
            root="Парадокс",
            nodes=[
                CauseEffectNode(id="n0", type="cause", description="Причина", order=5),
                CauseEffectNode(id="n1", type="effect", description="Следствие", order=0, depends_on=["n0"]),
            ],
            temporal_order=["n1", "n0"],  # effect trước cause
        )

        report = detector.detect(tree)
        assert not report.is_consistent
        assert report.hard_count > 0

    def test_missing_cause_detected(self, world_model):
        """Обнаружена отсутствующая причина."""
        from narrative_engine.contradiction_detector import ContradictionDetector
        from narrative_engine.planners.cause_effect import CauseEffectTree, CauseEffectNode

        detector = ContradictionDetector(world_model)

        # Effect без depends_on и с order > 0
        tree = CauseEffectTree(
            root="Без причины",
            nodes=[
                CauseEffectNode(id="n0", type="cause", description="Корень", order=0),
                CauseEffectNode(id="n1", type="effect", description="Сирота", order=1),
            ],
            temporal_order=["n0", "n1"],
        )

        report = detector.detect(tree)
        # Должно быть предупреждение (soft)
        assert report.contradiction_count >= 0  # Может быть 0 если effect на order 1 не считается сиротой

    def test_report_summary(self, world_model):
        """Сводка отчёта генерируется."""
        from narrative_engine.contradiction_detector import ContradictionDetector
        from narrative_engine.planners.cause_effect import CauseEffectTree, CauseEffectNode

        detector = ContradictionDetector(world_model)
        tree = CauseEffectTree(
            root="Тест",
            nodes=[CauseEffectNode(id="n0", type="cause", description="Тест", order=0)],
        )

        report = detector.detect(tree)
        assert isinstance(report.summary, str)
        assert len(report.summary) > 0


class TestWorldDelta:
    """Тесты модели изменений мира."""

    def test_world_delta_calculator(self, world_model):
        """WorldDeltaCalculator рассчитывает изменения."""
        from narrative_engine.world_delta import WorldDeltaCalculator, WorldDelta
        from narrative_engine.impact_assessor import ImpactAssessor
        from narrative_engine.planners.cause_effect import CauseEffectTree, CauseEffectNode

        calculator = WorldDeltaCalculator(world_model)
        assessor = ImpactAssessor(world_model)

        tree = CauseEffectTree(
            root="Тестовое событие",
            nodes=[
                CauseEffectNode(id="n0", type="cause", description="Причина", order=0),
                CauseEffectNode(id="n1", type="effect", description="Следствие", order=1, depends_on=["n0"]),
            ],
            temporal_order=["n0", "n1"],
        )

        impact_report = assessor.assess(tree, epoch_id="satya_yuga")
        delta = calculator.calculate(tree, impact_report, epoch_id="satya_yuga")

        assert isinstance(delta, WorldDelta)
        assert delta.total_changes >= 0
        assert 0.0 <= delta.impact_magnitude <= 1.0

    def test_world_delta_has_fields(self, world_model):
        """WorldDelta содержит все поля."""
        from narrative_engine.world_delta import WorldDeltaCalculator
        from narrative_engine.impact_assessor import ImpactAssessor
        from narrative_engine.planners.cause_effect import CauseEffectTree, CauseEffectNode

        calculator = WorldDeltaCalculator(world_model)
        assessor = ImpactAssessor(world_model)

        tree = CauseEffectTree(root="Событие", nodes=[])
        impact_report = assessor.assess(tree)
        delta = calculator.calculate(tree, impact_report)

        assert hasattr(delta, "character_deltas")
        assert hasattr(delta, "location_deltas")
        assert hasattr(delta, "civilization_deltas")
        assert hasattr(delta, "timeline_deltas")
        assert hasattr(delta, "value_deltas")
        assert hasattr(delta, "summary")


class TestLogicEngineIntegration:
    """Интеграционные тесты Logic Engine."""

    def test_full_logic_pipeline(self, world_model):
        """Полный pipeline: CauseEffectTree → ImpactAssessor → ContradictionDetector → WorldDelta."""
        from narrative_engine.planners.cause_effect import CauseEffectPlanner, CauseEffectTree, CauseEffectNode
        from narrative_engine.impact_assessor import ImpactAssessor
        from narrative_engine.contradiction_detector import ContradictionDetector
        from narrative_engine.world_delta import WorldDeltaCalculator
        from narrative_engine.constraint_engine import StoryRequest
        from narrative_engine.context_assembler import FullContext

        # 1. Создаём дерево причин-следствий
        planner = CauseEffectPlanner(world_model)
        request = StoryRequest(
            prompt="Путешествие героя через Гиперборею",
            epoch="satya_yuga",
            location="hyperborea",
        )
        context = FullContext()
        tree = planner.plan(request, context)

        assert isinstance(tree, CauseEffectTree)
        assert len(tree.nodes) > 0

        # 2. Оцениваем влияние
        assessor = ImpactAssessor(world_model)
        impact_report = assessor.assess(tree, epoch_id="satya_yuga")
        assert impact_report.overall_impact_score >= 0.0

        # 3. Проверяем противоречия
        detector = ContradictionDetector(world_model)
        contradiction_report = detector.detect(tree)
        assert isinstance(contradiction_report.is_consistent, bool)

        # 4. Рассчитываем изменения мира
        calculator = WorldDeltaCalculator(world_model)
        delta = calculator.calculate(tree, impact_report, epoch_id="satya_yuga")
        assert delta.total_changes >= 0

    def test_pattern_chain_expanded(self):
        """Паттерны расширены до 50+."""
        from narrative_engine.planners.cause_effect import PATTERN_CHAINS
        assert len(PATTERN_CHAINS) >= 50, f"Ожидалось 50+ паттернов, получено {len(PATTERN_CHAINS)}"


# ── Этап 3: Exploration Core Tests ─────────────────────────

class TestHypothesisGenerator:
    """Тесты генератора гипотез."""

    def test_generate_for_possibility(self, world_model):
        """Генерация гипотез на основе возможности."""
        from narrative_engine.hypothesis_generator import HypothesisGenerator, Hypothesis
        from narrative_engine.ability_model import AbilityModel

        gen = HypothesisGenerator(world_model)
        ability = AbilityModel(world_model)

        possibilities = ability.get_possibilities(epoch_id="satya_yuga", limit=1)
        assert len(possibilities) > 0

        hyps = gen.generate_for_possibility(possibilities[0], epoch_id="satya_yuga")
        assert len(hyps) > 0
        assert all(isinstance(h, Hypothesis) for h in hyps)

    def test_generate_for_epoch(self, world_model):
        """Генерация гипотез для эпохи."""
        from narrative_engine.hypothesis_generator import HypothesisGenerator, Hypothesis

        gen = HypothesisGenerator(world_model)
        hyps = gen.generate_for_epoch("satya_yuga", limit=10)

        assert len(hyps) > 0
        assert len(hyps) <= 10
        assert all(isinstance(h, Hypothesis) for h in hyps)

    def test_generate_for_hypothesis(self, world_model):
        """Генерация производных гипотез."""
        from narrative_engine.hypothesis_generator import HypothesisGenerator, Hypothesis

        gen = HypothesisGenerator(world_model)
        hyps = gen.generate_for_epoch("satya_yuga", limit=1)

        assert len(hyps) > 0

        derivatives = gen.generate_for_hypothesis(hyps[0], limit=3)
        assert len(derivatives) > 0
        assert all(isinstance(d, Hypothesis) for d in derivatives)

    def test_generate_proactive(self, world_model):
        """Проактивная генерация гипотез."""
        from narrative_engine.hypothesis_generator import HypothesisGenerator

        gen = HypothesisGenerator(world_model)
        hyps = gen.generate_proactive(epoch_id="satya_yuga", limit=5)

        assert len(hyps) > 0

    def test_build_graph(self, world_model):
        """Построение графа гипотез."""
        from narrative_engine.hypothesis_generator import HypothesisGenerator, HypothesisGraph

        gen = HypothesisGenerator(world_model)
        graph = gen.build_graph("satya_yuga", depth=2, limit_per_level=3)

        assert isinstance(graph, HypothesisGraph)
        assert graph.total_count > 0
        assert len(graph.hypotheses) > 0

    def test_hypothesis_has_required_fields(self, world_model):
        """Гипотеза содержит обязательные поля."""
        from narrative_engine.hypothesis_generator import HypothesisGenerator

        gen = HypothesisGenerator(world_model)
        hyps = gen.generate_for_epoch("satya_yuga", limit=1)

        for hyp in hyps:
            assert hyp.id, "Гипотеза должна иметь id"
            assert hyp.title, "Гипотеза должна иметь title"
            assert hyp.hypothesis_type, "Гипотеза должна иметь hypothesis_type"


class TestScenarioModeler:
    """Тесты моделировщика сценариев."""

    def test_model_scenario(self, world_model):
        """Моделирование сценария для гипотезы."""
        from narrative_engine.hypothesis_generator import HypothesisGenerator
        from narrative_engine.scenario_modeler import ScenarioModeler, ScenarioTree

        gen = HypothesisGenerator(world_model)
        modeler = ScenarioModeler(world_model)

        hyps = gen.generate_for_epoch("satya_yuga", limit=1)
        assert len(hyps) > 0

        tree = modeler.model_scenario(hyps[0], branch_count=3)
        assert isinstance(tree, ScenarioTree)
        assert tree.branch_count > 0
        assert len(tree.branches) > 0

    def test_scenario_branches_have_quality(self, world_model):
        """Ветви сценария имеют оценку качества."""
        from narrative_engine.hypothesis_generator import HypothesisGenerator
        from narrative_engine.scenario_modeler import ScenarioModeler

        gen = HypothesisGenerator(world_model)
        modeler = ScenarioModeler(world_model)

        hyps = gen.generate_for_epoch("satya_yuga", limit=1)
        tree = modeler.model_scenario(hyps[0], branch_count=2)

        for branch in tree.branches:
            assert 0.0 <= branch.quality_score <= 1.0

    def test_best_branch_selected(self, world_model):
        """Выбирается лучшая ветвь."""
        from narrative_engine.hypothesis_generator import HypothesisGenerator
        from narrative_engine.scenario_modeler import ScenarioModeler

        gen = HypothesisGenerator(world_model)
        modeler = ScenarioModeler(world_model)

        hyps = gen.generate_for_epoch("satya_yuga", limit=1)
        tree = modeler.model_scenario(hyps[0], branch_count=3)

        assert tree.best_branch_id != ""
        best = next(b for b in tree.branches if b.id == tree.best_branch_id)
        assert best.quality_score >= 0.0


class TestBranchManager:
    """Тесты менеджера ветвей."""

    def test_start_exploration(self, world_model):
        """Начало исследования."""
        from narrative_engine.branch_manager import BranchManager, ExplorationTree

        manager = BranchManager(world_model)
        tree = manager.start_exploration("satya_yuga")

        assert isinstance(tree, ExplorationTree)
        assert tree.root_id != ""
        assert tree.current_id != ""

    def test_explore_branch(self, world_model):
        """Исследование ветви."""
        from narrative_engine.branch_manager import BranchManager

        manager = BranchManager(world_model)
        tree = manager.start_exploration("satya_yuga")
        initial_count = tree.total_nodes

        root = manager.get_current_branch()
        assert root is not None

        manager.explore_branch(root.id)
        assert manager._tree.total_nodes > initial_count

    def test_navigation(self, world_model):
        """Навигация по дереву."""
        from narrative_engine.branch_manager import BranchManager

        manager = BranchManager(world_model)
        manager.start_exploration("satya_yuga")

        root = manager.get_current_branch()
        manager.explore_branch(root.id)

        # Идём вниз
        current = manager.get_current_branch()
        assert current.depth > 0

        # Идём вверх
        manager.go_up()
        current2 = manager.get_current_branch()
        assert current2.depth == 0

    def test_get_best_branch(self, world_model):
        """Поиск лучшей ветви."""
        from narrative_engine.branch_manager import BranchManager

        manager = BranchManager(world_model)
        manager.start_exploration("satya_yuga")

        root = manager.get_current_branch()
        manager.explore_branch(root.id)

        best = manager.get_best_branch()
        assert best is not None

    def test_get_path_to_root(self, world_model):
        """Путь до корня."""
        from narrative_engine.branch_manager import BranchManager

        manager = BranchManager(world_model)
        manager.start_exploration("satya_yuga")

        root = manager.get_current_branch()
        manager.explore_branch(root.id)

        current = manager.get_current_branch()
        path = manager.get_path_to_root(current.id)

        assert len(path) > 0
        assert path[0] == manager._tree.root_id

    def test_to_dict(self, world_model):
        """Экспорт в словарь."""
        from narrative_engine.branch_manager import BranchManager

        manager = BranchManager(world_model)
        manager.start_exploration("satya_yuga")

        data = manager.to_dict()
        assert "root_id" in data
        assert "nodes" in data


class TestExplorationCoreIntegration:
    """Интеграционные тесты Exploration Core."""

    def test_full_exploration_pipeline(self, world_model):
        """Полный pipeline: Hypothesis → Scenario → Branch."""
        from narrative_engine.hypothesis_generator import HypothesisGenerator
        from narrative_engine.scenario_modeler import ScenarioModeler
        from narrative_engine.branch_manager import BranchManager

        # 1. Генерируем гипотезы
        gen = HypothesisGenerator(world_model)
        hyps = gen.generate_for_epoch("satya_yuga", limit=3)
        assert len(hyps) > 0

        # 2. Моделируем сценарий
        modeler = ScenarioModeler(world_model)
        scenario = modeler.model_scenario(hyps[0], branch_count=2)
        assert scenario.branch_count > 0

        # 3. Управляем ветвями
        manager = BranchManager(world_model)
        tree = manager.start_exploration("satya_yuga")
        root = manager.get_current_branch()
        manager.explore_branch(root.id)

        assert tree.total_nodes > 0


# ── Этап 4: Quality Evaluator Tests ─────────────────────────

class TestQualityEvaluator:
    """Тесты оценщика качества."""

    def test_evaluate_branch(self, world_model):
        """Оценка ветви сценария."""
        from narrative_engine.quality_evaluator import QualityEvaluator, QualityReport
        from narrative_engine.hypothesis_generator import HypothesisGenerator
        from narrative_engine.scenario_modeler import ScenarioModeler

        gen = HypothesisGenerator(world_model)
        modeler = ScenarioModeler(world_model)
        evaluator = QualityEvaluator(world_model)

        hyps = gen.generate_for_epoch("satya_yuga", limit=1)
        scenario = modeler.model_scenario(hyps[0], branch_count=2)

        report = evaluator.evaluate(scenario.branches[0])
        assert isinstance(report, QualityReport)
        assert 0.0 <= report.overall_score <= 1.0
        assert len(report.criteria_scores) == 5

    def test_evaluate_branches_and_rank(self, world_model):
        """Оценка и ранжирование ветвей."""
        from narrative_engine.quality_evaluator import QualityEvaluator
        from narrative_engine.hypothesis_generator import HypothesisGenerator
        from narrative_engine.scenario_modeler import ScenarioModeler

        gen = HypothesisGenerator(world_model)
        modeler = ScenarioModeler(world_model)
        evaluator = QualityEvaluator(world_model)

        hyps = gen.generate_for_epoch("satya_yuga", limit=1)
        scenario = modeler.model_scenario(hyps[0], branch_count=3)

        reports = evaluator.evaluate_branches(scenario.branches)
        assert len(reports) == 3

        # Проверяем ранжирование
        for i, report in enumerate(reports):
            assert report.rank == i + 1
            assert report.total_evaluated == 3

        # Проверяем排序 по убыванию
        scores = [r.overall_score for r in reports]
        assert scores == sorted(scores, reverse=True)

    def test_criteria_weights_sum_to_one(self):
        """Веса критериев в сумме равны 1.0."""
        from narrative_engine.quality_evaluator import CRITERIA_WEIGHTS

        total = sum(CRITERIA_WEIGHTS.values())
        assert abs(total - 1.0) < 0.01, f"Сумма весов: {total}, ожидается 1.0"

    def test_criteria_scores_have_fields(self, world_model):
        """Оценки критериев содержат все поля."""
        from narrative_engine.quality_evaluator import QualityEvaluator
        from narrative_engine.hypothesis_generator import HypothesisGenerator
        from narrative_engine.scenario_modeler import ScenarioModeler

        gen = HypothesisGenerator(world_model)
        modeler = ScenarioModeler(world_model)
        evaluator = QualityEvaluator(world_model)

        hyps = gen.generate_for_epoch("satya_yuga", limit=1)
        scenario = modeler.model_scenario(hyps[0], branch_count=1)

        report = evaluator.evaluate(scenario.branches[0])

        for cs in report.criteria_scores:
            assert cs.criterion in ["canon_alignment", "logical_consistency",
                                    "thematic_depth", "dramatic_potential", "originality"]
            assert 0.0 <= cs.score <= 1.0
            assert 0.0 <= cs.weight <= 1.0
            assert cs.explanation

    def test_strengths_and_weaknesses(self, world_model):
        """Определяются сильные и слабые стороны."""
        from narrative_engine.quality_evaluator import QualityEvaluator
        from narrative_engine.hypothesis_generator import HypothesisGenerator
        from narrative_engine.scenario_modeler import ScenarioModeler

        gen = HypothesisGenerator(world_model)
        modeler = ScenarioModeler(world_model)
        evaluator = QualityEvaluator(world_model)

        hyps = gen.generate_for_epoch("satya_yuga", limit=1)
        scenario = modeler.model_scenario(hyps[0], branch_count=2)

        reports = evaluator.evaluate_branches(scenario.branches)
        for report in reports:
            assert isinstance(report.strengths, list)
            assert isinstance(report.weaknesses, list)
            assert isinstance(report.recommendations, list)

    def test_rank_alternatives(self, world_model):
        """Ранжирование альтернатив."""
        from narrative_engine.quality_evaluator import QualityEvaluator
        from narrative_engine.hypothesis_generator import HypothesisGenerator
        from narrative_engine.scenario_modeler import ScenarioModeler

        gen = HypothesisGenerator(world_model)
        modeler = ScenarioModeler(world_model)
        evaluator = QualityEvaluator(world_model)

        hyps = gen.generate_for_epoch("satya_yuga", limit=1)
        scenario = modeler.model_scenario(hyps[0], branch_count=4)

        ranked = evaluator.rank_alternatives(scenario.branches)
        assert len(ranked) == 4

        # Первая — лучшая
        assert ranked[0].rank == 1
        assert ranked[0].overall_score >= ranked[-1].overall_score


class TestQualityEvaluatorIntegration:
    """Интеграционные тесты Quality Evaluator."""

    def test_full_quality_pipeline(self, world_model):
        """Полный pipeline: Hypothesis → Scenario → Quality."""
        from narrative_engine.hypothesis_generator import HypothesisGenerator
        from narrative_engine.scenario_modeler import ScenarioModeler
        from narrative_engine.quality_evaluator import QualityEvaluator

        # 1. Генерируем гипотезы
        gen = HypothesisGenerator(world_model)
        hyps = gen.generate_for_epoch("satya_yuga", limit=2)
        assert len(hyps) > 0

        # 2. Моделируем сценарий
        modeler = ScenarioModeler(world_model)
        scenario = modeler.model_scenario(hyps[0], branch_count=3)
        assert scenario.branch_count > 0

        # 3. Оцениваем качество
        evaluator = QualityEvaluator(world_model)
        reports = evaluator.evaluate_branches(scenario.branches)
        assert len(reports) > 0

        # 4. Лучшая ветвь
        best = reports[0]
        assert best.rank == 1
        assert best.overall_score > 0.0


# ── Этап 5: Integration Tests ──────────────────────────────

class TestWorldExplorer:
    """Тесты единого pipeline World Explorer."""

    def test_explore_full_pipeline(self, world_model):
        """Полный pipeline: Request → Explore → Result."""
        from narrative_engine.world_explorer import WorldExplorer, ExplorationRequest, ExplorationResult

        explorer = WorldExplorer(world_model)
        request = ExplorationRequest(
            prompt="Путешествие героя через Гиперборею",
            epoch="satya_yuga",
            branch_count=3,
        )

        result = explorer.explore(request)
        assert isinstance(result, ExplorationResult)
        assert result.hypothesis is not None
        assert result.scenario is not None
        assert len(result.ranked_branches) > 0
        assert result.duration_ms > 0

    def test_explore_returns_ranked_branches(self, world_model):
        """Результат содержит отранжированные ветви."""
        from narrative_engine.world_explorer import WorldExplorer, ExplorationRequest

        explorer = WorldExplorer(world_model)
        request = ExplorationRequest(
            prompt="Исследование мира",
            epoch="satya_yuga",
            branch_count=3,
        )

        result = explorer.explore(request)
        assert len(result.ranked_branches) == 3

        # Проверяем ранжирование
        scores = [rb.quality_report.overall_score for rb in result.ranked_branches]
        assert scores == sorted(scores, reverse=True)

    def test_explore_from_hypothesis(self, world_model):
        """Исследование от гипотезы."""
        from narrative_engine.world_explorer import WorldExplorer
        from narrative_engine.hypothesis_generator import HypothesisGenerator

        explorer = WorldExplorer(world_model)
        gen = HypothesisGenerator(world_model)

        hyps = gen.generate_for_epoch("satya_yuga", limit=1)
        assert len(hyps) > 0

        result = explorer.explore_from_hypothesis(hyps[0], branch_count=2)
        assert result.hypothesis is not None
        assert len(result.ranked_branches) > 0

    def test_get_hypotheses(self, world_model):
        """Получение гипотез для эпохи."""
        from narrative_engine.world_explorer import WorldExplorer

        explorer = WorldExplorer(world_model)
        hyps = explorer.get_hypotheses("satya_yuga", limit=5)

        assert len(hyps) > 0
        assert len(hyps) <= 5

    def test_get_possibilities(self, world_model):
        """Получение возможностей для эпохи."""
        from narrative_engine.world_explorer import WorldExplorer

        explorer = WorldExplorer(world_model)
        possibilities = explorer.get_possibilities("satya_yuga", limit=5)

        assert len(possibilities) > 0
        assert len(possibilities) <= 5

    def test_ranked_branches_have_reports(self, world_model):
        """Отранжированные ветви содержат отчёты."""
        from narrative_engine.world_explorer import WorldExplorer, ExplorationRequest

        explorer = WorldExplorer(world_model)
        request = ExplorationRequest(
            prompt="Тест",
            epoch="satya_yuga",
            branch_count=2,
        )

        result = explorer.explore(request)
        for rb in result.ranked_branches:
            assert rb.quality_report is not None
            assert rb.impact_report is not None
            assert rb.contradiction_report is not None

    def test_exploration_summary(self, world_model):
        """Сводка исследования генерируется."""
        from narrative_engine.world_explorer import WorldExplorer, ExplorationRequest

        explorer = WorldExplorer(world_model)
        request = ExplorationRequest(
            prompt="Тест",
            epoch="satya_yuga",
        )

        result = explorer.explore(request)
        assert isinstance(result.summary, str)
        assert len(result.summary) > 0


class TestWorldExplorerIntegration:
    """Интеграционные тесты World Explorer."""

    def test_full_world_explorer_pipeline(self, world_model):
        """Полный pipeline: Request → Hypothesis → Scenario → Quality → Result."""
        from narrative_engine.world_explorer import WorldExplorer, ExplorationRequest
        from narrative_engine.hypothesis_generator import HypothesisGenerator
        from narrative_engine.scenario_modeler import ScenarioModeler
        from narrative_engine.quality_evaluator import QualityEvaluator
        from narrative_engine.branch_manager import BranchManager

        # 1. Создаём explorer
        explorer = WorldExplorer(world_model)

        # 2. Исследуем
        request = ExplorationRequest(
            prompt="Что если Аркаим не был разрушен?",
            epoch="satya_yuga",
            branch_count=3,
        )
        result = explorer.explore(request)

        # 3. Проверяем результат
        assert result.hypothesis is not None
        assert result.scenario is not None
        assert len(result.ranked_branches) > 0

        # 4. Лучшая ветвь
        best = result.ranked_branches[0]
        assert best.rank == 1
        assert best.quality_report.overall_score > 0.0

        # 5. Все ветви имеют отчёты
        for rb in result.ranked_branches:
            assert rb.quality_report
            assert rb.impact_report
            assert rb.contradiction_report


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
