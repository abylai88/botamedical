#!/usr/bin/env bash
# Tests for deploy/update.sh (bota-update) with stub tools. Run: bash deploy/tests/update.test.sh
# Git Bash on Windows cannot create symlinks, so a copy of the script is used in which the "current" link
# is a file holding the target path. Everything else is the unchanged script.
source "$(dirname "$0")/helpers.sh"
mkdir -p "$T/src/deploy" "$T/srv" "$T/cache"; echo app > "$T/src/package.json"
export BOTA_REPO="$T/repo" BOTA_RELEASES="$T/srv/releases" BOTA_CURRENT="$T/srv/current" BOTA_CACHE="$T/cache" BOTA_LOCK="$T/lock"
sed -e 's|readlink -f "\$CURRENT"|cat "$CURRENT"|g' \
    -e 's|if \[ -L "\$CURRENT" \]|if [ -f "$CURRENT" ]|' \
    -e 's|ln -s "\$dir" "\$CURRENT.new"|echo "$dir" > "$CURRENT.new"|' \
    -e 's|ln -s "\$CACHE/\$name" "\$dir/.next/cache"|echo "$CACHE/$name" > "$dir/.next/cache"|' \
    "$SITE/deploy/update.sh" > "$T/update.sh"
for pat in 'cat "$CURRENT"' 'echo "$dir" > "$CURRENT.new"' 'if \[ -f "$CURRENT" \]' 'echo "$CACHE/$name"'; do
  grep -q "$pat" "$T/update.sh" || { echo "Test seam missing in update.sh: $pat"; exit 1; }
done

stub git <<'S'
#!/usr/bin/env bash
shift 2
case "$1" in pull) exit 0;; rev-parse) cat "$T/sha";; archive) tar -cf - -C "$T/src" .;; esac
S
stub npm <<'S'
#!/usr/bin/env bash
if [ "$1" = ci ]; then mkdir -p node_modules; exit 0; fi
[ -f "$T/buildfail" ] && { echo "build error"; exit 1; }
mkdir -p .next/cache; echo built > .next/BUILD_ID
S
# /readyz fails while "current" points at a release whose commit is listed in $T/badsha.
stub curl <<'S'
#!/usr/bin/env bash
target=$(cat "$T/srv/current")
if [ -f "$T/badsha" ] && grep -qxF "$(cat "$target/.release-ready" 2>/dev/null)" "$T/badsha"; then exit 22; fi
exit 0
S
stub df <<'S'
#!/bin/sh
echo "Filesystem 1M-blocks Used Available Use% Mounted"; echo "x 1 1 $(cat "$T/free" 2>/dev/null || echo 99999) 1% /"
S

run() { out=$(bash "$T/update.sh" "$@" 2>&1); code=$?; }
current() { basename "$(cat "$T/srv/current" 2>/dev/null)" | sed 's/.*-//'; }
releases() { ls "$T/srv/releases" 2>/dev/null | sed 's/.*-//' | tr '\n' ' '; }
caches() { ls "$T/cache" | sed 's/.*-//' | tr '\n' ' '; }
release() { echo "$1" > "$T/sha"; /usr/bin/sleep 1.1; }  # release names carry the time in seconds

release aaaaaaa1; run
check "first install: exit" "$code" 0; check "first install: current" "$(current)" aaaaaaa
run; check "nothing new: exit" "$code" 0; check_contains "nothing new: message" "$out" "Обновлений нет"
for s in bbbbbbb2 ccccccc3 ddddddd4; do release $s; run; check "update to $s: exit" "$code" 0; done
check "keeps 3 releases" "$(releases)" "bbbbbbb ccccccc ddddddd "; check "cache follows releases" "$(caches)" "bbbbbbb ccccccc ddddddd "
check "current is newest" "$(current)" ddddddd

release eeeeeee5; touch "$T/buildfail"; run; rm "$T/buildfail"
check "build fails: exit" "$code" 1; check "build fails: current unchanged" "$(current)" ddddddd; check "build fails: no leftover" "$(releases)" "bbbbbbb ccccccc ddddddd "

release fffffff6; echo fffffff6 > "$T/badsha"; run; rm "$T/badsha"
check "new version not ready: exit" "$code" 1; check "new version not ready: rolled back" "$(current)" ddddddd
check "new version not ready: failed release removed" "$(releases)" "bbbbbbb ccccccc ddddddd "; check_contains "not ready: message" "$out" "прежней версии"

echo 100 > "$T/free"; release ggggggg7; run; rm "$T/free"
check "low disk: exit" "$code" 1; check "low disk: current unchanged" "$(current)" ddddddd; check_contains "low disk: message" "$out" "Мало места"

touch "$T/busy"; release hhhhhhh8; run; check "lock busy, update: exit" "$code" 1; check_contains "lock busy, update: message" "$out" "Уже идёт"
run --rollback; check "lock busy, rollback: exit" "$code" 1; check "lock busy: current unchanged" "$(current)" ddddddd; rm "$T/busy"

run --rollback; check "manual rollback: exit" "$code" 0; check "manual rollback: previous" "$(current)" ccccccc
run --rollback; check "manual rollback again: older" "$(current)" bbbbbbb
run --rollback; check "manual rollback, nothing older: exit" "$code" 1; check "nothing older: current unchanged" "$(current)" bbbbbbb
run --rollback "$(ls "$T/srv/releases" | grep ddddddd)"; check "rollback to named version" "$(current)" ddddddd
echo ccccccc3 > "$T/badsha"; run --rollback "$(ls "$T/srv/releases" | grep ccccccc)"; rm "$T/badsha"
check "rollback target not ready: exit" "$code" 1; check "rollback target not ready: back to previous" "$(current)" ddddddd

rm -rf "$T/srv" "$T/cache"; mkdir -p "$T/srv" "$T/cache"; release iiiiiii9; echo iiiiiii9 > "$T/badsha"; run; rm "$T/badsha"
check "first install not ready: exit" "$code" 1; check_contains "first install not ready: message" "$out" "order-key на месте"

summary
