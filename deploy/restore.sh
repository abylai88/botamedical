#!/usr/bin/env bash
# Восстановление базы и загруженных фото из зашифрованной копии (см. deploy/README.md, раздел 10).
# Устанавливается deploy/install.sh в /usr/local/sbin/bota-restore.
# Запуск: sudo bota-restore ~/bota-ДАТА.tar.gz.age ~/bota-backup-key.txt
#
# Порядок: копия расшифровывается и проверяется в папке root (/var/lib/bota-restore, тот же раздел диска,
# что и данные), пока сайт работает. Только потом: остановка → замена папки data переименованием → запуск.
# Прежние данные не удаляются, а откладываются в /var/lib/bota-restore/before-restore-ДАТА. Если на любом
# шаге после остановки что-то пошло не так, прежние данные возвращаются на место и сайт запускается снова.
#
# Безопасность: root не доверяет папкам, куда пишет сайт (bota). Из них он ничего не читает сам
# (order-key читается от имени bota), ссылки вместо файлов и папок — отказ, в архиве допускаются только
# обычные файлы и папки.
set -euo pipefail

DATA_ROOT=${BOTA_DATA_ROOT:-/var/lib/bota}
DATA_DIR="$DATA_ROOT/data"
WORK_ROOT=${BOTA_RESTORE_ROOT:-/var/lib/bota-restore}
SITE_USER=${BOTA_SITE_USER:-bota}
SERVICE=${BOTA_SERVICE:-bota}
APP=${BOTA_APP:-/srv/bota/current}
# /readyz отвечает 200, только если база открыта и order-key расшифровывает заказы.
READY_URL=${BOTA_READY_URL:-http://127.0.0.1:3000/readyz}

LOCK=${BOTA_LOCK:-/run/lock/bota-deploy.lock}

staging="" aside="" stamp=$(date +%Y%m%d-%H%M%S) switching=0

# Ссылку определяем через stat (не следует по ссылкам), так же как [ -L ].
is_link() { [ "$(stat -c %F -- "$1" 2>/dev/null)" = "symbolic link" ]; }
refuse() { echo "!! $1 Сайт не тронут."; exit 1; }
# Общая блокировка для bota-update, bota-update --rollback и bota-restore: одновременно идёт только одно.
# /run/lock доступна на запись всем, поэтому ссылку вместо файла блокировки не принимаем и файл не обрезаем.
take_lock() {
  if [ "$(stat -c %F -- "$LOCK" 2>/dev/null)" = "symbolic link" ]; then echo "!! $LOCK — ссылка. Отказ."; exit 1; fi
  exec 9>>"$LOCK"
  if ! flock -n 9; then
    echo "!! Уже идёт обновление, восстановление или откат сайта. Дождитесь окончания и повторите."; exit 1
  fi
}
# Перемещение папки только туда, где ещё ничего нет (mv -T не вкладывает папку внутрь существующей).
move_dir() {
  if [ -e "$2" ] || is_link "$2"; then echo "!! $2 уже существует, перемещение отменено."; return 1; fi
  mv -T -- "$1" "$2"
}

main() {
  if [ "$(id -u)" -ne 0 ]; then echo "Запустите через sudo"; exit 1; fi
  take_lock
  if [ $# -ne 2 ] || [ ! -f "$1" ] || [ ! -f "$2" ]; then
    echo "Использование: sudo bota-restore ФАЙЛ_КОПИИ.tar.gz.age ФАЙЛ_СЕКРЕТНОГО_КЛЮЧА"; exit 1
  fi
  local backup=$1 key=$2 path
  for path in "$DATA_ROOT" "$DATA_DIR" "$DATA_DIR/order-key"; do
    if is_link "$path"; then refuse "$path — ссылка, а не настоящий файл или папка. Отказ."; fi
  done
  # Без order-key заказы в восстановленной базе не прочитать: он в копию не входит и берётся с сервера.
  if ! sudo -u "$SITE_USER" test -f "$DATA_DIR/order-key"; then
    echo "В $DATA_DIR нет order-key. Сначала положите ключ с компьютера (README, раздел 10)."; exit 1
  fi

  # Рабочая папка принадлежит root и лежит на том же разделе, что данные: переключение — переименование.
  if [ ! -e "$WORK_ROOT" ]; then install -d -o root -g root -m 711 "$WORK_ROOT"; fi
  if is_link "$WORK_ROOT" || [ "$(stat -c '%U' "$WORK_ROOT")" != root ]; then refuse "$WORK_ROOT должна быть папкой root."; fi
  if [ "$(stat -c %d "$WORK_ROOT")" != "$(stat -c %d "$DATA_ROOT")" ]; then
    refuse "$WORK_ROOT и $DATA_ROOT на разных разделах диска."
  fi

  # Место: распакованная копия занимает в несколько раз больше сжатой; старые данные не удаляются.
  local need free
  need=$(( $(stat -c %s "$backup") * 6 / 1048576 + 100 ))
  free=$(df -Pm "$WORK_ROOT" | awk 'NR==2 {print $4}')
  if [ "$free" -lt "$need" ]; then refuse "Мало места: свободно ${free} МБ, нужно около ${need} МБ."; fi

  echo "== Расшифровываю и проверяю копию (сайт пока работает)"
  staging=$(mktemp -d "$WORK_ROOT/run-XXXXXX")
  if ! age -d -i "$key" -o "$staging/backup.tar.gz" "$backup"; then refuse "Не удалось расшифровать копию: не тот ключ или файл повреждён."; fi
  # В архиве допускаются только обычные файлы и папки: никаких ссылок и устройств.
  local types
  types=$(tar -tvzf "$staging/backup.tar.gz" | cut -c1 | sort -u | tr -d '\n')
  if [ -n "$(printf '%s' "$types" | tr -d -- '-d')" ]; then refuse "В копии есть ссылки или особые файлы ($types)."; fi
  tar -xzf "$staging/backup.tar.gz" -C "$staging" --no-same-owner --no-same-permissions
  rm -f "$staging/backup.tar.gz"
  local new="$staging/bota-backup"
  if [ ! -f "$new/bota.sqlite" ]; then refuse "В копии нет базы."; fi
  if [ -n "$(find "$new" ! -type f ! -type d -print -quit)" ]; then refuse "В копии есть ссылки или особые файлы."; fi
  local check
  check=$(sqlite3 "$new/bota.sqlite" 'PRAGMA integrity_check;')
  if [ "$check" != ok ]; then refuse "База в копии повреждена: $check."; fi
  # order-key читает bota (с правами сайта), записывает root — в свою папку.
  sudo -u "$SITE_USER" cat "$DATA_DIR/order-key" > "$new/order-key"
  if [ "$(stat -c %s "$new/order-key")" != 32 ]; then refuse "order-key на сервере повреждён (не 32 байта)."; fi
  chown -R --no-dereference "$SITE_USER:$SITE_USER" "$new"
  chmod -R u=rwX,go= "$new"
  # Заказы из копии должны открываться текущим order-key: проверка от имени bota (только счётчики, без данных).
  chmod 711 "$staging"
  if ! (cd "$APP" && sudo -u "$SITE_USER" env BOTA_DATA_DIR="$new" node --conditions=react-server scripts/db-verify.mjs); then
    refuse "Заказы в копии не расшифровываются текущим order-key (ключ от другой установки?)."
  fi

  echo "== Останавливаю сайт и подменяю данные"
  aside="$WORK_ROOT/before-restore-$stamp"
  switching=1
  systemctl stop "$SERVICE"
  move_dir "$DATA_DIR" "$aside"
  move_dir "$new" "$DATA_DIR"
  echo "== Запускаю сайт"
  systemctl start "$SERVICE"
  is_ready
  switching=0

  echo "== Готово. Прежние данные отложены в $aside"
  echo "   Проверьте админку (товары, заказы, контакты в заказах). Если всё в порядке: sudo rm -rf $aside"
}

is_ready() {
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 3 "$READY_URL" >/dev/null 2>&1 && systemctl is-active --quiet "$SERVICE"; then return 0; fi
    sleep 2
  done
  echo "!! Сайт не готов: $READY_URL не ответил 200 (база или order-key)"
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
      if [ -e "$DATA_DIR" ] || is_link "$DATA_DIR"; then move_dir "$DATA_DIR" "$WORK_ROOT/failed-restore-$stamp" || true; fi
      if ! move_dir "$aside" "$DATA_DIR"; then echo "!! Прежние данные остались в $aside — верните их вручную."; fi
    fi
    systemctl start "$SERVICE" || true
    if is_ready; then echo "!! Сайт работает на прежних данных."; else echo "!! Сайт не отвечает. Журнал: sudo journalctl -u $SERVICE -n 100"; fi
    code=1
  fi
  if [ -n "$staging" ]; then rm -rf "$staging"; fi
  exit "$code"
}
trap finish EXIT
trap 'exit 130' INT TERM HUP

main "$@"
