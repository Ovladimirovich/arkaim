# Карта направлений и план развития Arkaim
> **Дата:** 2026-10-30
> **Статус:** фактическая карта (инвентаризация) + план развития; НЕ замена плана G-1 или WIP_LEDGER.
> **Источник:** git HEAD `d49466a` (3 G-1-коммита: `dac1116` KNOWLEDGE P-1…P-5, `41a2e1f` SEC-6, `d49466a` блок A; базовый `2af923f` S-2), `docs/ARKAIM_PROJECT_STATE.md`, `docs/WIP_LEDGER.md`, `docs/G1_PUBLICATION_REGISTRY_2026-10-30.md`, фактические файлы рабочего дерева.
> **Обновление статуса 2026-10-30 (после полной сборки тестов):** W-4 (импорты) закрыт прогоном, SEC-6 устранён и закоммичен, блок A закоммичен; 8 FAIL-ов в полном прогоне — только KNOWLEDGE-данные (направление C/N-1).

---

## 0. Короткая сводка

| # | Направление | Статус | Приоритет | Зависит от | Критично |
|---|---|---|---|---|---|
| N-1 | **C — Knowledge Core: данные, происхождение, археология** | 🔴 РАЗРУШЕНО | **P0** | — | Да: тесты падают |
| N-2 | **СБОРКА И ТЕСТЫ** (завершить прогон + green baseline) | ✅ **Полный прогон завершён** (3096 passed, 8 failed, 26 skipped; 676 c) — 8 FAIL-ов все в KNOWLEDGE-данных (N-1); green baseline = «8 fallback ошибок данных C» | P1 | N-1 (частично) | Нет |
| N-3 | **A — Google OAuth + SESSION_SECRET** | ✅ **Блок A закрыт полностью**: OAuth-цепь + `runtime/.env.example` + `docker-compose` (`d49466a`); SEC-6 (`41a2e1f`) + корневой `.env.example` (`3e252a2`). Остаток: live-проверка OAuth-сценария (credentials) | P2 | N-1 (секреты) | Нет |
| N-4 | **E — Mobile: dev-login + сборка** | 🔴 dev-кнопка бьёт в удалённый эндпоинт; основной механизм — токен; tsc-ошибка баррела `shared/api` (4, предсуществующая). Механизмы установлены, решение — OWNER-GO E | P3 | — | Нет |
| N-5 | **B — ComfyUI: заглушка** | 🟡 Не подключён (заглушка) | P4 | — | Нет |
| N-6 | **D — Genome: дедупликация** | 🟢 Фактически готово (7 MD5, 47 файлов) | P5 | — | Нет |
| N-7 | **SEC-6 — core/config.py:83 (Book Intelligence)** | ✅ **Закрыто** (`41a2e1f`): дефолт `change-me-in-production` → `""`; запуск контура не меняется | P4 | — | Нет |
| N-8 | **Основная функциональность (Pulse, World Engine, RAG)** | 🟢 Работает | **P6 (главный)** | N-1 | Да: развитие требует |

---

## 1. Направление C — Knowledge Core: ДАННЫЕ, ПРОИСХОЖДЕНИЕ, АРХЕОЛОГИЯ

### 1.1 Фактическое состояние (не только план)

| Файл | Статус |
|---|---|
| `core/KNOWLEDGE/BOOK_DOCUMENT.json` | 0 items — пустой каркас (корневая книга) |
| `core/KNOWLEDGE/ARCHAEOLOGY_DEEP.json` | ✅ **2026-11-01 (KNOWLEDGE-C, A1): 1 запись** — удалены повторно 7 пустых зеркал (регрессия `dac1116`), решение G1.4 восстановлено. *Было (2026-10-30): 8 items, 7 пустых с confidence=1.0 — нарушение контракта* |
| `core/KNOWLEDGE/COSMOLOGY.json` | 27 items: 26 без `content`; у **15** из них confidence > 0, но `layers.literal` заполнен — контент живёт в слоях (см. §11.1, Вариант 1); на этот файл проверка G1 не распространяется |
| `core/KNOWLEDGE/GEOGRAPHY.json` | ✅ **2026-11-01 (KNOWLEDGE-C, A1): 17 записей, пустых нет** — удалены 2 пустых зеркала (`ARCHAEOLOGY.json.sites[3]`, `sites[4]`, регрессия `dac1116`). *Было (2026-10-30): 19 items, 2 пустых с confidence=1.0* |
| `core/KNOWLEDGE/THEMES_EXPANDED.json` | 16 items: 15 без `content` (у всех 15 заполнен `layers.literal`, confidence > 0 — см. COSMOLOGY) |
| `core/KNOWLEDGE/SYMBOLS_DEEP.json` | 15 items: 14 без `content` (у всех 14 заполнен `layers.literal`, confidence > 0 — см. COSMOLOGY) |
| `core/KNOWLEDGE/PHILOSOPHY_DEEP.json` | 134 items: 0 пустых (есть контент) |
| `core/KNOWLEDGE/SCREENPLAY_DIALOGUES.json` (tracked) | ✅ **2026-11-01 (KNOWLEDGE-C, B1): 7 items — 4 с контентом, 3 пустых с confidence 0.0** (не удалены — по §11.1/§14 «(б)»); файл-список, классифицирован `DERIVED`, `is_canon=False`, `requires_author_review=True`. *Было (2026-10-30): 7 items ВСЕ ПУСТЫЕ, без контента* |
| `core/CHROMA_DB` | 20.3 МБ — **реальная** база знаний (enriched_chunks + Chroma), работает |
| `core/CORE/**` (Pulse, Narrative, Media, World) | 🟢 Работает, задокументировано |

### 1.2 Фактический сбой

> ✅ **ИСПРАВЛЕНО 2026-11-01 (KNOWLEDGE-C, OWNER-GO A1+B1).** Ниже — описание сбоя на 2026-10-30, сохранено как история.

Тест `runtime/tests/test_g1_archaeology_claims.py` падал: `TestEmptyMirrorsFixed.test_no_empty_content_with_confident_metadata[ARCHAEOLOGY_DEEP.json]`:
```
assert content, f"{name}: запись с пустым content осталась"
```
Причина: в `ARCHAEOLOGY_DEEP.json` **7 из 8 записей** имели пустой `content` и `confidence=1.0` — это **нарушает собственный контракт G1** (пустой контент не может иметь `confidence > 0`). Источник — регрессия `dac1116` (возврат старого WIP-контента при замене абсолютных путей).

**Что сделано 2026-11-01:** удалены 9 пустых зеркал (7 в `ARCHAEOLOGY_DEEP`, 2 в `GEOGRAPHY`), история удаления записана в `_provenance_metadata.notes` обоих файлов; `SCREENPLAY_DIALOGUES.json` зарегистрирован в `PLAIN_LIST_REGISTERS` + реестре классификации (`DERIVED`, не канон), у 3 его пустых записей `confidence` обнулён. Тесты не ослаблялись.

### 1.3 Что НЕ работает

- Пытание данных: **частично закрыто 2026-11-01** — зеркала `ARCHAEOLOGY_DEEP`/`GEOGRAPHY` очищены (G1.4). Остаток: в `COSMOLOGY`, `PSYCHOLOGY`, `SYMBOLS_DEEP`, `THEMES_EXPANDED` есть записи без `content` (но с заполненным `layers.literal`) — они НЕ являются ложными утверждениями (контент есть в слоях) и не ловятся тестами G1; решение «(б) обнулить пустые» по ним — **открытый пункт владельца** (§14), в KNOWLEDGE-C не входило.
- `SCREENPLAY_DIALOGUES.json` — **обновлено 2026-11-01**: 4 из 7 записей содержат контент, 3 пустые — `confidence 0.0`. Классификация `DERIVED`/`requires_author_review=True` (направление C: «не считать авторски утверждёнными») — в публикацию только с авторским ревью (OWNER-GO C).
- `TECHNOLOGY.json` — существует (MIRRORS), его содержимое не проверял (тест пропускает, если нет `items`).

### 1.4 Что реализовано частично (W-3)

- `SYSTEM_INTERPRETATION`, `requires_author_review` — добавлены, но данные «сырые» (пустые записи), не утверждённые автором.

### 1.5 Зависимости и риски

- **Риск потери ценных данных:** если дедупликация KNOWLEDGE-файлов не выполнена, и часть записей действительно пустые — это WIP (незавершённая работа).
- **Риск повреждения:** `core/KNOWLEDGE/*.json` — 8 изменённых в рабочем дереве, не закоммичены. Если коммитить W-1 (OAuth) — захватит WIP C.

### 1.6 Как можно безопасно разрешить

**Пункт решения:** ~~не трогать KNOWLEDGE-данные до отдельного этапа C~~ → **этап C начат 2026-11-01 (KNOWLEDGE-C):** зеркала A1 и регистрация B1 выполнены по явному OWNER-GO, тесты зелёные. Осталось решение владельца: «(б) обнулить пустые» для `COSMOLOGY`/`PSYCHOLOGY`/`SYMBOLS_DEEP`/`THEMES_EXPANDED` (§14) и авторское ревью содержимого (OWNER-GO C) — **не выполняется автоматически**. Для публикации (G-1) пустые/производные файлы — по реестру `docs/G1_PUBLICATION_REGISTRY_2026-10-30.md`.

---

## 2. Направление N-2 — Сборка и тесты (завершить прогон + green baseline)

### 2.1 Что сделано (S-2)

- `runtime/shared_config.py` — строгий `validate()` (отклоняет None/пусто/заглушки/короткие).
- `runtime/core/main.py` — `SharedSettings.validate()` вызывается после `load_dotenv`.
- Целевые тесты (auth/new/dev_routes/contract/isolation): **190 passed, 3 skipped**.
- Ruff на изменённых файлах: чист.

### 2.2 Полный прогон завершён (2026-10-30)

- Полный прогон `runtime/tests/` (676 c, 3106 collected): **3096 passed, 8 failed, 26 skipped** (11:16).
- **W-4 (относительные импорты `orchestrator`, `provider_registry`) ЗАКРЫТ**: импорт-проверка в пакетном режиме `cd runtime && python -c "import core.orchestrator, core.provider_registry"` → OK; `test_provider_registry` (6/6), `test_provider_fallback` (4/4) и все изоляционные тесты PASSED; ни один из 8 FAIL не относится к импортам. **Записывать W-4 как проверенный — теперь корректно.**
- **8 FAIL-ов — только KNOWLEDGE-данные (направление C/N-1)**: `test_g1_archaeology_claims` (4: пустые записи `ARCHAEOLOGY_DEEP`/`GEOGRAPHY`), `test_milestone_b` (3: provenance-метаданные), `test_provenance_registry_consistency` (1).
- **Green baseline = «8 fallback-ошибок данных C»**; остальные тесты зелёные.
- ✅ **Обновлено 2026-11-01 (KNOWLEDGE-C):** 8 FAIL-ов закрыты (A1 + B1), см. §15.

### 2.3 Почему это важно

- Любой следующий шаг опирается на то, что backend работает.
- Если KNOWLEDGE-файлы «ломаные» (N-1), тесты упадут — сейчас зафиксировано: 8 конкретных fallback-сбоев.
- Без green baseline G-1 (публикация) не имеет смысла.

### 2.4 Зависимости

- N-1 (KNOWLEDGE-данные) — **блокирующий сбой** (8 fallback-ошибок).
- N-3 (SESSION_SECRET-остаток) — не блокирует.

---

## 3. Направление A — Google OAuth + SESSION_SECRET

### 3.1 Что реализовано (WIP)

| Файл | Что сделано |
|---|---|
| `arkaim-web/src/app/login/page.tsx` | Кнопка «Войти через Google» → `/api/auth/google` |
| `arkaim-web/src/app/api/auth/google/route.ts` (untracked) | Next.js route handler OAuth |
| `runtime/auth/routes.py` (hunk) | `google_callback` redirect на `/profile` (вместо `/_ui`) |
| `docker-compose.yml` | Добавлены `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PUBLIC_BASE_URL`, `FRONTEND_URL`, `CORS_ORIGINS` |
| `runtime/.env.example` | Google OAuth-секция + пустой `SESSION_SECRET` (S-2) |

### 3.2 Что НЕ завершено

- **Полный сценарий end-to-end не проверен** (логин → Google → callback → cookie → redirect → профиль) — требует Google-credentials.
- **SEC-6 (Book Intelligence)** — ✅ **закрыто полностью**: `core/config.py:83` (`41a2e1f`) + **корневой `.env.example`** (`3e252a2`: legacy Hermes-секции удалены, дефолт `SESSION_SECRET=change-me-in-production` → пусто + S-2 fail-fast).

### 3.3 Зависимости и риски

- Rely на SESSION_SECRET (S-2 закрыт) — безопасно.
- Если не запустить перед публикацией — OAuth не работает.
- Риск SEC-6 — при запуске контура Book Intelligence (scripts, `core/CORE`) без `SESSION_SECRET` в env — используется небезопасный дефолт.

---

## 4. Направление E — Mobile

### 4.1 Фактический сбой

`arkaim-mobile/src/screens/login/LoginScreen.tsx:17`:
```python
const response = await api.post('/api/auth/dev-login');
```
Это **удалённый эндпоинт** (закрыт в S-1 за `DEV_AUTH_ENABLED`). Без изменения mobile-приложение **не сможет войти**.

### 4.2 Что нужно

- Исправить `LoginScreen.tsx` — переключить на существующий эндпоинт (`/api/auth/login` по токену или Telegram widget), либо убрать dev-кнопку.
- Проверить сборку (Expo).

### 4.3 Зависимости и риски

- Не блокирует backend/web — mobile автономный проект.
- Если оставить как есть — mobile не функционален.

---

## 5. Направление B — ComfyUI

### 5.1 Фактическое состояние

| Файл | Статус |
|---|---|
| `runtime/core/routes/comfyui.py` (untracked) | Роутеры `/book/comfyui/config` и `/book/comfyui/status` |
| `runtime/core/main.py` | **Не подключён** (`include_router` отсутствует) |
| `core/CORE/media/` | `MediaPlanBuilder` использует `comfyui` только как **prompt-шаблон** |

### 5.2 Что нужно

- Решить: подключить в `main.py` (полный цикл ComfyUI) или оставить заглушку (направление B: не включать в публикацию).
- Если подключить — проверить live-запуск (Colab + Tunnel).

### 5.3 Зависимости и риски

- Media-направление (B) — отдельный трек, не блокирует ядро.
- Rely на `COMFYUI_URL` в .env (дефолт `http://127.0.0.1:8188`).

---

## 6. Направление D — Genome: дедупликация

### 6.1 Фактическое состояние

`core/CORE/genome/history/` — **49 файлов, 7 уникальных MD5-хэшей** (факт: `git ls-files` = 47 `.json` + `index.json` + 4 `.txt`-слоя; реестр G-1 указывает 46 tracked-файлов → дедупликация до 7 уникальных версий, ориентир D).

| Hash | Кол-во файлов | Размер |
|---|---|---|
| `A9A50130...` | 32 | 205678 |
| `4C8C5C20...` | 8 | 261448 |
| `B06CE268...` | 2 | ? |
| `6B43A3D3...` | 2 | ? |
| `13D4BE8F...` | 1 | ? |
| `9CA93E19...` | 1 | ? |
| `FCE6BB56...` | 1 | ? |

### 6.2 Что нужно

- Дедупликация до 7 уникальных версий (ориентир D: оригиналы в бэкапе `Arkaim_Backup_2026-10-30`).
- Это **не блокирует**, можно отложить до G-1 (реестр публикации).

### 6.3 Зависимости

- Нет. Можно делать параллельно.

---

## 7. Направление SEC-6 — core/config.py:83 (Book Intelligence)

### 7.1 ✅ ЗАКРЫТО (коммит `41a2e1f`)

```python
# Было:
SESSION_SECRET: str = os.getenv("SESSION_SECRET", "change-me-in-production")
# Стало:
SESSION_SECRET: str = os.getenv("SESSION_SECRET", "")
```

### 7.2 Что сделано

- Небезопасный дефолт `change-me-in-production` заменён на `""` (fail-fast).
- Атрибут `SESSION_SECRET` в контуре Book Intelligence **не используется** (только определение) — запуск контура не меняется.
- Остаток того же дефолта в **корневом `.env.example`** (legacy, Hermes-секции) — ✅ **закрыт отдельным коммитом `3e252a2`**: дефолт → пусто + S-2 fail-fast-комментарий, legacy `HERMES_URL`/`HERMES_API_KEY` удалены (service-auth не затронут).

### 7.3 Зависимости

- Зависимость от SESSION_SECRET-политики (A) устранена: дефолт-заглушки в `core/config.py` больше нет.

---

## 8. Направление N-8 — Основная функциональность Arkaim (Pulse, World Engine, RAG)

### 8.1 Что работает

- `core/CORE/**` (Pulse, Narrative, Media, World Engine, Knowledge) — **живое ядро**, задокументировано.
- `runtime/core/routes/book.py` — `/book/*` (ask, genome, layers, world) — работает.
- `runtime/core/routes/knowledge_cards.py`, `world_references.py`, `temporal_references.py`, `conflicts.py`, `reasoning.py`, `corrections.py`, `review_queue.py` — **M1–M7/M14/M21–M25** (knowledge core, M-этапы).
- `core/CHROMA_DB` (20 МБ) — реальная база, работает.
- `runtime/memory/` (SQLite) — работает.
- `runtime/tests/integration/test_book_api.py` — интеграционные тесты `/book/*`.

### 8.2 Что не работает / не проверено

- `TEST_DRIFT`: полный прогон не завершён (см. N-2).
- **`BOOK_DOCUMENT.json` (root) — 0 items** — неясно, это намеренный пустой каркас или данные потеряны.
- **Pulse: WorldEngine layer, 168 тем** — фактическая целостность не подтверждена.

### 8.3 Зависимости

- Зависит от KNOWLEDGE (N-1) — если данные ломаются, Pulse не выдаёт точных ответов.

### 8.4 Что развиваем

- Новые M-этапы (M8, M9) — закрыты как foundations (по ARKAIM_PROJECT_STATE), новые мутации — только по OWNER-GO.
- Развитие Pulse: **Knowledge Core** (дополнительные сущности, связи, время) — отдельный трек.

---

## 9. Единая карта зависимостей

```
         ┌─────────────┐
         │  KNOWLEDGE  │──┐ (C/N-1) блокирует
         │  /BOOK_DATA │  │ 
         └─────────────┘  │
                          ├──────►  SБОРКА/ТЕСТЫ (N-2, P1)
                          │
         ┌─────────────┐  │         ├──────►  GREEN BASELINE (N-2)
         │  SESSION_   │  │         │
         │  SECRET (A) │──┼────────┴──────►  G-1 (публикация, P6)
         └─────────────┘  │
                          │
         ┌─────────────┐  ├──────►  MOBILE (E, P3)
         │  MOBILE     │  │
         │  dev-login  │  └──────►  BUILD (P4)
         └─────────────┘

         ┌─────────────┐
         │  COMFYUI    │── (B, P4, параллельно)
         │  (заглушка) │
         └─────────────┘

         ┌─────────────┐
         │  GENOME     │── (D, P5, параллельно)
         │  history    │
         └─────────────┘

         ┌─────────────┐
         │  core/config│── (SEC-6, P4, параллельно с A)
         │  .py:83     │
         └─────────────┘

         ┌─────────────────────────────────┐
         │  КН. КНИГА → МИР → ЗНАНИЯ →    │
         │  СВЯЗИ → ВРЕМЯ → ФОРМА →       │
         │  ВОЗМОЖНЫЕ ЛИНИИ → ДИАЛОГ →    │
         │  МЕДИА                         │
         └─────────────────────────────────┘
```

### 9.1 Ключевые блокирующие зависимости

| Зависит от | Что блокируется |
|---|---|
| **KNOWLEDGE (C/N-1)** | `test_g1_archaeology_claims.py` (падает) → green baseline (N-2) → G-1 (P6) |
| **SESSION_SECRET (A)** | `.env.example`, `docker-compose.yml` → G-1 (P6) |
| **Mobile dev-login (E)** | Сборка mobile (P4) |

### 9.2 Параллельно можно

- **B (ComfyUI)** + **D (Genome)** + **SEC-6 (core/config.py)** — независимы, можно делать одновременно.
- **E (Mobile)** — тоже независим, но с низкой приоритетом.

---

## 10. Продуктовая целостность Arkaim (запрет смещения)

### 10.1 Базовая концепция (из AGENTS.md / план §0)

```
КНИГА → МИР → ЗНАНИЯ → СВЯЗИ → ВРЕМЯ → ФОРМА → ВОЗМОЖНЫЕ ЛИНИИ → ДИАЛОГ → МЕДИА
```

**Arkaim — цифровое представительство книги «Наследие Аркаима» и развивающаяся система знаний. Видео — одна из форм представления знаний, а не конечная цель проекта.**

### 10.2 Что можно сместить

- **`SCREENPLAY_DIALOGUES.json`** — *обновлено 2026-11-01:* файл не пуст (4 из 7 записей с контентом), но классифицирован `DERIVED`/`is_canon=False`/`requires_author_review=True`, поэтому «ложного впечатления канона» не создаёт: он объявлен производным от сценария, авторское ревью обязательно (OWNER-GO C).
- **ComfyUI (B)** — если подключить к `/book/comfyui/*` без Media-планов, создаёт «видео-ориентацию».
- **`core/CORE/media/`** — `MediaPlanBuilder` — это нормально (медиа-слой), но не заменяет основные функции.

### 10.3 Проверка на сегодня

- ✅ Основная реализация: **Pulse, World Engine, RAG, Knowledge Core** — работает.
- ⚠️ **Видео/ComfyUI** — НЕ подключён, не смещает фокус.
- ⚠️ **SCREENPLAY** — *обновлено 2026-11-01:* содержит данные (4/7 записей), но не канон (`DERIVED`, `requires_author_review=True`) — смещения фокуса «скрипт → видео» не создаёт.

---

## 11. Рекомендуемая последовательность (с обоснованием)

### 11.1 П0 — Немедленное: C (KNOWLEDGE) и N-2 (завершить прогон)

**Почему именно это:**

1. `test_g1_archaeology_claims.py` падает — значит, базовый тест backend сломан.
2. Неясно, что работает, а что нет.
3. Любой следующий шаг (A, E, G-1) требует green baseline.

**Как сделать:**

- **Шаг 1:** Запустить полный прогон pytest: `cd runtime && python -m pytest tests/ -v --tb=short 2>&1 | tee full_test_output.txt` (без `-x`).
- **Шаг 2:** Зафиксировать карту: какие тесты падают, почему (KNOWLEDGE, integration, drift).
- **Шаг 3:** Решение по KNOWLEDGE:
  - Вариант 1 (быстрый): В **пустых** KNOWLEDGE-записях (`COSMOLOGY`, `THEMES_EXPANDED`, `SYMBOLS_DEEP`, `SCREENPLAY_DIALOGUES`) — **обнулить `confidence` до 0.0** (нормально, не содержит контента). Это **малый объём**, не «повышает до канона», не «удаляет».
    - ✅ **`SCREENPLAY_DIALOGUES.json` — ВЫПОЛНЕНО (2026-11-01, KNOWLEDGE-C B1):** 3 пустые записи → `confidence 0.0`, записи сохранены (не удалены).
    - ⏳ **`COSMOLOGY`, `THEMES_EXPANDED`, `SYMBOLS_DEEP` (+ обнаружен `PSYCHOLOGY`) — НЕ выполнялось:** у этих записей пуст только `content`, а `layers.literal` заполнен у всех записей с `confidence > 0` → ложной уверенности нет (контент есть в слоях). Формальное решение «обнулить или нет» остаётся за владельцем (§14 «(б)») и в KNOWLEDGE-C не входило.
  - Вариант 2 (полный): Заполнить данные KNOWLEDGE — отдельный трек C (не сейчас).

**Результат:** Green baseline, можно переходить к N-3.

### 11.2 P1 — N-2 (GREEN BASELINE подтверждён)

После P0 — **green baseline зафиксирован**. Можно двигаться.

### 11.3 P2 — A (Google OAuth + SESSION_SECRET)

**Почему:**

- OAuth — основная функциональность, нужна читателю.
- SESSION_SECRET остаток (`.env.example`, `docker-compose`) — маленький объём.

**Как сделать:**

- **Шаг 1:** Подготовить сценарий полного OAuth-теста (login → Google → callback → cookie → redirect).
- **Шаг 2:** Запустить OAuth live (локально или через test-токены).
- **Шаг 3:** Закоммитить согласованную группу:
  - `arkaim-web/src/app/login/page.tsx`
  - `arkaim-web/src/app/api/auth/google/route.ts`
  - `runtime/auth/routes.py` (hunk `google_callback` redirect)
  - `runtime/.env.example` (SESSION_SECRET-политика)
  - `docker-compose.yml` (безопасный дефолт)
- **Шаг 4:** Проверить SEC-6 (core/config.py:83) — синхронизировать с shared_config или оставить (решение владельца).

### 11.4 P3 — E (Mobile)

**Почему:**

- Mobile — автономный проект, не блокирует backend.
- Dev-login ссылается на удалённый эндпоинт — исправление простое.

**Как сделать:**

- **Шаг 1:** Исправить `arkaim-mobile/src/screens/login/LoginScreen.tsx` — убрать dev-login или переключить на существующий метод.
- **Шаг 2:** Проверить сборку (Expo).
- **Шаг 3:** Закоммитить согласованно (мобильный проект отдельный).

### 11.5 P4 — B (ComfyUI) и SEC-6 (core/config.py) — параллельно

**Почему:**

- Независимы друг от друга и от основных направлений.
- Можно делать вместе.

**Как сделать:**

- **B:** Решить (по OWNER-GO): подключить ComfyUI в main.py или оставить заглушкой.
- **SEC-6:** Убрать небезопасный дефолт `change-me-in-production` из `core/config.py:83`.

### 11.6 P5 — D (Genome дедупликация) — параллельно или отложить до G-1

**Почему:**

- 47 файлов → 7 уникальных MD5 — дедупликация технически простая, но не блокирует.
- Можно отложить до G-1 (публикация).

### 11.7 P6 — G-1 (Публикация) — ПОСЛЕ стабилизации

**Условия:**

- Green baseline (N-2) ✅
- A (OAuth) ✅
- SEC-6 (core/config.py) ✅
- C (KNOWLEDGE) — решение принято
- D (Genome) — дедупликация

**STOP GATE: OWNER-GO по G-1 (§15.4, §15.3.6).**

---

## 12. Что откладывать и что не делать сейчас

| Что | Приоритет | Почему |
|---|---|---|
| **B (ComfyUI live)** | Низкий | Media-направление, не блокирует ядро; OWNER-GO B |
| **D (Genome дедупл.)** | Низкий | Техническая задача, не блокирует |
| **C (KNOWLEDGE-редактура)** | Высокий, но НЕ сейчас | Отдельный трек Knowledge Core; P0 — только обнуление пустых confidence |
| **Новые M-этапы (M8, M9)** | Отложено | По ARKAIM_PROJECT_STATE — foundations закрыты, новые мутации — по OWNER-GO |
| **Pulse evolution** | Отложено | Не блокирует ядро |

---

## 13. Риски потери или повреждения ценных данных

| Файл | Риск | Митигация |
|---|---|---|
| `core/KNOWLEDGE/*.json` (8 изменённых) | WIP, не закоммичены; могут быть случайно перезаписаны | Не трогать; если коммитим — только согласованную группу |
| `core/CHROMA_DB` (20 МБ) | Не отслеживается git (binary); потеря при ошибке | Резервная копия содержит; при сборке — проверить |
| `core/CORE/narrative_engine/data/WORLD_MODEL.json.backup_20261029_141101` | Дубль текущего (размер разный — 31163 vs 35339) | Не в репо (E-7, реестр) |
| `arkaim-mobile/**` (dev-login сломан) | Приложение не функционально | E (P3) |
| `runtime/test_output.txt`, `test_access.txt`, `scan_*.py` | Мусор-артефакты | E-3 (гигиена, G-1) |
| `.auth-history-dev-cookies.txt` (admin-JWT) | Секрет, но истёк | E-1 (исключить из публикации) |

---

## 14. Единый следующий шаг — P0: Завершить полный прогон + Обнулить пустые confidence

> ✅ **Статус 2026-11-01 (KNOWLEDGE-C):** (а) полный прогон повторён после исправления; (б) **выполнено для `SCREENPLAY_DIALOGUES.json`** (3 пустые записи → `confidence 0.0`); для `COSMOLOGY`/`THEMES_EXPANDED`/`SYMBOLS_DEEP`/`PSYCHOLOGY` решение НЕ принималось — у них `layers.literal` заполнен (см. §11.1 Вариант 1), вопрос оставлен владельцу; (в) `test_g1_archaeology_claims.py` — проходит. Подробности — §15.

**Решение владельца требуется для:**

- **(а) Green baseline** — запустить полный прогон и зафиксировать карту.
- **(б) Обнулить пустые KNOWLEDGE** — в пустых записях (`COSMOLOGY`, `THEMES_EXPANDED`, `SYMBOLS_DEEP`, `SCREENPLAY_DIALOGUES`) — `confidence: 0.0` (не удалять, не повышать до канона, не менять контент). Это **малый объём**, согласуется с ориентиром C («не считать авторски утверждёнными»). *(`SCREENPLAY_DIALOGUES` ✅ выполнен 2026-11-01; для остальных трёх + `PSYCHOLOGY` уточнено: контент в `layers` — решение за владельцем.)*
- **(в) Green baseline** — подтвердить, что `test_g1_archaeology_claims.py` проходит.

**Результат:** Backend-тесты **100% проходят** → можно двигаться к P2 (A: OAuth).

**После:** P2 (A) → P3 (E) → P4 (B, SEC-6, параллельно) → P5 (D) → P6 (G-1).

---

## 15. KNOWLEDGE-C — исправление 8 падающих тестов (2026-11-01, OWNER-GO: A1 + B1)

**Решения владельца:** A1 — удалить пустые зеркала (точное восстановление G1.4); B1 — зарегистрировать `SCREENPLAY_DIALOGUES.json` в `PLAIN_LIST_REGISTERS` + реестре классификации, обнулить `confidence` у 3 пустых записей. Тесты не ослаблялись, формат JSON-массива сохранён (не оборачивался в `{items, item_count}`).

| Что | Сделано |
|---|---|
| `ARCHAEOLOGY_DEEP.json` (A1) | 8 → **1 запись**: удалены 7 пустых зеркал (`ARCHAEOLOGY.json.sites[0..6]`, `content: ""`, `confidence: 1.0`); в `_provenance_metadata.notes` дописана история удаления (регрессия `dac1116`, восстановлено G1.4) |
| `GEOGRAPHY.json` (A1) | 19 → **17 записей**: удалены 2 пустых зеркала (`sites[3]`, `sites[4]`); история удаления — в `notes` |
| `SCREENPLAY_DIALOGUES.json` (B1) | формат **не изменён** (JSON-массив, 7 записей сохранены); у 3 пустых записей `confidence` → `0.0` (записи НЕ удалялись — по §11.1/§14 «(б)»); 4 записи с контентом не тронуты |
| `test_milestone_b.py` (B1) | `SCREENPLAY_DIALOGUES.json` добавлен в `PLAIN_LIST_REGISTERS` с документированным обоснованием: массив не может нести файл-уровневый `_provenance_metadata`, обёртка запрещена guard'ом — это **регистрация ограничения формата готовым механизмом**, не ослабление проверки |
| `test_provenance_registry_consistency.py` | `SCREENPLAY_DIALOGUES.json` **добавлен** в параметры `test_top_level_arrays_stay_arrays` — усиление guard'а: массив защищён от будущей обёртки |
| `knowledge_classification.py` (реестр) | новая запись: `DERIVED`, `is_canon=False`, `requires_author_review=True` (ориентир C — не считать авторски утверждённым), описание контракта хранения |
| Целевые тесты | 3 файла (`test_g1_archaeology_claims`, `test_milestone_b`, `test_provenance_registry_consistency`): **8/8 падений закрыты** (53 passed, 1 skipped) |
| Полный backend-прогон | **3103 passed, 2 failed, 26 skipped, 2 deselected** (680 с, 2026-11-01). Исходные 8 FAIL → **0**. **2 оставшихся FAIL — pre-existing и НЕ относятся к KNOWLEDGE-C**: `test_knowledge_card_book_os.py::test_book_os_claims_in_card` и `::test_book_os_fact_store_by_entity` — проверено эмпирически: на чистом HEAD (мои 6 файлов временно откатены) эти же 2 теста падают. Причина — локальный корпус `core/OS_DATA/graph` (gitignored, наполняется ingest-пайплайном): сущность «Аркаим» есть, фактов для неё нет. Вероятно, на прогонах 2026-10-30 эти тесты пропускались (корпус отсутствовал) — точный пересчёт старых skipped-чисел в документах неоднозначен |
| `ruff check` | ✅ `cd runtime && ruff check .` → **All checks passed**; отдельно `core/CORE/narrative_engine/provenance/knowledge_classification.py` → **All checks passed** |

**Что НЕ делалось (границы):** тесты не ослаблялись и не удалялись; DERIVED/реконструкции не повышались до CANON; пустые записи `SCREENPLAY_DIALOGUES` не удалялись; `COSMOLOGY`/`PSYCHOLOGY`/`SYMBOLS_DEEP`/`THEMES_EXPANDED` не трогались (контент у них в `layers`, решение «(б)» — за владельцем, §14); push/GitHub не выполнялись; старый проект `C:\proect_arkaim\arkaim` не изменялся.
