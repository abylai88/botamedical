#!/usr/bin/env bash
# Устанавливает служебные скрипты и службы systemd из репозитория на сервере:
#   deploy/update.sh  → /usr/local/sbin/bota-update
#   deploy/backup.sh  → /usr/local/sbin/bota-backup
#   deploy/restore.sh → /usr/local/sbin/bota-restore
#   bota.service, bota-backup.service, bota-backup.timer → /etc/systemd/system/
# Все файлы принадлежат root: пользователь сайта bota не может их изменить.
# Запуск: sudo bash /srv/bota/repo/deploy/install.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then echo "Запустите через sudo: sudo bash $0"; exit 1; fi
SRC=$(cd "$(dirname "$0")" && pwd)

# Источник тоже должен принадлежать root и не быть доступным для записи другим,
# иначе кто-то мог бы подменить скрипты до установки.
bad=$(find "$SRC" "$SRC/.." -maxdepth 0 \( ! -user root -o -perm /022 \) -print; find "$SRC" \( ! -user root -o -perm /022 \) -print)
if [ -n "$bad" ]; then
  echo "Отказ: эти файлы не принадлежат root или доступны для записи другим:"; echo "$bad"; exit 1
fi

for name in update backup restore; do
  install -o root -g root -m 0755 "$SRC/$name.sh" "/usr/local/sbin/bota-$name"
done
for unit in bota.service bota-backup.service bota-backup.timer; do
  install -o root -g root -m 0644 "$SRC/$unit" "/etc/systemd/system/$unit"
done
systemctl daemon-reload
echo "Установлено: bota-update, bota-backup, bota-restore и службы systemd."
echo "Если сайт уже работает, примените новые настройки службы: sudo systemctl restart bota"
