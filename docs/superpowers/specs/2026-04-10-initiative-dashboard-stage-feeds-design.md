# Initiative Dashboard & Stage Feed Mini-Apps

**Date:** 2026-04-10
**Status:** Design approved, pending implementation plan

## Overview

Six interconnected changes that transform how users interact with initiatives and governance stages:

1. Remove ConcernsFlow from initiative stages
2. New Initiative Dashboard as primary initiative view
3. Stage Feed Mini-Apps replacing card-list feeds
4. Test data seeding for Eston's Test Community
5. Conviction Staking system for Mandate stage
6. Problem vote UI polish

**Approach:** Evolutionary — reuse existing contract-backed flow components (ProblemVoteFlow, ApprovalFlow, QVFlow, DiscussionFlow) and recompose them into two new contexts: the Initiative Dashboard and the Stage Feed Mini-Apps.

---

## 1. Remove ConcernsFlow

Remove ConcernsFlow from the initiative pipeline stages. The component files remain in the codebase but are disconnected from PipelineView.

**Changes in `PipelineView.tsx`:**
- Delete import of ConcernsFlow (line 14)
- Delete `showConcerns` / `setShowConcerns` state (line 74)
- Delete "Raise Concern" / "Hide Concerns" toggle button (lines 376-379)
- Delete concerns panel conditional render + ErrorBoundary wrapper (lines 383-396)

**No other components reference ConcernsFlow.** Safe, isolated removal.

---

## 2. Initiative Dashboard

New component replacing PipelineView as the default view when clicking an initiative from the community page.

**Route:** `/initiative/:host/:agent/:communityId/:initiativeId` (same URL, new component)

### Layout (top to bottom)

**Header:**
- Back button to community page
- Initiative title (prominent)
- Initiative description
- Community name

**Stage Progress Bar:**
- 5 connected steps: green = completed, blue = current, grey = locked
- More prominent than current PipelineView progress dots since this is the primary view

**Stage Cards (vertically stacked, all 5 visible):**

Each card shows:
- Stage name + status badge (Completed / Active / Locked)
- Country/region participation: small flag row showing top 3-5 participating countries with participation counts

**Card states:**

| State | Appearance | Interaction |
|-------|-----------|-------------|
| Completed | Full metrics summary, country data, final results | View-only |
| Active | Expanded with full interaction or navigation | Interactive |
| Locked | Greyed out, shows what will be tracked, no data | None |

### Active stage behavior by type

**Voting stages (inline on dashboard — no sub-view):**

- **Problem (active):** Up/down vote buttons with tally, threshold progress bar (67%), country breakdown of voters
- **Proposals (active):** List of proposals with approve/withdraw buttons, approval counts, country-segmented results. Input to add new proposals.
- **Vote (active):** Credit allocation with +/- buttons per proposal, sqrt influence display, budget tracker, submit button. Country-segmented results.

**Text-input stage (link to dedicated sub-view):**

- **Discussion (active):** Summary card showing comment count, participation rate (% of members), top participating countries. "Join Discussion" button opens dedicated threaded discussion view.

**Conviction staking (inline on dashboard):**

- **Mandate (active):** Conviction staking interface rendered inline — amount field, duration selector, stake button, aggregate stats, country breakdown. See Section 5 for full specification.

### Completed stage summaries

- **Problem:** Final vote tally (X up / Y down), threshold result, participating countries
- **Discussion:** Total comments, participation rate achieved, top contributors by country
- **Proposals:** Number of proposals, top approved proposals with counts, country breakdown
- **Vote:** Winning proposal(s), vote weight distribution, credit allocation summary, country breakdown
- **Mandate:** Total conviction weight, number of stakers, duration distribution, country breakdown

---

## 3. Stage Feed Mini-Apps

The 5 global nav bar tabs evolve from initiative card lists into purpose-built participation interfaces. Each feed pulls initiatives from across all communities.

Country/region participation indicators appear on every card in every feed.

### Problem Feed (`/stage/problem`)

- Cards: initiative title, description snippet, community name, country flags of participants
- Inline: up/down vote buttons with tally and threshold progress bar
- Sort/filter: most active, newest, closest to threshold

### Discussion Feed (`/stage/discussion`)

- Cards: initiative title, comment count, participation rate, top participating countries
- Preview: latest comment or most-replied thread snippet
- Tap card → opens dedicated discussion view for that initiative
- No inline text input from the feed

### Proposals Feed (`/stage/proposals`)

- Cards: initiative title, number of proposals, user's approval status
- Inline: approve/withdraw buttons per proposal, approval counts, country-segmented results
- Expandable cards to see all proposals without leaving feed

### Vote Feed (`/stage/vote`)

- Cards: initiative title, proposals with current vote weights
- Inline: credit allocation +/- buttons per proposal, budget tracker, sqrt display
- Submit allocation button per initiative
- Country-segmented results

### Mandate Feed (`/stage/mandate`)

- Cards: mandate title, description, total conviction weight, duration distribution
- Inline: conviction staking — amount + lock duration selector, stake button
- Show user's current stake if active
- Country breakdown of conviction support

### Shared behavior

- Real initiatives from real communities (sample data only as empty-state fallback)
- Gamification noted as future direction — not implemented in this spec

---

## 4. Test Data Seeding

Create 5 test initiatives in "Eston's Test Community", one at each stage, with realistic seed data for immediate interactivity.

### Initiative 1 — Problem stage: "Global Water Access Crisis"
- Pre-seeded: a few up/down votes from mock participants across 3-4 countries
- Threshold not yet met — user can vote and see progress move

### Initiative 2 — Discussion stage: "Misinformation & Democratic Integrity"
- Problem stage: completed (threshold met, shows summary)
- Discussion: seeded with 5-8 threaded comments from mock participants across countries
- Participation threshold partially met — room for user to join

### Initiative 3 — Proposals stage: "Youth Employment & Education"
- Problem + Discussion: completed with summaries
- Proposals: 3-4 proposals seeded with some approvals, country-segmented
- User can add proposals, approve/withdraw

### Initiative 4 — Vote stage: "Digital Privacy Standards"
- Problem + Discussion + Proposals: completed with summaries
- Top 3 proposals carried forward
- Some credit allocations seeded from mock participants
- User can allocate credits and see quadratic math in action

### Initiative 5 — Mandate stage: "Universal Climate Adaptation Fund"
- All prior stages: completed with summary data
- Ready for conviction staking interaction

### Implementation
- Seed data created on first load of Eston's Test Community if initiatives don't already exist
- Uses real contract deploys so interactions are persistent
- Seed data includes country attribution for all mock participants

---

## 5. Conviction Staking (Mandate Stage)

Time-weighted conviction signaling for mandates that have passed all governance stages.

### Mechanism

- User chooses an amount of community currency to stake
- User selects lock duration: 1 week, 1 month, 3 months, 6 months, 1 year
- **Conviction weight** = amount x duration multiplier:
  - 1 week = 1x
  - 1 month = 2x
  - 3 months = 4x
  - 6 months = 7x
  - 1 year = 12x
- Staked amount is locked for chosen duration — cannot be unstaked early
- Conviction accumulates: linear ramp-up to full weight over first week after staking
- One active stake per user per mandate (can increase but not decrease)

### UI (used in both Initiative Dashboard and Mandate Feed)

**Staking input:**
- Amount field (validated against currency balance)
- Duration selector (dropdown or segmented control)
- Preview: "Your conviction weight: X" before confirming
- "Stake" button

**Active stake display:**
- Amount staked, duration remaining, current conviction weight

**Community aggregate:**
- Total conviction weight across all stakers
- Number of stakers
- Duration distribution chart (how many at each lock tier)
- Country breakdown of staking participation

### Contract: `conviction_contract.py`

**Methods:**
- `stake(amount, duration)` — create or increase a stake
- `get_stakes()` — all stakes for this mandate
- `get_my_stake()` — caller's stake record
- `get_total_conviction()` — aggregate conviction weight
- `get_conviction_by_country()` — conviction weight grouped by country

**Storage:**
- Stake records: `{ publicKey, amount, duration, timestamp, country }`
- Weight calculated on read from timestamp + duration multiplier + ramp-up

### Constraints
- No early unstaking in v1 (penalty-based early exit is a future option)
- Currency balance checked before staking
- One active stake per user per mandate (can increase, not decrease)

---

## 6. Problem Vote UI Polish

The problem vote buttons are already contract-backed and functional. This section adds visual feedback and reactivity.

**Changes:**
- **Optimistic tally update:** On button press, immediately increment/decrement the displayed tally before the contract write completes
- **Button animation:** Scale or color pulse on press for tactile feedback
- **Loading state:** Disable both buttons while contract write is in flight
- **Rollback:** If contract write fails, revert to previous tally and show brief error indication
- **Applies to both** StageFeedView inline voting and Initiative Dashboard problem voting

---

## Architecture Notes

### Component reuse strategy

Existing flow components are reused in new contexts:

| Component | Initiative Dashboard | Stage Feed |
|-----------|---------------------|------------|
| ProblemVoteFlow | Inline in active Problem card | Inline in Problem Feed cards |
| DiscussionFlow | Link to sub-view | Tap-through from Discussion Feed |
| ApprovalFlow | Inline in active Proposals card | Inline in Proposals Feed cards |
| QVFlow | Inline in active Vote card | Inline in Vote Feed cards |
| ConvictionStaking (new) | Inline in active Mandate card | Inline in Mandate Feed cards |

Flow components may need prop adjustments to support both compact (feed card) and expanded (dashboard) display modes.

### Country data integration

- Extend `ProblemVoteFlow` and `DiscussionFlow` to track/display country participation (ApprovalFlow and QVFlow already have this)
- Country data sourced from user profiles (`state.communities.profiles[publicKey].country`)
- Display uses existing `getCountryColor()`, `getCountryName()` utilities from `src/utils/countries.ts`

### Routing changes

```
/initiative/:host/:agent/:communityId/:initiativeId → InitiativeDashboard (was PipelineView)
/initiative/:host/:agent/:communityId/:initiativeId/discussion → DiscussionView (sub-view)
/initiative/:host/:agent/:communityId/:initiativeId/mandate → MandateView (sub-view, if needed)
/stage/:stageId → StageFeedView (same URL, redesigned internals)
```
