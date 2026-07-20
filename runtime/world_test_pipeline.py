"""
World Engine Automated Testing Pipeline — автоматизированный пайплайн тестирования.

Использование:
    python world_test_pipeline.py
    python world_test_pipeline.py --report
"""
import sys
sys.path.insert(0, '../core/CORE')

import subprocess
import json
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, field


@dataclass
class TestResult:
    """Результат теста."""
    name: str
    status: str  # passed, failed, error
    duration: float = 0.0
    error: str = ""


@dataclass
class TestSuite:
    """Набор тестов."""
    name: str
    results: list[TestResult] = field(default_factory=list)
    
    @property
    def total(self) -> int:
        return len(self.results)
    
    @property
    def passed(self) -> int:
        return sum(1 for r in self.results if r.status == "passed")
    
    @property
    def failed(self) -> int:
        return sum(1 for r in self.results if r.status == "failed")
    
    @property
    def errors(self) -> int:
        return sum(1 for r in self.results if r.status == "error")


def run_tests(test_path: str, work_dir: str = None) -> TestSuite:
    """Запустить тесты."""
    suite = TestSuite(name=test_path)
    
    try:
        cmd = ["python", "-m", "pytest", test_path, "-v", "--tb=short", "-q"]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            cwd=work_dir,
        )
        
        # Парсим вывод
        for line in result.stdout.split("\n"):
            if "PASSED" in line:
                test_name = line.split("::")[-1].split(" ")[0] if "::" in line else line
                suite.results.append(TestResult(name=test_name.strip(), status="passed"))
            elif "FAILED" in line:
                test_name = line.split("::")[-1].split(" ")[0] if "::" in line else line
                suite.results.append(TestResult(name=test_name.strip(), status="failed"))
        
        if not suite.results:
            if result.returncode == 0:
                suite.results.append(TestResult(name="all", status="passed"))
            else:
                suite.results.append(TestResult(name="all", status="error", error=result.stdout[:500]))
    
    except subprocess.TimeoutExpired:
        suite.results.append(TestResult(name=test_path, status="error", error="Timeout"))
    except Exception as e:
        suite.results.append(TestResult(name=test_path, status="error", error=str(e)))
    
    return suite


def run_all_tests() -> dict:
    """Запустить все тесты."""
    print("=" * 60)
    print(" АВТОМАТИЗИРОВАННОЕ ТЕСТИРОВАНИЕ")
    print("=" * 60)
    
    suites = []
    
    # 1. Visual tests
    print("\n[1/4] Visual tests...")
    visual_suite = run_tests(
        "tests/test_visual",
        work_dir="C:/ПРОЕКТ Наследие Аркаима/core/CORE"
    )
    suites.append(visual_suite)
    print(f"  {visual_suite.passed}/{visual_suite.total} passed")
    
    # 2. World Engine tests
    print("\n[2/4] World Engine tests...")
    we_suite = run_tests(
        "tests/test_world_engine.py",
        work_dir="C:/ПРОЕКТ Наследие Аркаима/runtime"
    )
    suites.append(we_suite)
    print(f"  {we_suite.passed}/{we_suite.total} passed")
    
    # 3. Integration tests
    print("\n[3/4] Integration tests...")
    int_suite = run_tests(
        "tests/test_world_engine_integration.py",
        work_dir="C:/ПРОЕКТ Наследие Аркаима/runtime"
    )
    suites.append(int_suite)
    print(f"  {int_suite.passed}/{int_suite.total} passed")
    
    # 4. Backend tests
    print("\n[4/4] Backend tests...")
    backend_suite = run_tests(
        "test_llm.py",
        work_dir="C:/ПРОЕКТ Наследие Аркаима/runtime"
    )
    suites.append(backend_suite)
    print(f"  {backend_suite.passed}/{backend_suite.total} passed")
    
    # Суммарный отчёт
    total = sum(s.total for s in suites)
    passed = sum(s.passed for s in suites)
    failed = sum(s.failed for s in suites)
    errors = sum(s.errors for s in suites)
    
    print("\n" + "=" * 60)
    print(" ИТОГИ")
    print("=" * 60)
    print(f"Всего: {total} | Пройдено: {passed} | Провалено: {failed} | Ошибки: {errors}")
    
    if total > 0:
        print(f"Успешность: {(passed/total)*100:.1f}%")
    
    return {
        "timestamp": datetime.now().isoformat(),
        "total": total,
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "suites": [{"name": s.name, "total": s.total, "passed": s.passed} for s in suites]
    }


def main():
    results = run_all_tests()
    
    # Сохраняем отчёт
    report_dir = Path("C:/ПРОЕКТ Наследие Аркаима/runtime/test_reports")
    report_dir.mkdir(exist_ok=True)
    report_file = report_dir / f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    report_file.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nОтчёт: {report_file}")


if __name__ == "__main__":
    main()
