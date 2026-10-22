#!/usr/bin/env bash
# Удаление старых резервных копий: всё старше 30 дней (так обещано в политике конфиденциальности) и всё
# сверх 14 последних. Запускается каждый день своим таймером bota-backup-prune.timer от имени bota —
# независимо от того, удался ли бэкап. Устанавливается deploy/install.sh в /usr/local/sbin/bota-backup-prune.
# Что удалено, видно в журнале: sudo journalctl -u bota-backup-prune
set -euo pipefail

BACKUP_DIR=${BOTA_BACKUP_DIR:-/var/backups/bota}
KEEP=${BOTA_BACKUP_KEEP:-14}
MAX_AGE_DAYS=${BOTA_BACKUP_MAX_AGE_DAYS:-30}

if [ ! -d "$BACKUP_DIR" ]; then echo "Нет папки копий: $BACKUP_DIR"; exit 1; fi
removed=0
remove() { rm -f -- "$1"; echo "Удалена: $(basename "$1") ($2)"; removed=$((removed + 1)); }

# -type f: только обычные файлы, по ссылкам не идём.
while IFS= read -r f; do remove "$f" "старше $MAX_AGE_DAYS дней"; done < <(
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'bota-*.tar.gz.age' -mmin +"$((MAX_AGE_DAYS * 24 * 60))")
# Недописанные копии (бэкап прервался) старше суток.
while IFS= read -r f; do remove "$f" "недописанная"; done < <(
  find "$BACKUP_DIR" -maxdepth 1 -type f -name '.bota-*.part' -mmin +1440)
while IFS= read -r f; do remove "$f" "сверх $KEEP последних"; done < <(
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'bota-*.tar.gz.age' -printf '%T@ %p\n' | sort -rn | tail -n +"$((KEEP + 1))" | cut -d' ' -f2-)

left=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'bota-*.tar.gz.age' | wc -l)
newest=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'bota-*.tar.gz.age' -printf '%T@ %f\n' | sort -rn | head -n 1 | cut -d' ' -f2-)
echo "Очистка: удалено $removed, осталось копий: $left, самая свежая: ${newest:-нет}"
