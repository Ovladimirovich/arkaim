"""
adc_deps — FastAPI зависимости для ADC-компонентов.
CORE/ добавляется в sys.path один раз при старте (core/main.py).
"""

import logging
from typing import Optional

from fastapi import Depends
from core.pulse_manager import get_pulse as _gp, get_voice as _gv, get_reader_memory as _grm

log = logging.getLogger("hermes.adc_deps")


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
    from agents.keeper import KeeperAgent
    return KeeperAgent(pulse=_cached_pulse(), voice=_cached_voice())


def _get_herald():
    from agents.keeper import HeraldAgent
    return HeraldAgent(pulse=_cached_pulse())


def _get_diplomat():
    from agents.keeper import DiplomatAgent
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


# ── Конфиг ───────────────────────────────────────────

def _get_config():
    from config import config
    return config


@functools.cache
def _cached_config():
    return _get_config()


# ── Visualization ───────────────────────────────────

def _get_scene_engine():
    from visualization.scene_engine import SceneEngine
    return SceneEngine(genome=_cached_pulse().genome, retriever=_get_retriever())


def _get_prompt_builder():
    from visualization.prompt_builder import PromptBuilder
    return PromptBuilder(pulse=_cached_pulse())


def _get_image_provider():
    from providers.image import ImageProviderChain
    from providers.image.comfyui import ComfyUIProvider
    from providers.image.mock import MockImageProvider
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
    from intelligence.retriever import BookRetriever
    return BookRetriever()


def _get_event_logger():
    from core_memory.logger import EventLogger
    return EventLogger()


def _get_xray():
    from core_memory.analyzer import XRayObserver
    return XRayObserver()


def _get_drafts():
    from community.telegram import DraftManager
    return DraftManager()


def _get_telegram_stub():
    from community.telegram import TelegramBotStub
    return TelegramBotStub()


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
