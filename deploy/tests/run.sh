#!/usr/bin/env bash
# Runs all deploy script tests (stub tools, no root needed). Run: npm run test:deploy
cd "$(dirname "$0")" || exit 1
status=0
for t in backup restore update; do bash "./$t.test.sh" || status=1; done
exit $status
