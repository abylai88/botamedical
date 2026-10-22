#!/usr/bin/env bash
# Зашифрованная резервная копия базы и загруженных фото. Запускается каждый день таймером bota-backup.timer
# от имени пользователя bota (устанавливается deploy/install.sh в /usr/local/sbin/bota-backup). Ключ order-key в копию НЕ входит: он хранится отдельно у владельца.
# Шифрование — age открытым ключом: на сервере лежит только открытый ключ, расшифровать копию
# можно лишь секретным ключом, который хранится у владельца (см. deploy/README.md, раздел 8).
# Старые копии удаляет отдельный bota-backup-prune (свой таймер): очистка не зависит от успеха бэкапа.
set -euo pipefail

DATA_DIR=${BOTA_DATA_DIR:-/var/lib/bota/data}
BACKUP_DIR=${BOTA_BACKUP_DIR:-/var/backups/bota}
RECIPIENT=${BOTA_BACKUP_RECIPIENT:-/etc/bota/backup-recipient.txt}
# Копии читает и группа botabackup (владелец сервера скачивает их на компьютер), остальные — нет.
umask 027

if [ ! -s "$RECIPIENT" ]; then echo "Нет открытого ключа шифрования: $RECIPIENT"; exit 1; fi
if [ ! -f "$DATA_DIR/bota.sqlite" ]; then echo "Нет базы: $DATA_DIR/bota.sqlite"; exit 1; fi

name="bota-$(date +%Y-%m-%d_%H%M%S).tar.gz.age"
part="$BACKUP_DIR/.$name.part"
work=$(mktemp -d)
trap 'rm -rf "$work"; rm -f "$part"' EXIT
mkdir "$work/bota-backup"

# .backup делает целостную копию, даже если сайт в этот момент пишет в базу (простое копирование файла — нет).
sqlite3 -cmd '.timeout 10000' "$DATA_DIR/bota.sqlite" ".backup '$work/bota-backup/bota.sqlite'"
check=$(sqlite3 "$work/bota-backup/bota.sqlite" 'PRAGMA integrity_check;')
if [ "$check" != ok ]; then echo "Копия базы не прошла проверку: $check"; exit 1; fi
# Только обычные файлы фото: ссылки и прочее в копию не попадают (bota-restore такую копию не примет).
if [ -d "$DATA_DIR/uploads" ] && [ "$(stat -c %F -- "$DATA_DIR/uploads")" = directory ]; then
  mkdir "$work/bota-backup/uploads"
  find "$DATA_DIR/uploads" -maxdepth 1 -type f -exec cp --no-dereference --preserve=timestamps -t "$work/bota-backup/uploads" -- {} +
fi

# Сначала пишем во временный файл: недописанная копия никогда не выглядит как готовая.
tar -C "$work" -czf - bota-backup | age -R "$RECIPIENT" -o "$part"
mv "$part" "$BACKUP_DIR/$name"

echo "Готово: $BACKUP_DIR/$name ($(du -h "$BACKUP_DIR/$name" | cut -f1)), копий: $(ls -1 "$BACKUP_DIR"/bota-*.tar.gz.age | wc -l)"
