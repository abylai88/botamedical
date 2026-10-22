#!/usr/bin/env bash
# Восстановление базы и загруженных фото из зашифрованной копии (см. deploy/README.md, раздел 10).
# Устанавливается deploy/install.sh в /usr/local/sbin/bota-restore. Запуск: sudo bota-restore ~/bota-ДАТА.tar.gz.age ~/bota-backup-key.txt
# Текущие данные не удаляются, а откладываются в /var/lib/bota/before-restore-ДАТА.
set -euo pipefail

DATA_DIR=${BOTA_DATA_DIR:-/var/lib/bota}
SITE_USER=${BOTA_SITE_USER:-bota}
SERVICE=${BOTA_SERVICE:-bota}

main() {
  if [ "$(id -u)" -ne 0 ]; then echo "Запустите через sudo"; exit 1; fi
  if [ $# -ne 2 ] || [ ! -f "$1" ] || [ ! -f "$2" ]; then
    echo "Использование: sudo bash $0 ФАЙЛ_КОПИИ.tar.gz.age ФАЙЛ_СЕКРЕТНОГО_КЛЮЧА"; exit 1
  fi
  local backup=$1 key=$2 aside
  # Без order-key заказы в восстановленной базе не прочитать: он в копию не входит и кладётся отдельно.
  if [ ! -f "$DATA_DIR/order-key" ]; then
    echo "В $DATA_DIR нет order-key. Сначала положите ключ с компьютера (README, раздел 10)."; exit 1
  fi

  # Не local: папку удаляет trap при выходе из скрипта, когда функция уже завершилась.
  work=$(mktemp -d)
  trap 'rm -rf "$work"' EXIT
  echo "== Расшифровываю и распаковываю копию"
  age -d -i "$key" "$backup" | tar -xz -C "$work"
  if [ ! -f "$work/bota-backup/bota.sqlite" ]; then echo "В копии нет базы"; exit 1; fi
  local check
  check=$(sqlite3 "$work/bota-backup/bota.sqlite" 'PRAGMA integrity_check;')
  if [ "$check" != ok ]; then echo "База в копии повреждена: $check"; exit 1; fi

  echo "== Останавливаю сайт"
  systemctl stop "$SERVICE"
  aside="$DATA_DIR/before-restore-$(date +%Y%m%d-%H%M%S)"
  mkdir "$aside"   # права 700 выставит chmod ниже
  shopt -s nullglob
  for f in "$DATA_DIR"/bota.sqlite*; do mv "$f" "$aside/"; done
  if [ -d "$DATA_DIR/uploads" ]; then mv "$DATA_DIR/uploads" "$aside/"; fi
  cp "$work/bota-backup/bota.sqlite" "$DATA_DIR/bota.sqlite"
  if [ -d "$work/bota-backup/uploads" ]; then cp -r "$work/bota-backup/uploads" "$DATA_DIR/uploads"; fi
  chown -R "$SITE_USER:$SITE_USER" "$DATA_DIR"
  chmod -R u=rwX,go= "$DATA_DIR"

  echo "== Запускаю сайт"
  systemctl start "$SERVICE"
  echo "== Готово. Прежние данные отложены в $aside"
  echo "   Проверьте админку (товары, заказы, контакты в заказах). Если всё в порядке: sudo rm -rf $aside"
}

main "$@"
