"""
Тесты для rate limiting middleware.
Проверяют защиту от abuse и корректность работы Token Bucket.
"""
import time
import sys
from pathlib import Path

# Добавляем runtime в sys.path для импорта
_RUNTIME = Path(__file__).resolve().parent
if str(_RUNTIME) not in sys.path:
    sys.path.append(str(_RUNTIME))

from gateway.rate_limit import TokenBucket, check_rate_limit, get_rate_limit_info, reset_rate_limit


class TestTokenBucket:
    """Тесты Token Bucket алгоритма."""

    def test_token_bucket_initialization(self):
        """Проверка инициализации Token Bucket."""
        bucket = TokenBucket(rate=10.0, burst=20)
        assert bucket.rate == 10.0
        assert bucket.burst == 20

    def test_allow_first_requests(self):
        """Проверка что первые запросы разрешены."""
        bucket = TokenBucket(rate=10.0, burst=20)
        assert bucket.allow("key1") is True
        assert bucket.allow("key1") is True
        assert bucket.allow("key1") is True

    def test_burst_limit(self):
        """Проверка burst лимита."""
        bucket = TokenBucket(rate=1.0, burst=5)

        # Первые 5 запросов должны пройти
        for _ in range(5):
            assert bucket.allow("key1") is True

        # Шестой запрос должен быть отклонен
        assert bucket.allow("key1") is False

    def test_token_replenishment(self):
        """Проверка восстановления токенов со временем."""
        bucket = TokenBucket(rate=10.0, burst=10)

        # Используем все токены
        for _ in range(10):
            assert bucket.allow("key1") is True

        # Следующий запрос должен быть отклонен
        assert bucket.allow("key1") is False

        # Ждем 0.2 секунды (должно восстановиться 2 токена при rate=10)
        time.sleep(0.2)

        # Теперь 2 запроса должны пройти
        assert bucket.allow("key1") is True
        assert bucket.allow("key1") is True
        assert bucket.allow("key1") is False

    def test_different_keys_independent(self):
        """Проверка что разные ключи независимы."""
        bucket = TokenBucket(rate=1.0, burst=5)

        # Используем все токены для key1
        for _ in range(5):
            assert bucket.allow("key1") is True
        assert bucket.allow("key1") is False

        # key2 должен иметь полный запас токенов
        assert bucket.allow("key2") is True
        assert bucket.allow("key2") is True

    def test_get_remaining_tokens(self):
        """Проверка получения оставшихся токенов."""
        bucket = TokenBucket(rate=10.0, burst=10)

        # Изначально должно быть близко к burst токенов (может быть немного меньше из-за времени)
        initial = bucket.get_remaining_tokens("key1")
        assert initial >= 9  # Допускаем небольшое отклонение

        # После одного запроса должно быть на 1 меньше
        bucket.allow("key1")
        after_one = bucket.get_remaining_tokens("key1")
        assert after_one <= initial
        assert after_one >= 8

        # После еще 5 запросов должно быть значительно меньше
        for _ in range(5):
            bucket.allow("key1")
        final = bucket.get_remaining_tokens("key1")
        assert final <= after_one
        assert final >= 3

    def test_reset(self):
        """Проверка сброса токенов."""
        bucket = TokenBucket(rate=1.0, burst=5)

        # Используем все токены
        for _ in range(5):
            bucket.allow("key1")
        assert bucket.allow("key1") is False

        # Сбрасываем
        bucket.reset("key1")

        # Теперь снова должны быть доступны все токены
        assert bucket.allow("key1") is True
        assert bucket.allow("key1") is True


class TestRateLimitFunctions:
    """Тесты функций rate limiting."""

    def test_check_rate_limit(self):
        """Проверка функции check_rate_limit."""
        # Первые запросы должны проходить
        assert check_rate_limit("test_key_1") is True
        assert check_rate_limit("test_key_1") is True

    def test_get_rate_limit_info(self):
        """Проверка функции get_rate_limit_info."""
        info = get_rate_limit_info("test_key_2")

        assert "allowed" in info
        assert "remaining" in info
        assert "limit" in info
        assert "rate" in info
        assert isinstance(info["allowed"], bool)
        assert isinstance(info["remaining"], int)
        assert isinstance(info["limit"], int)
        assert isinstance(info["rate"], float)

    def test_reset_rate_limit(self):
        """Проверка функции reset_rate_limit."""
        # Используем токены
        for _ in range(25):
            check_rate_limit("test_key_3")

        # Сбрасываем
        reset_rate_limit("test_key_3")

        # Теперь снова должны проходить
        assert check_rate_limit("test_key_3") is True


class TestRateLimitBehavior:
    """Тесты поведения rate limiting в реальных сценариях."""

    def test_gradual_exhaustion(self):
        """Проверка постепенного исчерпания токенов."""
        bucket = TokenBucket(rate=2.0, burst=10)

        allowed_count = 0
        for _ in range(15):
            if bucket.allow("gradual_test"):
                allowed_count += 1

        # Должно быть разрешено максимум burst запросов
        assert allowed_count == 10

    def test_recovery_after_wait(self):
        """Проверка восстановления после ожидания."""
        bucket = TokenBucket(rate=5.0, burst=10)

        # Используем все токены
        for _ in range(10):
            bucket.allow("recovery_test")
        assert bucket.allow("recovery_test") is False

        # Ждем 1 секунду (должно восстановиться 5 токенов)
        time.sleep(1)

        # Теперь 5 запросов должны пройти
        for _ in range(5):
            assert bucket.allow("recovery_test") is True
        assert bucket.allow("recovery_test") is False

    def test_high_frequency_requests(self):
        """Проверка обработки высокочастотных запросов."""
        bucket = TokenBucket(rate=100.0, burst=20)

        # Быстро отправляем 25 запросов
        allowed = 0
        for _ in range(25):
            if bucket.allow("high_freq"):
                allowed += 1

        # Должно быть разрешено максимум burst
        assert allowed == 20

    def test_multiple_clients(self):
        """Проверка работы с множеством клиентов."""
        bucket = TokenBucket(rate=5.0, burst=10)

        # Симулируем 5 разных клиентов
        clients = [f"client_{i}" for i in range(5)]

        # Каждый клиент делает 15 запросов
        results = {}
        for client in clients:
            allowed = 0
            for _ in range(15):
                if bucket.allow(client):
                    allowed += 1
            results[client] = allowed

        # Каждый клиент должен получить максимум burst запросов
        for client, allowed in results.items():
            assert allowed == 10


class TestRateLimitEdgeCases:
    """Тесты граничных случаев."""

    def test_zero_rate(self):
        """Проверка с нулевой скоростью."""
        bucket = TokenBucket(rate=0.0, burst=10)

        # Должно быть разрешено burst запросов
        for _ in range(10):
            assert bucket.allow("zero_rate") is True

        # После этого все отклоняются
        assert bucket.allow("zero_rate") is False

    def test_very_high_rate(self):
        """Проверка с очень высокой скоростью."""
        bucket = TokenBucket(rate=1000.0, burst=100)

        # Должно быстро восстанавливаться
        for _ in range(100):
            bucket.allow("high_rate")

        time.sleep(0.1)  # 100ms должно восстановить ~100 токенов

        # Должно снова быть доступно много токенов
        assert bucket.get_remaining_tokens("high_rate") > 50

    def test_empty_key(self):
        """Проверка с пустым ключом."""
        bucket = TokenBucket(rate=10.0, burst=5)

        # Пустой ключ должен работать как обычный
        assert bucket.allow("") is True
        assert bucket.allow("") is True

    def test_very_long_key(self):
        """Проверка с очень длинным ключом."""
        bucket = TokenBucket(rate=10.0, burst=5)

        long_key = "a" * 1000
        assert bucket.allow(long_key) is True
