# Initiative Roles & Collaboration — Design

**Date:** 2026-04-20
**Block:** A of 4 (see `2026-04-20-initiative-pathway-redesign-backlog.md` for B, C, D)
**Status:** Design — awaiting user review, then implementation plan

## 1. Purpose

Make intra-initiative collaboration legible. Today, the interaction between initiative authors, contributors, suggesters, and approvers is muddled: `ModificationSuggestions` exists contract-side but authors can't actually accept/reject from the UI; there's no concept of a co-author or expert; and alternative directions for an initiative have no primitive — people either fork off into a separate initiative (fragmenting support) or stay silent.

Block A introduces three new primitives to the Discussion and Proposals stages:

- **Earned roles** — co-author and expert, awarded through contribution and community endorsement (not self-declaration).
- **Edit Suggestions** (wiring an existing contract) — the author/co-authors can accept or reject each suggestion; acceptance promotes the suggester to co-author.
- **Merge Proposals** — a new cross-initiative primitive for coalition-building. Anyone can propose merging one initiative into another; the community votes; the target author/co-authors finalize.

This block delivers the data and UI that later blocks build on (Block B's Vote graduation consumes role counts; Blocks C, D are downstream).

## 2. Role model

Roles are **earned**, not assigned:

| Role | How awarded | Powers |
|---|---|---|
| Author | Creates the initiative | Accept/reject suggestions + merge proposals. Cannot be revoked. |
| Co-author | Your Edit Suggestion or Merge Proposal was accepted | Same as Author: accept/reject suggestions + merge proposals. |
| Expert | Received endorsements from ≥ `EXPERT_THRESHOLD` (default 3) other members on this initiative | Reputational. Shown with chip. Counts toward Block B's Vote graduation. |

Expert endorsement is **per-initiative**, not global — mapping the mockups' domain-specific credibility ("Marine Ecologist on this plastics treaty").

## 3. Merge proposal semantics

A merge proposal is a **relationship between two existing initiatives**, requesting that the source be absorbed into the target:

- **Anyone** can propose a merge (not just the author of the source initiative).
- The proposer names the **source initiative** (must be one that exists) and writes a rationale.
- **Stage gate:** Both source and target must be in `problem`, `discussion`, or `proposals`. Merges are blocked once either initiative has reached `vote` or `mandate`.
- **Community vote:** Everyone can vote `for` or `against` the merge. Votes carry signal but are not binding. Most visible during the Proposals stage (when alternatives are under active comparison).
- **Author decide:** Target initiative's author or any co-author makes the final call. Decision window: 14 days from proposal; auto-expires if unresolved.
- **On acceptance:**
  - Source initiative's `status` becomes `merged_into`, with `mergedInto` pointing to the target's id.
  - Source becomes read-only; a banner redirects supporters to the target.
  - Proposer + source initiative's co-authors become co-authors of the target.
  - Source initiative's supporters (anyone who upvoted Problem, commented in Discussion, approved a Proposal) get an in-app notification.

## 4. Architecture

Hybrid approach (chosen over minimal-extension and fully-composable alternatives):

- **Roles live in `initiative_contract.details`** — flat key-value, part of the initiative's identity.
- **Merge proposals get a new `merge_contract.py`**, deployed per-initiative via the existing shared-contract pattern (matches how `problem`, `discussion`, `proposals`, etc. are sub-contracts of an initiative).
- **`modification_contract` stays as-is** (already contract-complete); only the UI wiring changes.

### 4.1 `initiative_contract.py` — added fields

Backward compatible. Existing initiatives read missing fields as defaults.

```
details.coAuthors:      [public_key, ...]          # default []
details.experts:        [public_key, ...]          # default []
details.endorsements:   { public_key: [endorser, ...] }   # default {}
details.mergeContractId: str | None                # set when merge_contract deployed
details.status:         'active' | 'merged_into' | 'archived'   # default 'active'
details.mergedInto:     str | None                 # set when status becomes merged_into
```

### 4.2 `initiative_contract.py` — added methods

- `add_co_author(public_key)` — intended for cross-contract invocation from `modification_contract` and `merge_contract` acceptance flows. Exact gating mechanism (caller-identity check) to be confirmed during implementation against Gloki's contract patterns; if cross-contract calls cannot authenticate cleanly, fall back to a `pending_co_author_claims` queue that the frontend resolves on next load. Idempotent (no-op if already a co-author).
- `endorse_expert(public_key)` — anyone can call. Records `caller → public_key` in endorsements. When endorsement count reaches `EXPERT_THRESHOLD`, adds to `experts[]`. Blocks self-endorsement.
- `unendorse_expert(public_key)` — remove own endorsement; demote target from experts[] if count falls below threshold.
- `mark_merged_into(target_id)` — internal use only. Sets status = `merged_into`, mergedInto = target_id. Callable only by this initiative's author/co-authors (protects against hostile merge claims).
- `get_roles()` — returns `{author, coAuthors, experts, endorsementCounts, status, mergedInto}`.

### 4.3 `merge_contract.py` — new contract

Deployed per-initiative. Stores merge proposals *targeting* this initiative.

```python
# Proposal entry shape:
# {
#   id: int,
#   sourceInitiativeId: str,
#   proposer: str,
#   rationale: str,
#   communityVotes: { public_key: 'for' | 'against' },
#   status: 'pending' | 'accepted' | 'rejected' | 'expired',
#   createdAt: int,
#   decisionDeadline: int,     # createdAt + 14 days
#   decidedAt: int | None,
#   decidedBy: str | None
# }
```

Methods:

- `propose_merge(source_initiative_id, rationale)` — anyone. Records new proposal.
- `vote_on_merge(merge_id, vote)` — `for` | `against`. One vote per user, overwrites on re-vote.
- `author_decide_merge(merge_id, decision)` — `accept` | `reject`. Gated: caller must be target initiative's author or any co-author (read from target details). Any single author/co-author can decide unilaterally — no consensus required among co-authors. On accept, call `mark_merged_into` on source and `add_co_author` for proposer + source co-authors on target.
- `get_merge_proposals()` — returns list of all proposals, with computed `forCount` / `againstCount`.

### 4.4 `modification_contract.py` — wiring only

No contract changes. Frontend changes:

- Call `set_author(originalAuthor)` once when initiative is created (wire via `useFlowContract` on first deploy).
- Pass `originalAuthor` prop through `ModificationSuggestions` → `authorDecideButtons` component. Broaden the effective accept/reject permission to `author OR co_author` (UI-side gate matches contract-side).
- On `author_decide(accepted=true)`, cross-contract call to `add_co_author(suggestion.author)`.

## 5. UI design

### 5.1 Collaboration Panel (inline on Discussion + Proposals stage cards)

New component: `CollaborationPanel.tsx`.

Compact view — rendered on each active stage card in `InitiativeDashboard`, above/below the stage's existing flow:

```
┌─ Collaboration ────────────────────────────┐
│  [Icon] 130 Edit Suggestions    [View →]   │
│  [Icon] 14 Merge Proposals      [View →]   │
└─────────────────────────────────────────────┘
```

Full view — new subroute `/initiative/:host/:agent/:communityId/:initiativeId/collaboration` (pattern matches existing `/discussion` sub-route). Tabs: **Edit Suggestions** | **Merge Proposals**. Each tab scrolls a list of cards.

### 5.2 Edit Suggestion card

Shows suggester (avatar + name + AI-assist icon if applicable), timestamp, suggested text, community up/down tally. For author/co-authors, Accept + Reject buttons. For others, only the tally is visible.

### 5.3 Merge Proposal card

Shows source initiative title (linked) + source stage badge, proposer, rationale paragraph, community for/against bar with percentages. Community vote buttons for all users. Accept + Reject buttons for target author/co-authors only. Footer: "decision due in N days" if pending.

### 5.4 Submit merge modal

Triggered from a "Propose Merge" CTA on any active initiative page. Modal content:

- Dropdown: "Which of your initiatives should be merged into this one?" — populated with caller's own-authored initiatives in eligible stages. If caller has none eligible, shows "You need an initiative in Problem/Discussion/Proposals to propose a merge."
- Textarea: rationale (min 50 chars).
- Submit → creates proposal; modal closes; confirmation toast.

Note: we allow non-author proposers per our decision — so dropdown also includes initiatives the caller is a co-author of. Future: optional "create a new initiative to merge" path, out of scope here.

### 5.5 Role display

- **Initiative Dashboard header:** row beneath title with Author avatar + "Author" chip, co-author avatars (+N overflow), expert avatars with endorsement-count badge. Click → member drawer.
- **Flow participant displays:** wherever we render a participant (DiscussionFlow, ApprovalFlow, QVFlow, ConvictionStaking), name is followed by role chip if applicable (`author`, `co-author`, `expert`).
- **Self-awareness banner:** on any initiative page, if the viewer is a co-author, a small banner near the top: *"You're a co-author. You can accept edit suggestions and merge proposals."*

### 5.6 Expert endorsement UX

- On any participant's avatar/name (except your own), "Endorse as expert" affordance (icon button, tooltip). Clicking → optimistic update, calls `endorse_expert`.
- Endorsement count badge visible on participant chip: `3 ✓` (small) → promoted to expert when ≥ threshold. Once promoted, badge switches to an expert chip.
- De-endorse affordance on endorsed participants.

### 5.7 Absorbed initiative state

When an initiative's `status === 'merged_into'`:

- Initiative page becomes read-only.
- Banner at top (prominent, full-width): *"This initiative merged into [Target Title] on [date]. Continue the conversation there →"* with a clear CTA button navigating to the target.
- Participation controls (voting, commenting, suggesting) hidden. Stage cards show "Merged" status overlay.
- Initiative still appears in search/activity feeds but with a "merged" badge so supporters can find the target.

### 5.8 In-app notifications

New lightweight `notificationsSlice` (localStorage-backed, matches `preferencesSlice` pattern):

- When a merge is accepted, the source initiative's supporters get a notification entry on next app load.
- Notification payload: `{type: 'merge_absorbed', sourceInitiative, targetInitiative, acceptedAt}`.
- UI: bell icon in `PageHeader` with unread count, dropdown lists recent notifications with CTA to the target initiative.
- Out of scope: push notifications, email — those belong in a later block.

## 6. Data exposed for Block B

Block B (Vote graduation checklist) will consume:

- `initiative_contract.get_roles()` → `coAuthorCount`, `expertCount`.
- `modification_contract.get_suggestions()` filtered to `status='accepted'` → `acceptedSuggestionCount`.
- `merge_contract.get_merge_proposals()` → can be surfaced as "this initiative survived/absorbed N merges" on the final Vote card.

Block A does **not** add the graduation UI itself. The data is there; the gating logic is Block B's job.

## 7. Backward compatibility

- Existing initiatives pre-dating this spec read missing role fields as empty arrays. No migration required.
- Existing `modification_contract` deployments gain `originalAuthor` wiring when the initiative owner loads the app post-deploy (set_author call on first visit, idempotent if already set).
- `merge_contract` is only deployed when the first merge proposal is submitted on an initiative (lazy deploy via shared-contract pattern). Until then, "14 Merge Proposals" reads `0` with no contract cost.

## 8. Implementation boundaries

In scope:

- Contract changes: `initiative_contract.py` additions, new `merge_contract.py`.
- Frontend: `CollaborationPanel.tsx`, `MergeProposalCard.tsx`, `MergeProposalSubmitModal.tsx`, `ExpertEndorseButton.tsx`, role chips, subroute, absorbed-state banner, notifications slice + bell UI.
- Wiring: `originalAuthor` for modifications, cross-contract calls on accept.

Out of scope (deferred or explicit cut):

- Vote graduation gating UI (Block B).
- "Voices in favour / Voices against" pre-vote card (Block B).
- Post-Mandate Advocacy/Institution hubs (Block C).
- Engagement trendline (Block D).
- Push/email notifications (future).
- Hostile-merge protection beyond the author/co-author accept gate (e.g., rate-limiting merge proposals, reputation requirements for proposers).
- Merge proposals that *create* a new initiative (the "bilateral" flavor we discussed). Only absorb-into-existing for now.

## 9. Open questions

None gating the plan. Defaults chosen where discussion didn't decide:

- `EXPERT_THRESHOLD` = 3 endorsements (tune after pilot).
- Decision window on merge proposals = 14 days, then auto-expire.
- Co-authors get the same accept/reject power as the author (per §2 role table and §4.3). Any co-author can accept/reject edit suggestions or merge proposals unilaterally; no consensus required. Revisit if this causes conflict patterns in the pilot.

## 10. Success criteria

- Author of an initiative can see and act on every Edit Suggestion from the Collaboration Panel.
- Any user can propose a merge of their initiative into another, have it voted on by the community, and receive an accept/reject decision from the target author.
- Co-author and expert roles display consistently across all surfaces where participants appear.
- Merged-into initiatives are clearly signposted and redirect supporters.
- Block B can read role counts directly from `get_roles()` with no further contract work.
