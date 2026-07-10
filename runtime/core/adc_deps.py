"""
adc_deps — FastAPI зависимости для ADC-компонентов.
Без sys.path hack: использует importlib для ленивого импорта.
"""

import importlib
import logging
import warnings
from pathlib import Path
from typing import Any, Optional

from fastapi import Depends
from core.pulse_manager import get_pulse as _gp, get_voice as _gv, get_reader_memory as _grm

log = logging.getLogger("hermes.adc_deps")

# ── Определение пути к CORE ──────────────────────────
_RUNTIME = Path(__file__).resolve().parent.parent
_PROJECT = _RUNTIME.parent
_ADC_CORE = _PROJECT / "core" / "CORE"


def _lazy_import(module_path: str, class_name: Optional[str] = None) -> Any:
    """
    Ленивый импорт модуля из CORE без sys.path модификации.
    
    Пытается импортировать напрямую. Если не находит — добавляет CORE/ в sys.path
    только для этого импорта (deprecated).
    """
    import sys
    
    # Пробуем прямой импорт
    try:
        module = importlib.import_module(module_path)
        if class_name:
            return getattr(module, class_name)
        return module
    except ImportError:
        pass
    
    # Fallback (deprecated): добавляем CORE/ в sys.path
    path_str = str(_ADC_CORE)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)
        warnings.warn(
            f"DEPRECATED: {module_path} не найден напрямую. Использован sys.path hack через {path_str}. "
            f"Переместите модуль в runtime/ или настройте PYTHONPATH.",
            DeprecationWarning,
            stacklevel=2,
        )
    
    module = importlib.import_module(module_path)
    if class_name:
        return getattr(module, class_name)
    return module


# ── Pulse + Voice (живые, через pulse_manager) ───────

import functools


@functools.cache
def _cached_pulse():
    return _gp()


@functools.cache
def _cached_voice():
    return _gv()


def get_pulse():
    return _cached_pulse()


def get_voice():
    return _cached_voice()


# ── Агенты (с Pulse) ─────────────────────────────────

def _get_keeper():
    KeeperAgent = _lazy_import("agents.keeper", "KeeperAgent")
    return KeeperAgent(pulse=_cached_pulse(), voice=_cached_voice())


def _get_herald():
    HeraldAgent = _lazy_import("agents.keeper", "HeraldAgent")
    return HeraldAgent(pulse=_cached_pulse())


def _get_diplomat():
    DiplomatAgent = _lazy_import("agents.keeper", "DiplomatAgent")
    return DiplomatAgent(pulse=_cached_pulse())


@functools.cache
def _cached_keeper():
    return _get_keeper()


@functools.cache
def _cached_herald():
    return _get_herald()


@functools.cache
def _cached_diplomat():
    return _get_diplomat()


# ── Компоненты с обратной совместимостью ─────────────

def _get_config():
    """Импорт config.py из CORE."""
    return _lazy_import("config", "config")


# ── Visualization ───────────────────────────────────

def _get_scene_engine():
    SceneEngine = _lazy_import("visualization.scene_engine", "SceneEngine")
    return SceneEngine(genome=_cached_pulse().genome, retriever=_get_retriever())


def _get_prompt_builder():
    PromptBuilder = _lazy_import("visualization.prompt_builder", "PromptBuilder")
    return PromptBuilder(pulse=_cached_pulse())


def _get_image_provider():
    ImageProviderChain = _lazy_import("providers.image", "ImageProviderChain")
    ComfyUIProvider = _lazy_import("providers.image.comfyui", "ComfyUIProvider")
    MockImageProvider = _lazy_import("providers.image.mock", "MockImageProvider")
    return ImageProviderChain([ComfyUIProvider(), MockImageProvider()])


@functools.cache
def _cached_scene_engine():
    return _get_scene_engine()


@functools.cache
def _cached_prompt_builder():
    return _get_prompt_builder()


@functools.cache
def _cached_image_provider():
    return _get_image_provider()


def get_scene_engine():
    return _cached_scene_engine()


def get_prompt_builder():
    return _cached_prompt_builder()


def get_image_provider():
    return _cached_image_provider()


# ── Retriever ──────────────────────────────────────

def _get_retriever():
    BookRetriever = _lazy_import("intelligence.retriever", "BookRetriever")
    return BookRetriever()


def _get_event_logger():
    EventLogger = _lazy_import("core_memory.logger", "EventLogger")
    return EventLogger()


def _get_xray():
    XRayObserver = _lazy_import("core_memory.analyzer", "XRayObserver")
    return XRayObserver()


def _get_drafts():
    DraftManager = _lazy_import("community.telegram", "DraftManager")
    return DraftManager()


def _get_telegram_stub():
    TelegramBotStub = _lazy_import("community.telegram", "TelegramBotStub")
    return TelegramBotStub()


@functools.cache
def _cached_config():
    return _get_config()


@functools.cache
def _cached_retriever():
    return _get_retriever()


@functools.cache
def _cached_event_logger():
    return _get_event_logger()


@functools.cache
def _cached_xray():
    return _get_xray()


@functools.cache
def _cached_drafts():
    return _get_drafts()


@functools.cache
def _cached_telegram_stub():
    return _get_telegram_stub()


# ── FastAPI-зависимости (публичный API) ─────────────

def get_config():
    return _cached_config()


def get_retriever():
    return _cached_retriever()


def get_keeper():
    return _cached_keeper()


def get_herald():
    return _cached_herald()


def get_diplomat():
    return _cached_diplomat()


def get_event_logger():
    return _cached_event_logger()


def get_xray():
    return _cached_xray()


def get_drafts():
    return _cached_drafts()


def get_telegram_stub():
    return _cached_telegram_stub()


BOOK_DEPS = {
    "config": Depends(get_config),
    "retriever": Depends(get_retriever),
    "keeper": Depends(get_keeper),
    "herald": Depends(get_herald),
    "diplomat": Depends(get_diplomat),
    "event_logger": Depends(get_event_logger),
    "xray": Depends(get_xray),
    "drafts": Depends(get_drafts),
    "telegram_stub": Depends(get_telegram_stub),
    "pulse": Depends(get_pulse),
    "voice": Depends(get_voice),
}


def get_reader_memory():
    return _grm()


__all__ = [
    "get_config", "get_retriever",
    "get_keeper", "get_herald", "get_diplomat",
    "get_event_logger", "get_xray", "get_drafts", "get_telegram_stub",
    "get_pulse", "get_voice", "get_reader_memory",
    "BOOK_DEPS",
]