"""Тесты S-2: обязательный безопасный SESSION_SECRET (fail-fast).

Проверяем SharedSettings.validate() напрямую, изолированно от импорта
core.main (импорт core.main грузит реальный runtime/.env).
"""

import pytest

from shared_config import SharedSettings


@pytest.fixture(autouse=True)
def _reset_validate_state(monkeypatch):
    """Сбрасываем _validated и задаём атрибут SESSION_SECRET на каждый тест."""
    monkeypatch.setattr(SharedSettings, "_validated", False)


def _set_secret(monkeypatch, value):
    monkeypatch.setattr(SharedSettings, "SESSION_SECRET", value)


class TestSessionSecretValidate:
    def test_missing_secret_fails(self, monkeypatch):
        """Отсутствие переменной (None) — запуск должен упасть."""
        _set_secret(monkeypatch, None)
        with pytest.raises(RuntimeError, match="SESSION_SECRET"):
            SharedSettings.validate()

    def test_empty_secret_fails(self, monkeypatch):
        _set_secret(monkeypatch, "")
        with pytest.raises(RuntimeError, match="SESSION_SECRET"):
            SharedSettings.validate()

    def test_whitespace_secret_fails(self, monkeypatch):
        """Только пробелы — недопустимо."""
        _set_secret(monkeypatch, "   ")
        with pytest.raises(RuntimeError, match="SESSION_SECRET"):
            SharedSettings.validate()

    @pytest.mark.parametrize(
        "insecure",
        [
            "change-me",
            "change-me-in-production",
            "change-me-in-production-min-32-chars",
            "your-secure-random-key-here",
            "secret",
            "xxx",
        ],
    )
    def test_known_placeholders_fail(self, monkeypatch, insecure):
        """Известные заглушки недопустимы (даже если длинные)."""
        _set_secret(monkeypatch, insecure)
        with pytest.raises(RuntimeError, match="SESSION_SECRET"):
            SharedSettings.validate()

    def test_short_secret_fails(self, monkeypatch):
        """Секрет короче 32 символов недопустим."""
        _set_secret(monkeypatch, "test-auth-svc-secret-12345")  # 24 символа
        with pytest.raises(RuntimeError, match="SESSION_SECRET"):
            SharedSettings.validate()

    def test_secret_with_outer_spaces_fails(self, monkeypatch):
        """Секрет с пробелами на краях недопустим."""
        _set_secret(monkeypatch, "  " + "a" * 40 + "  ")
        with pytest.raises(RuntimeError, match="SESSION_SECRET"):
            SharedSettings.validate()

    def test_valid_secret_passes(self, monkeypatch):
        """Допустимый длинный случайный секрет проходит и кэшируется."""
        _set_secret(monkeypatch, "a" * 64)
        SharedSettings.validate()  # не должно бросить
        assert SharedSettings._validated is True

    def test_non_string_secret_fails(self, monkeypatch):
        """Некорректный тип (например, число) недопустим."""
        _set_secret(monkeypatch, 12345678901234567890)
        with pytest.raises(RuntimeError, match="SESSION_SECRET"):
            SharedSettings.validate()


class TestSessionSecretPolicyConstants:
    def test_min_length_constant(self):
        assert SharedSettings._MIN_SECRET_LENGTH == 32

    def test_insecure_set_contains_empty(self):
        assert "" in SharedSettings._INSECURE_SECRETS
