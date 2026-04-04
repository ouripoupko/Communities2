# Stage Navigation Redesign — Planning & Implementation Prompt

> Paste this entire file into a fresh Claude Code session. It contains the full vision, technical context, and implementation plan for restructuring the app around a stage-based global footer navigation.

---

## Vision

Replace the current homepage (InitiativeFeed) with a **stage-first global navigation model**. A persistent footer with 5 icons lets users browse ALL initiatives across ALL communities by their current stage in the governance pipeline. Think Reddit — but instead of subreddits on top, you have governance stages on the bottom.

Problems still belong to communities (communities are the trust layer), but the primary browsing experience is now **"what's happening at each stage?"** rather than "find a community, then find an initiative."

---

## The 5 Stages (Footer Icons)

### Stage 1: Problem
- **Feed view**: List of all problems across all communities currently at the "problem" stage
- **Each card shows**: title, description, author, community name (clickable → community page), time submitted, current upvote count, upvotes needed to advance (67% threshold)
- **Actions**: Vote Approve / Reject (upvote/downvote)
- **Scrollable feed** — browse and vote inline

### Stage 2: Discussion
- **Feed view**: List of problems that passed Stage 1
- **Each card shows**: title, description, community name, participation count
- **Click into a problem** → open chat + formal modification suggestions
- **New functionality to build**: Users can suggest modifications to the problem title or description. Other members vote on suggestions. Original author can approve/reject suggestions. After enough accepted suggestions, problem can advance to Stage 3.

### Stage 3: Proposals
- **Feed view**: List of problems ready for solutions
- **Click into a problem** → see all proposed solutions
- **Actions**: Add a solution, vote approve/reject on solutions, suggest modifications to solutions (same pattern as Stage 2 modifications)
- **Advancement**: 67% approval on a solution moves it to Stage 4

### Stage 4: Vote
- **Feed view**: List of problems in formal voting
- **Click into a problem** → formal vote interface (existing QVFlow) + open chat
- **No modifications** — just voting and discussion
- **Actions**: Allocate voting credits, discuss

### Stage 5: Mandate
- **Feed view**: List of completed mandates
- **Each card shows**: title, solution that won, community name, vote results summary
- **Read-only** — the historical record of democratic decisions

---

## Key Design Principles

1. **Community name is always visible** on every card, clickable to navigate to the community page (like Reddit's r/subreddit)
2. **Static footer** on almost every page (login page excluded)
3. **Page headers** show the problem title (or solution title) when drilling into detail views
4. **Community pages still exist** with their own tabs (Collaboration, Chat, Currency, Members) — you get there by clicking the community name on any item
5. **Problems always belong to a community** — communities provide the web of trust

---

## Current Architecture (What Exists)

### Routing (`App.tsx`)
```
/ → /identity (redirect)
/identity/* → IdentityView (homepage)
/community/:communityId/* → CommunityView
/initiative/:hostServer/:hostAgent/:communityId/:initiativeId/* → InitiativeView → PipelineView
```

### Homepage (`IdentityView.tsx`)
- "Gloki" wordmark + slide-out HomepageMenu
- Default route renders `InitiativeFeed` — shows all initiatives across communities
- Menu links: Communities, Profile, Join, Create, About, Contact

### Data Flow
- `state.user.contracts` → list of all contracts the user belongs to
- Filter by `contract === 'community_contract.py'` → community contracts
- `fetchCollaborations(contractId)` → `state.communities.communityCollaborations[contractId]` → `Collaboration[]`
- Each `Collaboration` with `type === 'initiative'` is an initiative
- Initiative stage fetched via `contractRead({ method: 'get_stage' })` on the initiative's contract
- Initiative details via `contractRead({ method: 'get_details' })` → `{ description, evidence, countries }`

### Key Interfaces
```typescript
interface Collaboration {
  id: string;
  type: 'initiative' | 'wish' | 'agreement' | 'collab';
  title: string;
  description?: string;
  createdAt: number;
  author?: string;
  hostServer?: string;
  hostAgent?: string;
  // ... more optional fields
}

interface FlowProps {
  instanceId: string;
  collaborationId: string;
  collaborationType: 'initiative' | 'wish' | 'agreement';
  parentContractId?: string;
  stageKey?: string;
}
```

### Existing Flow Components
- **ProblemVoteFlow**: upvote/downvote with 67% threshold progress bar. Props include `description`, `evidenceLinks`, `countries`, `communityMemberCount`.
- **DiscussionFlow**: Threaded comments (in-memory, keyed by `instanceId`). Open chat only — no modification suggestions.
- **ApprovalFlow**: Add proposals, approve/withdraw, country-segmented results. Blockchain-backed.
- **QVFlow**: Quadratic voting — allocate credits across proposals, sqrt-weighted results. Blockchain-backed.
- **ConcernsFlow**: Raise concerns, propose resolutions, author resolves. Blockchain-backed.

### PipelineView (Current Single-Initiative View)
Currently at `src/components/collaboration/PipelineView.tsx`. Shows one initiative with 5-stage progress dots at the top. Each stage renders its flow component. Has advance button with confirmation. This component stays mostly intact but will be reached by drilling into a specific problem from the stage feed.

---

## Implementation Plan

### Phase 1: Global Footer Component
**New file**: `src/components/shared/StageFooter.tsx` + `StageFooter.module.scss`

- 5 icons in a fixed-bottom bar (one per stage)
- Active stage highlighted
- Icons: suggest using lucide-react icons that map to each concept:
  - Problem: `AlertCircle` or `CircleHelp`
  - Discussion: `MessageCircle`
  - Proposals: `Lightbulb`
  - Vote: `Vote` or `CheckSquare`
  - Mandate: `FileCheck` or `ScrollText`
- Clicking an icon navigates to that stage's feed
- Footer should NOT appear on the login page
- Consider a subtle badge/count showing number of items at each stage

### Phase 2: Stage Feed Pages
**New file**: `src/pages/StageFeedView.tsx` + `StageFeedView.module.scss`

A single page component that renders different feeds based on which stage is selected. Or 5 separate lightweight page components — your call on what's cleaner.

**Data fetching pattern** (extend from existing `InitiativeFeed.tsx`):
1. Get all community contracts from `state.user.contracts`
2. Fetch collaborations for each community (already cached in Redux)
3. Filter initiatives (`type === 'initiative'`)
4. Fetch each initiative's stage via `contractRead({ method: 'get_stage' })`
5. Group initiatives by stage
6. For Stage 1, also fetch tally data (upvote/downvote counts) per initiative

Each stage feed card should show:
- Problem title (bold)
- Problem description (truncated)
- Community name (clickable badge → `/community/:id`)
- Author (truncated public key or profile name if available from `state.communities.profiles`)
- Time (relative: "2h ago", "3 days ago")
- Stage-specific data (vote counts for Stage 1, participation count for Stage 2, etc.)

### Phase 3: Inline Voting on Stage 1 Feed
Users should be able to vote approve/reject directly from the Stage 1 feed without drilling into a detail view. This means:
- Each card has upvote/downvote buttons
- Voting calls the ProblemVoteFlow contract methods directly
- Show vote count and threshold progress inline

### Phase 4: Detail Views (Drill-In)
When a user clicks a card in any stage feed, they navigate to a detail view for that problem at that stage. This is essentially the existing PipelineView but:
- Opened to the specific stage
- Page header shows the problem title
- Back button returns to the stage feed
- Community name still clickable

**Route structure suggestion**:
```
/stage/:stageId → Stage feed (list view)
/stage/:stageId/:communityId/:initiativeId → Detail view at that stage
```

Or reuse the existing initiative route and just change the landing behavior.

### Phase 5: Modification Suggestions (New Feature — Stage 2 & 3)
This is the biggest new feature. Users can suggest changes to problem descriptions (Stage 2) or solution text (Stage 3).

**New component**: `ModificationSuggestions.tsx`

Functionality:
- Submit a text suggestion (modification to title or description)
- Other users vote approve/reject on each suggestion
- Original author can approve/reject with special weight
- Accepted suggestions update the canonical text
- This likely needs a new Python contract or new methods on an existing contract

**Contract design considerations**:
- Store suggestions as `{ id, author, field (title|description), original_text, suggested_text, votes_for, votes_against, status }`
- Methods: `suggest_modification`, `vote_on_suggestion`, `author_decide`, `get_suggestions`
- Threshold for auto-acceptance (e.g., 67% community approval OR author approval)

### Phase 6: Route Restructuring
Update `App.tsx` routing:

```
/ → /stage/problem (new default)
/stage/:stageId → StageFeedView
/stage/:stageId/:communityId/:initiativeId → Detail view
/community/:communityId/* → CommunityView (unchanged)
/identity/* → Keep for profile, about, contact (accessed via menu)
```

Update `IdentityView.tsx`:
- Remove InitiativeFeed as the default route (it's replaced by stage feeds)
- Keep menu items: Communities, Profile, Join, Create, About, Contact

### Phase 7: Update HomepageMenu
- Remove "Communities" as the primary entry point (communities are now discovered through stage feeds)
- Keep it in the menu as a secondary option
- Consider: does the HomepageMenu still make sense, or does the footer handle most navigation?

---

## Technical Notes

- **No test framework** — verify via `npm run dev` and browser DevTools
- **Production build requires `tsc -b`** — fix all TypeScript errors before pushing
- **Deploy** to GitHub Pages via push to `eston/dev` branch
- **SCSS Modules** — use design tokens from `src/styles/variables.scss`
- **Design system** reference: `DESIGN_SYSTEM.md`
- **Contract API**: `contractRead()`/`contractWrite()` from `src/services/api.ts`
- **Vite `?raw`** for importing Python contract source
- **Python contracts**: `Storage()`, `master()`, `timestamp()`, `partners()` — no imports, no `.get(key, default)`

---

## Priority Order

1. **Phase 1 + 2 + 6**: Footer + stage feeds + routing — this is the core navigation change
2. **Phase 3**: Inline voting on Stage 1 — makes the feed immediately interactive
3. **Phase 4**: Detail views — drill into specific problems
4. **Phase 5**: Modification suggestions — the biggest new feature
5. **Phase 7**: Menu cleanup

Phases 1, 2, and 6 should be done together as they're interdependent. Phase 3 can follow immediately. Phase 5 is the most complex and can be a separate PR.

---

## Open Questions (Decide During Implementation)

1. **Footer on detail views?** Should the stage footer persist when you drill into a specific problem, or should it be replaced by a back button? (Recommendation: keep footer, add back button to header)
2. **Stage counts in footer**: Show badge counts of items at each stage? This requires fetching all data upfront.
3. **Caching**: Stage data for all initiatives is fetched per-session. Consider whether to cache stage info in Redux or refetch each time.
4. **Modification suggestions contract**: New contract or extend the initiative contract? (Recommendation: new contract — keeps concerns separated, can be deployed per-initiative like other flow contracts)
5. **Empty stage feeds**: What to show when a stage has zero items? Probably a friendly empty state with explanation of what appears here and how items get to this stage.
