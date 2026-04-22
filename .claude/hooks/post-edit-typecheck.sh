#!/usr/bin/env bash
# PostToolUse hook: re-run tsc -b --noEmit only when a .ts/.tsx was just edited.
# Exits 0 regardless — the tsc output is informational and feeds back to Claude.

file=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)
if [[ "$file" =~ \.(ts|tsx)$ ]]; then
  cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
  echo "--- tsc -b --noEmit (triggered by $file) ---"
  npx --no-install tsc -b --noEmit 2>&1 | tail -25
fi
exit 0
