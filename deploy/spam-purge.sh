#!/usr/bin/env bash
# Удаление спам-заказов старше 30 дней и служебных записей с истёкшим сроком (хеши IP и т.п.), как обещает
# политика конфиденциальности, — даже если админку никто не открывает и запросов на сайт нет. Запускается каждый день таймером bota-spam-purge.timer от имени bota.
# Устанавливается deploy/install.sh в /usr/local/sbin/bota-spam-purge: скрипт лежит вне релизов сайта,
# поэтому работает и после отката bota-update --rollback на старую версию.
# Выводит только количество удалённых записей, без содержимого заказов.
set -euo pipefail

DATA_DIR=${BOTA_DATA_DIR:-/var/lib/bota/data}
DAYS=${BOTA_SPAM_KEEP_DAYS:-30}
db="$DATA_DIR/bota.sqlite"

if ! [[ "$DAYS" =~ ^[0-9]+$ ]]; then echo "BOTA_SPAM_KEEP_DAYS должно быть числом дней"; exit 1; fi
# До первого запуска сайта базы ещё нет — очищать нечего, это не ошибка.
if [ ! -e "$db" ]; then echo "Базы ещё нет ($db) — очищать нечего"; exit 0; fi
if [ ! -f "$db" ] || [ -L "$db" ]; then echo "$db — не обычный файл"; exit 1; fi

# Даты заказов хранятся как 2026-10-22T12:34:56.789Z — сравнение строк совпадает с порядком времени.
removed=$(sqlite3 -cmd '.timeout 10000' "$db" \
  "DELETE FROM orders WHERE status = 'spam' AND created < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-$DAYS days'); SELECT changes();")
echo "Очистка спама: удалено $removed, хранится не дольше $DAYS дней"

# Служебные записи с истёкшим сроком (хеши IP для лимитов, использованные метки форм, задержки входа,
# сессии): сайт удаляет их сам при следующих запросах, а здесь — ежедневно, даже если запросов не было.
# Сроки хранятся в миллисекундах Unix-времени. Таблицы, которых ещё нет в старой базе, пропускаются.
now_ms="CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)"
expired=0
for table in rate_limits used_form_tokens login_delays sessions; do
  exists=$(sqlite3 -cmd '.timeout 10000' "$db" "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = '$table';")
  [ "$exists" = 1 ] || continue
  n=$(sqlite3 -cmd '.timeout 10000' "$db" "DELETE FROM $table WHERE expires < $now_ms; SELECT changes();")
  expired=$((expired + n))
done
echo "Очистка служебных записей с истёкшим сроком: удалено $expired"
