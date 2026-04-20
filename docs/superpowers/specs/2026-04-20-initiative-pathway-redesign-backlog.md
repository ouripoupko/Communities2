# Initiative Pathway Redesign — Backlog

**Source:** Brainstorm session 2026-04-20, triggered by review of legacy mockups (Global solutions feed, Collaboration dashboard, Global discussion, Global vote, Advocacy Hub, Institution Hub).

**Goal:** Make intra-initiative interactions — contributors, authors, suggesters, approvers — legible and actionable. Clear pathways for collaboration in Discuss/Propose; real-world impact visibility in Vote/Mandate.

**Decomposition:** Four independent blocks. Block A is being designed first in `2026-04-20-initiative-roles-and-collaboration-design.md` (in progress). B, C, D are deferred to future specs.

---

## Block A — Roles & Collaboration primitives *(IN DESIGN)*

Scope: Discuss (stage 2) + Propose (stage 3).

- Co-authors and experts as first-class roles on initiatives (initiative contract `details` dict extension).
- Edit Suggestions panel: surface existing `modification_contract` suggestions with count, proposer, and author accept/reject. Wires the `originalAuthor` prop currently listed as a known limitation in CLAUDE.md.
- Merge Proposals: a new concept distinct from current `ApprovalFlow` proposals — alternative worded versions of the initiative (title/description rewrites), not standalone solutions. Requires new contract or extension.
- Collaboration Dashboard panel pattern: "14 Merge Proposals / 130 Edit Suggestions" header with inline scrollable lists and View All.
- Author controls: clear affordances for the original author to accept/reject suggestions and merge proposals.

---

## Block B — Vote graduation & structured debate *(DEFERRED)*

Scope: Vote (stage 4) readiness gating + pre-vote discussion structure.

- **Graduation checklist** gating Vote stage: e.g. `≥5 co-authors`, `≥3 experts`, minimum discussion participation. Implemented in `getStageReadiness()` in `InitiativeDashboard.tsx`. Depends on Block A's role data model.
- **Voices in favour / Voices against** card on the Discussion stage dashboard: two columns listing credentialed participants (name + credential/role). Likely requires a "position + credential" field on discussion comments, or a separate lightweight contract method.
- **Countdown to Vote** timer (time-based transition), if we want to enforce vote windows.
- **Global vote eligibility** visual indicators (mockup shows bar charts + checkmarks for eligibility criteria).

**Dependency:** Block A must be shipped first — graduation checks reference co-author/expert counts.

---

## Block C — Post-Mandate real-world impact *(DEFERRED)*

Scope: new surfaces after Mandate (stage 5). Effectively a 6th pseudo-stage.

- **Advocacy Hub:** "Build support for this global solution" — find local campaigns, advocacy toolkit, start a local group. "Follow the movement" — success stories, newsletter, social.
- **Institution Hub:** "Implement this global solution" — guidelines, legal briefs, factsheets. Contact co-authors / expert. Report Implementation form (organisation name, country, contact email, description, supporting docs upload).
- **National Ratifications map:** world map with color-coded ratification status, list of implementing institutions.
- **Action Ledger:** crypto wallet + implementation contract ID wiring, for on-chain attestation of implementation.

**Dependency:** Standalone — does not depend on A or B, but the surfaces should link to the author/co-author roles from A for "Contact Co-authors" affordances.

---

## Block D — Engagement trendline *(DEFERRED)*

Scope: lightweight analytics surface, embeddable on Initiative Dashboard and Community views.

- Time-series line chart of initiative activity (votes, comments, suggestions, approvals per day).
- "High / Medium / Low" engagement label derived from recent activity velocity.
- Embedded on the Collaboration Dashboard panel (Block A) and as a standalone card on the Initiative Dashboard.

**Dependency:** Standalone — can be built anytime. Data source: aggregate existing contract events across all stage sub-contracts.

---

## Implementation Order

1. **Block A** — now (foundational).
2. **Block B** — after A ships and roles data is flowing.
3. **Block C** — anytime after A (uses role data but no blocking data coupling).
4. **Block D** — anytime; cheapest if done alongside A since it embeds in the same dashboard.
