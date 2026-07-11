# Отчёт анализа проекта "Наследие Аркаима" (PAD+ AI)

> Дата анализа: 11.07.2026
> Статус: **Plan Mode** — только чтение/анализ, без изменений кода

---

## 1. Общее состояние проекта

Проект — **функционально богатый прототип MVP** (оценка из SYSTEM_AUDIT.md: 5.8/10).
- ✅ Pulse (живое ядро книги), Voice (LLM как микрофон), ReaderMemory, Presence, EvolutionTracker, Knowledge Graph, RAG (1037 чанков), Web UI (Jinja2 + HTMX), Admin-панель, Auth + RBAC, Ingestion Pipeline, Telegram Presence, Email-подписка, NSSM-службы, WebSocket (endpoint готов).
- ⚠️ Архитектурная связность "двух миров" (Runtime ↔ ADC CORE), модульные синглтоны, отсутствие миграций БД, технический долг.

---

## 2. Критические проблемы (требуют немедленного исправления)

| # | Проблема | Файл/Местоположение | Статус | Приоритет |
|---|----------|---------------------|--------|-----------|
| **2.1** | **Модульные синглтоны (9+ шт.)** — создаются при старте, невозможно подменить для тестов, нет контроля жизненного цикла | `runtime/core/adc_deps.py` (строки 20-177) | 🔴 Открыта | **Критический** |
| **2.2** | **sys.path hack (deprecated)** — `bootstrap.prepare_core_path()` добавляет CORE в sys.path | `runtime/core/bootstrap.py:23-36` | 🟡 Deprecated, но используется | **Критический** |
| **2.3** | **Дублирование глобального состояния** — GraphEngine × 3 (api_routes.py, keeper.py, adc_deps), LLM-клиенты × 2 | `core/CORE/knowledge_graph/api_routes.py:12`, `core/CORE/agents/keeper.py`, `runtime/core/adc_deps.py` | 🔴 Открыта | **Высокий** |
| **2.4** | **Отсутствие миграций БД** — `CREATE TABLE IF NOT EXISTS`, при изменении схемы — ручное вмешательство | `runtime/auth/migrations/`, `runtime/auth/users.py` | 🔴 Открыта | **Высокий** |
| **2.5** | **Gateway модуль отсутствует** — тесты (`test_gateway_runtime.py`) импортируют несуществующий `gateway.proxy` | `runtime/tests/test_gateway_runtime.py:53` | 🔴 Сломаны тесты | **Высокий** |
| **2.6** | **health_monitor** — подключён в lifespan, но Telegram-алёрты требуют настройки `TELEGRAM_BOT_TOKEN` и `TELEGRAM_ADMIN_CHAT_ID` | `runtime/core/main.py:133`, `runtime/skills/health_monitor.py:38-41` | 🟡 Требует конфига | **Средний** |

---

## 3. Архитектурные проблемы (средний приоритет)

| # | Проблема | Описание | Решение |
|---|----------|----------|---------|
| **3.1** | **Связность «двух миров»** | Runtime ↔ ADC CORE взаимно импортируют друг друга. Нельзя запустить ADC отдельно. | Вынести общие контракты в отдельный пакет, инвертировать зависимости через DI. |
| **3.2** | **Покрытие тестами ~30-35%** | Auth: **есть тесты** (противоречит аудиту!), providers: 0%, gateway: 40% | Дописать тесты для providers, gateway (если вернуть), integration. |
| **3.3** | **Pydantic v2 deprecation** | Уже исправлено: везде используется `json_schema_extra={"example": ...}` вместо `example=` | ✅ Решено |
| **3.4** | **Circuit breaker в provider_registry** | Thread-safe (asyncio.Lock), но gateway circuit breaker (если вернуть) — не thread-safe | Проверить при восстановлении gateway. |

---

## 4. Функциональные пробелы (UX/UI и фичи)

| # | Задача | Описание | Сложность |
|---|--------|----------|-----------|
| **4.1** | **WebSocket уведомления в дашборде** | Endpoint `/ws` готов, JS не подключён | Низкая |
| **4.2** | **Полная индексация enriched_chunks** | 1037 → 2000+ чанков | Низкая |
| **4.3** | **Мобильная вёрстка Web UI** | Нет адаптивной вёрстки | Низкая |
| **4.4** | **Тёмная тема** | Нет переключателя темы | Низкая |
| **4.5** | **История вопросов пользователя** | Нет UI для просмотра своих вопросов | Низкая |
| **4.6** | **Приглашение участников через ссылку** | Нет функционала приглашений | Средняя |
| **4.7** | **Admin-панель (CRUD пользователей)** | Только чтение, нет управления ролями/активностью | Средняя |
| **4.8** | **Docker-упаковка** | Для переносимости и CI/CD | Средняя |
| **4.9** | **Cloudflare Tunnel** | Остался из фазы развёртывания (требует админа домена) | Низкая |

---

## 5. Технический долг (детально)

### 5.1 DI-рефакторинг (`adc_deps.py`)
**9 синглтонов с `@functools.cache`:**
- `get_pulse`, `get_voice` — живое ядро и голос
- `get_keeper`, `get_herald`, `get_diplomat` — агенты
- `get_config`, `get_retriever`, `get_event_logger`, `get_xray`
- `get_drafts`, `get_telegram_stub`
- `get_scene_engine`, `get_prompt_builder`, `get_image_provider` — визуализация

**Проблема:** создаются при первом вызове, живут вечно, нельзя замокать в тестах.

**Решение:** Заменить на FastAPI `Depends` с lifespan-фабриками (как в `runtime/core/services/auth_service.py`).

---

### 5.2 Дублирование GraphEngine
| Файл | Использование |
|------|---------------|
| `core/CORE/knowledge_graph/api_routes.py:12` | `_engine: GraphEngine \| None = None` — модульный синглтон |
| `core/CORE/agents/keeper.py` | Через `pulse.layers.get("knowledge")` — другой экземпляр |
| `runtime/core/adc_deps.py:130-132` | `_get_retriever()` создаёт `BookRetriever()` — третий путь к знаниям |

**Результат:** Три независимых in-memory копии графа, не синхронизируются.

---

### 5.3 LLM-клиенты
| Путь | Что делает |
|------|------------|
| `core/CORE/llm_client.py` | Старый клиент ADC |
| `runtime/core/providers/*.py` | Новые провайдеры (GigaChat, OpenRouter, HF) через ProviderRegistry |

Два разных пути к LLM, разная обработка ошибок, разные ретраи.

---

### 5.4 UserStore — новое соединение на запрос
`auth/users.py` создаёт новый `aiosqlite` connection при каждом вызове методов. Нет пула соединений.

---

### 5.5 Отсутствующие миграции
```
runtime/auth/migrations/
├── 001_initial_schema.sql
└── 002_add_api_keys.sql
```
Есть файлы, но **нет раннера миграций** — применяются вручную или через `CREATE TABLE IF NOT EXISTS`.

---

### 5.6 Gateway circuit breaker (если вернуть)
В тестах (`test_gateway_runtime.py`) используется:
```python
_CORE_FAILURES = 0          # int — модульный глобал
_CORE_BLOCKED_UNTIL = 0.0   # float
```
Модифицируется в async-функциях **без блокировки** → гонки при конкурентных запросах.

---

## 6. Что УЖЕ исправлено (противоречит SYSTEM_AUDIT.md)

| Аудит утверждал | Реальность |
|----------------|------------|
| «Тесты auth-пакета — 0% покрытия» | ✅ **Есть тесты**: `runtime/tests/auth/test_*.py` (7 файлов, ~40 тестов) |
| «health_monitor не подключён» | ✅ **Подключён** в `main.py:133` (`_health_check_task = asyncio.create_task(periodic_check())`) |
| «Pydantic deprecation warnings» | ✅ **Исправлено** — везде `json_schema_extra` |

> **Вывод:** SYSTEM_AUDIT.md устарел (дата 09.07.2026), многие пункты уже закрыты.

---

## 7. План действий (приоритизированный)

### Фаза A — Стабилизация (1-2 недели)
| Задача | Файлы | Оценка |
|--------|-------|--------|
| **A1** DI-рефакторинг: убрать `@functools.cache`, заменить на lifespan-фабрики + `Depends` | `runtime/core/adc_deps.py`, `runtime/core/routes/book.py` | 3-5 дн |
| **A2** Убрать `sys.path` hack, использовать `adc_deps._lazy_import` | `runtime/core/bootstrap.py`, все импорты CORE | 1 дн |
| **A3** Объединить GraphEngine в единый экземпляр через DI | `core/CORE/knowledge_graph/api_routes.py`, `adc_deps.py` | 2 дн |
| **A4** Добавить раннер миграций (sqlite3) | `runtime/auth/migrations/`, `runtime/auth/users.py` | 2 дн |
| **A5** Исправить/удалить сломанные тесты gateway | `runtime/tests/test_gateway_runtime.py` | 1 дн |
| **A6** Дописать тесты для providers (GigaChat, OpenRouter, HF) | `runtime/tests/` | 3 дн |

### Фаза B — Функциональность (2-4 недели)
| Задача | Оценка |
|--------|--------|
| **B1** WebSocket уведомления в дашборде (подключить JS) | 2 дн |
| **B2** Полная индексация enriched_chunks (2000+) | 1 дн |
| **B3** Admin-панель: CRUD пользователей, смена ролей | 3 дн |
| **B4** Приглашение участников через ссылку | 3 дн |
| **B5** Тёмная тема + мобильная вёрстка | 2 дн |
| **B6** История вопросов пользователя | 2 дн |

### Фаза C — Масштабирование (2-4 недели)
| Задача | Оценка |
|--------|--------|
| **C1** Docker-упаковка (multi-stage) | 3 дн |
| **C2** CI/CD (GitHub Actions) | 2 дн |
| **C3** Кеширование ответов (Redis) | 3 дн |
| **C4** Фоновые задачи (ARQ/Celery) для ингеста PDF | 5 дн |
| **C5** rate limiting per-user (не per-session) | 1 дн |

### Фаза D — Глубокие улучшения (1-2 месяца)
| Задача | Оценка |
|--------|--------|
| **D1** LLM-реранжировка (уже есть в `retriever.rerank`) | 1 дн |
| **D2** Multi-hop RAG (цепочка вопросов) | 2 нед |
| **D3** Graph RAG (граф как контекст для LLM) | 1 нед |
| **D4** Авто-извлечение сущностей из PDF | 1 нед |
| **D5** Экспорт генома в визуальный граф (D3.js) | 1 нед |
| **D6** CSP, CSRF, валидация ввода | 1 нед |

---

## 8. Файловая карта ключевых мест для рефакторинга

```
runtime/
├── core/
│   ├── adc_deps.py           # 🔴 9 синглтонов — главный кандидат на DI-рефакторинг
│   ├── bootstrap.py          # 🔴 deprecated sys.path hack
│   ├── main.py               # ✅ health_monitor подключён
│   ├── provider_registry.py  # ✅ thread-safe circuit breaker
│   ├── book_routes.py        # композитный роутер
│   └── routes/
│       └── book.py           # использует adc_deps
├── auth/
│   ├── users.py              # ⚠️ новое соединение на запрос
│   └── migrations/           # ⚠️ нет раннера
├── tests/
│   ├── auth/                 # ✅ тесты есть (противоречит аудиту)
│   ├── test_gateway_runtime.py  # 🔴 сломан (нет модуля gateway)
│   └── integration/
core/
└── CORE/
    ├── agents/keeper.py      # ⚠️ свой путь к знаниям
    └── knowledge_graph/
        ├── api_routes.py     # 🔴 модульный синглтон GraphEngine
        └── graph_engine.py
```

---

## 9. Рекомендации по следующим шагам

1. **Начать с A1 (DI-рефакторинг)** — это разблокирует тестируемость и уберёт 9 синглтонов.
2. **Параллельно A3 (GraphEngine)** — устранить тройное дублирование графа.
3. **Удалить/починить gateway тесты** — либо восстановить gateway модуль, либо удалить тесты.
4. **Обновить SYSTEM_AUDIT.md** — убрать закрытые пункты, актуализировать приоритеты.
5. **Настроить health_monitor** — добавить `TELEGRAM_BOT_TOKEN` и `TELEGRAM_ADMIN_CHAT_ID` в `.env`.

---

## 10. Вопросы к команде (требуют решения)

| Вопрос | Варианты | Рекомендация |
|--------|----------|--------------|
| **Gateway модуль** — восстанавливать или полностью убрать? | 1. Восстановить 2. Удалить тесты и забыть | Если Gateway не нужен — удалить тесты. Если нужен — вынести в отдельный сервис. |
| **Миграции БД** — использовать `alembic` или простой sqlite-раннер? | 1. Alembic 2. Свой скрипт | Для SQLite — простой раннер быстрее. |
| **Docker** — нужен ли сейчас? | 1. Да (для CI/CD) 2. Нет (NSSM работает) | Отложить до Фазы C, если нет команды DevOps. |
| **Cloudflare Tunnel** — кто настраивает DNS? | Требует доступа к домену | Документация готова (`NETWORK_ACCESS_OPTIONS.md`), ждёт админа. |

---

*Отчёт сгенерирован автоматически на основе анализа кодовой базы и документации проекта.*