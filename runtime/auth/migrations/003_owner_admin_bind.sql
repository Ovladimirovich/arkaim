-- 003_owner_admin_bind: привязка owner-инвайтов к конкретному Google-UID
-- Дата: 2026-11-02
-- Назначение: разрешить владельцу (admin) войти через Google и НЕ сбрасывать роль
--            на reader при каждом повторном Google-входе. Инвайт с привязкой
--            (bind_provider + bind_provider_user_id) применяется автоматически
--            в google_callback: если существует активный привязанный инвайт
--            для этого provider+provider_user_id — его роль ставится, иначе
--            default role='reader'. Обычные (непривязанные) инвайты не затронуты.
--            НЕ меняет default reader, НЕ выдаёт admin всем Google — только
--            конкретному Google-UID, зафиксированному владельцем.

ALTER TABLE invites ADD COLUMN bind_provider TEXT;
ALTER TABLE invites ADD COLUMN bind_provider_user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_invites_bind ON invites(bind_provider, bind_provider_user_id);

-- Фиксируем применение
INSERT OR IGNORE INTO _migrations (name, applied_at) VALUES ('003_owner_admin_bind.sql', datetime('now'));
