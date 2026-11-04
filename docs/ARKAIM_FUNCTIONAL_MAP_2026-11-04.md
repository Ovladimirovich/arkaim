# АРКАИМ — ФУНКЦИОНАЛЬНАЯ КАРТА «ОТ ЗАМЫСА ДО РАБОЧЕГО ПРОДУКТА»

> **Версия:** 2026-11-04 (рабочая версия после deep-audit + OWNER-GO уточнений).
> **Режим:** исследование и документирование. **Никаких изменений кода, флагов, данных не производилось.**
> **Основание:** deep-audit backend / frontend-stadio-media-infra-docs + уточнения OWNER-GO (2026-11-04).

---

## 1. Формат отчёта

Итоговый документ вынесен в структуру:

**DONE / WORKS / PROBLEMS / OWNER-GO / Ближайшие шаги / Дальняя перспектива**

---

## 2. Что было целью?

Собрать целостную функциональную карту Arkaim — от первоначального замысла (книга → мир → знания → связи → время → формы выражения) до фактического состояния репозитория — и проверить три вещи:

1. Соответствует ли реализация замыслу.
2. Что реально работает.
3. Что осталось незавершённым.

## 3. Что реально сделано?

1. Проведён deep-audit репозитория (backend; frontend/studio/media/infra/docs) — только чтение, без изменений.
2. Собрана обновлённая функциональная карта из 10 разделов (FC1–FC10).
3. Собрана матрица готовности на едиких уровнях.
4. Проверены три направления: World Engine / Temporal / History; Studio / Film Studio / Media; Knowledge Core / Pulse.
5. Проверена проблема №3 — маршруты — по фактическому коду.
6. Предложены исправления по документации (по итогам OWNER-GO уточнений).

## 4. Итоговый отчёт

### DONE — что действительно завершено и подтверждено

| # | Задача | Статус | Подтверждено |
|---|---|---|---|
| 1 | **P0 «Сквозная неопределённость Pulse»** (JSON path: backend keeper/layers/DTO + frontend SourceBadge/ChatBubble) | ✅ DONE | backend+frontend confidence_state; backend 13 passed + 223 regression; frontend 283 passed; CI green; push ok; формат-fix `e865b47` |
| 2 | **Backend ask-flow** | ✅ DONE (code) | keeper→related_entities→knowledge_core→canonical_events; dialogue context; Stage2; EDM-RES |
| 3 | **Pulse core** | ✅ MOSTLY REAL | lifecycle, evolution, deterministic layers, temporal (M9), WorldEngineV2, BookVoice, ReaderAware — с оговорками |
| 4 | **CI / инфраструктура** | ✅ TESTED | backend lint+format, frontend lint+tsc+test+build, docker — green |

### WORKS — что работает, но с ограничениями

- Keeper: `confidence_state` (confirmed/partial/insufficient) — ✅ E2E без LLM через `/book/ask`.
- Ask-flow: ✅ deterministic.
- Stage2/EDM: код написан; **GATED OFF** — OWNER-GATE.
- Ограничения: Voice LLM E2E не покрыт; keeper event-log без confidence_state; mood/metaphor — formal stubs; visual_style не в `listen()`.

### PROBLEMS — реальные дефекты, техдолг, потерянные функции

| # | Проблема | Домен | Приоритет |
|---|---|---|---|
| P0-1 | **SSE `/v1/stream` не несёт `confidence_state`** | Frontend/SSE | **DEFERRED / PRODUCT VALUE NOT CONFIRMED** (решение владельца: пока не возвращать в план) |
| P1-1 | Docs-статусы смешаны | Docs | P1 |
| P1-2 | Restore-backlog B1/B2 pending; status page TODO; dead code | Frontend | P1 |
| P1-3 | Backend gaps: visual_style, mood, LLM-voice, event-log | Backend | P1 |
| P2-1 | Studio/media contract partial | Media | P2 |
| P2-2 | WorldEngineLayerV2: возможный `self._world_engine is None` | Backend | P2 |

### OWNER-GO — решения, которые нельзя принимать без владельца

1. **SSE `/v1/stream` + frontend streaming:** решение владельца — отложить (DEFERRED / PRODUCT VALUE NOT CONFIRMED). Вернуть в план только после отдельного OWNER-GO на product-необходимость.
2. **Stage2** (`STAGE2_ENABLED=true`): отдельный OWNER-GO.
3. **EDM-RES** (`EDM_RES_PILOT_ENABLED=true`): отдельный OWNER-GO (пилот).
4. **Restore backlog B1/B2:** отдельный OWNER-GO.
5. **Deploy:** отдельный OWNER-GO (master → main).
6. **Архитектурные решения:** LLM-в-Voice (микрофон), mood/metaphor, keyword routing — отдельные OWNER-GO.

---

## 5. Матрица готовности — единый словарь статусов

| Уровень | Значение |
|---|---|
| `NOT-IMPLEMENTED` | Функция не реализована. |
| `IMPLEMENTED` | Код функции существует. |
| `TESTED` | Функция проверена тестами. |
| `INTEGRATION-VERIFIED` | Компоненты работают вместе (конкретная интеграция/сценарий проверены). |
| `USER-FLOW-VERIFIED` | Пользовательский сценарий (route + вход + результат + способ проверки) пройден целиком. |
| `GATED` | Функция существует, но выключена (OWNER-GATE / feature flag). |
| `PARTIAL` | Функция реализована не полностью. |

**Правило:** блок не помечается полностью готовым, если есть `GATED` или недостаточные доказательства (`TESTED`/`INTEGRATION-VERIFIED`/`USER-FLOW-VERIFIED`). Статус `FULL` **исключён из словаря** по решению владельца (2026-11-04) — как слишком обобщающий и скрывающий непроверенные части. Используются только семь уровней выше.

---

## 6. Функциональная карта — 10 разделов (FC1–FC10)

Для каждого раздела: назначение в концепции → модули и файлы → реализовано → фактическое состояние → доказательства → ограничения → зависимости → приоритет развития.

### FC1. Цифровое представительство книги (книга — источник истины)

- **Назначение:** книга → единая онтология знаний; цифровое представление = книга.
- **Модули/файлы:** `core/KNOWLEDGE/*.json`, `core/GENOME/GENOME_v1.0.0.json`, `core/CHROMA_DB`, `SCHEMAS/`, `core/CORE/knowledge_graph/`, `runtime/core/services/knowledge_core_context.py`.
- **Реализовано:** ✅ (`IMPLEMENTED`/`TESTED`).
- **Доказательства:** `test_milestone_b`, `test_data_discipline`, `test_book_intelligence`, `test_provenance_completion`.
- **Ограничения:** derived/enriched provenance.
- **Приоритет:** P2 (OWNER-GO для включения расширений).

### FC2. Мир книги и World Model

- **Назначение:** world entities + WORLD_MODEL как вычислимый мир.
- **Модули/файлы:** `core/GENOME` (world_entities), `core/WORLD_MODEL`, `core/CORE/pulse/layers_world_engine.py`, `runtime/core/services/related_entities.py`.
- **Реализовано:** ✅.
- **Ограничения:** WorldEngine V2 provenance gate; matching.
- **Приоритет:** P2.

### FC3. Knowledge Core и происхождение знаний

- **Назначение:** где знание пришло из (provenance), gap detection, expansion.
- **Модули/файлы:** `services/knowledge_core_context.py`, `ask_gap_detector.py`, `ask_expansion_orchestrator.py`, `layers/ExpansionLayer`.
- **Реализовано:** ✅; Stage2/EDM — IMPLEMENTED, **GATED OFF**.
- **Ограничения:** gates OFF; origin для enriched.
- **Приоритет:** P2 (OWNER-GO для включения).

### FC4. Граф связей

- **Назначение:** reader → related_entities → claims → world/temporal links.
- **Модули/файлы:** `services/related_entities.py`, `knowledge_core_context.py`.
- **Реализовано:** ✅ (`TESTED`, MIN_SCORE=60).
- **Приоритет:** P1/P2.

### FC5. История и Temporal

- **История/фактическая временная линия:** temporal chain (BACKWARD/FORWARD), canonical events, claim temporal refs — ✅ (`TESTED`, M9).
- **Альтернативные/возможные линии:** отдельная возможность — ✅ частично, не user-flow-verified.

### FC6. World Engine и возможные линии развития событий

- **Назначение:** альтернативные/возможные линии (FUTURE_EXTRAPOLATION), WorldEngine V2.
- **Реализовано:** ✅ частично.
- **Ограничения:** gates; не user-flow-verified.

### FC7. Диалог читателя с книгой, Pulse и Keeper (неопределённость)

- **Подтверждённый ответ (confirmed):** ✅ (`INTEGRATION-VERIFIED`).
- **Частичный ответ (partial):** ✅ (`INTEGRATION-VERIFIED`, catalog).
- **Недостаточно оснований / silence (insufficient):** ✅ (`INTEGRATION-VERIFIED`, out-of-book).
- **SSE streaming:** DEFERRED / PRODUCT VALUE NOT CONFIRMED.

### FC8. Studio и Film Studio

- **Назначение:** production/visual capabilities.
- **Реализовано:** ✅ code; boundaries accepted.
- **Ограничения:** media contract partial; production scenarios partially verified.

### FC9. Media и формы выражения знаний

- **Назначение:** media/arkaim-media, visual genome, knowledge expression forms.
- **Реализовано:** ✅ code; ⚠️ real integration not verified; contract partial.

### FC10. UI и пользовательские сценарии

- **Reader asks → sees source/confidence/state (JSON path):** ✅ (`INTEGRATION-VERIFIED`).
- **Silence display:** ✅ (`TESTED`).
- **Catalog partial display:** ✅ (`TESTED`).
- **SSE streaming display:** DEFERRED / PRODUCT VALUE NOT CONFIRMED.
- **Restore backlog B1/B2:** pending (P1).

---

## 7. Проверка проблемы №3 — маршруты (OWNER-GO уточнение 2026-11-04)

**Вопрос:** `/history`, `/world-engine`, `/temporal` — какие маршруты действительно существуют?

**Метод:** FastAPI router prefixes + карта вызовов фронтенда + схлопывание составных префиксов.

**Итог: CONTRADICTION RESOLVED — маршруты существуют и согласованы.**

| Пользовательский маршрут (frontend) | Backend контракт (реально существующий) | Статус |
|---|---|---|
| `/history` | `/book/reader/history`, `/book/reader/history/full`, `/book/reader/history/sessions`, `/book/reader/history/stats`, `/book/reader/profile` | **EXISTS ✓** |
| `/world-engine` | `/book/world/summary`, `/book/world/modes`, `/book/world/rules`, `/book/world/categories`, `/book/world/search`, `/book/world/entity/{id}`, `/book/world/entity/{id}/context`, `/book/world/entity/{id}/visual-prompt`, `/book/world-engine/model` | **EXISTS ✓** (deep link `?entity_id=` ✓) |
| `/temporal` | `/book/temporal/chain` (`direction`), `/book/temporal/nodes`, `/book/temporal/context/{epoch_id}`, `/book/temporal/node/{epoch_id}`, `/book/temporal/reconstruct`, `/book/temporal/chains`, `/book/temporal/future-extrapolation`, `/book/temporal/pending-updates/*` | **EXISTS ✓** |
| `/world-explorer` | `/book/world-explorer/*` | **EXISTS ✓** |

**Важный нюанс:** `/history` — reader memory (диалоги), не temporal-цепочка. Temporal — `/book/temporal/*` + `/book/world-explorer/*`.

**Оговорка (принята):** проверка маршрутов подтверждает routing, но не полную работоспособность пользовательских сценариев. Например, существование `/history` не доказывает сохранение данных после перезапуска/F5.

---

## 8. Исправления по итогам OWNER-GO уточнений (2026-11-04)

1. **SSE → DEFERRED / PRODUCT VALUE NOT CONFIRMED.** Не P0. Не входить в ближайшие этапы без отдельного owner-GO на product-необходимость. Решение владельца: решение принято, нового не требуется.
2. **User-ability granularity:** карта строится на user-flow capabilities (UC), а не только на модулях.
3. **Маршруты:** проверено — противоречия нет. Документ это отметил.
4. **Уровни готовности:** принят единый словарь (§5), статус `FULL` исключён.

---

## 9. Единый дорожный план Arkaim (исправления подчинены развитию продукта)

- **Фаза 0 — DONE** (P0 uncertainty JSON path; CI green; functional map assembled).
- **Фаза 1 — DEFERRED:** SSE confidence (`confidence_state` in `/v1/stream`) — после owner-GO на product-необходимость.
- **Фаза 2 — P1:** restore backlog B1/B2; docs sync; backend observability/tests.
- **Фаза 3 — P2:** Stage2 enable; EDM enable; media contract sync; deploy master→main.

Приоритеты — по значимости для полноценного Arkaim, не по количеству дефектов.

---

## 10. Карта пользовательских возможностей (User Capabilities / User Cases) — UC1–UC8

**Ввод:** по итогам OWNER-GO уточнений (2026-11-04) принято, что продуктовая карта должна описывать **что человек может делать в Arkaim**, а не только какие модули существуют. Ниже — рабочая версия UC-карты на основе deep-audit и закрытых P0.

Для каждого сценария фиксируется: **что пользователь делает → что система должна сделать → что реально работает → чем подтверждено → что предстоит**.

### UC1. Открытие цифрового представления книги

| Поле | Значение |
|---|---|
| Пользователь | Читатель открывает цифровое представление книги (`/book`, `/ask`, `/`). |
| Система должна | Отдавать книгу как источник истины (genome, layers, ask). |
| Реально работает | ✅ Backend: `/book/genome`, `/book/layers`, `/book/ask`; Frontend: `/book`, `/ask`. |
| Подтверждено | TESTS + backend/frontend green; **F5/state persistence — НЕ подтверждено**. |
| Предстоит | USER-FLOW-VERIFIED (реальный пользовательский сценарий). |

### UC2. Исследование персонажа, места или события

| Поле | Значение |
|---|---|
| Пользователь | Выбирает сущность (world-engine: `/book/world/entity/{id}`) или задаёт вопрос через `/book/ask`. |
| Система должна | WorldModel lookup → KnowledgeLayer → контекст. |
| Реально работает | ✅ `/book/world/*`, `/book/world-explorer/explore`, `/book/ask` (P0 confirmed/partial/insufficient). |
| Подтверждено | TESTS (world-engine, ask, p0). |
| Предстоит | USER-FLOW-VERIFIED (UI→backend реальный сценарий). |

### UC3. Переход по связям между сущностями

| Поле | Значение |
|---|---|
| Пользователь | Кликает связь между сущностями. |
| Система должна | related_entities resolution (MIN_SCORE=60) → навигация. |
| Реально работает | ✅ `services/related_entities.py`; ответ `/book/ask` несёт related. |
| Подтверждено | TESTS. |
| Предстоит | UI-интеграция перехода (проверка не завершена). |

### UC4. Изучение исторического контекста

| Поле | Значение |
|---|---|
| Пользователь | Через temporal: `/book/temporal/chain`, `/context/{epoch_id}`, `/book/world-explorer/history`. |
| Система должна | Temporal chain из WorldModel; canonical events. |
| Реально работает | ✅ (M9). **Важно:** `/history` — это memory диалогов, не temporal. |
| Подтверждено | TESTS (temporal M9, canonical events). |
| Предстоит | USER-FLOW-VERIFIED; F5 persistence — НЕ подтверждено. |

### UC5. Исследование альтернативной линии развития событий

| Поле | Значение |
|---|---|
| Пользователь | Через world-explorer: explore branches, future-extrapolation, alternatives. |
| Система должна | WorldEngineV2 + FutureExtrapolator; gates. |
| Реально работает | ✅ частично; GATED boundaries. |
| Подтверждено | TESTS (частично). |
| Предстоит | USER-FLOW-VERIFIED; OWNER-GATE (Stage2/EDM). |

### UC6. Диалог с книгой и честная оценка достоверности

| Поле | Значение |
|---|---|
| Пользователь | Задаёт вопрос → получает ответ с source/confidence/confidence_state/uncertainty или silence. |
| Система должна | Keeper `_derive_confidence_state` (confirmed/partial/insufficient), silence out-of-book. |
| Реально работает | ✅ JSON path (`INTEGRATION-VERIFIED`); SSE — **DEFERRED**. |
| Подтверждено | TESTS (13 P0 + regression 223; frontend 283). |
| Предстоит | SSE confidence; event-log gap; LLM voice E2E. |

### UC7. Создание форм выражения знаний через Studio и Media

| Поле | Значение |
|---|---|
| Пользователь | Через Studio/Media: film, assets, visual, OS pipeline. |
| Система должна | MediaClient, MediaPlan, film studio routes. |
| Реально работает | ✅ code; ⚠️ реальная production-интеграция не подтверждена; media contract partial. |
| Подтверждено | ADR + code; production — НЕ verified. |
| Предстоит | REAL integration check; media contract sync. |

### UC8. Возврат к предыдущим исследованиям и диалогам

| Поле | Значение |
|---|---|
| Пользователь | История: `/book/world-explorer/history`, `/book/reader/history(Full|Sessions)`, context, stats. |
| Система должна | Хранение и возврат к контексту. |
| Реально работает | ✅ endpoints EXIST; **persistence после F5 — НЕ подтверждено**. |
| Подтверждено | TESTS (reader history, world-explorer history). |
| Предстоит | USER-FLOW-VERIFIED + F5 persistence. |

---

## 11. Что считаю закрытым и открытым (по итогам проверки и уточнений 2026-11-04)

| Направление | Решение |
|---|---|
| Проверка маршрутов | **ЗАКРЫТО** (подтверждено; с оговоркой: routing ≠ user-flow) |
| Различие History и Temporal | **УТОЧНЕНО** (memory vs temporal — разные контуры) |
| SSE | **ОТЛОЖЕН** (DEFERRED / PRODUCT VALUE NOT CONFIRMED; решение владельца: пока не возвращать) |
| Техническая карта FC1–FC10 | **РАБОЧАЯ ВЕРСИЯ** |
| Полная карта пользовательских возможностей | **ВЫПОЛНЕНА (UC1–UC8)** — статусы оформлены в §16 (Итоговый отчёт) |
| Проверка сценариев после F5 | **НЕ ПОДТВЕРЖДЕНО** |
| Реальное производство через Studio/Media | **ЧАСТИЧНО ПРОВЕРЕНО** |

---

## 12. Ближайшие шаги

1. Финальное оформление UC-карты — выполнено (поля + статусы + вердикты в §16). Требует только финального подтверждения owner.
2. Owner-GO: подтвердить product-необходимость SSE → затем довести confidence_state до SSE.
3. Restore backlog B1/B2 (P1) — после SSE.
4. Stage2/EDM/deploy — отдельные OWNER-GO.

---

## 13. Дальняя перспектива

Полноценный Arkaim = book → world → knowledge → links → time → expression (+ LLM-voice, media, deploy, docs).

---

## 14. Матрица UC × FC (связи пользовательских сценариев с функциональными блоками)

| UC | Пользовательский сценарий | Участвующие FC | Зависимости |
|---|---|---|---|
| UC1 | Открытие цифрового представления книги | FC1, FC10 | FC1 → FC10 |
| UC2 | Исследование персонажа/места/события | FC2, FC3, FC4, FC10 | FC2/FC3/FC4 → FC10 |
| UC3 | Переход по связям между сущностями | FC2, FC4 | FC4 → UI-навигация |
| UC4 | Изучение исторического контекста | FC5, FC2 | FC5 → FC10 |
| UC5 | Исследование альтернативной линии | FC6, FC2/FC5 | FC6 → FC10 |
| UC6 | Диалог + честная оценка достоверности | FC3, FC7, FC10, FC4 | FC7 → FC10 |
| UC7 | Studio/Media — формы выражения знаний | FC8, FC9, FC6 | FC9 → FC8 |
| UC8 | Возврат к исследованиям/диалогам | FC7, FC5, FC10 | FC7/FC5 → FC10 |

## 15. Матрица продуктовых пробелов

| Категория | Содержание | Связанные UC/FC |
|---|---|---|
| Функции, которых нет | Полный user-flow для всех UC (UI-навигация связей, возврат, studio production UI); status page; admin moderation backlog — по FRONTEND_RESTORE_BACKLOG | UC3, UC8, UC7, FC10 |
| Реализовано, но не протестировано | LLM voice E2E; real media integration; F5-проверки; user-flow UI сценариев | UC6, UC7, UC1–UC8 |
| Протестировано, но не интегрировано | related_entities (backend) — UI-навигация (UC3); keeper event-log confidence (UC6) | UC3, UC6 |
| Интегрировано, но не проверено в полном user-flow | UC6 JSON path: real Pulse+Voice+keeper → `/book/ask` → confidence_state (system-level integration); frontend display — component tests; полный user-flow — pending | UC6 |
| GATED | Stage2, EDM-RES, M10/M11 pending updates, world-engine gates | FC3, FC5/FC6, M10/M11 |
| Отложено (owner) | SSE confidence (`confidence_state` in `/v1/stream`) — DEFERRED / PRODUCT VALUE NOT CONFIRMED | UC6, FC10, FC7 |

## 16. Итоговый отчёт (обновлённый)

- **DONE:** UC1–UC8 оформлены в документе со всеми полями; матрица UC×FC; матрица пробелов; roadmap обновлён.
- **WORKS:** Pulse, Keeper, Ask-flow, JSON confidence_state, основные frontend/backend маршруты.
- **PROBLEMS:** полная карта UC требует финального оформления статусов; сохранение после F5 — НЕ проверено; production — частично; SSE DEFERRED.
- **OWNER-GO:** сейчас не требуется. SSE отложен; Stage2, EDM, M10/M11 и deployment не запускаем.
- **Ближайшие шаги:** (1) финальное оформление UC — выполнено на уровне полей + статусов по существующим доказательствам; (2) F5-проверки — NOT-VERIFIED.
- **Дальняя перспектива:** собрать Arkaim как единое цифровое представительство книги.

### Финальные вердикты по UC (итоги UC-финализации 2026-11-04)

| UC | Статус | Доказательства | Что необходимо для завершения |
|---|---|---|---|
| UC1 | IMPLEMENTED + TESTED (backend/frontend); ask-E2E integration-verified | tests, green CI | USER-FLOW-VERIFIED; F5 NOT |
| UC2 | IMPLEMENTED + TESTS | world/ask/world-explorer tests | USER-FLOW; F5 |
| UC3 | TESTED (backend); UI-навигация — не интегрирована | related tests | UI integration + USER-FLOW |
| UC4 | TESTED (M9); user-flow pending | temporal tests | USER-FLOW; F5 |
| UC5 | PARTIAL (gates) | partial tests | USER-FLOW; OWNER-GATE |
| UC6 | **INTEGRATION-VERIFIED** (JSON path); SSE DEFERRED; event-log gap | P0 E2E (real Pulse+Voice+keeper → `/book/ask` → confidence_state), 13+223 tests, frontend 283 | SSE; event-log; LLM-voice E2E; USER-FLOW UI |
| UC7 | IMPLEMENTED (code); production NOT verified | ADR+code; media contract PARTIAL | REAL integration; USER-FLOW |
| UC8 | TESTED (endpoints); F5 NOT | history tests | USER-FLOW; F5 |

### F5-проверки: какие реально выполнялись

- **Ни одной реальной F5-проверки в браузере не проводилось.** Результат: **NOT-VERIFIED**.
- Серверное состояние (reader history, dialogue context) — серверный контур (SQLite по коду); клиентское — localStorage/React (по коду). E2E в реальном браузере — не проводилось.

### Пробелы, блокирующие полноценные пользовательские сценарии

- F5 persistence (UC1/UC4/UC8) — NOT-VERIFIED.
- UI-навигация связей (UC3) — не интегрирована.
- UC6: SSE (DEFERRED), event-log gap, LLM-voice E2E.
- UC7: real production/media integration.
- USER-FLOW-VERIFIED не достигнут для ни одного UC; ближайший — UC6 (INTEGRATION-VERIFIED на системном уровне).

### Карта готова как основание для единого продуктового дорожного плана?

- **ДА**, как рабочая версия — при условии финального оформления статусов UC (выше) и подтверждения owner по SSE.

---

## 17. Решения владельца и уточнения по итогам UC1–UC8-финализации (2026-11-04)

### 17.1 Подтверждение вердиктов UC1–UC8

| UC | Вердикт владельца | Статус |
|---|---|---|
| UC1 | **Принят** — IMPLEMENTED + TESTED; интеграция Ask подтверждена | ✅ |
| UC2 | **Принят** — IMPLEMENTED + TESTED | ✅ |
| UC3 | **Принят с ограничением** — Backend TESTED, UI-навигация не интегрирована | ✅ |
| UC4 | **Принят** — TESTED; пользовательский сценарий не подтверждён | ✅ |
| UC5 | **Принят** — PARTIAL / GATED | ✅ |
| UC6 | **Принят** — INTEGRATION-VERIFIED для JSON-пути | ✅ |
| UC7 | **Принят** — IMPLEMENTED / PARTIAL; production-интеграция не подтверждена | ✅ |
| UC8 | **Принят** — TESTED; F5 не проверен | ✅ |

**Оговорка (принята):** ни один UC пока не получил USER-FLOW-VERIFIED. Это не обесценивает работу, но не позволяет утверждать, что все пользовательские сценарии работают целиком.

### 17.2 Четыре уточнения

1. **UC6 не должен зависеть от SSE.** JSON-путь уже интеграционно проверен; SSE — отдельная оценка (основной диалог, передача достоверности/неопределённости, стриминг, журналирование, LLM Voice).
2. **F5 — отдельная проверка сохранности состояния.** Не считать, что все 8 UC блокируются отсутствием браузерного теста.
3. **UC3 — реальный продуктовый пробел.** Backend-навигация TESTED, UI-навигация не интегрирована — важнее, чем новый недостающий тест.
4. **UC7 — не сводить Media к видео.** Система должна поддерживать разные формы выражения знаний; проверка одного производственного контура ≠ оценка всей медиаконцепции.

### 17.3 Решения владельца

| Вопрос | Решение |
|---|---|
| Финальные вердикты UC1–UC8 | **Подтверждены** |
| Функциональная карта | **Принята как рабочая основа** |
| Маршруты | **Закрыты, без повторного аудита** |
| SSE | **DEFERRED** |
| F5 | **Отдельная будущая проверка** |
| Stage2 / EDM | **Не запускать** |
| B1/B2 restore | **Не запускать** |
| M10/M11 | **Не запускать** |
| Deployment | **Не запускать** |
| Изменения кода и push | **Не разрешены этим решением** |

**SSE:** дополнительного OWNER-GO на отсрочку не требуется — она уже действует (DEFERRED / PRODUCT VALUE NOT CONFIRMED); вернуться можно при появлении конкретного пользовательского сценария, нуждающегося в streaming.

### 17.4 Главный результат этапа

Подготовительный аудит завершён. Три уровня понимания Arkaim:
1. FC1–FC10 — функциональные подсистемы.
2. UC1–UC8 — пользовательские возможности и готовность.
3. Матрица продуктовых пробелов — препятствия на пути к целостному продукту.

Это достаточная основа для перехода от проверки компонент к проектированию продукта.

---

## STOP

Карта принята в рабочую версию. Следующий шаг — подготовка единого продуктового дорожного плана.
