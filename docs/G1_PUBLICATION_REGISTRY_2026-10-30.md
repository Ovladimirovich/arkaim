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

---

## 1. Реестр СОХРАНЯЕМЫХ материалов (состав будущей публикации)

| # | Что | Где | Статус для G-1 |
|---|---|---|---|
| S-1 | Знания книги | `core/KNOWLEDGE/*.json` (56 файлов) | включить после тех. чистки путей (см. §4) |
| S-2 | Диалоги сценария | `core/KNOWLEDGE/SCREENPLAY_DIALOGUES.json` (untracked) | включить после чистки путей + ревью (OWNER-GO C) |
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
| P-5 | `core/KNOWLEDGE/SCREENPLAY_DIALOGUES.json` | 7 | ✅ **Замещено и закоммичено** (`dac1116`, то же замечание; пустой каркас включён в tracked) |
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
| 15.3.5 Документация | Частично: README_BRIEF, отчёты; README.md требует обновления | сверить с фактом |
| 15.3.6 Первая публикация | STOP GATE OPEN — **запрещено** | ждать OWNER-GO |

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
