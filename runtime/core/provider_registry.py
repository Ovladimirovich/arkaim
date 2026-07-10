from time import time as now
from core.config import settings
from core.providers.base import BaseProvider
from core.logging import log


class ProviderRegistry:
    _providers: dict[str, type[BaseProvider]] = {}
    _frozen = False
    _health_state: dict[str, dict] = {}

    @classmethod
    def register(cls, name: str, provider_cls: type[BaseProvider]):
        if cls._frozen:
            raise RuntimeError("Provider registry is frozen after startup")
        cls._providers[name] = provider_cls
        cls._health_state[name] = {"failure_count": 0, "cooldown_until": 0.0}
        log.info("provider_registered name=%s", name)

    @classmethod
    def select_provider(cls, requested: str | None = None) -> str:
        """
        Выбирает провайдера с поддержкой A/B тестирования.

        Args:
            requested: Явно запрошенный провайдер (опционально).

        Returns:
            Имя выбранного провайдера.
        """
        try:
            from core.providers.ab_testing import ab_selector
            return ab_selector.select_provider(requested)
        except ImportError:
            # Fallback: если ab_testing не доступен — оригинальная цепочка
            if requested and requested in cls._providers:
                return requested
            return settings.PROVIDER_CHAIN[0]

    @classmethod
    def reset(cls):
        cls._frozen = False
        cls._providers = {}
        cls._health_state = {}

    @classmethod
    def freeze(cls):
        cls._frozen = True
        log.info("provider_registry_frozen providers=%s", list(cls._providers))

    @classmethod
    def get(cls, name: str) -> BaseProvider:
        if name not in cls._providers:
            raise ValueError(f"Unknown provider: {name}")
        return cls._providers[name]()

    @classmethod
    def chain(cls, requested: str) -> list[str]:
        if requested in cls._providers:
            chain = [requested]
        else:
            chain = []
        for name in settings.PROVIDER_CHAIN:
            if name not in chain and name in cls._providers:
                chain.append(name)
        return chain

    @classmethod
    def all(cls) -> dict[str, type[BaseProvider]]:
        return dict(cls._providers)

    @classmethod
    def is_registered(cls, name: str) -> bool:
        return name in cls._providers

    @classmethod
    def is_healthy(cls, name: str) -> bool:
        if name not in cls._health_state:
            return True
        state = cls._health_state[name]
        if state["cooldown_until"] == 0.0:
            return True
        if now() >= state["cooldown_until"]:
            state["cooldown_until"] = 0.0
            state["failure_count"] = 0
            return True
        return False

    @classmethod
    def report_failure(cls, name: str):
        if name not in cls._health_state:
            return
        state = cls._health_state[name]
        state["failure_count"] += 1
        threshold = settings.PROVIDER_FAILURE_THRESHOLD
        if state["failure_count"] >= threshold:
            cooldown = settings.PROVIDER_COOLDOWN_SECONDS
            state["cooldown_until"] = now() + cooldown
            log.warning(
                "circuit_breaker_open provider=%s failures=%d cooldown=%ds",
                name, state["failure_count"], cooldown,
            )

    @classmethod
    def report_success(cls, name: str):
        if name not in cls._health_state:
            return
        prev = cls._health_state[name]["failure_count"]
        cls._health_state[name] = {"failure_count": 0, "cooldown_until": 0.0}
        if prev > 0:
            log.info("circuit_breaker_close provider=%s previous_failures=%d", name, prev)

    @classmethod
    def chain_healthy(cls, requested: str) -> list[str]:
        return [name for name in cls.chain(requested) if cls.is_healthy(name)]

    @classmethod
    async def health(cls) -> list[dict]:
        results = []
        for name, p_cls in cls._providers.items():
            try:
                provider = p_cls()
                status = await provider.health()
                status["name"] = name
                status["healthy"] = cls.is_healthy(name)
                results.append(status)
            except Exception as exc:
                results.append({"name": name, "status": "error", "error": str(exc), "healthy": cls.is_healthy(name)})
        return results
