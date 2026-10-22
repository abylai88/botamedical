#!/usr/bin/env bash
# Обновление сайта до последней версии из GitHub (ветка main).
# Устанавливается deploy/install.sh в /usr/local/sbin/bota-update.
# Запуск: sudo bota-update [--force]          — обновить до последней версии
#         sudo bota-update --rollback [ИМЯ]  — вернуться на предыдущую (или указанную) готовую версию
#
# Каждая версия собирается в своей папке /srv/bota/releases/<дата-коммит>, сайт работает из
# /srv/bota/current — это ссылка на рабочую версию. Пока новая версия собирается, текущая работает
# и не трогается. Переключение: ссылка на новую → перезапуск → проверка /readyz. Если что-то не так,
# ссылка возвращается на предыдущую готовую версию (без пересборки). Именно /readyz, а не /healthz:
# сайт должен не просто запуститься, а открыть базу и расшифровать заказы. Хранятся 3 последние версии.
#
# Сборку делает пользователь bota-build, затем папка передаётся root: сайт (bota) может её только читать.
# Скрипты из папок, куда может писать сайт или сборка, этот скрипт не запускает.
set -euo pipefail

REPO=${BOTA_REPO:-/srv/bota/repo}
RELEASES=${BOTA_RELEASES:-/srv/bota/releases}
CURRENT=${BOTA_CURRENT:-/srv/bota/current}
CACHE=${BOTA_CACHE:-/var/cache/bota}
BUILD_USER=${BOTA_BUILD_USER:-bota-build}
SITE_USER=${BOTA_SITE_USER:-bota}
SERVICE=${BOTA_SERVICE:-bota}
# /readyz отвечает 200, только если база открыта и order-key расшифровывает заказы.
READY_URL=${BOTA_READY_URL:-http://127.0.0.1:3000/readyz}
KEEP=${BOTA_KEEP_RELEASES:-3}
MIN_FREE_MB=${BOTA_MIN_FREE_MB:-1500}
LOCK=${BOTA_LOCK:-/run/bota-deploy/deploy.lock}
# Метка готовой версии: появляется последним шагом сборки. Без неё папка не считается версией.
READY=.release-ready

main() {
  if [ "$(id -u)" -ne 0 ]; then echo "Запустите через sudo: sudo bota-update"; exit 1; fi
  take_lock
  if [ "${1:-}" = "--rollback" ]; then rollback_manual "${2:-}"; fi

  echo "== Скачиваю обновления из GitHub"
  git -C "$REPO" pull --ff-only --quiet
  local sha prev name dir
  sha=$(git -C "$REPO" rev-parse HEAD)
  prev=""
  if [ -L "$CURRENT" ]; then prev=$(readlink -f "$CURRENT"); fi
  if [ -n "$prev" ] && [ "$(cat "$prev/$READY" 2>/dev/null)" = "$sha" ] && [ "${1:-}" != "--force" ]; then
    echo "Обновлений нет (версия ${sha:0:7}). Пересобрать всё равно: sudo bota-update --force"; exit 0
  fi

  install -d -o root -g root -m 755 "$RELEASES"
  local free
  free=$(df -Pm "$RELEASES" | awk 'NR==2 {print $4}')
  if [ "$free" -lt "$MIN_FREE_MB" ]; then
    echo "!! Мало места на диске: свободно ${free} МБ, нужно хотя бы ${MIN_FREE_MB} МБ. Сайт не тронут."; exit 1
  fi

  name="$(date +%Y%m%d-%H%M%S)-${sha:0:7}"
  dir="$RELEASES/$name"
  echo "== Собираю версию ${sha:0:7} в $dir (1–3 минуты, сайт пока работает)"
  if ! build "$sha" "$dir" "$name"; then
    discard "$dir"
    echo "!! Сборка не удалась, сайт работает на прежней версии. Пришлите текст ошибки выше."; exit 1
  fi

  echo "== Переключаю сайт на новую версию"
  if switch_to "$dir"; then
    prune
    notice_changes
    echo "== Готово: работает версия $name"
    exit 0
  fi

  echo "!! Новая версия не заработала. Возвращаю предыдущую."
  local target
  target=$(rollback_target "$prev" "$dir")
  if [ -z "$target" ]; then
    echo "!! Готовой предыдущей версии нет (это первая установка). Проверьте, что order-key на месте (README, 4.3),"
    echo "   и пришлите журнал: sudo journalctl -u $SERVICE -n 100"; exit 1
  fi
  if switch_to "$target"; then
    discard "$dir"
    echo "!! Сайт работает на прежней версии $(basename "$target"). Пришлите вывод: sudo journalctl -u $SERVICE -n 100"
  else
    echo "!! Прежняя версия тоже не отвечает. Журнал: sudo journalctl -u $SERVICE -n 100"
  fi
  exit 1
}

# Сборка в папке dir. Каждый шаг проверяется явно: внутри `if !` bash не останавливается на ошибках сам.
build() {
  local sha=$1 dir=$2 name=$3 tmp
  install -d -o "$BUILD_USER" -g "$BUILD_USER" -m 755 "$dir" || return 1
  git -C "$REPO" archive "$sha" | sudo -u "$BUILD_USER" tar -x -C "$dir" || return 1
  # Сборка не видит настоящие данные: ей даётся пустая временная папка.
  tmp=$(mktemp -d) || return 1
  chown "$BUILD_USER" "$tmp" || return 1
  if ! (cd "$dir" && sudo -u "$BUILD_USER" -H env BOTA_DATA_DIR="$tmp" npm ci --include=dev \
        && sudo -u "$BUILD_USER" -H env BOTA_DATA_DIR="$tmp" npm run build); then
    rm -rf "$tmp"; return 1
  fi
  rm -rf "$tmp"
  # Сборщик мог оставить запущенные процессы: завершаем их, прежде чем root возьмёт папку себе.
  pkill -KILL -u "$BUILD_USER" 2>/dev/null || true
  # Сначала папка сборки целиком переходит к root: после этого сборщик больше ничего в ней не подменит.
  # --no-dereference: ссылки внутри сборки меняют владельца сами, а не то, на что указывают.
  # chmod не трогает ссылки (-P по умолчанию для -R без -L), поэтому не меняет права их целей.
  chown -R --no-dereference root:root "$dir" && chmod -R u+rwX,go+rX,go-w "$dir" || return 1
  # Дальше root пишет в сборку сам, поэтому пути проверяются: настоящие папки, не ссылки.
  if [ "$(stat -c %F -- "$dir")" != directory ] || [ "$(stat -c %F -- "$dir/.next" 2>/dev/null)" != directory ]; then
    echo "!! В сборке нет настоящей папки .next (возможно, ссылка). Отказ."; return 1
  fi
  # Кеш картинок Next.js у каждой версии свой, в /var/cache/bota — туда пишет сайт. Внутри этой папки
  # всё делается от имени bota, чтобы root не следовал по подложенным туда ссылкам.
  if [ ! -e "$CACHE" ]; then install -d -o "$SITE_USER" -g "$SITE_USER" -m 700 "$CACHE" || return 1; fi
  if [ "$(stat -c %F -- "$CACHE")" != directory ]; then echo "!! $CACHE — не папка (возможно, ссылка)"; return 1; fi
  sudo -u "$SITE_USER" mkdir -m 700 "$CACHE/$name" || return 1
  rm -rf -- "$dir/.next/cache" && ln -s "$CACHE/$name" "$dir/.next/cache" || return 1
  # Маркер готовности: прежний путь (файл или ссылку, оставленные сборкой) удаляем, новый создаём
  # с noclobber — запись не пойдёт по ссылке и не перезапишет существующий файл.
  rm -f -- "$dir/$READY" && (set -C; echo "$sha" > "$dir/$READY") || return 1
}

# Ссылка current → dir (заменяется одним переименованием), перезапуск, проверка.
switch_to() {
  local dir=$1
  # Папки версий никуда не перемещаются: меняется только ссылка, одним переименованием (mv -T).
  rm -f "$CURRENT.new" && ln -s "$dir" "$CURRENT.new" && mv -Tf "$CURRENT.new" "$CURRENT" || return 1
  systemctl restart "$SERVICE" || return 1
  is_ready
}

# Ждём ответа 200 от /readyz: до 30 попыток, на каждую не больше 3 секунд.
is_ready() {
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 3 "$READY_URL" >/dev/null 2>&1 && systemctl is-active --quiet "$SERVICE"; then
      echo "== Сайт готов: база и order-key в порядке"; return 0
    fi
    sleep 2
  done
  echo "!! Сайт не готов: $READY_URL не ответил 200 (база или order-key)"
  return 1
}

# Куда откатываться: версия, работавшая до обновления, а если её нет — самая свежая другая готовая.
# Общая блокировка для bota-update, bota-update --rollback и bota-restore: одновременно идёт только одно.
# Файл блокировки лежит в папке, куда может писать только root (не в общей /run/lock): иначе другой
# пользователь мог бы подменить файл и дать двум запускам взять «разные» блокировки.
take_lock() {
  local lock_dir
  lock_dir=$(dirname -- "$LOCK")
  if [ ! -e "$lock_dir" ]; then install -d -o root -g root -m 700 "$lock_dir" || exit 1; fi
  if [ "$(stat -c %F -- "$lock_dir")" != directory ] || [ "$(stat -c %U -- "$lock_dir")" != root ] \
    || [ -n "$(find "$lock_dir" -maxdepth 0 -perm /022 2>/dev/null)" ]; then
    echo "!! $lock_dir должна быть папкой root, закрытой для записи другим. Отказ."; exit 1
  fi
  if [ "$(stat -c %F -- "$LOCK" 2>/dev/null)" = "symbolic link" ]; then echo "!! $LOCK — ссылка. Отказ."; exit 1; fi
  if [ -e "$LOCK" ] && { [ ! -f "$LOCK" ] || [ "$(stat -c %U -- "$LOCK")" != root ]; }; then
    echo "!! $LOCK — не обычный файл root. Отказ."; exit 1
  fi
  exec 9>>"$LOCK"
  if ! flock -n 9; then
    echo "!! Уже идёт обновление, восстановление или откат сайта. Дождитесь окончания и повторите."; exit 1
  fi
}

# Ручной откат: на указанную версию или на ближайшую готовую версию старше рабочей.
rollback_manual() {
  local current target="" candidate
  current=$(readlink -f "$CURRENT")
  if [ -n "$1" ]; then
    target="$RELEASES/$1"
    if [ ! -f "$target/$READY" ]; then echo "!! Нет готовой версии $1. Список: ls $RELEASES"; exit 1; fi
  else
    for candidate in $(ls -1d "$RELEASES"/*/ 2>/dev/null | sort -r); do
      candidate=${candidate%/}
      if [[ "$(basename "$candidate")" < "$(basename "$current")" ]] && [ -f "$candidate/$READY" ]; then target=$candidate; break; fi
    done
    if [ -z "$target" ]; then echo "!! Нет готовой версии старше рабочей $(basename "$current")."; exit 1; fi
  fi
  if [ "$target" = "$current" ]; then echo "Версия $(basename "$target") и так рабочая."; exit 0; fi
  echo "== Возвращаю версию $(basename "$target")"
  if switch_to "$target"; then echo "== Готово: работает версия $(basename "$target")"; exit 0; fi
  echo "!! Версия $(basename "$target") не заработала. Возвращаю $(basename "$current")"
  switch_to "$current" || echo "!! Сайт не отвечает. Журнал: sudo journalctl -u $SERVICE -n 100"
  exit 1
}

rollback_target() {
  local prev=$1 failed=$2 candidate
  if [ -n "$prev" ] && [ "$prev" != "$failed" ] && [ -f "$prev/$READY" ]; then echo "$prev"; return; fi
  for candidate in $(ls -1d "$RELEASES"/*/ 2>/dev/null | sort -r); do
    candidate=${candidate%/}
    if [ "$candidate" != "$failed" ] && [ -f "$candidate/$READY" ]; then echo "$candidate"; return; fi
  done
}

# Удаляет папку версии вместе с её кешем.
discard() {
  local dir=$1
  rm -rf "$dir"
  sudo -u "$SITE_USER" rm -rf "$CACHE/$(basename "$dir")"
}

# Оставляем KEEP последних готовых версий (рабочая не удаляется никогда) и убираем недособранные.
prune() {
  local current kept=0 dir
  current=$(readlink -f "$CURRENT")
  for dir in $(ls -1d "$RELEASES"/*/ 2>/dev/null | sort -r); do
    dir=${dir%/}
    if [ "$dir" = "$current" ]; then kept=$((kept + 1)); continue; fi
    if [ -f "$dir/$READY" ] && [ "$kept" -lt "$KEEP" ]; then kept=$((kept + 1)); continue; fi
    discard "$dir"
  done
}

# Новые служебные скрипты и службы не ставятся сами: root решает это отдельной командой.
notice_changes() {
  local changed=0 name unit
  for name in update backup restore backup-prune; do cmp -s "$REPO/deploy/$name.sh" "/usr/local/sbin/bota-$name" || changed=1; done
  for unit in bota.service bota-backup.service bota-backup.timer bota-backup-prune.service bota-backup-prune.timer; do cmp -s "$REPO/deploy/$unit" "/etc/systemd/system/$unit" || changed=1; done
  if [ "$changed" = 1 ]; then
    echo "!! В новой версии изменились служебные скрипты или службы. Установите их:"
    echo "   sudo bash $REPO/deploy/install.sh && sudo systemctl restart $SERVICE"
  fi
}

main "$@"
