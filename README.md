# Наследие Аркаима: цифровое представительство книги

## Что это

**Arkaim — цифровое представительство книги «Наследие Аркаима».**

Книга перестаёт быть файлом и становится местом, куда приходят с вопросом,
с исследованием и с желанием сделать из неё производные материалы — при том,
что каждое утверждение системы прослеживается до авторского текста либо
честно помечено как гипотеза, внешний источник или реконструкция.

Автор пишет книгу один раз. Система помогает ей жить дальше.

## Для кого

| Кто | Что получает |
|---|---|
| Читатель | ответ на вопрос по книге с указанием, откуда он взят |
| Исследователь | мир и время книги как отдельные навигаторы, сценарии «что если» |
| Автор | производные материалы из книги — сценарий, задания на кадры, письма читателям |

## Чем не является

Arkaim — не чат-бот «по книге», не CRM, не автопостер, не система массовых
рассылок и не замена автору. Любое действие с внешним эффектом требует
подтверждения человека.

## Что работает сегодня

Каждое число пересчитывается на текущем коммите или на запущенном инстансе.
Доказательство — в последней колонке.

| Величина | Значение | Доказательство |
|---|---|---|
| API: путей / операций | **346 / 370** | на запущенном бэкенде: `curl -s localhost:8642/openapi.json \| python3 -c "import json,sys;d=json.load(sys.stdin);p=d['paths'];print(len(p), sum(len([m for m in v if m in ('get','post','put','patch','delete')]) for v in p.values()))"` |
| Страниц интерфейса | **39** | `git ls-tree -r --name-only HEAD \| grep -c 'arkaim-web/src/app/.*page\.tsx'` |
| Тестов бэкенда | **3134 passed**, 1 failed (`test_dev_routes_disabled::test_default_config_is_off` — локальный `.env` содержит `DEV_AUTH_ENABLED=true`; на чистом инстансе с default конфигур — пройдёт), 26 skipped, 2 deselected (live) | `cd runtime && pytest tests -q -m "not live"` |
| Тестов narrative_engine | **57 passed** | `pytest core/CORE/narrative_engine/tests -q` |
| Тестов фронтенда | **274 passed / 3 failed** (pre-existing в `auth-provider.test.tsx`), 38 файлов | `cd arkaim-web && npx vitest run` |
| Сборка фронтенда | проходит (✓ Compiled successfully, 47 страниц) | `cd arkaim-web && npm run build` |
| Сущностей мира | **503** в 13 категориях | `curl -s localhost:8642/book/world/summary` (нужна сессия). Авторским каноном помечены **3 из 503** (`AUTHOR_CANON`), **411** — `DERIVED` (≈82%), 57 — `SYSTEM_INTERPRETATION`, 25 — `EXTERNAL_SOURCE`, 6 — `UNKNOWN`, 1 — `RECONSTRUCTION` |
| Записей провенанса | **503**, нарушений **0** | `python scripts/check_provenance_integrity.py --strict` |
| Форм визуализации | **55** = 11 категорий × 5 | `core/CORE/FORM/*.json` (11 файлов) |
| Слоёв Pulse | **11** (10 + ExpansionLayer) | `core/CORE/pulse/pulse.py:112-124` |
| Тем в геноме | **138** | `core/GENOME/CURRENT/themes.json` |
| Чанков каталога | **824** | `core/KNOWLEDGE/enriched_catalog.json` |
| Эпох / канонических событий | **12 / 8** | `core/CORE/narrative_engine/data/WORLD_MODEL.json` |
| Сцен сценария | **119 глав, 642 абзаца**, 149 323 знака | `core/KNOWLEDGE/SYNOPSIS_DOCUMENT.json` |
| JSON в `core/KNOWLEDGE` | **54** | `git ls-tree -r --name-only HEAD \| grep -c '^core/KNOWLEDGE/.*\.json$'` |
| Экранов мобильного | **30 файлов**, сборка не проверялась | `arkaim-mobile/` |
| Python | **3.14** | `Dockerfile.backend:2`, матрица CI |

Оговорки (обязательны при цитировании чисел):

- **Связи между сущностями** — 102 генерируются кодом; в графовом
  хранилище (Book OS) на момент снимка **0 узлов / 0 рёбер**: граф и
  Book OS существуют как код, данных в клоне нет.
- **Модули обогащения знаний** — 11 в документах, 28 `.py`-файлов в
  `core/CORE/knowledge_expansion/`; считаем по смыслу, не по файлам.
- **Темы расширенных знаний** — 23 доступны слою, 217 записей на диске.
  Формулировку «168 тем» не использовать: она не была верна ни в одной
  ревизии.

## Чего пока нет

| Заявлять нельзя | Потому что | Что корректно |
|---|---|---|
| «547 сущностей, 287 связей» | устаревшие числа релиза 2.0.0 (июль) | 503 сущности; связи — только с оговоркой выше |
| «219 эндпоинтов», «34 страницы», «349 тестов» | устарело | 346/370, 39, 3134 + 57 + 274 |
| «Генерация изображений (ComfyUI)» | роуты `/comfyui/*` депубликованы; остался только `MediaPlan` | готовит задания на кадры; исполнение — за пределами проекта |
| «ChromaDB заполнена» | данные gitignored, в клоне пусто | векторный индекс вне репозитория; конфигурируется на инстансе |
| «Книга молчит, если ответа нет» | 40/40 вопросов вне книги получили ответ | границы ответа — в разработке |
| «Граф знаний работает» | 0 узлов, 0 рёбер в хранилище | код есть, данных нет |
| «Сообщество читателей» | 0 интерпретаций, 0 артефактов | API и модель есть, записей нет |
| «Медиапроизводство / фильм» | только план и EDL | планирование есть, исполнения нет |
| «Понимает книгу как человек» | система понимает структуру и связи, не рассуждает | не формулировать |

## Как устроено

```
Читатель → Web UI (Next.js :3000) → API-прокси → Backend (FastAPI :8642)
                                                          │
                                       ┌──────────────────┴───────────┐
                                       │  Pulse — живое ядро (11 слоёв) │
                                       │  Knowledge · Meaning · Identity │
                                       │  Mission · World Engine · …      │
                                       │  BookVoice (LLM-микрофон)       │
                                       └────────────────────────────────┘
   Подсистемы:
   • World Engine (narrative_engine) — вычислимая модель мира книги
   • Temporal / World Model — эпохи и канонические события (12 / 8)
   • Studio (film_studio, media_plan) — сценарные и кадровые задания
   • Book OS (core/CORE/book_os) — документная база: сущности, факты, связи
```

Pulse отвечает на вопрос первым: слои знают книгу без LLM; LLM используется
только как «микрофон» для формулировки. Финальная проверка —
`IdentityLayer.validate()`.

## Производные материалы

| Материал | Пометка | Основание |
|---|---|---|
| Сценарий | **данные есть** — 119 сцен | `SYNOPSIS_DOCUMENT.json` |
| Кадр, видео | **только задание** — `MediaPlan` | `assets/generate` не запускает генерацию |
| Фильм | **только план** — EDL для внешнего монтажа | `test_studio_sequence.py:17` |
| Письма читателям | **работает** — черновик из Pulse → утверждение → отправка | `presence/email_api.py`, 12 роутов |
| Статьи и посты | **не реализовано** | нулевые роуты |

## Быстрый старт

### Бэкенд (порт 8642)

```bash
cd runtime
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
# заполнить .env из .env.example (SESSION_SECRET ≥ 32 символов, случайный)
.venv\Scripts\python -m uvicorn core.main:app --port 8642
```

Проверка: `curl http://localhost:8642/health` → JSON со статусом.

### Фронтенд (порт 3000)

```bash
cd arkaim-web
npm install
npm run dev
```

Проверка: сборка — `npm run build`; страница — http://localhost:3000.

### Всё сразу (Docker)

```bash
docker compose up --build
```

Frontend: http://localhost:3000 · Backend: http://localhost:8642 ·
Swagger: http://localhost:8642/docs

Примечание: локальные базы `core/OS_DATA/` и `core/CHROMA_DB/` gitignored —
в чистом клоне их нет; наполняются штатным ingest-пайплайном
(`python -m book_os.cli ingest …` + `populate_from_genome`), идемпотентно.

## Где правда

| Документ | Что |
|---|---|
| [CURRENT_DEVELOPMENT_STATE](docs/CURRENT_DEVELOPMENT_STATE.md) | Текущее состояние разработки |
| [DEPLOY](docs/DEPLOY.md) | Развёртывание и HTTPS |
| [CONTRIBUTING](CONTRIBUTING.md) | Как участвовать |
| [G1_PUBLICATION_REGISTRY](docs/G1_PUBLICATION_REGISTRY_2026-10-30.md) | Состав публикации, исключения, открытые вопросы |
| [AGENTS.md](AGENTS.md) | Руководство для ИИ-инженеров (команды, тесты, принципы) |

[![Python](https://img.shields.io/badge/Python-3.14-3776AB?logo=python&logoColor=white)](https://python.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![CI/CD](https://github.com/Ovladimirovich/arkaim/actions/workflows/ci.yml/badge.svg)](https://github.com/Ovladimirovich/arkaim/actions/workflows/ci.yml)

## Лицензия

Проект распространяется под лицензией **MIT**. См. [LICENSE](LICENSE).
