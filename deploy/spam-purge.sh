#!/usr/bin/env bash
# Удаление спам-заказов старше 30 дней, как обещает политика конфиденциальности, — даже если админку никто
# не открывает. Запускается каждый день таймером bota-spam-purge.timer от имени bota.
# Устанавливается deploy/install.sh в /usr/local/sbin/bota-spam-purge: скрипт лежит вне релизов сайта,
# поэтому работает и после отката bota-update --rollback на старую версию.
# Выводит только количество удалённых записей, без содержимого заказов.
set -euo pipefail

DATA_DIR=${BOTA_DATA_DIR:-/var/lib/bota/data}
DAYS=${BOTA_SPAM_KEEP_DAYS:-30}
db="$DATA_DIR/bota.sqlite"

if ! [[ "$DAYS" =~ ^[0-9]+$ ]]; then echo "BOTA_SPAM_KEEP_DAYS должно быть числом дней"; exit 1; fi
if [ ! -f "$db" ]; then echo "Нет базы: $db"; exit 1; fi

# Даты заказов хранятся как 2026-10-22T12:34:56.789Z — сравнение строк совпадает с порядком времени.
removed=$(sqlite3 -cmd '.timeout 10000' "$db" \
  "DELETE FROM orders WHERE status = 'spam' AND created < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-$DAYS days'); SELECT changes();")
echo "Очистка спама: удалено $removed, хранится не дольше $DAYS дней"
