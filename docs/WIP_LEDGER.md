# WIP LEDGER — незакоммиченные направления (S-0, 2026-10-29)

> Этот журнал защищает незакоммиченные направления от случайного перезаписывания
> и фиксирует, что **нельзя** включать в security-коммит этапа S-1
> (закрытие серверного dev-auth, см. `план синхронизации...` и задачу P0).

## Правила
-_security-коммит S-1 содержит ТОЛЬКО согласованную группу файлов:_
  `runtime/auth/routes.py` (только dev-auth hunk), `runtime/shared_config.py`
  (новый флаг `DEV_AUTH_ENABLED`), `runtime/tests/test_dev_routes_disabled.py`.
- Каждая группа ниже остаётся в рабочем дереве, НЕ коммитится «заодно».
- До коммита группы — её WIP снимаем в patch/запасной файл, чтобы не потерять.

## Снимок `git status` (рабочее дерево на HEAD 3f2d28c)

### Изменённые (modified)
| Направление | Файлы | Статус | Правило для S-1 |
|---|---|---|---|
| Google OAuth | `arkaim-web/src/app/login/page.tsx`, `runtime/auth/routes.py` (hunk `google_callback` redirect на `/profile`), untracked `arkaim-web/src/app/api/auth/google/` | WIP, незавершено | НЕ входить в S-1; hunk routes.py изолируется patch-ом |
| Миграция на относительные импорты | `runtime/core/orchestrator.py`, `runtime/core/provider_registry.py` | частично (WIP) | НЕ входить в S-1; довести или откатить в этапе C-3 |
| Данные знаний (содержательные) | `core/KNOWLEDGE/ARCHAEOLOGY_DEEP.json` (+256), `COSMOLOGY.json` (+213), `THEMES_EXPANDED.json` (+213), `GEOGRAPHY.json` (+64) | WIP | НЕ входить в S-1; этап D-2 (библиография) |
| Данные знаний (форматирование) | `core/KNOWLEDGE/CROSS_REFERENCES_DEEP.json`, `PHILOSOPHY_DEEP.json`, `SYMBOLS_DEEP.json` | WIP | НЕ входить в S-1 |
| Компоновка/конфиг | `docker-compose.yml`, `runtime/.env.example` (изменили SESSION_SECRET-плейсхолдер и убили COMFYUI_URL) | WIP | НЕ входить в S-1; .env.example ждёт OWNER-GO-1 (SESSION_SECRET-политику) |

### Новые (untracked)
| Файл | Замечание |
|---|---|
| `runtime/core/routes/comfyui.py` | ComfyUI config/status заглушки; НЕ подключены в `main.py` (спят); судьба = OWNER-GO-2 |
| `core/KNOWLEDGE/SCREENPLAY_DIALOGUES.json` | данные знаний |
| `core/CORE/narrative_engine/data/WORLD_MODEL.json.backup_20261029_141101` | резервная копия World Model |
| `ARKAIM_CONCEPT.md`, `docs/archive/completed/ARKAIM_CONCEPT_RESEARCH_2026-10-29.md` | отчётные артефакты (`REPORT.md` удалён 2026-11-03 как устаревший P-отчёт) |
| `scan_refs.py`, `scan_terms.py`, `scan_terms.ps1`, `runtime/fix_routes.py`, `runtime/fix_tests2.py`…`fix_tests4.py`, `runtime/test_output.txt` | scratch-скрипты (гигиена = этап E-3) |
| `план синхронизации локальной разработки и GitHub.md` | отчёт (исходный документ задачи) |

## Каноническая ветка (определено для синка)
- Локальная `master` (HEAD `3f2d28c`) **впереди** `origin/master` (`966be26`) на 3 коммита
  (`e62c500`, `e036c39`, `3f2d28c`). `HEAD..origin/master` пуст.
- `origin/HEAD` указывает на ветку `fresh-start` (`48c19c9`), а не на `master`
  (также есть `g0-clean`, `push-20260916`, `push-test-20260916`, `security-fix`).
- **Решение S-1:** локальный коммит создаём на `master`. **Не пушим в GitHub**
  в этом этапе (требование владельца: не отправлять прочие локальные изменения).
- Доработать позже (этап H-1): согласовать каноническую ветку с OWNER и
  расшить расхождение `fresh-start` vs `master`.

## Базовая линия тестов (S-0, локальное дерево)
| Набор | Результат | Замечание |
|---|---|---|
| `tests/test_auth.py` | 34 passed | зона, которую затрагивает S-1; обязана остаться зелёной |
| `tests/test_media_boundary.py` | 33 passed | честно (ComfyUI не подключён) |
| Пуск `core.main` / OpenAPI | confirmed | по отчёту, пере-проверять не требовалось |
