#!/usr/bin/env bash
# Обновление сайта на сервере до последней версии из GitHub (ветка main).
# Запуск: sudo bash /srv/bota/app/deploy/update.sh
# Если сборка не удалась, сайт возвращается на предыдущую версию и запускается снова.
set -euo pipefail

APP_DIR=/srv/bota/app
SITE_USER=bota
SERVICE=bota

# Всё в функции: git pull может заменить этот файл, а bash читает функцию целиком заранее.
main() {
  if [ "$(id -u)" -ne 0 ]; then echo "Запустите через sudo: sudo bash $0"; exit 1; fi
  cd "$APP_DIR"
  as_site() { sudo -u "$SITE_USER" -H "$@"; }

  local before after
  before=$(as_site git rev-parse HEAD)
  echo "== Скачиваю обновления из GitHub"
  as_site git pull --ff-only
  after=$(as_site git rev-parse HEAD)
  if [ "$before" = "$after" ] && [ "${1:-}" != "--force" ]; then
    echo "Обновлений нет (версия ${after:0:7}). Пересобрать всё равно: sudo bash $0 --force"
    exit 0
  fi

  echo "== Останавливаю сайт на время сборки (1–3 минуты)"
  systemctl stop "$SERVICE"
  if ! build; then
    echo "!! Сборка не удалась. Возвращаю предыдущую версию ${before:0:7}"
    as_site git reset --hard "$before"
    build
    systemctl start "$SERVICE"
    echo "!! Сайт работает на старой версии. Пришлите текст ошибки выше."
    exit 1
  fi
  systemctl start "$SERVICE"
  check
  echo "== Готово: версия ${after:0:7}"
}

build() {
  sudo -u "$SITE_USER" -H npm ci --include=dev && sudo -u "$SITE_USER" -H npm run build
}

# Ждём, пока сайт ответит на /healthz.
check() {
  for _ in $(seq 1 30); do
    if curl -fsS http://127.0.0.1:3000/healthz >/dev/null 2>&1; then echo "== Сайт отвечает"; return 0; fi
    sleep 1
  done
  echo "!! Сайт не ответил за 30 секунд. Смотрите журнал: sudo journalctl -u $SERVICE -n 50"
  return 1
}

main "$@"
