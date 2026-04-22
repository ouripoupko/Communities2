#!/usr/bin/env bash
# Stop hook: before Claude ends its turn, confirm tsc -b passes.
# Exit non-zero to block Stop and force Claude to keep fixing.

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if ! npx --no-install tsc -b --noEmit 2>&1 | tail -30; then
  echo "Stop blocked: tsc -b failed. Fix the errors before ending the turn."
  exit 2
fi
exit 0
