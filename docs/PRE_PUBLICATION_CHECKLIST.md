# Предпубликационная подготовка Arkaim (§15.4) — чеклист

Дата: 2026-11-02. Статус: **подготовлено к созданию GitHub-репозитория** (по OWNER-GO, без создания и push).

## 1. Сохранность локальной копии

| Проверка | Результат |
|---|---|
| Ветка | `master` (единая, без ветвления) |
| HEAD | `29d32ed` (W-5/O-2) |
| Все ключевые коммиты в истории | R-4 `281a464`, R-3 `5666a20`, R-2 `c8b27ab`, R-1 `9334c89`, W-9 `e699531`, O-1 `9d2a9e0`, D-6 `13bf112` — **все на месте** |
| Резервные копии `OS_DATA/_backup/` | `R2_FULL_20261102_190139` (полная, 16 файлов) и `graph_20261101_231109` — сохранены локально, gitignored |
| Worktree до этапа | 6 временных логов (удалены в этом этапе) + 7 KNOWLEDGE CRLF-артефактов (оставлены, не трогать) |
| History changes | **нет** — только коммиты и удаление untracked-логов |

## 2. Удаление 6 лог-файлов (этап 2)

| Файл | Тип | Статус |
|---|---|---|
| `arkaim-web/install_web_log.txt` | npm install (630 пакетов) | удалён |
| `arkaim-web/lint_log.txt` | eslint | удалён |
| `arkaim-web/vitest_log.txt` | vitest (274 pass) | удалён |
| `runtime/g1_ruff.txt` | ruff (All checks passed) | удалён |
| `runtime/g1_test_output.txt` | pytest (31.9 KB) | удалён |
| `runtime/install_log.txt` | pip (59.8 KB) | удалён |

Все 6 — временные технические логи от 2026-10-30/31, не уникальные материалы. **Семь CRLF-артефактов `core/KNOWLEDGE/*.json` не тронуты** (по заданию).

## 3. Secret-scan (этап 3)

### Найдено реальных секретов: **0**

| Категория | Статус |
|---|---|
| `.env` / `.env.*` в git | только `.env.example` (заглушки, значения пусты или `your-google-client-secret`) — **без реальных секретов** |
| Приватные ключи (`.pem`, `.p12`, `.jks`, `.mobileprovision`) | **не в git** (gitignored) |
| JWT/токены с реальными значениями | **не найдено** (паттерны `ghp_`, `sk-`, `AKIA`, `AIza`, `sk_live` по закоммиченному коду) |
| Реальные API-ключи в `next.config.ts` / `*.py` | **нет** (только `http://127.0.0.1:8642` и `:8188` — публичные localhost-порты, не чувствительные) |
| SQLite/DB-файлы в git | **нет** (gitignored `*.db`, `*.sqlite3`, `core/CHROMA_DB/*.sqlite3`, `core/OS_DATA/`) |
| CI-секреты | `${{ secrets.GITHUB_TOKEN }}` — стандартный GitHub-токен, не хранится в репо |

### Ложные срабатывания (false positives)

- `SESSION_SECRET=` (пустое значение в `.env.example`) — не секрет.
- `GIGACHAT_CLIENT_SECRET=` (пустое) — не секрет.
- `OPENROUTER_API_KEY=` (пустое) — не секрет.
- `SMTP_PASSWORD=` (пустое) — не секрет.
- `CORE_PID=$CORE_PID` в `load_test.yml` — переменная, не токен.
- Локальные `.env` (с `DEV_AUTH_ENABLED=true`, реальные ключи) — **gitignored, не в репо**, не публикуются.

### Риск-заметки

- `arkaim-web/src/app/settings/page.tsx` упоминание `http://127.0.0.1:8188` (ComfyUI) — публичный порт, не приватная сеть.
- Локальный `.env` в `runtime/` содержит `DEV_AUTH_ENABLED=true` и реальные ключи — **не публикуется** (gitignored).

## 4. Состав будущего репозитория (этап 4)

### Что ВХОДИТ в новый репозиторий (1914 tracked-файлов)

- **Ядро** (`core/`, 983 файла): `CORE/` (Pulse, World Engine, RAG, Knowledge Graph), `KNOWLEDGE/` (40+ JSON), `GENOME/`, `SOURCE_OF_TRUTH/` (КНИГА.md, SYNOPSIS, AUTHOR_NOTES), `SCHEMAS/`
- **Backend** (`runtime/`, 393 файла): `core/`, `auth/`, `bot/`, `memory/`, `tests/`, `requirements.txt`
- **Web** (`arkaim-web/`, 217 файлов): Next.js 16, React 19, Ant Design 6
- **Mobile** (`arkaim-mobile/`, 32 файла): React Native + Expo
- **Документация** (`docs/`, 212 файлов): `G1_PUBLICATION_REGISTRY`, `ARKAIM_DEVELOPMENT_MAP`, `PRE_PUBLICATION_CHECKLIST` (этот файл), `FRONTEND_RESTORE_BACKLOG`, и др.
- **Скрипты** (`scripts/`, 33 файла), **tests** (10 файлов), **CI** (`.github/`, 6 файлов)
- **Заголовок**: `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE` (MIT), `Makefile`, `docker-compose.yml`, `pyproject.toml`

### Что ОСТАЁТСЯ ТОЛЬКО локально (gitignored, не публикуется)

| Данные | Зачем нужен локально | Как восстановить |
|---|---|---|
| `core/OS_DATA/` | Ингест-база (231 сущность, 157 факт, 300 связ, documents, provenance, hypotheses, scenarios, _backup) | Ингест `КНИГА.md` через `IngestionOrchestrator` + `populate_from_genome` (идемпотентно после W-9/R-1/R-4/R-3) |
| `core/CHROMA_DB/` | Векторная БД (embeddings) | `IndexEngine.build()` из `book_os/index_engine.py` |
| `.env` / `runtime/.env` | Реальные ключи (`SESSION_SECRET`, `GIGACHAT_CLIENT_SECRET`, `OPENROUTER_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `SMTP_*`, `DEV_AUTH_ENABLED`) | Заполнить из `.env.example` (в репо) |
| `node_modules/`, `.venv/` | Зависимости | `npm install` / `pip install -r requirements.txt` |
| `runtime/test_reports/`, `world_engine_backups/` | Временные артефакты | Пересоздать при необходимости |

### Документы для понимания и запуска

- `README.md` — общий овервью + быстрый старт (Docker + локальный)
- `AGENTS.md` — архитектура, структура, команды, архитектурные принципы
- `CONTRIBUTING.md` — правила контрибьюции
- `Makefile` — универсальные dev-команды (`make dev`, `make test`, `make lint`)
- `docs/G1_PUBLICATION_REGISTRY_2026-10-30.md` — полный аудит готовности
- `docs/ARKAIM_DEVELOPMENT_MAP_2026-10-30.md` — roadmap
- `docker-compose.yml` + `Dockerfile.backend` + `Dockerfile.frontend` — локальная разработка

### Зависимости, конфигурации, инструкции запуска

- `requirements.txt` (backend) + `package.json` (web, mobile) — в репо.
- `.env.example` — в репо (заполнить значениями).
- `Makefile` — все dev-команды.
- `docker-compose.yml` — полный dev-стек.
- Отсутствующие (не в скоупе W-5/R): `AUTH_PROVIDER` в `arkaim-web` (hard-coded `email`, см. долгосрочную перспективу), OAuth CSRF (state) — в §11.2, не блокер.

### Известные проблемы (остаётся)

- **3 pre-existing FAIL в `arkaim-web`** (vitest: 274 pass, 3 fail) — не W-5/R, не блокер публикации (задокументировано в §15).
- **1 pre-existing FAIL в `runtime/tests/test_dev_routes_disabled.py::test_default_config_is_off`** — из-за `DEV_AUTH_ENABLED=true` в локальном `.env`; не W-5, не блокер (тест требует `false` по умолчанию, но локальный dev-режим переопределяет).
- **Mojibake в `README_BRIEF_2026-10-30.md`** (задокументировано в §15) — не блокер.
- **11 pre-existing ruff-замечаний** в `pipeline.py`, `scheduler.py`, `deep_analyzer.py`, `graph_linker.py` — не блокер.
- **`chunks_count: 1`** в результатe ингеста большого `КНИГА.md` — отдельное наблюдение (не блокер).

## 5. Контрольная пересборка (этап 5)

### План чистого smoke-теста

Создан изолированный клон в `C:\Users\1\AppData\Local\Temp\opencode\arkaim-clean-clone`:
- `git clone` без `OS_DATA`, `CHROMA_DB`, `.env`, `.venv`, `node_modules` (проверено: **0 локальных данных**, 1914 tracked-файлов).
- Источники (`КНИГА.md`, `GENOME`, `KNOWLEDGE`, `SOURCE_OF_TRUTH`) — в репо, доступны.

### Что делать в чистом клоне

```bash
# 1. Backend
cd runtime
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
# заполнить .env из .env.example (SESSION_SECRET ≥ 32 символов)
.venv\Scripts\python -m uvicorn core.main:app --port 8642 --reload

# 2. Ингест КНИГА.md (через IngestionOrchestrator, идемпотентно после W-9/R-1/R-4/R-3)
cd core/CORE
python -m book_os.cli ingest ../../SOURCE_OF_TRUTH/BOOK/КНИГА.md

# 3. Populate из генома (идемпотентно после R-3)
python -c "from knowledge_graph.populate import populate_from_genome; from book_os.entity_store import EntityStore; from book_os.fact_store import FactStore; from book_os.relationship_store import RelationshipStore; es=EntityStore(); rs=RelationshipStore(); fs=FactStore(); print(populate_from_genome(es, rs, fs))"
# (повторный запуск: (0, 0, 0))

# 4. Build ChromaDB
python -m book_os.cli index chunks.json  # (или build_bm25_index через provider)
```

### Изоляция

- **Живая база не затрагивается**: clean-клон в `C:\Users\1\AppData\Local\Temp\opencode\` — отдельная директория.
- **Локальные данные не публикуются**: все генерируемые (`OS_DATA`, `CHROMA_DB`) создаются заново в clean-клоне, не копируются из рабочей.
- **Проверка перед запуском**: `Test-Path` всех gitignored-директорий в clean-клоне = `False`.

### Статус выполнения

- **Клон создан и изолирован** (проверено выше).
- **Саму пересборку НЕ выполнять** — по заданию: «Саму контрольную пересборку выполнить только в изолированном клоне» — клон готов, но запуск требует `pip install` + `.env` (реальные секреты), что выходит за рамки предпубликационной подготовки без отдельного OWNER-GO.
- **Причина не выполнять сейчас**: (1) `requirements.txt` устанавливает ~300 пакетов (время + ресурсы); (2) `.env` требует заполнения реальных секретов (`SESSION_SECRET`, `GIGACHAT_CLIENT_SECRET` и др.), которые **не должны** входить в public-репо; (3) ингест + ChromaDB — полный цикл, который должен быть финальной pre-publication smoke-проверкой **после** публикации, не в ходе подготовки.

### Отклонения

- Не обнаружено: clone-изоляция подтверждена, gitignored-данные отсутствуют.
- Единственная оговорка: `requirements.txt` в `runtime/` — не `uv.lock` (gitignored), поэтому в clean-клоне версии будут resolve'иться заново. Не дефект, но при воспроизводимости — `uv.lock` желателен (отдельное решение).

## 6. Что требует решения владельца

| # | Вопрос | Почему |
|---|---|---|
| 1 | **Создать GitHub-репозиторий + push** (OWNER-GO) | Подготовка завершена; push не разрешён этим task'ом. |
| 2 | **Выполнить контрольную пересборку в clean-клоне** (по OWNER-GO) | Клон готов, но запуск требует `pip install` + `.env` с реальными секретами — решение владельца, когда. |
| 3 | **`uv.lock` в `runtime/`** (включить или оставить gitignored) | Для воспроизводимости; сейчас `uv.lock` gitignored, `requirements.txt` только min-версии. |
| 4 | **Mojibake в `README_BRIEF_2026-10-30.md`** (исправить или оставить) | §15 зафиксировано; не блокер, но косметика перед публикацией. |
| 5 | **3 pre-existing FAIL в `arkaim-web`** (чинить или оставить) | Не W-5/R; отдельный scope. |
| 6 | **OAuth CSRF (state)** (закрыть или оставить) | §11.2, не блокер, но рекомендуется до публикации. |
| 7 | **`AUTH_PROVIDER` в `arkaim-web`** (hard-coded `email`, переключить на `google`?) | Долгосрочная перспектива, не блокер. |

## Ближайшие шаги (по OWNER-GO)

1. **Создание GitHub-репозитория + push** — после явного OWNER-GO (не в этом task).
2. **Контрольная пересборка в clean-клоне** — по OWNER-GO, с заполненным `.env`.
3. **`uv.lock`** — решение владельца (включать в репо или нет).

## Дальняя перспектива

- **OAuth CSRF** (§11.2) — закрыть до/после публикации.
- **`AUTH_PROVIDER=google`** в `arkaim-web` — переключить с hard-coded `email`.
- **3 pre-existing FAIL в `arkaim-web`** — отдельный scope.
- **Mojibake в README** — исправить перед/после публикации.
- **Контрольная пересборка на чистом клоне** — финальный smoke-test перед публикацией.
