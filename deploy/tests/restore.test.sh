#!/usr/bin/env bash
# Tests for deploy/restore.sh (bota-restore) with stub tools. Run: bash deploy/tests/restore.test.sh
source "$(dirname "$0")/helpers.sh"
mkdir -p "$T/app/scripts"
export BOTA_DATA_ROOT="$T/root" BOTA_RESTORE_ROOT="$T/restore-root" BOTA_LOCK="$T/lock" BOTA_APP="$T/app"

# Backups are plain tar.gz here; "age" only checks that the identity file is the right one.
stub age <<'S'
#!/usr/bin/env bash
grep -q SECRET "$3" || { echo "age: no identity matched" >&2; exit 1; }; cp "$6" "$5"
S
stub sqlite3 <<'S'
#!/usr/bin/env bash
case "$2" in PRAGMA*) grep -q CORRUPT "$1" && echo "corrupt page" || echo ok;; *) echo 3;; esac
S
# /readyz fails while the live database is marked NOTREADY (e.g. its orders do not open with the key).
stub curl <<'S'
#!/usr/bin/env bash
grep -q NOTREADY "$T/root/data/bota.sqlite" 2>/dev/null && exit 22; exit 0
S
# db-verify stand-in (real node): orders in a database marked OTHERKEY do not decrypt with the server's key.
cat > "$T/app/scripts/db-verify.mjs" <<'S'
import { readFileSync } from 'node:fs';
const db = readFileSync(process.env.BOTA_DATA_DIR + '/bota.sqlite', 'utf8');
if (db.includes('OTHERKEY')) { console.error('FAILED: 1 of 1 newest orders cannot be decrypted'); process.exitCode = 1; }
S

mkbackup() { rm -rf "$T/pkg"; mkdir -p "$T/pkg/bota-backup/uploads"; echo "$1" > "$T/pkg/bota-backup/bota.sqlite"; echo img > "$T/pkg/bota-backup/uploads/a.webp"; tar -czf "$T/$2" -C "$T/pkg" bota-backup; }
reset() {
  rm -rf "$T/root" "$T/restore-root" "$T/links" "$T/otherdev" "$T/busy"
  mkdir -p "$T/root/data/uploads"; echo DB-CURRENT > "$T/root/data/bota.sqlite"; echo x > "$T/root/data/bota.sqlite-wal"
  head -c 32 /dev/zero | tr '\0' K > "$T/root/data/order-key"; echo old > "$T/root/data/uploads/old.webp"
}
run() { out=$(bash "$SITE/deploy/restore.sh" "$@" 2>&1); code=$?; }
db() { cat "$T/root/data/bota.sqlite" 2>/dev/null; }
untouched() { # description
  check "$1: exit code" "$code" 1; check "$1: live database untouched" "$(db)" DB-CURRENT
  check "$1: order-key untouched" "$(cat "$T/root/data/order-key" 2>/dev/null | head -c 4)" KKKK
  check "$1: no leftovers" "$(ls "$T/restore-root" 2>/dev/null | tr '\n' ' ')" ""
}

echo SECRET > "$T/key.txt"; echo WRONG > "$T/wrong.txt"
mkbackup DB-FROM-BACKUP good.age; mkbackup "DB CORRUPT" corrupt.age; mkbackup "DB NOTREADY" notready.age; mkbackup "DB OTHERKEY" otherkey.age
PY=""; for candidate in python3 python; do if "$candidate" -c 'import tarfile' 2>/dev/null; then PY=$candidate; break; fi; done
[ -n "$PY" ] || { echo "Python is needed to build the symlink archive"; exit 1; }
"$PY" - "$T/withlink.age" <<'PY'
import sys, tarfile, io
with tarfile.open(sys.argv[1], 'w:gz') as t:
    d = tarfile.TarInfo('bota-backup'); d.type = tarfile.DIRTYPE; t.addfile(d)
    data = b'DB'; f = tarfile.TarInfo('bota-backup/bota.sqlite'); f.size = len(data); t.addfile(f, io.BytesIO(data))
    l = tarfile.TarInfo('bota-backup/uploads'); l.type = tarfile.SYMTYPE; l.linkname = '/etc'; t.addfile(l)
PY

reset; run "$T/good.age" "$T/key.txt"
check "normal: exit code" "$code" 0; check "normal: database from backup" "$(db)" DB-FROM-BACKUP
check "normal: server order-key kept" "$(head -c 4 "$T/root/data/order-key")" KKKK
check "normal: photos from backup" "$(ls "$T/root/data/uploads")" a.webp
check "normal: old data set aside" "$(ls "$T/restore-root" | sed -E 's/[0-9]{8}-[0-9]{6}/TS/')" before-restore-TS

reset; run "$T/corrupt.age" "$T/key.txt"; untouched "corrupt backup"; check_contains "corrupt backup: message" "$out" "повреждена"
reset; run "$T/good.age" "$T/wrong.txt"; untouched "wrong backup key"; check_contains "wrong backup key: message" "$out" "Не удалось расшифровать"
reset; run "$T/otherkey.age" "$T/key.txt"; untouched "orders do not open with order-key"; check_contains "orders do not open: message" "$out" "не расшифровываются текущим order-key"

reset; run "$T/notready.age" "$T/key.txt"
check "not ready after switch: exit code" "$code" 1; check "not ready after switch: old database back" "$(db)" DB-CURRENT
check "not ready after switch: old WAL back" "$(ls "$T/root/data" | tr '\n' ' ')" "bota.sqlite bota.sqlite-wal order-key uploads "
check "not ready after switch: failed attempt kept" "$(ls "$T/restore-root" | sed -E 's/[0-9]{8}-[0-9]{6}/TS/')" failed-restore-TS
check_contains "not ready after switch: message" "$out" "Сайт работает на прежних данных"

reset; echo "$T/root/data/order-key" > "$T/links"; run "$T/good.age" "$T/key.txt"; untouched "order-key is a symlink"; check_contains "order-key symlink: message" "$out" "ссылка"
reset; echo "$T/root/data" > "$T/links"; run "$T/good.age" "$T/key.txt"; untouched "data dir is a symlink"; check_contains "data dir symlink: message" "$out" "ссылка"
reset; mkdir -p "$T/restore-root"; echo "$T/restore-root" > "$T/otherdev"; run "$T/good.age" "$T/key.txt"; untouched "work dir on another partition"; check_contains "other partition: message" "$out" "разных разделах"
reset; run "$T/withlink.age" "$T/key.txt"; untouched "archive with a symlink"; check_contains "archive symlink: message" "$out" "ссылки или особые файлы"
reset; touch "$T/busy"; run "$T/good.age" "$T/key.txt"; untouched "lock busy"; check_contains "lock busy: message" "$out" "Уже идёт"
reset; rm "$T/root/data/order-key"; run "$T/good.age" "$T/key.txt"; check "no order-key: exit code" "$code" 1; check "no order-key: database untouched" "$(db)" DB-CURRENT

reset; head -c 50000000 /dev/zero > "$T/huge.age"
stub df <<'S'
#!/bin/sh
echo "Filesystem 1M-blocks Used Available Use% Mounted"; echo "x 1 1 50 1% /"
S
run "$T/huge.age" "$T/key.txt"; untouched "low disk"; check_contains "low disk: message" "$out" "Мало места"; rm "$B/df"

# A small archive that unpacks into much more (zeros compress ~1000x): the unpacked size decides, not the archive size.
rm -rf "$T/pkg"; mkdir -p "$T/pkg/bota-backup/uploads"; head -c 30000000 /dev/zero > "$T/pkg/bota-backup/bota.sqlite"
tar -czf "$T/bomb.age" -C "$T/pkg" bota-backup
reset; stub df <<'S'
#!/bin/sh
echo "Filesystem 1M-blocks Used Available Use% Mounted"; echo "x 1 1 215 1% /"
S
run "$T/bomb.age" "$T/key.txt"; untouched "unpacks too big"; check_contains "unpacks too big: message" "$out" "Мало места для распаковки"; rm "$B/df"

# The lock lives in a root-only folder: a folder others can write to is refused.
reset; mkdir -p "$T/openlock"; chmod 777 "$T/openlock"
out=$(BOTA_LOCK="$T/openlock/deploy.lock" bash "$SITE/deploy/restore.sh" "$T/good.age" "$T/key.txt" 2>&1); code=$?
untouched "lock folder writable by others"; check_contains "open lock folder: message" "$out" "закрытой для записи"

# A running backup blocks the switch; timers are stopped for the restore and started again afterwards.
reset; stub systemctl <<'S'
#!/usr/bin/env bash
echo "$*" >> "$T/systemctl.log"
case "$*" in
  "show -p ActiveState --value bota-backup.service") [ -f "$T/backup-running" ] && echo activating || echo inactive;;
  "show -p ActiveState --value "*) echo inactive;;
esac
exit 0
S
rm -f "$T/systemctl.log"; touch "$T/backup-running"
out=$(BOTA_JOB_WAIT=2 bash "$SITE/deploy/restore.sh" "$T/good.age" "$T/key.txt" 2>&1); code=$?
untouched "backup still running"; check_contains "backup running: message" "$out" "Не дождался окончания: bota-backup"
check_contains "backup running: timer started again" "$(cat "$T/systemctl.log")" "start bota-backup.timer"
rm -f "$T/backup-running" "$T/systemctl.log"; reset; run "$T/good.age" "$T/key.txt"
check "jobs idle: restore works" "$code" 0; check "jobs idle: database from backup" "$(db)" DB-FROM-BACKUP
log=$(cat "$T/systemctl.log")
check_contains "jobs idle: backup timer paused" "$log" "stop bota-backup.timer"
check_contains "jobs idle: spam timer paused" "$log" "stop bota-spam-purge.timer"
check_contains "jobs idle: timers started again" "$log" "start bota-spam-purge.timer"
printf '#!/bin/sh\nexit 0\n' | stub systemctl

summary
