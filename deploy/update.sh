#!/usr/bin/env bash
# Обновление сайта до последней версии из GitHub (ветка main).
# Устанавливается deploy/install.sh в /usr/local/sbin/bota-update. Запуск: sudo bota-update
#
# Код скачивается в /srv/bota/repo (принадлежит root), новая версия собирается в отдельной папке
# пользователем bota-build, затем передаётся root и становится доступной сайту только для чтения.
# Скрипты из папок, куда может писать сайт или сборка, этот скрипт не запускает.
set -euo pipefail

REPO=/srv/bota/repo
APP=/srv/bota/app
BUILD_USER=bota-build
CACHE=/var/cache/bota
SERVICE=bota

main() {
  if [ "$(id -u)" -ne 0 ]; then echo "Запустите через sudo: sudo bota-update"; exit 1; fi
  echo "== Скачиваю обновления из GitHub"
  git -C "$REPO" pull --ff-only --quiet
  local sha new
  sha=$(git -C "$REPO" rev-parse HEAD)
  if [ "$(cat "$APP/.release" 2>/dev/null)" = "$sha" ] && [ "${1:-}" != "--force" ]; then
    echo "Обновлений нет (версия ${sha:0:7}). Пересобрать всё равно: sudo bota-update --force"; exit 0
  fi

  new="$APP.new"
  rm -rf "$new"
  echo "== Собираю версию ${sha:0:7} (1–3 минуты, сайт пока работает)"
  if ! build "$sha" "$new"; then
    rm -rf "$new"
    echo "!! Сборка не удалась, сайт работает на прежней версии. Пришлите текст ошибки выше."; exit 1
  fi

  echo "== Переключаю сайт на новую версию"
  systemctl stop "$SERVICE"
  rm -rf "$APP.prev"
  if [ -d "$APP" ]; then mv "$APP" "$APP.prev"; fi
  mv "$new" "$APP"
  rm -rf "${CACHE:?}/next"
  install -d -o bota -g bota -m 700 "$CACHE/next"
  systemctl start "$SERVICE"
  check
  notice_changes
  echo "== Готово: версия ${sha:0:7}"
}

# Сборка в папке dir. Каждый шаг проверяется явно: внутри `if !` bash не останавливается на ошибках сам.
build() {
  local sha=$1 dir=$2 tmp
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
  # Кеш картинок Next.js — в /var/cache/bota, единственном месте, куда сайту можно писать рядом с кодом.
  rm -rf "$dir/.next/cache" && ln -s "$CACHE/next" "$dir/.next/cache" || return 1
  echo "$sha" > "$dir/.release" || return 1
  chown -R root:root "$dir" && chmod -R u+rwX,go+rX,go-w "$dir"
}

# Ждём, пока сайт ответит на /healthz.
check() {
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 3 http://127.0.0.1:3000/healthz >/dev/null 2>&1; then echo "== Сайт отвечает"; return 0; fi
    sleep 1
  done
  echo "!! Сайт не ответил за 30 секунд. Журнал: sudo journalctl -u $SERVICE -n 50"
  return 1
}

# Новые служебные скрипты и службы не ставятся сами: root решает это отдельной командой.
notice_changes() {
  local changed=0 name unit
  for name in update backup restore; do cmp -s "$REPO/deploy/$name.sh" "/usr/local/sbin/bota-$name" || changed=1; done
  for unit in bota.service bota-backup.service bota-backup.timer; do cmp -s "$REPO/deploy/$unit" "/etc/systemd/system/$unit" || changed=1; done
  if [ "$changed" = 1 ]; then
    echo "!! В новой версии изменились служебные скрипты или службы. Установите их:"
    echo "   sudo bash $REPO/deploy/install.sh && sudo systemctl restart $SERVICE"
  fi
}

main "$@"
