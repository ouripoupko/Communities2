---
description: Run a full Gloki regression pass — typecheck + browser UI test + design-system lint on recently-changed components
argument-hint: "[optional: specific route or component path]"
---

Run the Gloki verification pipeline. Three subagents, dispatched in parallel where possible, results consolidated into a single report.

**Scope:** $ARGUMENTS (if empty, verify all five stage routes and the most-recently-changed components)

**Pipeline:**

1. **Typecheck** — dispatch `gloki-typecheck-watcher`. Collect pass/fail + error list.

2. **UI regression** — dispatch `gloki-ui-tester` against:
   - `/stage/problem`, `/stage/discussion`, `/stage/proposals`, `/stage/vote`, `/stage/mandate`
   - `/identity/communities`
   - any additional routes named in `$ARGUMENTS`
   Collect screenshots + console-error counts.

3. **Design-system lint** — identify changed components by running `git diff --name-only HEAD~5..HEAD -- 'src/**/*.tsx'` (or use the path in `$ARGUMENTS`). For each, dispatch `gloki-design-system-linter`. Collect per-component PASS/FAIL.

Dispatch steps 1 and 2 in parallel (single message, two Agent calls). Run step 3 after you have the changed-file list.

**Report format:**

```
# /verify-gloki report — <timestamp>

## Typecheck
<one-line status, error count if any>

## UI regression
| Route | Screenshot | Errors | Warnings |
| ... |

## Design-system lint
| Component | Status | Violations |
| ... |

## Next actions
<ordered list of fixes needed, or "clean — safe to merge">
```

Do NOT attempt fixes in this command. This is a verification pass only — surface findings so the user or an implementer agent can address them.
