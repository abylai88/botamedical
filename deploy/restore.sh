#!/usr/bin/env bash
# Восстановление базы и загруженных фото из зашифрованной копии (см. deploy/README.md, раздел 10).
# Устанавливается deploy/install.sh в /usr/local/sbin/bota-restore.
# Запуск: sudo bota-restore ~/bota-ДАТА.tar.gz.age ~/bota-backup-key.txt
#
# Порядок: копия расшифровывается и проверяется во временной папке рядом с данными (тот же раздел диска),
# пока сайт работает. Только потом: остановка → замена папки data одним переименованием → запуск → /healthz.
# Прежние данные не удаляются, а откладываются в /var/lib/bota/before-restore-ДАТА. Если на любом шаге
# после остановки что-то пошло не так, прежние данные возвращаются на место и сайт запускается снова.
set -euo pipefail

DATA_ROOT=${BOTA_DATA_ROOT:-/var/lib/bota}
DATA_DIR="$DATA_ROOT/data"
SITE_USER=${BOTA_SITE_USER:-bota}
SERVICE=${BOTA_SERVICE:-bota}
HEALTH_URL=${BOTA_HEALTH_URL:-http://127.0.0.1:3000/healthz}

staging="" aside="" stamp=$(date +%Y%m%d-%H%M%S) switching=0

main() {
  if [ "$(id -u)" -ne 0 ]; then echo "Запустите через sudo"; exit 1; fi
  if [ $# -ne 2 ] || [ ! -f "$1" ] || [ ! -f "$2" ]; then
    echo "Использование: sudo bota-restore ФАЙЛ_КОПИИ.tar.gz.age ФАЙЛ_СЕКРЕТНОГО_КЛЮЧА"; exit 1
  fi
  local backup=$1 key=$2
  # Без order-key заказы в восстановленной базе не прочитать: он в копию не входит и кладётся отдельно.
  if [ ! -f "$DATA_DIR/order-key" ]; then
    echo "В $DATA_DIR нет order-key. Сначала положите ключ с компьютера (README, раздел 10)."; exit 1
  fi

  # Место: распакованная копия занимает в несколько раз больше сжатой. Старые данные не удаляются,
  # переключение — переименование, поэтому больше места не понадобится.
  local need free
  need=$(( $(stat -c %s "$backup") * 5 / 1048576 + 100 ))
  free=$(df -Pm "$DATA_ROOT" | awk 'NR==2 {print $4}')
  if [ "$free" -lt "$need" ]; then echo "!! Мало места: свободно ${free} МБ, нужно около ${need} МБ. Сайт не тронут."; exit 1; fi

  echo "== Расшифровываю и проверяю копию (сайт пока работает)"
  staging=$(mktemp -d "$DATA_ROOT/restore-XXXXXX")
  if ! age -d -i "$key" "$backup" | tar -xz -C "$staging"; then
    echo "!! Не удалось расшифровать копию: не тот ключ или файл повреждён. Сайт не тронут."; exit 1
  fi
  local new="$staging/bota-backup"
  if [ ! -f "$new/bota.sqlite" ]; then echo "!! В копии нет базы. Сайт не тронут."; exit 1; fi
  local check
  check=$(sqlite3 "$new/bota.sqlite" 'PRAGMA integrity_check;')
  if [ "$check" != ok ]; then echo "!! База в копии повреждена: $check. Сайт не тронут."; exit 1; fi
  cp -p "$DATA_DIR/order-key" "$new/order-key"
  chown -R "$SITE_USER:$SITE_USER" "$new"
  chmod -R u=rwX,go= "$new"

  echo "== Останавливаю сайт и подменяю данные"
  aside="$DATA_ROOT/before-restore-$stamp"
  switching=1
  systemctl stop "$SERVICE"
  mv "$DATA_DIR" "$aside"
  mv "$new" "$DATA_DIR"
  echo "== Запускаю сайт"
  systemctl start "$SERVICE"
  healthy
  # Сайт видит базу с правами bota.
  sudo -u "$SITE_USER" sqlite3 "$DATA_DIR/bota.sqlite" 'SELECT count(*) FROM products;' >/dev/null
  switching=0

  echo "== Готово. Прежние данные отложены в $aside"
  echo "   Проверьте админку (товары, заказы, контакты в заказах). Если всё в порядке: sudo rm -rf $aside"
}

healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 3 "$HEALTH_URL" >/dev/null 2>&1 && systemctl is-active --quiet "$SERVICE"; then return 0; fi
    sleep 2
  done
  echo "!! Сайт не ответил на $HEALTH_URL"
  return 1
}

# Любая ошибка или прерывание после остановки сайта: возвращаем прежние данные и запускаем сайт.
finish() {
  local code=$?
  trap - EXIT
  if [ "$switching" = 1 ]; then
    echo "!! Восстановление не удалось. Возвращаю прежние данные."
    systemctl stop "$SERVICE" || true
    if [ -n "$aside" ] && [ -d "$aside" ]; then
      if [ -e "$DATA_DIR" ]; then mv "$DATA_DIR" "$DATA_ROOT/failed-restore-$stamp"; fi
      mv "$aside" "$DATA_DIR"
    fi
    systemctl start "$SERVICE" || true
    if healthy; then echo "!! Сайт работает на прежних данных."; else echo "!! Сайт не отвечает. Журнал: sudo journalctl -u $SERVICE -n 100"; fi
    code=1
  fi
  if [ -n "$staging" ]; then rm -rf "$staging"; fi
  exit "$code"
}
trap finish EXIT
trap 'exit 130' INT TERM HUP

main "$@"
