# shellcheck shell=bash
# shellcheck disable=SC2034 # SITE и счётчики используются в тестах, которые подключают этот файл
# Shared helpers for the deploy script tests. The tests replace system tools (systemctl, curl, age, sqlite3,
# sudo, flock, …) with stubs, so they run without root, on Linux or in Git Bash on Windows.
# Git Bash cannot create symlinks or apply POSIX modes, therefore:
#   - the stat stub reports "symbolic link" for paths listed in $T/links (the scripts detect links via stat);
#   - the flock stub reports "busy" while $T/busy exists;
#   - the mkdir stub drops -m.
SITE=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
T=$(mktemp -d); B="$T/bin"; mkdir -p "$B"
trap 'rm -rf "$T"' EXIT
export T PATH="$B:$PATH"
failures=0 passes=0

stub() { cat > "$B/$1"; chmod +x "$B/$1"; }
check() { # description actual expected
  if [ "$2" = "$3" ]; then passes=$((passes + 1)); else failures=$((failures + 1)); echo "  FAIL: $1 — got [$2], expected [$3]"; fi
}
check_contains() { # description haystack needle
  case "$2" in *"$3"*) passes=$((passes + 1));; *) failures=$((failures + 1)); echo "  FAIL: $1 — output has no [$3]"; echo "$2" | sed 's/^/    | /';; esac
}
summary() { echo "$(basename "$0"): $passes passed, $failures failed"; [ "$failures" = 0 ]; }

stub systemctl <<'S'
#!/bin/sh
exit 0
S
stub id <<'S'
#!/bin/sh
echo 0
S
for s in chown pkill sleep; do printf '#!/bin/sh\n:\n' | stub "$s"; done
stub flock <<'S'
#!/bin/sh
[ -e "$T/busy" ] && exit 1; exit 0
S
stub stat <<'S'
#!/usr/bin/env bash
fmt=$2; p=${@: -1}
if [ "$fmt" = %F ] && grep -qxF -- "$p" "$T/links" 2>/dev/null; then echo "symbolic link"; exit 0; fi
if [ "$fmt" = %d ] && grep -qxF -- "$p" "$T/otherdev" 2>/dev/null; then echo 999; exit 0; fi
if [ "$fmt" = %U ]; then echo root; exit 0; fi
exec /usr/bin/stat "$@"
S
stub mkdir <<'S'
#!/usr/bin/env bash
args=(); while [ $# -gt 0 ]; do case "$1" in -m) shift;; *) args+=("$1");; esac; shift; done
exec /usr/bin/mkdir "${args[@]}"
S
stub install <<'S'
#!/usr/bin/env bash
while [ "${1:0:1}" = - ]; do case "$1" in -o|-g|-m) shift;; esac; shift; done
/usr/bin/mkdir -p "$@"
S
stub sudo <<'S'
#!/usr/bin/env bash
while [ "${1:0:1}" = - ]; do [ "$1" = -u ] && shift; shift; done
[ "$1" = env ] && { shift; [ "$1" = -i ] && shift; while [[ "$1" == *=* ]]; do export "$1"; shift; done; }
exec "$@"
S
