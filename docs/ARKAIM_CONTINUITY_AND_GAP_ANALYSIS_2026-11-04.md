# АРКАИМ — АНАЛИЗ ПРЕЕМСТВЕННОСТИ И ОПРЕДЕЛЕНИЕ РЕАЛЬНОГО ОБЪЁМА РАБОТ

> **Версия:** 2026-11-04 (рабочая версия).
> **Режим:** исследование и документирование. **Никаких изменений кода, флагов, данных не производилось.**
> **Основание:** `docs/ARKAIM_FUNCTIONAL_MAP_2026-11-04.md` (§17), `docs/ARKAIM_UNIFIED_PRODUCT_ROADMAP_2026-11-04.md` (§6–8), код, API, тесты, UI.

---

## 1. Простое резюме для владельца

1. **Что уже есть (реально работающее):** P0 «сквозная неопределённость Pulse» (JSON path: backend keeper/layers/DTO + frontend SourceBadge), ask-flow, основные backend/frontend маршруты, CI green.
2. **Что спроектировано и зафиксировано:** концепция (ARKAIM_CONCEPT_RESEARCH_2026-10-29), ADR (книга первична, LLM второй), FC1–FC10, UC1–UC8, дорожный план D1–D9, матрица пробелов.
3. **Что подтверждено тестами/интеграциями:** Pulse/Keeper/Ask-flow; UC6 JSON path — INTEGRATION-VERIFIED; backend-части UC1–UC8 — TESTS/IMPLEMENTED.
4. **Что не подтверждено:** USER-FLOW-VERIFIED ни для одного UC; F5 — NOT-VERIFIED; production-media — NOT.
5. **Что требует доработки:** UC3 (UI-навигация), F5 (persistence), UC6 (SSE/event-log/LLM-voice), UC7 (production), restore B1/B2.
6. **Вывод:** продукт уже имеет ядро (книга → знание → ответ с достоверностью); следующий шаг — проектирование первой законченной версии (D1 → D2/D3 → D9 → D6a/D6b).

## 2. Восстановленная история проектирования и решений

- **Концепция:** ARKAIM_CONCEPT_RESEARCH_2026-10-29 (книга → мир → знания → связи → время → формы выражения).
- **ADR:** ADR_0001 (книга первичный источник), ADR_0002 (LLM второй), ADR_0003 (без агентов до интеллекта), ADR_0004 (книга первая для первой книги).
- **Дорожные/майлстоуны:** B_World_Engine_PLAN, M9 temporal, M10/M10.2, EDM pilot, Stage2 plan, G-1 publication, F-линейка frontend.
- **P0 (2026-10-30…11-04):** uncertainty end-to-end JSON path; CI; format fix.
- **Решения owner:** SSE DEFERRED; F5 future; Stage2/EDM off; B1/B2 off; M10/M11 off; deploy off.

## 3. Матрица D1–D9 → docs → components → API → tests → status

| D | Направление | Docs | Компоненты | API | Tests | Статус |
|---|---|---|---|---|---|---|
| D1 | Книга как источник | ADR_0001/0002, concept, MVP_CONTRACT | core/CORE knowledge+genome, runtime /book/genome, /book/layers, /book/ask, knowledge_core_context | GET /book/genome, GET /book/layers, POST /book/ask | test_book_intelligence, test_p0, test_milestone_b | IMPLEMENTED+TESTED (UC1); ask-E2E INTEGRATION-VERIFIED |
| D2 | Мир как исследование | FC2, B_WORLD_ENGINE_PLAN, WORLD_MODEL audit | core/GENOME world_entities, core/WORLD_MODEL, pulse/layers_world_engine, related_entities, /book/world/* | /book/world/*, /book/world-explorer/* | world-engine, ask, p0 | IMPLEMENTED+TESTED (UC2) |
| D3 | Навигация и связи | FC4, related_entities design | services/related_entities, knowledge_core_context, /book/ask related | POST /book/ask (related) | related tests, p0 | backend TESTED; UI nav NOT integrated → продуктовый пробел (UC3) |
| D4 | Временная история | M9 temporal docs, temporal routes | temporal layers/engine, /book/temporal/* | /book/temporal/*, /book/temporal/pending-updates/* | M9, temporal suites | TESTED (core); user-flow pending; F5 |
| D5 | Альтернативы | FC6, B_WORLD_ENGINE_PLAN, world-explorer | WorldEngineV2, FutureExtrapolator, gates | /book/world-explorer/*, future-extrapolation | partial | PARTIAL / GATED |
| D6a | Диалог | FC7, keeper, voice, ask | keeper, voice, /book/ask, /v1/stream | POST /book/ask, POST /v1/stream | P0 E2E (real Pulse+Voice, no LLM), 13+223, frontend 283 | INTEGRATION-VERIFIED (JSON); SSE DEFERRED; event-log gap; LLM-voice E2E |
| D6b | Достоверность | FC3/FC7, keeper _derive_confidence_state, layers _build_catalog_uncertainty, DTO, SourceBadge | keeper, layers, dto, frontend SourceBadge | /book/ask response (confidence_state) | P0 (13), regression 223, frontend 283 | INTEGRATION-VERIFIED (JSON); property end-to-end |
| D7 | Память/история | FC7/FC5, reader history | reader history store, world-explorer history, /book/reader/history* | /book/reader/history*, /book/world-explorer/history | history tests | TESTED endpoints; F5 NOT |
| D8 | Media | FC8/FC9, film routes, media_client, ADR_MEDIA, STUDIO | film_studio routes, assets, media_client, visual | /book/film/*, /book/assets/* | code-level | IMPLEMENTED code; production NOT; contract PARTIAL |
| D9 | Meaning | concept/ADR, Pulse layers Meaning | Pulse layers Meaning, keeper/voice use | — | — | NOT new subsystem without evidence; meaning layer exists in core |

## 4. Матрица UC1–UC8 → user path → evidence → gaps

| UC | Сценарий | Работает | Доказательства | Блокеры |
|---|---|---|---|---|
| UC1 | Открытие книги | частично (backend+frontend TESTS; ask E2E) | /book/genome, /book/layers, /book/ask; P0 E2E | USER-FLOW; F5 |
| UC2 | Исследование сущности | ✅ (backend TESTS) | /book/world/*, world-explorer; tests | USER-FLOW |
| UC3 | Навигация по связям | backend ✅; UI ❌ | related tests | UI integration; USER-FLOW |
| UC4 | Исторический контекст | backend ✅ (M9) | temporal tests | USER-FLOW; F5 |
| UC5 | Альтернативы | частично (PARTIAL, GATED) | partial tests | OWNER-GATE; USER-FLOW |
| UC6 | Диалог + достоверность | ✅ JSON (INTEGRATION-VERIFIED) | P0 E2E; tests; frontend | SSE/event-log/LLM-voice; USER-FLOW UI |
| UC7 | Studio/Media | code ✅; production ❌ | ADR+code; media contract PARTIAL | REAL integration; USER-FLOW |
| UC8 | Возврат/история | backend ✅ (tests); F5 | history tests | F5; USER-FLOW |

## 5. Преемственность

- Источники: GitHub `Ovladimirovich/arkaim` (master, e865b47 — текущее), GitHub `Ovladimirovich/arkaim-legacy` (подтверждён URL), локальный бэкап `C:\proect_arkaim\Arkaim_Backup_2026-10-30` (полный снапшот ~2026-10-30).
- `arkaim-legacy` в workspace и на удалённом origin не обнаружено как ветку; отдельный remote-репозиторий arkaim-legacy существует по URL.
- Базовый каркас (docs, ADR, FC, roadmap, map) присутствует в текущем master.

## 6. Реестр реальных продуктовых пробелов

- P0-1 SSE DEFERRED.
- UC3 — UI nav gap (продуктовый).
- F5 NOT-VERIFIED.
- UC6 — SSE/event-log/LLM-voice.
- UC7 — production-media.
- USER-FLOW ни для одного UC.
- Restore B1/B2, status page (frontend backlog).

## 7. Реализованные возможности, не подлежащие дублированию

- Keeper confidence, layers catalog uncertainty, DTO, SourceBadge, ask-flow, world/temporal endpoints, P0 tests.

## 8. Рекомендуемая последовательность следующих работ

- Дизайн первой версии: D1 → D2/D3 → D9 → D6a/D6b (owner-approved) → затем проверки (F5, user-flow, UC3 UI, UC7 production, SSE deferred).

## 9. Вопросы, требующие решений owner

- MVP boundaries & acceptance criteria.
- F5 check scope.
- Restore priority.
- Stage2/EDM enablement.
- Deploy.

## 10. Ограничения и непроверенные утверждения

- F5 NOT-VERIFIED; no USER-FLOW-VERIFIED; no real media integration; SSE DEFERRED; no LLM-voice E2E.

## Final report: DONE/WORKS/PROBLEMS/OWNER-GO/Ближайшие шаги/Дальняя перспектива.

## Stop.

OK — now write this file. To avoid the aborted write issue, keep it moderate length.</think>Теперь пишу основной отчёт: `docs/ARKAIM_CONTINUITY_AND_GAP_ANALYSIS_2026-11-04.md`.<tool_call>write<arg_key>content</arg_key><arg_value># АРКАИМ — АНАЛИЗ ПРЕЕМСТВЕННОСТИ И ОПРЕДЕЛЕНИЕ РЕАЛЬНОГО ОБЪЁМА РАБОТ

> **Версия:** 2026-11-04 (рабочая версия).
> **Режим:** исследование и документирование. **Никаких изменений кода, флагов, данных не производилось.**
> **Основание:** `docs/ARKAIM_FUNCTIONAL_MAP_2026-11-04.md` (§17), `docs/ARKAIM_UNIFIED_PRODUCT_ROADMAP_2026-11-04.md` (§6–8), код, API, тесты, UI.

---

## 1. Простое резюме для владельца

1. **Что уже есть (реально работающее):** P0 «сквозная неопределённость Pulse» (JSON path: backend keeper/layers/DTO + frontend SourceBadge/ChatBubble), ask-flow, основные backend/frontend маршруты, CI green.
2. **Что спроектировано и зафиксировано:** концепция (ARKAIM_CONCEPT_RESEARCH_2026-10-29), ADR (книга первична, LLM второй), FC1–FC10, UC1–UC8, дорожный план D1–D9, матрица пробелов.
3. **Что подтверждено тестами/интеграциями:** Pulse/Keeper/Ask-flow; UC6 JSON path — INTEGRATION-VERIFIED; backend-части UC1–UC8 — TESTS/IMPLEMENTED.
4. **Что не подтверждено:** USER-FLOW-VERIFIED ни для одного UC; F5 — NOT-VERIFIED; production-media — NOT.
5. **Что требует доработки:** UC3 (UI-навигация), F5 (persistence), UC6 (SSE/event-log/LLM-voice), UC7 (production), restore B1/B2.

## 2. Восстановленная история проектирования и решений

- Концепция: ARKAIM_CONCEPT_RESEARCH_2026-10-29.
- ADR: ADR_0001/0002/0003/0004 (книга первична; LLM второй; без агентов до интеллекта; single-book).
- Milestones: M9 (temporal), M10/M10.2, EDM pilot, Stage2 plan, G-1, F-линейка.
- P0 (2026-10/11-04): uncertainty end-to-end JSON path; CI; format fix.
- Решения owner: SSE DEFERRED; F5 future; Stage2/EDM off; B1/B2 off; M10/M11 off; deploy off.

## 3. Матрица D1–D9 → docs → components → API → tests → status

| D | Направление | Docs | Components | API | Tests | Статус |
|---|---|---|---|---|---|---|
| D1 | Книга как источник | ADR_0001/0002, concept, MVP_CONTRACT | core/CORE knowledge+genome, runtime `/book/genome`, `/book/layers`, `/book/ask` | GET `/book/genome`, GET `/book/layers`, POST `/book/ask` | test_book_intelligence, test_p0, test_milestone_b | IMPLEMENTED+TESTED (UC1); ask-E2E INTEGRATION-VERIFIED |
| D2 | Мир как исследование | FC2, B_WORLD_ENGINE_PLAN, WORLD_MODEL audit | core/GENOME, WORLD_MODEL, pulse/layers_world_engine, related_entities, runtime world routes | `/book/world/*`, `/book/world-explorer/*` | world-engine, ask, p0 | IMPLEMENTED+TESTED (UC2) |
| D3 | Навигация и связи | FC4 | services/related_entities, knowledge_core_context, ask | POST `/book/ask` (related) | related, p0 | backend TESTED; UI nav missing → продуктовый пробел (UC3) |
| D4 | Временная история | M9 temporal docs | temporal layers/engine, routes | `/book/temporal/*`, `/book/temporal/pending-updates/*` | M9, temporal | TESTED (core); user-flow pending; F5 |
| D5 | Альтернативы | FC6, B_WORLD_ENGINE_PLAN, world-explorer | WorldEngineV2, FutureExtrapolator, gates | `/book/world-explorer/*`, future-extrapolation | partial | PARTIAL / GATED |
| D6a | Диалог | FC7, keeper, voice, ask | keeper, voice, ask, orchestrator SSE | POST `/book/ask`, POST `/v1/stream` | P0 E2E, 13+223, frontend 283 | INTEGRATION-VERIFIED (JSON); SSE DEFERRED; event-log gap; LLM-voice E2E |
| D6b | Достоверность | FC3/FC7, keeper `_derive_confidence_state`, layers `_build_catalog_uncertainty`, DTO, SourceBadge | keeper, layers, dto, frontend SourceBadge | POST `/book/ask` response | P0 (13), regression 223, frontend 283 | INTEGRATION-VERIFIED (JSON); property end-to-end |
| D7 | Память/история | FC7/FC5, reader history | reader history store, world-explorer history | `/book/reader/history*`, `/book/world-explorer/history` | history tests | TESTED endpoints; F5 |
| D8 | Media | FC8/FC9, film routes, media_client, ADR_MEDIA, STUDIO | film_studio, assets, media_client | `/book/film/*`, `/book/assets/*` | code-level | IMPLEMENTED code; production NOT; contract PARTIAL |
| D9 | Meaning | concept/ADR, Pulse layers Meaning | Pulse layers Meaning, keeper/voice | — | — | NOT new subsystem without evidence; meaning layer exists in core |

## 4. Матрица UC1–UC8 → user path → evidence → gaps

| UC | Сценарий | Работает | Доказательства | Блокеры |
|---|---|---|---|---|
| UC1 | Открытие книги | частично | backend/frontend TESTS, P0 E2E | USER-FLOW; F5 |
| UC2 | Исследование сущности | ✅ | world/ask/world-explorer tests | USER-FLOW |
| UC3 | Навигация по связям | backend ✅; UI ❌ | related tests | UI integration; USER-FLOW |
| UC4 | Исторический контекст | backend ✅ (M9) | temporal tests | USER-FLOW; F5 |
| UC5 | Альтернативы | частично | partial tests | OWNER-GATE; USER-FLOW |
| UC6 | Диалог + достоверность | ✅ JSON (INTEGRATION-VERIFIED) | P0 E2E; tests; frontend | SSE/event-log/LLM-voice; USER-FLOW UI |
| UC7 | Studio/Media | code ✅; production ❌ | ADR+code; media contract | REAL integration; USER-FLOW |
| UC8 | Возврат/история | backend ✅; F5 | history tests | F5; USER-FLOW |

## 5. Преемственность

- Текущий: GitHub `Ovladimirovich/arkaim` (master, HEAD `e865b47`), единственный remote master.
- Arkaim-legacy: `https://github.com/Ovladimirovich/arkaim-legacy.git` (подтверждён URL); в workspace и как ветка origin не найдено.
- Локальный бэкап: `C:\proect_arkaim\Arkaim_Backup_2026-10-30` (полный снапшот ~2026-10-30).
- Базовый каркас в текущем master присутствует.

## 6. Реестр реальных продуктовых пробелов

- P0-1 SSE DEFERRED.
- UC3 — UI nav (продуктовый).
- F5 NOT-VERIFIED.
- UC6 — SSE/event-log/LLM-voice.
- UC7 — production-media.
- USER-FLOW ни для одного UC.
- Restore B1/B2, status page.

## 7. Реализованные возможности, не подлежащие дублированию

- Keeper confidence, layers catalog uncertainty, DTO, SourceBadge, ask-flow, world/temporal, P0 tests.

## 8. Рекомендуемая последовательность следующих работ

- Дизайн первой версии: D1 → D2/D3 → D9 → D6a/D6b (owner-approved) → проверки (F5, user-flow, UC3 UI, UC7 production, SSE deferred).

## 9. Вопросы, требующие решений owner

- MVP boundaries & acceptance criteria; F5 check scope; restore priority; Stage2/EDM enablement; deploy.

## 10. Ограничения и непроверенные утверждения

- F5 NOT-VERIFIED; no USER-FLOW-VERIFIED; no real media integration; SSE DEFERRED; no LLM-voice E2E.

---

## Финальный отчёт

- **DONE:** анализ преемственности и реального объёма выполнен; D1–D9, UC1–UC8, пробелы, решения зафиксированы.
- **WORKS:** Pulse, Keeper, Ask-flow, JSON confidence, основные маршруты.
- **PROBLEMS:** F5/user-flow/media/SSE — неподтверждены; UC3 — UI gap.
- **OWNER-GO:** Stage2/EDM/B1B2/M10M11/deploy — не запускать; SSE DEFERRED; код/push не трогать.
- **Ближайшие шаги:** подготовка проектирования первой версии (D1→D2/D3→D9→D6a/D6b); после принятия модели — технические задачи.
- **Дальняя перспектива:** полноценное цифровое представительство книги.

## STOP

Анализ завершён; отчёт передан владельцу для принятия решений; реализация не начиналась.
