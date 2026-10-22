#!/usr/bin/env bash
# Tests for deploy/spam-purge.sh (bota-spam-purge) with a real SQLite database. Needs the sqlite3 command;
# without it the test is skipped (CI installs it).
source "$(dirname "$0")/helpers.sh"
if ! command -v sqlite3 >/dev/null; then
  if [ -n "${CI:-}" ]; then echo "spam-purge.test.sh: sqlite3 is required in CI"; exit 1; fi
  echo "spam-purge.test.sh: skipped (no sqlite3)"; exit 0
fi
export BOTA_DATA_DIR="$T/data"; mkdir -p "$BOTA_DATA_DIR"
db="$BOTA_DATA_DIR/bota.sqlite"
old=$(date -u -d '40 days ago' +%Y-%m-%dT%H:%M:%S.000Z); fresh=$(date -u -d '10 days ago' +%Y-%m-%dT%H:%M:%S.000Z)
sqlite3 "$db" "CREATE TABLE orders (id TEXT PRIMARY KEY, created TEXT NOT NULL, status TEXT NOT NULL, payload TEXT NOT NULL);
  INSERT INTO orders VALUES ('old-spam', '$old', 'spam', 'x'), ('old-real', '$old', 'new', 'x'), ('fresh-spam', '$fresh', 'spam', 'x');"

past=$(( $(date +%s) * 1000 - 60000 )); future=$(( $(date +%s) * 1000 + 3600000 ))
sqlite3 "$db" "CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
  CREATE TABLE used_form_tokens (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL);
  INSERT INTO rate_limits VALUES ('ip-old', 1, $past), ('ip-live', 1, $future);
  INSERT INTO used_form_tokens VALUES ('t-old', $past), ('t-live', $future);"

out=$(bash "$SITE/deploy/spam-purge.sh" 2>&1); check "purge: exit" "$?" 0
check_contains "purge: expired service rows reported" "$out" "истёкшим сроком: удалено 2"
check "purge: expired IP hashes gone, live kept" "$(sqlite3 "$db" 'SELECT key FROM rate_limits')" ip-live
check "purge: expired form tokens gone, live kept" "$(sqlite3 "$db" 'SELECT hash FROM used_form_tokens')" t-live
check_contains "purge: reports count" "$out" "удалено 1"
check "purge: old spam gone, the rest kept" "$(sqlite3 "$db" 'SELECT id FROM orders ORDER BY id' | tr '\n' ' ')" "fresh-spam old-real "
out=$(bash "$SITE/deploy/spam-purge.sh" 2>&1); check_contains "purge again: nothing to remove" "$out" "удалено 0"
out=$(BOTA_SPAM_KEEP_DAYS="1; DROP TABLE orders" bash "$SITE/deploy/spam-purge.sh" 2>&1); check "bad days value: refused" "$?" 1
check "bad days value: table intact" "$(sqlite3 "$db" 'SELECT count(*) FROM orders')" 2
out=$(BOTA_DATA_DIR="$T/missing" bash "$SITE/deploy/spam-purge.sh" 2>&1); check "no database yet: not an error" "$?" 0
check_contains "no database yet: message" "$out" "очищать нечего"
summary
