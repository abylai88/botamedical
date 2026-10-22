#!/usr/bin/env bash
# Tests for deploy/backup.sh (bota-backup) and deploy/backup-prune.sh (bota-backup-prune) with stub tools.
# Run: bash deploy/tests/backup.test.sh
source "$(dirname "$0")/helpers.sh"
mkdir -p "$T/data/uploads" "$T/backups"
export BOTA_DATA_DIR="$T/data" BOTA_BACKUP_DIR="$T/backups" BOTA_BACKUP_RECIPIENT="$T/recipient"
stub sqlite3 <<'S'
#!/usr/bin/env bash
[ "$1" = -cmd ] && shift 2
case "$2" in .backup*) d=${2#.backup }; cp "$1" "${d//\'/}";; PRAGMA*) echo ok;; esac
S
stub age <<'S'
#!/bin/sh
cat > "$4"
S
echo DB > "$T/data/bota.sqlite"; echo KEY > "$T/data/order-key"; echo img > "$T/data/uploads/a.webp"; echo age1test > "$T/recipient"

out=$(bash "$SITE/deploy/backup.sh" 2>&1); check "backup: exit" "$?" 0
archive=$(ls "$T"/backups/bota-*.tar.gz.age)
contents=$(tar -tzf "$archive" | tr '\n' ' ')
check "backup: database and photos inside" "$contents" "bota-backup/ bota-backup/bota.sqlite bota-backup/uploads/ bota-backup/uploads/a.webp "
case "$contents" in *order-key*) check "backup: order-key is NOT inside" yes no;; *) check "backup: order-key is NOT inside" no no;; esac
check "backup: no unfinished part left" "$(ls -A "$T/backups" | grep -c part)" 0

# Old copies, a stale unfinished one and more than 14 recent ones.
rm -f "$T"/backups/*
for d in 45 31 29 2; do f="$T/backups/bota-old-$d.tar.gz.age"; echo x > "$f"; touch -d "$d days ago" "$f"; done
for i in $(seq 1 15); do f="$T/backups/bota-recent-$i.tar.gz.age"; echo x > "$f"; touch -d "$((i + 2)) hours ago" "$f"; done
echo x > "$T/backups/.bota-stale.tar.gz.age.part"; touch -d "2 days ago" "$T/backups/.bota-stale.tar.gz.age.part"

out=$(BOTA_BACKUP_RECIPIENT="$T/missing" bash "$SITE/deploy/backup.sh" 2>&1); check "failed backup: exit" "$?" 1
check "failed backup: removes nothing by itself" "$(ls -A "$T/backups" | wc -l | tr -d ' ')" 20

out=$(bash "$SITE/deploy/backup-prune.sh" 2>&1); check "prune after failed backup: exit" "$?" 0
check "prune: older than 30 days gone" "$(ls "$T/backups" | grep -c 'old-45\|old-31')" 0
check "prune: stale part gone" "$(ls -A "$T/backups" | grep -c part)" 0
check "prune: 14 copies kept" "$(ls "$T/backups" | wc -l | tr -d ' ')" 14
check "prune: the 14 newest are kept" "$(ls "$T/backups" | grep -c 'recent-15\|old-2\.\|old-29')" 0
check_contains "prune: logs summary" "$out" "Очистка: удалено 6, осталось копий: 14"

summary
