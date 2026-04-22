#!/usr/bin/env bash
# SessionStart hook: print the most-recent plan so Claude re-grounds on active work.

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
latest=$(ls -t docs/superpowers/plans/*.md 2>/dev/null | head -1)
if [[ -n "$latest" ]]; then
  echo "Most recent plan: $latest"
fi
tasks=$(ls -t UI_TASKS.md 2>/dev/null | head -1)
if [[ -n "$tasks" ]]; then
  echo "Scoped UI tasks: $tasks"
fi
exit 0
