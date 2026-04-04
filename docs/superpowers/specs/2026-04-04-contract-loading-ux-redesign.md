# Contract Loading, UX Redesign & Design System

**Date:** 2026-04-04
**Status:** Approved
**Scope:** Fix contract loading failures, expand country list, redesign homepage, establish design system, polish initiative pipeline

---

## 1. Resilient Contract Loading

### Problem

`useFlowContract` calls `deployContract()` but the promise never resolves or rejects for flow contracts. Users see "Deploying contract..." forever with no recovery path. This affects both pipeline (shared) and collab (per-user) flows — every flow, every time.

Community contract deployment works fine using the same API and same `fetchWithTimeout` utility, ruling out server connectivity or auth issues.

### Root Causes

1. **No deploy-level timeout** — `fetchWithTimeout` has a 10s timeout, but if the response status arrives (HTTP 200) and the body stalls, `response.json()` hangs indefinitely past the abort window.
2. **Cancellation drops results silently** — if React re-renders the component, the cleanup sets `cancelled = true`. The in-flight deploy's `.then()` silently returns, and `isDeploying` stays stuck in Redux forever.
3. **No "stuck deploying" recovery** — on component mount, if Redux says `isDeploying = true` from a previous failed attempt, the guard `if (isDeploying) return` blocks all future attempts.
4. **No diagnostic visibility** — nothing in console tells you where deployment stalled.

### Fixes

#### A. Deploy timeout in useFlowContract

Add a secondary timeout (30s) inside the hook. If the deploy promise doesn't settle within 30s, force the error state:

```
setTimeout → if still deploying after 30s → setHasError(true), clearDeploying, log warning
```

Cleanup: clear the timeout on unmount or when deploy completes.

#### B. Fix cancellation race condition

In the `.then()` (success) path: still dispatch `setContract` even if `cancelled` is true. The contract was deployed on the server regardless of whether the component unmounted — we should cache the result in Redux. Redux dispatch is safe after unmount since the store is global.

In the `.catch()` (error) path: keep the `if (cancelled) return` guard. We don't want to show error UI for intentionally cancelled operations.

Change `.then()` from:
```typescript
if (cancelled) return;
dispatch(setContract({ instanceId, contractId: id }));
```
To:
```typescript
// Always cache — the contract exists on the server regardless of component lifecycle
dispatch(setContract({ instanceId, contractId: id }));
```

#### C. Stale deploying recovery

On mount, if `isDeploying` is already `true` in Redux but no deploy is actually running (`attempted.current` is `false`), clear the stale flag and allow a fresh attempt.

```typescript
// At the start of the effect, before the guard:
if (isDeploying && !attempted.current) {
  dispatch(clearDeploying({ instanceId }));
  return; // Will re-run on next render with isDeploying = false
}
```

#### D. Diagnostic logging

Add `console.log` breadcrumbs at each stage:

- `[FlowContract] Deploying ${contractName} for ${instanceId}...`
- `[FlowContract] Deploy response received: ${JSON.stringify(response).slice(0,200)}`
- `[FlowContract] Contract ID extracted: ${id}`
- `[FlowContract] ERROR: ${err.message}`
- `[FlowContract] TIMEOUT: Deploy did not complete within 30s`

#### E. Increase fetchWithTimeout for deploys

Contract deployment is heavier than reads. Increase the timeout from 10s to 30s for `deployContract` specifically by passing a longer timeout parameter.

### Files Changed

- `src/components/collaboration/flows/shared/useFlowContract.ts` — timeout, cancellation fix, stale recovery, logging
- `src/services/api.ts` — increase deploy timeout (optional: make timeout a parameter of `deployContract`)

---

## 2. Country List Expansion

### Current State

4 pilot countries (Kenya, Nigeria, Malawi, DR Congo) + "Other" in `src/utils/countries.ts` (39 lines). Used in Profile country selector, ApprovalFlow country-segmented results, and member CountryBadge.

### Change

Replace with a complete list of ~249 countries/territories (ISO 3166-1). Includes all UN members, observer states, and territories (Puerto Rico, Hong Kong, etc.).

### Details

- `PILOT_COUNTRIES` → `COUNTRIES` — full sorted array with `{ code, name, flag }` for each entry
- `COUNTRY_COLORS` → algorithmic color generation from country code hash. Keep manual overrides for the 4 original pilot countries.
- Profile country selector becomes a **searchable dropdown** — typing "Ger" filters to Germany instead of scrolling through 249 items in a raw `<select>`
- ApprovalFlow country breakdown still works unchanged — groups by whatever countries voters have set
- `getCountryByCode()`, `getCountryFlag()`, `getCountryName()` — same API signature, just more data

### Files Changed

- `src/utils/countries.ts` — full country list, algorithmic colors
- `src/components/identity/Profile.tsx` — searchable country dropdown
- Flow components using country display — no API changes needed

---

## 3. Homepage Redesign

### Current State

"Gloki" wordmark + slide-out `HomepageMenu`. Communities displayed in a card grid as the default landing page. Profile, Join, Create accessed via menu. Initiative pipeline is buried 3 levels deep (homepage → community → initiative tab → click initiative → pipeline).

### Design Principle

Initiative flow is the core experience. Everything else is useful but secondary.

### Navigation Hierarchy Shift

- **Homepage becomes an initiative feed** — shows active initiatives across all communities, sorted by activity/stage. Each card shows: initiative name, community name, current pipeline stage, participation count.
- **Communities grid** moves to a secondary view accessible via a tab or icon in the header. Still important, just not the landing page.
- **Profile, Join, Create** stay in the hamburger menu — infrequent actions.

### Layout

- **Single-column feed** on mobile — easier to scan, thumb-friendly, follows mobile feed conventions.
- Each initiative card is **tappable** → navigates directly to its pipeline view.
- **Community grouping** optional — toggle between "all initiatives" flat feed and "grouped by community" view.

### Activity Surface

- No separate activity page. **Activity indicators live on initiative cards** — "3 new votes," "Discussion threshold reached," stage progress bar.
- The homepage IS the activity view.

### What Moves Behind Icons/Menus

- Collab, Chat, Currency, Members — accessible from within a community, not on homepage
- Community management (create, join, settings) — stays in hamburger menu

### Files Changed

- `src/pages/IdentityView.tsx` — new default route to initiative feed
- `src/components/identity/Communities.tsx` — becomes secondary view
- New: `src/components/identity/InitiativeFeed.tsx` — initiative feed component
- `src/components/identity/HomepageMenu.tsx` — updated menu structure
- Routing updates in `App.tsx`

---

## 4. Design System

### Current State

Solid token foundation in `src/styles/variables.scss` (79 lines). All components use SCSS modules importing tokens. Dark mode supported. But no documented standards — Currency, Profile, popups, flow UIs each have their own feel.

### Design System Document

Create `DESIGN_SYSTEM.md` in project root covering:

#### Component Patterns

Standardize the recurring UI elements:

- **Cards** — consistent padding (`$spacing-lg`), radius (`$radius-lg`), shadow (`$shadow-base`), hover state. Used for initiatives, communities, members.
- **Buttons** — primary (blue filled), secondary (outline), destructive (red), ghost (text-only). Three sizes: sm (32px), md (40px), lg (48px).
- **Form inputs** — text, select, searchable dropdown. Consistent height (40px), border (`$gray-200`), focus ring (`$primary` with 2px offset).
- **Modals/popups** — centered overlay, consistent header/body/footer structure, backdrop blur.
- **Loading states** — spinner + message, centered in container.
- **Error states** — error icon + message + retry button, same layout everywhere.
- **Empty states** — icon + descriptive message + CTA button.

#### Spacing Rhythm

Enforce the existing scale consistently:

- `$spacing-sm` (8px) within components (between label and input, between icon and text)
- `$spacing-lg` (16px) between sibling components
- `$spacing-xl` (24px) for section breaks
- No ad-hoc pixel values

#### Mobile-First Patterns

- Touch targets minimum 44x44px (Apple HIG)
- Bottom-anchored primary actions (thumb zone)
- Swipe navigation where it exists stays — no new swipe gestures, prefer taps
- No hover-dependent interactions on mobile
- Content padding 16px from screen edges

#### Typography Hierarchy

- Page title: `$text-xl` (20px) semibold
- Section header: `$text-lg` (18px) medium
- Body: `$text-sm` (14px) normal
- Caption/meta: `$text-xs` (12px) in `$gray-400`

#### Color Usage Rules

- Blue (`$primary`) for interactive/actionable elements only
- Green (`$success`) for positive outcomes, thresholds met
- Red (`$error`) for destructive actions and failures only
- Gray for secondary/disabled content
- No new colors without adding to the token system

### What This Is Not

- No new component library or framework — use what exists, just consistently
- No Storybook or component catalog — overkill for this stage
- The doc is a reference for development, not enforced by tooling

### Files Changed

- New: `DESIGN_SYSTEM.md` — reference document
- Existing components updated incrementally as they're touched

---

## 5. Initiative Pipeline UX Polish

### Current State

5 stages with "Global Problem" → "Global Solution" labels. Each stage renders a flow component. Navigation between stages via `viewStage`. Functional but lacks visual polish and clarity.

### Improvements

#### Stage Progress Visualization

- Horizontal progress bar at top showing all 5 stages as connected dots/nodes
- Current stage highlighted, completed stages filled, future stages dimmed
- Tappable dots to jump between stages (same as current `viewStage` mechanic)

#### Voting UX (ApprovalFlow + QVFlow)

- Clearer vote counts — big numbers, not buried in text
- Progress toward threshold as a **fill bar** (e.g., "67% needed, currently at 45%")
- Your vote status clearly indicated — "You voted: Approve" with option to change
- Country breakdown as a compact horizontal stacked bar, not a verbose list

#### ProblemVoteFlow

- Upvote/downvote as clear thumb icons with count
- Simple progress bar toward 67% threshold
- "X more votes needed" helper text

#### ConcernsFlow Sidebar

- Concern count badge visible at all stages
- Unresolved concerns highlighted in amber (`$warning`)
- Resolved concerns collapsed by default

#### Consistent Flow Chrome

- Every flow gets the same header: flow name + brief description of what this stage does
- Same card container styling (from design system Section 4)
- Same loading/error states (from Section 1)

### Files Changed

- `src/pages/collaboration/PipelineView.tsx` — stage progress bar
- `src/components/collaboration/flows/voting/ApprovalFlow.tsx` — vote UX improvements
- `src/components/collaboration/flows/voting/QVFlow.tsx` — vote UX improvements
- `src/components/collaboration/flows/voting/ProblemVoteFlow.tsx` — thumb voting UI
- `src/components/collaboration/flows/concerns/ConcernsFlow.tsx` — badge + collapse
- Associated `.module.scss` files for each

---

## Implementation Order

1. **Contract loading fixes** (Section 1) — unblocks everything else
2. **Design system doc** (Section 4) — establishes standards before UI work
3. **Country expansion** (Section 2) — data change, lower risk
4. **Initiative pipeline polish** (Section 5) — applies design system to core flow
5. **Homepage redesign** (Section 3) — largest change, depends on pipeline being solid

---

## Out of Scope

- Server-side contract deployment debugging (needs server access)
- Test framework setup (no test framework per CLAUDE.md)
- Automated test user agents (would need server-side test infrastructure)
- Chat persistence (separate concern)
- Mandate pledge wiring (Step 5 contract storage)
