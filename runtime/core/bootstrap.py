"""
bootstrap — единая точка входа для добавления ADC CORE в sys.path.

Все модули runtime, которым нужен импорт из CORE/, используют:
    from core.bootstrap import prepare_core_path
    prepare_core_path()

Вместо прямых sys.path.append/hack.
"""
import sys
from pathlib import Path

_RUNTIME = Path(__file__).resolve().parent.parent           # runtime/
_PROJECT = _RUNTIME.parent                                  # корень проекта
_ADC_CORE_DEFAULT = _PROJECT / "core" / "CORE"

_added = False


import warnings


def prepare_core_path(core_path: Path | None = None) -> Path:
    """DEPRECATED: Используйте adc_deps._lazy_import вместо прямого sys.path hack."""
    warnings.warn(
        "DEPRECATED: prepare_core_path() устарел. Используйте adc_deps._lazy_import().",
        DeprecationWarning,
        stacklevel=2,
    )
    global _added
    if _added:
        return _ADC_CORE_DEFAULT
    p = core_path or _ADC_CORE_DEFAULT
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))
    _added = True
    return p
