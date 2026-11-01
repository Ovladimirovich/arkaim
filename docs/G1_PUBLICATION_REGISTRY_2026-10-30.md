# G-1 — Единый реестр подготовки к полному воссозданию GitHub

> **Дата:** 2026-10-30
> **Статус:** рабочий документ-реестр (инвентаризация), подготовлен до запуска G-1.
> **Является:** консолидированным срезом — сводит инвентаризацию (этот сеанс), стратегию `docs/ARKAIM_KNOWLEDGE_DEVELOPMENT_PLAN.md §15` (2026-10-30) и статус `docs/WIP_LEDGER.md`.
> **Правила:** работа локальная, push/pull/PR запрещены; G-1 запускается ТОЛЬКО по явному OWNER-GO и после стабилизации локального состояния (§15.4 — STOP GATE OPEN).
> **Ориентиры владельца A–E (2026-10-30, подготовительные, НЕ разрешение на удаление/изменение/публикацию):**
> - **A** Google OAuth — сохранить локально, перед публикацией проверить полный сценарий.
> - **B** неподключённая ComfyUI-заглушка — не включать в основную публикацию; сохранить отдельно.
> - **C** все KNOWLEDGE-интерпретации — сохранить, НЕ считать авторски утверждёнными; не удалять и не повышать до канона.
> - **D** подготовить дедуплицированный GENOME/history для публикации; оригиналы сохранить в резервной копии.
> - **E** мобильный проект НЕ исключать автоматически; проверить и исправить ссылку на удалённый dev-login, проверить сборку.

---

## 0. Сводка состояния (2026-10-30)

| Позиция | Значение |
|---|---|
| Локальная ветка | `master` |
| Локальный HEAD | `3e252a2` (SEC-6 корневой `.env.example`, закрыт) → `d49466a` (блок A: OAuth-цепь + SESSION_SECRET placeholder-политика) → `dac1116` (KNOWLEDGE P-1…P-5) → `41a2e1f` (SEC-6 `core/config.py`) → `2af923f` (S-2) |
| `origin/master` | `966be26` — НЕ целевое состояние (расхождение не гонится) |
| Расхождение | `master` впереди `origin/master` на 10 коммитов (5 WIP + S-2 + 4 согласованных G-1-коммита: KNOWLEDGE, SEC-6, блок A, SEC-6 корневой `.env.example`); push/pull/PR запрещены |
| Резервная копия | ✅ `C:\proect_arkaim\Arkaim_Backup_2026-10-30` (проверена, идентична: 137216 файлов, `.git` цел, `fsck` чист) |
| S-2 | ✅ **ПРИНЯТА** (OWNER-GO от 2026-10-30, коммит `2af923f`); целевые проверки пройдены; **полный прогон тестов завершён (2026-10-30): 3096 passed, 8 failed, 26 skipped** (8 FAIL-ов — только KNOWLEDGE-данные, направление C); остатки `.env.example`/`docker-compose.yml` → закрыты блоком A (`d49466a`) + корневой `.env.example` (`3e252a2`) |
| G-1 STOP GATE | **OPEN** — публикация запрещена до OWNER-GO |
| Секреты запущенные в дереве | 1 (cookies admin-JWT, истёк 27.09.2026, не используется в коде) — риск `core/config.py:83` устранён (`41a2e1f`) и корневой `.env.example` (`3e252a2`), секретов-заглушек в конфиге не осталось |
| KNOWLEDGE-C | ✅ **ЗАКРЫТ (2026-11-01, OWNER-GO: A1+B1)** — 8 backend-FAIL исправлены (см. §12); полный прогон 2026-11-01: **3103 passed, 2 failed (pre-existing `core/OS_DATA`, доказано на чистом HEAD), 26 skipped**; `ruff` — чисто; push не выполнялся |
| Book OS пересборка | ✅ **ЗАКРЫТА (2026-11-01, OWNER-GO «локальная пересборка»)** — штатный ingest `SOURCE_OF_TRUTH/BOOK/КНИГА.md` (+192 сущности, +157 фактов, +300 связей; старые 166 сущностей сохранены — аддитивно), бэкап `OS_DATA/graph` до пересборки; 2 оставшихся pre-existing FAIL закрыты; полный прогон 2026-11-01: **3105 passed, 0 failed, 26 skipped**; `OS_DATA`/`CHROMA_DB` gitignored — в git только эта запись |

---

## 1. Реестр СОХРАНЯЕМЫХ материалов (состав будущей публикации)

| # | Что | Где | Статус для G-1 |
|---|---|---|---|
| S-1 | Знания книги | `core/KNOWLEDGE/*.json` (56 файлов) | включить после тех. чистки путей (см. §4) |
| S-2 | Диалоги сценария | `core/KNOWLEDGE/SCREENPLAY_DIALOGUES.json` (tracked; 7 записей: 4 с контентом, 3 пустых — `confidence 0.0` c 2026-11-01, KNOWLEDGE-C B1) | включить после чистки путей + ревью (OWNER-GO C) |
| S-3 | Геном актуальный | `core/GENOME/CURRENT/*` (20) + `core/GENOME/GENOME_v1.0.0.json` | включить |
| S-4 | Геном-история | `core/CORE/genome/history/` (46 файлов) | дедупликация → 6 уникальных (OWNER-GO D) |
| S-5 | Первоисточник | `core/SOURCE_OF_TRUTH/**` (книга, синопсис, примечания) | включить |
| S-6 | Ядро | `core/CORE/**` (Pulse, Narrative, Media, World, Knowledge) | включить |
| S-7 | Бэкенд | `runtime/**` (FastAPI) | включить (см. импорты §5) |
| S-8 | Фронтенд | `arkaim-web/**` (единственный действующий) | включить |
| S-9 | Мобайл | `arkaim-mobile/**` | включить после OWNER-GO E (dev-login) |
| S-10 | CI/конфиг | `.github/**`, `Makefile`, `Dockerfile.*`, `docker-compose.yml` | включить (после согласования OAuth env, OWNER-GO A) |
| S-11 | Схемы/скрипты | `SCHEMAS/**`, `scripts/**` | включить |
| S-12 | Документация актуальная | `docs/**` (не архив) | включить |
| S-13 | Док-архив история | `docs/archive/**` | включить как архив (или решить отдельно) |
| S-14 | Проектные .md в корне | `README_BRIEF_2026-10-30.md`, отчёты (ARKAIM_CONCEPT, REPORT) | перенести в docs при сборке; решение ниже |
| S-15 | Резервная копия | `C:\proect_arkaim\Arkaim_Backup_2026-10-30` | НЕ в репозиторий; хранится отдельно от рабочей папки |

---

## 2. Реестр ИСКЛЮЧАЕМЫХ материалов (не войдут в публикацию)

| # | Что | Причина | Действие |
|---|---|---|---|
| E-1 | `arkaim-web/tests/.auth-history-dev-cookies.txt` | admin-JWT (истёк, но секрет) | исключить из новой истории; добавить в `.gitignore` |
| E-2 | `_validate_out.txt` (в корне, tracked) | лог валидации | убрать из дерева/истории при сборке |
| E-3 | `backend_baseline.pid`, `frontend_baseline.pid` | пустые PID-файлы (уже отсутствуют — процессы закрылись) | в `.gitignore` |
| E-4 | `runtime/test_output.txt`, `test_access.txt` | вывод тестов / пробник | в `.gitignore` |
| E-5 | `scan_refs.py`, `scan_terms.py`, `scan_terms.ps1` | одноразовая разведка, Windows-путь | в `.gitignore` |
| E-6 | `s -ExecutionPolicy RemoteSigned) ; (& c...ps1` | обрывок PS-команды | ✅ **Исключено** (файл удалён с диска 2026-10-30; был untracked) |
| E-7 | `core/CORE/narrative_engine/data/WORLD_MODEL.json.backup_20261029_141101` | идентичен текущему (только `updated_at`) | не в репо (в бэкапе сохранён) |
| E-8 | `node_modules/`, `.venv/`, `.next/`, `.pytest_cache/`, `.kilo/node_modules`, `.mimocode/` | тяжёлые артефакты | уже в `.gitignore` |
| E-9 | `.env` (runtime + core, реальные) | секреты | уже в `.gitignore` |
| E-10 | Корневой `АУДИТ_ARKAIM.md` | кириллич. имя, дубль | перенести в `docs/archive/` при сборке |

---

## 3. Реестр СЕКРЕТОВ и чувствительных данных (аудит)

| # | Находка | Оценка | Статус |
|---|---|---|---|
| SEC-1 | admin-JWT в `arkaim-web/tests/.auth-history-dev-cookies.txt` | истёк 27.09.2026; role=admin; provider=telegram; не используется в коде; подписан тестовым секретом | **отзыв не требуется**; исключить из публикации (E-1) |
| SEC-2 | Реальных туннельных URL (ngrok/cloudflare) | не найдено — только плейсхолдеры `xxx/abc123` в док-ах | чисто |
| SEC-3 | Реальные ключи/токены в дереве master | не найдено (только имена переменных + test-заглушки CI) | чисто |
| SEC-4 | `.env.example` (оба) | заглушки + пустой `SESSION_SECRET` (S-2 placeholder-политика); OAuth-заглушки в `runtime/.env.example` — WIP направления A | чисто, публиковать |
| SEC-5 | CI `${{ secrets.* }}` | корректно | чисто |
| SEC-6 | **Риск: `core/config.py:83` (контур Book Intelligence)** — отдельная копия `SESSION_SECRET = os.getenv(..., "change-me-in-production")` с небезопасным дефолтом; НЕ покрыт fail-fast S-2 | ✅ **УСТРАНЕНО ПОЛНОСТЬЮ (2026-10-30)**: (1) `core/config.py:83` → `""` (`41a2e1f`); (2) **корневой `.env.example` (tracked, `SESSION_SECRET=change-me-in-production` + legacy Hermes-секции) — ✅ ЗАКРЫТ отдельным коммитом `3e252a2`**: дефолт → пусто + комментарий S-2 fail-fast (канон `runtime/.env.example`), legacy `HERMES_URL`/`HERMES_API_KEY` удалены (HERMES_API_KEY остаётся активным в service-auth, но в scope `runtime/.env.example`, функциональность не удалена). Технических открытых остатков SEC-6 НЕТ |

---

## 4. Реестр АБСОЛЮТНЫХ ПУТЕЙ (замена перед публикацией)

| # | Файл | Вхождений | Предлагаемая замена |
|---|---|---|---|
| P-1 | `core/KNOWLEDGE/ARCHAEOLOGY_DEEP.json` | 7 | ✅ **Замещено и закоммичено** (`dac1116`) — машинная замена `C:\proect_arkaim\arkaim\core\KNOWLEDGE\` → `core\KNOWLEDGE\`, JSON-валидность подтверждена. ЗАМЕЧАНИЕ: в коммит попали также предсуществующие незакоммиченные KNOWLEDGE-изменения WIP-группы C (см. W-3 ниже) — их отдельное коммитирование НЕ выполнялось |
| P-2 | `core/KNOWLEDGE/COSMOLOGY.json` | 2 | ✅ **Замещено и закоммичено** (`dac1116`, то же замечание) |
| P-3 | `core/KNOWLEDGE/GEOGRAPHY.json` | 2 | ✅ **Замещено и закоммичено** (`dac1116`, то же замечание) |
| P-4 | `core/KNOWLEDGE/THEMES_EXPANDED.json` | 2 | ✅ **Замещено и закоммичено** (`dac1116`, то же замечание) |
| P-5 | `core/KNOWLEDGE/SCREENPLAY_DIALOGUES.json` | 7 | ✅ **Замещено и закоммичено** (`dac1116`, то же замечание; каркас включён в tracked) — *уточнено 2026-11-01: это был НЕ пустой каркас: 4 из 7 записей содержат контент из `screenplay_extracts.json`; 3 пустые — `confidence 0.0` (KNOWLEDGE-C B1)* |
| P-6 | `.clinerules/project-map.md` | 1 | ✅ **Замещено при сборке** (`C:\proect_arkaim\arkaim` → `.`) |
| P-7 | `docs/MEDIA_PRODUCTION_MASTERPLAN_APPROVAL_2026-10-22.md` | 1 | ✅ **Замещено при сборке** (арх. путь → `<repo-root>`, `arkaim-media` → `<adjacent-repo:arkaim-media>`) |
| P-8 | `docs/archive/md-line/*` (4 файла) | по 1 | ✅ **Замещено при сборке** (MD4_M41, MD4_M42_2, FORENSIC_AUDIT_POST_MD5; MD4_PRE без абс. пути) |
| P-9 | `АУДИТ_ARKAIM.md` | 1 | ✅ **Перенесено** → `docs/archive/ARKAIM_AUDIT_ORIGIN.md` + абс. пути заменены |

> **Прогресс §4:** P-1…P-5 закрыты коммитом `dac1116` (20 вхождений, только технические, контент не тронут). P-6…P-9 закрыты при сборке `arkaim-book` (2026-10-30).

> **Принципы:** тех. очистка путей = машинная замена, НЕ трогает контент. Авторское утверждение интерпретаций (SYSTEM_INTERPRETATION) — отдельно, по OWNER-GO C. Не переписывать и не удалять неподтверждённые материалы.

---

## 5. Реестр НЕЗАВЕРШЁННЫХ НАПРАВЛЕНИЙ (требуют решения/доводки)

| # | Направление | Тех. статус | Продукт. решение | Владелец |
|---|---|---|---|---|
| W-1 | **Google OAuth** (кнопка, `route.ts`, docker env, redirect `/profile`) | ✅ **Цепь закоммичена** (`d49466a`, блок A): `arkaim-web/src/app/login/page.tsx` (кнопка), `arkaim-web/src/app/api/auth/google/route.ts` (untracked → tracked), `runtime/auth/routes.py` (redirect `/profile`), `docker-compose.yml` (env), `runtime/.env.example` (OAuth-секция + SESSION_SECRET-политика). **Live-прогон полного сценария НЕ выполнен** (требует Google-credentials) | **ориентир A**: сохранить локально; перед публикацией проверить полный сценарий (live-проверка с credentials — остаток до публикации) | OWNER-GO A |
| W-2 | **ComfyUI** (`runtime/core/routes/comfyui.py` — config/status) | заглушка, НЕ подключена в `main.py`; MediaPlanBuilder использует `comfyui` только как промпт-шаблон | **ориентир B**: НЕ в основную публикацию; сохранить отдельно | OWNER-GO B (= ledger OWNER-GO-2) |
| W-3 | **KNOWLEDGE интерпретации** (SYSTEM_INTERPRETATION, requires_author_review) | добавлены тех. корректно; ⚠️ предсуществующие незакоммиченные KNOWLEDGE-изменения WIP-группы C (данные + форматирование: `ARCHAEOLOGY_DEEP`, `COSMOLOGY`, `GEOGRAPHY`, `THEMES_EXPANDED`, `SCREENPLAY_DIALOGUES`) вместе с P-1…P-5 закоммичены в `dac1116` (факт зафиксирован в §4); в рабочем дереве остались 3 файла группы C: `CROSS_REFERENCES_DEEP`, `PHILOSOPHY_DEEP`, `SYMBOLS_DEEP` (форматирование) | **ориентир C**: сохранить, НЕ считать авторски утверждёнными; не удалять, не повышать до канона | OWNER-GO C |
| W-4 | **Относительные импорты** (`orchestrator`, `provider_registry`) | ✅ **ЗАКРЫТО (2026-10-30, подтверждено прогоном)**: (1) импорт-проверка в пакетном режиме `cd runtime && python -c "import core.orchestrator, core.provider_registry"` → OK; (2) полный прогон `runtime/tests/` (676 c, 3106 collected): все модули с соответствующими тестами PASSED — `test_provider_registry` (6/6), `test_provider_fallback` (4/4), изоляционные тесты (`test_core_does_not_import_gateway`, `test_gateway_does_not_import_core_orchestrator`, `test_core_orchestrator_no_gateway` и др.) PASSED. **Ни один из 8 FAIL-ов не относится к импортам** (все 8 — KNOWLEDGE-данные, см. ниже) | ✅ **Включать в публикацию — подтверждено тестами** | — (тех., закрыто) |
| W-5 | **arkaim-mobile dev-login** (`LoginScreen.tsx` вызывает удалённый эндпоинт) | **Установлено (2026-10-30, без изменения кода):** `arkaim-mobile` входит в состав публикации (S-9, ориентир E). Механизм авторизации mobile: (a) основной — **ввод токена** (`POST /api/auth/login` с `token`, токен выдаётся через Telegram-бота или email-регистрацию — footer-подпись экрана входа), (b) **dev-кнопка** `handleDevLogin` → `POST /api/auth/dev-login` (`LoginScreen.tsx:17`) — **бьёт в удалённый/закрытый эндпоинт** (S-1: `/auth/dev/generate-token` за `DEV_AUTH_ENABLED`, дефолт off). Сборка: `npx tsc --noEmit` → 4 ошибок `Cannot find module '../../shared/api'` (нет `index.ts`-баррела; есть `api/client.ts`) — **предсуществующий, НЕ от dev-login**. Решение (удалить/переключить dev-кнопку) — НЕ принимается автоматически | **ориентир E**: НЕ исключать автоматически; проверка механизмов выполнена; **решение по dev-кнопке — OWNER-GO E**; tsc-сбой баррела `shared/api` — отдельная техническая фиксация | OWNER-GO E |
| W-6 | **SESSION_SECRET-политика (S-2)** | ✅ **ПРИНЯТА (OWNER-GO 2026-10-30, вариант A)** — коммит `2af923f`; fail-fast при старте `core.main`; откл. `None`/пусто/заглушки/<32 симв.; целевые проверки пройдены | ✅ **Остаток ЗАКРЫТ ПОЛНОСТЬЮ (2026-10-30)**: (1) placeholder `.env.example` (runtime) + дефолт `docker-compose` + Google OAuth-цепь — **коммит `d49466a`** (блок A); (2) **корневой `.env.example` (legacy Hermes-секции, дефолт `SESSION_SECRET=change-me-in-production`) — ✅ закрыт отдельным коммитом `3e252a2`**. Единственный остаток: live-проверка полного OAuth-сценария (W-1, требует Google-credentials); полный прогон тестов завершён (см. §6) | OWNER-GO-1 (выполнен, вариант A) |
| W-7 | **WIP-группы ledger (A–H)** | сохраняются, не удаляются | сходятся в G-1 подшаге 15.3.1 | — |
| W-8 | **Геном-история дубли** | 46 файлов → 6 уникальных | **ориентир D**: подготовить дедуплицированный вариант для публикации; оригиналы — в резервной копии | OWNER-GO D |

---

## 6. Карта действий G-1 (по подшагам §15.3) — с фактической проработанностью

| Подшаг G-1 (§15.3) | Статус на 2026-10-30 | Осталось |
|---|---|---|
| 15.3.1 Инвентаризация | **Выполнена** (этот реестр + `docs/ARKAIM_KNOWLEDGE_DEVELOPMENT_PLAN.md §15`) | — |
| 15.3.2 Состав публикации | **Черновик готов** (§1–§2); SEC-6 закрыт (`41a2e1f`), E-6 исключено, P-1…P-5 закоммичены (`dac1116`), блок A закоммичен (`d49466a`) | принять OWNER |
| 15.3.3 Аудит секретов | **Проведён** (§3): 1 секрет, план исключения готов; SEC-6 закрыт | выполнить исключение E-1…E-5, E-10 при сборке |
| 15.3.4 Воспроизводимая установка | ✅ **ЗАКРЫТО (2026-10-30)**: S-2 (`2af923f`), SEC-6 (`41a2e1f` + корневой `.env.example` `3e252a2`), блок A — OAuth-цепь + `runtime/.env.example` + `docker-compose` (`d49466a`) | live-проверка полного OAuth-сценария (требует Google-credentials) — остаток W-1 |
| 15.3.5 Документация | ✅ **Обновлено в arkaim-book**: README.md (пометка репо + CI-badge `arkaim-book`), CHANGELOG.md (G-1-вход), AGENTS.md (пометка чистого снимка), `docs/G1_PUBLICATION_REGISTRY_2026-10-30.md` и `docs/ARKAIM_DEVELOPMENT_MAP_2026-10-30.md` включены | сверить с фактом |
| 15.3.6 Первая публикация | ✅ **Собрано локально (`arkaim-book`, 2026-10-30)**: `git init` + одиночный смысловой коммит `81069d0`; исключение E-1…E-5/E-10, P-6…P-9, W-8 (46→6), `.gitignore`, секреты чисты; W-1/W-5/KNOWLEDGE-C сохранены как open items | публикация (push) — только по финальному OWNER-GO |

---

## 7. Предварительная структура нового репозитория

```
arkaim-book/                     # новая чистая история
├── README.md / CHANGELOG / LICENSE / AGENTS.md / CONTRIBUTING.md
├── .github/                     # CI + SECURITY + шаблоны
├── .gitignore                   # обновлённый (E-1..E-6, scan_*, pid)
├── .clinerules/                 # или исключить (по реш. владельца)
├── core/
│   ├── SOURCE_OF_TRUTH/         # книга — первоисточник
│   ├── KNOWLEDGE/               # знания (+SCREENPLAY после чистки)
│   ├── GENOME/                  # CURRENT + v1.0.0 (дедупл. history)
│   └── CORE/                    # Pulse, Narrative, Media, World Engine
├── runtime/                     # FastAPI backend
├── arkaim-web/                  # Next.js frontend
├── arkaim-mobile/               # Expo (после OWNER-GO E)
├── docs/
│   ├── (актуальные*)            # планы, WIP_LEDGER, состояние
│   └── archive/                 # исторические отчёты
├── SCHEMAS/  scripts/  notebooks/
├── Makefile  Dockerfile.*  docker-compose.yml  start/stop (в scripts/)
```

---

## 8. ОТКРЫТЫЕ РЕШЕНИЯ (OWNER-GO) — единый список

| # | Вопрос | Варианты | Откуда |
|---|---|---|---|
| GO-1 | Запуск **S-2** (SESSION_SECRET fail-fast, deploy-конфиг, placeholder-политика) | (а) GO / (б) отложить | параллельный инженер §15.4 |
| GO-A | Google OAuth (W-1) | **ориентир A зафиксирован**: сохранить локально → проверить полный сценарий перед публикацией | этот сеанс (W-1) |
| GO-B | ComfyUI (W-2) | **ориентир B зафиксирован**: не в основную публикацию; сохранить отдельно (= OWNER-GO-2) | этот сеанс (W-2) |
| GO-C | KNOWLEDGE-интерпретации (W-3) | **ориентир C зафиксирован**: сохранить, не считать утверждёнными, не удалять | этот сеанс (W-3) |
| GO-D | Геном-история (W-8) | **ориентир D зафиксирован**: дедуплицированный вариант → публикация, оригиналы → бэкап | этот сеанс (W-8) |
| GO-E | arkaim-mobile (W-5) | **ориентир E зафиксирован**: не исключать; исправить dev-login, проверить сборку | этот сеанс (W-5) |
| GO-X | Способ G-1: (а) обновить существующий arkaim-book / (б) новый репозиторий / (в) другое | а/б/в | параллельный §15.4 GO-2 (только при запуске G-1) |

---

## 9. Ближайший следующий этап (после решений)

1. **S-2** (по GO-1): ✅ **ВЫПОЛНЕНО** (коммит `2af923f`; placeholder-политика `.env.example` + `docker-compose` → блок A, коммит `d49466a`).
2. По GO-A…E: финализация состава публикации.
   - **Блок A (W-1/W-6/SEC-6 остаток):** ✅ **закрыт полностью** — OAuth-цепь + SESSION_SECRET-политика (runtime) в `d49466a`; **корневой `.env.example`** (legacy Hermes-секции + дефолт `change-me-in-production`) — ✅ закрыт отдельным коммитом `3e252a2`. Остаток блока A: live-проверка полного OAuth-сценария (требует Google-credentials). **SEC-6 закрыт полностью, технических открытых остатков нет.**
   - **W-4 (относительные импорты):** ✅ **ЗАКРЫТО прогоном 2026-10-30**: полный прогон `runtime/tests/` (3106 collected, 676 c) — **3096 passed, 8 failed, 26 skipped**; W-4 подтверждён (импорт-проверка + `test_provider_registry`/`test_provider_fallback`/изолированные тесты PASSED). Все 8 FAIL-ов — только KNOWLEDGE-данные (направление C, W-3): `test_g1_archaeology_claims` (4, пустые записи `ARCHAEOLOGY_DEEP`/`GEOGRAPHY`), `test_milestone_b` (3, provenance-метаданные), `test_provenance_registry_consistency` (1). Не относятся к импортам/секретам.
   - **W-5 (mobile):** проверка механизмов авторизации выполнена (см. §5 W-5): основной — токен (`/api/auth/login`), dev-кнопка — битая; tsc-сбой баррела `shared/api` (4 ошибки, предсуществующий). **Решение по dev-кнопке + фиксация barrel-импорта — OWNER-GO E.**
3. По стабилизации и явному триггеру: **G-1** — сборка чистой истории (исключения E-1…E-5, E-10; замена путей P-6…P-9; дедупликация W-8; структура §7) → локальный прогон → публикация (только по финальному OWNER-GO).

## 10. Дальняя перспектива

Локальная стабилизация (S-2 → бэклог A–H) → чистый checkpoint с зелёным baseline → **G-1** (свободный от секретов, воспроизводимый снимок) → дальнейшая разработка локально по §15.2, публикация — управляемые этапы по решению владельца. Knowledge Core — отдельный трек (M1–M9 closed; новые мутации — по OWNER-GO).

## 11. Состояние сборки `arkaim-book` (2026-10-30, по OWNER-GO)

| Параметр | Значение |
|---|---|
| Путь репозитория | `C:\proect_arkaim\arkaim-book` (локальный, отдельный от `arkaim`) |
| Git-история | **чистая** — `git init` + один смысловой коммит `81069d0` (`feat(g1): initial arkaim-book clean snapshot`) |
| Файлов в индексе | **1907** (тяжёлые артефакты E-8 = 0; секреты E-9 = 0) |
| Исключения E-1…E-5, E-10 | ✅ применены (файлы физически отсутствуют в дереве/индексе; паттерны в `.gitignore`) |
| P-6…P-9 | ✅ заменены (`.clinerules/project-map.md`, `MEDIA_PRODUCTION`, `md-line/*`, `АУДИТ_ARKAIM.md` → `docs/archive/ARKAIM_AUDIT_ORIGIN.md`) |
| W-8 (Genome) | ✅ дедупликация: 46 файлов → 6 уникальных версий + `index.json` + 4 `.txt`-слоя |
| ComfyUI (W-2/B) | ✅ **не включён** в основную публикацию (`runtime/core/routes/comfyui.py` отсутствует; сохранён в бэкапе `Arkaim_Backup_2026-10-30`) |
| WORLD_MODEL backup (E-7) | ✅ не в репо (в бэкапе) |
| `.env.example` (корень + runtime) | ✅ включены; `docker-compose.yml` SESSION_SECRET → fail-fast |
| Проверки | ✅ `python -m py_compile` (main/config/shared_config) exit 0; ✅ JSON-валидность 74 файла KNOWLEDGE/GENOME = 0 ошибок; ✅ `git fsck` чист |
| Открытые (сохранены, не блокируют) | W-1 (live OAuth-сценарий), W-5 (mobile dev-login + tsc barrel); ~~KNOWLEDGE-C (8 FAIL-ов)~~ ✅ **закрыт 2026-11-01** (см. §12) |
| Публикация (push) | **НЕ выполнялась** — только по финальному OWNER-GO |

---

### 11.1 OWNER-GO A — локальная проверка воспроизводимости (`arkaim-book`, 2026-10-30)

**Контекст:** `arkaim-book` создан из `arkaim` через `git archive HEAD | tar -x` на Windows (bsdtar). При распаковке **все имена файлов с кириллицей были искажены** (mojibake): каждый UTF-8 байт кириллического имени превратился в символ бокс-рамки (`═`, U+2568/U+2550). Содержимое файлов не пострадало. Это привело к массовым FAIL-ам (код искал `КНИГА.md`, `lang_предыстория_человечества.json` и т.п., а на диске и в git-индексе лежали `═К═Н═И═Г═А.md`-подобные имена).

| Параметр | Результат |
|---|---|
| Окружение | свежий venv `runtime/.venv` Python 3.14.3, pip 26.2.2; `pip install -r requirements.txt` exit=0 |
| `runtime/.env` | создан локально (не коммитится): `SESSION_SECRET`, `PUBLIC_BASE_URL`, `FRONTEND_URL`, `CORS_ORIGINS`, `HERMES_API_KEY`, `TELEGRAM_BOT_TOKEN` (тест-значения) |
| **mojibake-имена** | **исправлены**: 453 файла переименованы по md5-совпадению содержимого с эталонным `arkaim` (0 без совпадения); в т.ч. `SOURCE_OF_TRUTH` (КНИГА.md, сценарий, 2 PDF) и 400+ карточек `entity_model/pilot/` |
| **CHROMA_DB** | восстановлен полной копией из `Arkaim_Backup_2026-10-30` (11 МБ, 36 каталогов HNSW); в git не войдёт (`.gitignore`, как в старом репо) |
| **backend-блокер** | устранён: `runtime/core/book_routes.py` — guarded-импорт исключённого `core/routes/comfyui.py` (без возврата модуля) |
| `lint-backend` | ✅ `ruff check .` — **All checks passed** (exit 0) |
| `test-backend` | ✅ **3091 passed, 31 skipped, 2 deselected**; ❌ **8 failed** — только известные KNOWLEDGE-C (`test_g1_archaeology_claims` 4, `test_milestone_b` 3, `test_provenance_registry_consistency` 1) |
| `lint-frontend` | ✅ `npm run lint` exit 0; ✅ `npx tsc --noEmit` exit 0 |
| `test-frontend` | ⚠️ vitest: **274 passed, 3 failed** (файл `auth-provider.test.tsx)` — это **pre-existing** W-5: тот же провал подтверждён в старом репо `arkaim` (3 failed, те же строки) → не ошибка воспроизводимости |
| live-запуск | ✅ `uvicorn core.main:app --port 8642` — старт успешен (`pulse_initialized`, `Application startup complete`) |
| live-маршруты | `/docs` 200 · `/openapi.json` 200 (322 КБ) · `/book/health` 200 `version 1.0.0` · `/health` 200 · `/book/genome|layers|chapters` 401 (нужна роль) · `/_ui/` 302 · **`/book/comfyui/status` 404 + отсутствует в openapi** (соответствует `test_no_comfyui_status`) |
| live xray | ⚠️ `/xray/traces` (защищённые) → 500 без авторизации. **Первопричина (уточнена 2026-11-01):** `protected_routes_middleware` (`runtime/core/middleware.py:66-76`) перебрасывает `HTTPException` (401/403) наружу из middleware — в Starlette он подхватывается только внешним `ServerErrorMiddleware`, поэтому 401 превращается в 500. Публичные `/xray/version`, `/xray/mode` → 200 (работают). Ранее диагностика «нет XRAY_TRACE_STORE_PATH» была **неверной** — это не блокер сборки; дефект pre-existing (код идентичен старому репо) |
| Git-индекс | обновлён: **457 rename + 1 modify (`book_routes.py`)**; 0 файлов с mojibake в новых именах; рабочие лог-файлы не включены |
| Публикация (push) | **НЕ выполнялась** — ждёт финального OWNER-GO |

**Итог OWNER-GO A:** воспроизводимость новой сборки подтверждена — backend собирается, lint/тесты проходят (кроме 8 известных FAIL направления C и pre-existing W-5 во frontend), live-запуск работает, ComfyUI корректно исключён. Исправление mojibake-имён (453 файла) — критически важный шаг, без него сборка нежизнеспособна.

---

### 11.2 Переход на новую рабочую точку `arkaim-book` — live-проверка (2026-11-01)

**Контекст:** `C:\proect_arkaim\arkaim-book` официально назначена единственной основной рабочей точкой; `C:\proect_arkaim\arkaim` — архив (только чтение). Проверена именно новая сборка. Публикация/переименование GitHub — НЕ выполнялись (нет OWNER-GO).

| Проверка | Результат |
|---|---|
| Рабочая точка | ветка `master`, HEAD `bfcad4a`, история 3 коммитов сохранена, remote не настроен, git status — только untracked рабочие логи |
| Границы проектов | старый `arkaim` не изменён (HEAD `3e252a2`, его локальный WIP не тронут); между проектами ничего не переносилось |
| backend live | ✅ `uvicorn 127.0.0.1:8642`, чистый старт: `provider_registered (gigachat, openrouter)`, `database_manager_initialized`, `book_os_provider_initialized`, `xray_mode mode=live`, **`pulse_initialized`**, `presence_initialized`, `telegram_bot_started`, **`knowledge_expansion_scheduled`**, `Application startup complete`; 0 ошибок приложения в логе |
| frontend live | ✅ Next.js 16.2.10 (Turbopack), `Ready in 1696ms`, `http://localhost:3000`; `/`, `/book`, `/login` → 200 с контентом и заголовком «Наследие Аркаима»; ошибок сборки нет |
| frontend→backend | ✅ прокси rewrites: `/book/health` через frontend → 200 `{"status":"ok","version":"1.0.0"}`; `/auth/me` → 401; `/health` через frontend → 404 (не в rewrites — это прямой backend-роут, напрямую 200) |
| health endpoints | ✅ `/health` 200 (`mode=live`, `trace_store=false`) · `/book/health` 200 · `/docs` 200 · `/openapi.json` 200 · `/book/genome\|layers\|chapters` 401 (роль) · `/book/comfyui/status` 404 + нет в openapi |
| Google OAuth — воспроизведение | `/auth/google` → **501 «Google OAuth не настроен»**; `/auth/google/callback` без code → **400 «Отсутствует code»**; с фиктивным code → **400 «GOOGLE_CLIENT_ID или GOOGLE_CLIENT_SECRET не задан»**. Прокси `/api/auth/google` (frontend) и `/auth/google` → 501 от backend — цепочка доходит |
| Google OAuth — первопричина | **отсутствуют `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`** в `runtime/.env` (читаются в `shared_config.py:136-137`, по умолчанию `""`). Поведение кода корректное (graceful 501/400). Это **конфигурация, не дефект кода** — восстановлена та же причина, что и в старой папке; ошибка НЕ перенесена, а воспроизведена заново |
| Google OAuth — конфигурация | `PUBLIC_BASE_URL=http://localhost:8642` → callback URL = `http://localhost:8642/auth/google/callback` ✅; `SESSION_SECRET` задан (64 символа) ✅; `redirect_uri` в `get_google_auth_url`/`exchange_code` одинаков |
| xray live | публичные `/xray/version`, `/xray/mode` → 200 ✅; защищённые `/xray/traces*` → 500 без auth — см. уточнённую диагностику в §11.1 (middleware re-raise; pre-existing, не блокер) |
| Code-level блокеров | **не обнаружено** — все найденные проблемы являются конфигурацией (Google credentials) или pre-existing дефектами, идентичными старому репо |

**Известные проблемы сохранены в учёте (НЕ объявлялись исправленными):**
- 8 backend FAIL направления KNOWLEDGE-C (`test_g1_archaeology_claims` 4, `test_milestone_b` 3, `test_provenance_registry_consistency` 1);
- 3 frontend FAIL `auth-provider.test.tsx` (pre-existing W-5, подтверждён в старом репо);
- Google OAuth не настроен (нет credentials) — живой сценарий требует OWNER-GO;
- `/xray/*` защищённые → 500 вместо 401 (pre-existing, `middleware.py:66-76`);
- `state` в OAuth-флоу Google не генерируется и не проверяется (`get_google_auth_url` без `state`) — security-замечание;
- кнопка «Войти через Google» на React-странице `/login` не скрывается при отсутствии OAuth-конфигурации (в `_ui`-HTML скрывается, в React — нет): клик даёт 501-JSON в браузере;
- `XRAY_TRACE_STORE_PATH` не задан (`trace_store=false`) — локальный артефакт, не в git.

**Git:** изменения этого шага — только документация реестра (§11.1 уточнение + §11.2). Код не менялся (code-level блокеров не найдено). Публикация (push) НЕ выполнялась.

---

## 12. KNOWLEDGE-C — закрытие 8 backend-FAIL (2026-11-01, OWNER-GO: A1 + B1)

**Диагноз (read-only, подтверждён):** все 8 падений — о данных, не о коде; две причины, обе — регрессии ранее закрытых дефектов.

| # | Причина | Затронутые тесты |
|---|---|---|
| 1 | **Возврат пустых зеркал** — регрессия `dac1116` (коммит «замена абсолютных путей» вернул старый WIP-контент: +7 пустых зеркал в `ARCHAEOLOGY_DEEP`, +2 в `GEOGRAPHY`), решение G1.4 (2026-10-22) было откатнуто | `test_g1_archaeology_claims` — 4 FAIL |
| 2 | **`SCREENPLAY_DIALOGUES.json` нигде не зарегистрирован** — ни в механизме исключений JSON-массивов, ни в реестре классификации; файл-уровневый `_provenance_metadata` на массиве физически невозможен | `test_milestone_b` — 3 FAIL, `test_provenance_registry_consistency` — 1 FAIL |

**Выполнено (OWNER-GO 2026-11-01):**

1. **A1** — удалены 9 пустых зеркал (`ARCHAEOLOGY_DEEP` 8→1, `GEOGRAPHY` 19→17). Это **восстановление решения G1.4**, а не новое удаление данных: удалена именно пустота с `confidence: 1.0` (ложное утверждение). История удаления (регрессия `dac1116`, дата) дописана в `_provenance_metadata.notes` обоих файлов. Живые записи не ссылались на удаляемые — потеря данных отсутствует.
2. **B1** — `SCREENPLAY_DIALOGUES.json`: формат JSON-массива **сохранён** (обёртка `{items, item_count}` запрещена — разрушительный `scripts/enrich_knowledge_provenance.py` удалён, guard `test_top_level_arrays_stay_arrays`); файл добавлен в `PLAIN_LIST_REGISTERS` (`test_milestone_b.py`) с документированным обоснованием; запись добавлена в `knowledge_classification.py`: **`DERIVED`, `is_canon=False`, `requires_author_review=True`** (ориентир C — не считать авторски утверждённым); у **3 пустых записей** `confidence` → `0.0` (записи **не удалялись** — выполнено предложение карты §11.1 «Вариант 1» / §14 «(б)» именно для этого файла); 4 записи с контентом не тронуты; файл **добавлен** в параметры `test_top_level_arrays_stay_arrays` (усиление guard'а формата).

**Проверки:** целевые 3 файла тестов — 8/8 закрыты (**53 passed, 1 skipped**); полный backend-прогон (2026-11-01, 680 с) — **3103 passed, 2 failed, 26 skipped, 2 deselected**: исходных 8 FAIL не осталось. `ruff check` (runtime + изменённый core-файл) — **All checks passed**. Оставшиеся 2 FAIL — `test_knowledge_card_book_os.py::test_book_os_claims_in_card`, `::test_book_os_fact_store_by_entity` — **pre-existing, доказано прогоном на чистом HEAD** (мои 6 файлов временно откатывались — тот же результат): это локальный генерируемый корпус `core/OS_DATA/graph` (gitignored), где у сущности «Аркаим» нет фактов. К KNOWLEDGE-C отношения не имеет; исправление — отдельная задача (пересборка ingest-пайплайном Book OS), решение — владельцу.

**Границы (соблюдены):** тесты не ослаблялись и не удалялись; формат массива не менялся; `DERIVED`/реконструкции не повышались до `CANON`; пустые записи `SCREENPLAY_DIALOGUES` не удалялись; `COSMOLOGY`/`PSYCHOLOGY`/`SYMBOLS_DEEP`/`THEMES_EXPANDED` не изменялись; push/GitHub не выполнялись; проект `C:\proect_arkaim\arkaim` не изменялся; посторонний WIP не правился.

**Открытый вопрос, зафиксирован отдельно (не блокирует):** в `COSMOLOGY` (15), `PSYCHOLOGY` (25), `SYMBOLS_DEEP` (14), `THEMES_EXPANDED` (15) есть записи с пустым `content`, но у **всех** них заполнен `layers.literal` при `confidence > 0` — то есть это не пустые утверждения, а записи, чей контент живёт в слоях. Формальное предложение §14 «(б)» (обнулить `confidence`) для этих файлов **НЕ выполнялось** и требует решения владельца: обнуление здесь уберёт обоснованную уверенность, а не ложную.

**Статус:** **DONE** по объёму A1+B1; итоговые PASS/PARTIAL — в отчёте этой сессии (по факту полного прогона).

**Дополнение (2026-11-01, OWNER-GO «локальная пересборка Book OS»):** оставшиеся 2 pre-existing FAIL устранены **не кодом, а восстановлением локального генерируемого корпуса**: выполнен бэкап `core/OS_DATA/graph` (`core/OS_DATA/_backup/graph_20261101_231109/` + копия во внешнем temp), затем штатный ingest `core/SOURCE_OF_TRUTH/BOOK/КНИГА.md` через `BookOSProvider.ingest_document` (тот же код, что CLI `book_os.cli ingest`): **+192 сущности, +157 фактов, +300 связей, 1 чанк**; существующие 166 сущностей `knowledge_*` **сохранены** (аддитивный режим, дубликаты имён — известный квирк `EntityExtractor`, не устранялся). У сущности «Аркаим» появились факты (`Тема 'Аркаим' раскрывается в главе КНИГА` — извлечённые пайплайном, не искусственные). Целевые тесты — **6 passed**, полный прогон — **3105 passed, 0 failed, 26 skipped, 2 deselected** (646 с). В git-commits попала только эта документация: `OS_DATA`/`CHROMA_DB` gitignored, содержимое корпуса — локальные генерируемые данные.

**Статус дополнения:** **DONE**; весь backend — **0 failed**.
