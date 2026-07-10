SCRIPTS — Hermes Runtime / Book Intelligence
=============================================

Все скрипты запускаются из корня проекта: scripts\*.bat


ЗАПУСК СЕРВИСОВ
----------------

start_all.bat
  Запускает все сервисы последовательно:
    Gateway (:8080)  ->  Core + Book API (:8642)  ->  Telegram Bot
  Не освобождает порты перед запуском.
  Для остановки используй stop_all.bat.

start_all_clean.bat
  Запускает все сервисы + освобождает порты 8080, 8642, 9090.
  Перед запуском убивает процессы, занявшие эти порты.
  После запуска проверяет что порты слушаются.
  Открывает в браузере 3 вкладки:
    - Book Intelligence UI  (http://127.0.0.1:8642/_ui/book.html)
    - X-Ray Dashboard       (http://127.0.0.1:8642/_ui/index.html)
    - Book API              (http://127.0.0.1:8642/book)

start_gateway.bat
  Запускает только Gateway (:8080).
  uvicorn gateway.main:app --host 127.0.0.1 --port 8080

start_core.bat
  Запускает только Core + Book API (:8642).
  uvicorn core.main:app --host 127.0.0.1 --port 8642

start_book_api.bat
  Информационный скрипт.
  Book Intelligence встроен в Core (:8642).
  Для отдельного запуска на :9090: python run_api.py

start_telegram.bat
  Запускает Telegram Bot.
  python -m integrations.telegram.run


ОСТАНОВКА
----------

stop_all.bat
  Останавливает все сервисы двумя способами:
    1) По заголовку окна (Gateway, Core, Telegram)
    2) Принудительно освобождает порты 8080, 8642, 9090


ПРОВЕРКА
---------

health_check.py
  Проверяет доступность всех сервисов.
  Запуск: python scripts/health_check.py
  Проверяет:
    - http://127.0.0.1:8080/health        (Gateway)
    - http://127.0.0.1:8642/health        (Core)
    - http://127.0.0.1:8642/book/health   (Book Intelligence)


НАГРУЗОЧНОЕ ТЕСТИРОВАНИЕ
--------------------------

load_test.py
  Отправляет N concurrent запросов в Gateway.
  Замеряет P50, P95, P99 latency.
  Запуск: python scripts/load_test.py [concurrent=10]
  Пример: python scripts/load_test.py 50


ЗАВИСИМОСТИ
------------

Все скрипты используют runtime\.venv\Scripts\python или uvicorn.
Порт 8080 — Gateway (внешний шлюз)
Порт 8642 — Core (оркестратор + Book Intelligence + UI)
Порт 9090 — Book API (только standalone-режим)


БРАУЗЕРНЫЕ ССЫЛКИ (после запуска)
----------------------------------

  http://127.0.0.1:8642/_ui/book.html   — Book Intelligence UI
  http://127.0.0.1:8642/_ui/index.html   — X-Ray Dashboard
  http://127.0.0.1:8642/book             — Book API endpoints
  http://127.0.0.1:8080/health           — Gateway health
