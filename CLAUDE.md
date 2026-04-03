# Communities2

**Branch:** `eston/dev` — deployed to GitHub Pages

## Stack

- React 19 + TypeScript + Vite + Redux Toolkit + SCSS Modules
- Python blockchain contracts: `Storage()`, `master()`, `timestamp()`, `partners()` — no imports, no `.get(key, default)`
- Contract API: `contractRead()`/`contractWrite()` from `src/services/api.ts`; `deployContract()`/`joinContract()` for contracts
- Vite `?raw` suffix for importing Python contract source
- **No test framework** — verify via `npm run dev` and browser DevTools

## Key Patterns

- `FlowProps`: `{ instanceId, collaborationId, collaborationType, parentContractId?, stageKey? }` — **all flows must destructure `instanceId`**
- `useFlowContract` hook: `src/components/collaboration/flows/shared/useFlowContract.ts` — returns `{ contractId, isReady, isDeploying, hasError, retry }`, includes unmount cancellation and deploy failure handling. Supports two modes:
  - **Per-user mode** (no `parentContractId`/`stageKey`): deploys a new contract per user (used by Collab flows)
  - **Shared mode** (`parentContractId` + `stageKey` provided): reads parent contract's details for a stored sub-contract; if found, joins via `joinContract()`; if not, deploys and stores info on parent so others can join. Used by all PipelineView flows so all community members share one contract instance.
- `flowContractsSlice`: `src/components/collaboration/flows/shared/flowContractsSlice.ts` (localStorage-backed, uses `current()` for serialization)
- `preferencesSlice`: `src/store/slices/preferencesSlice.ts` — localStorage-backed starred/hidden community IDs with `toggleStar`, `toggleHide`, `unhide` reducers
- `CountryBadge`: `src/components/collaboration/flows/shared/CountryBadge.tsx`
- `useAppSelector`/`useAppDispatch` from `src/store/hooks.ts`
- `useSwipeRef`: `src/hooks/useSwipeNavigation.ts` — callback ref hook for horizontal swipe detection, used in CommunityView tabs and PipelineView stages
- Profiles available at `state.communities.profiles[publicKey]` — keyed by member's public key (same as `master()` in contracts)
- User auth at `state.user.serverUrl` and `state.user.publicKey`
- Country utilities: `src/utils/countries.ts` — `COUNTRY_COLORS`, `getCountryByCode()`

## Homepage & Identity

- `IdentityView` (`src/pages/IdentityView.tsx`): homepage with "Gloki" wordmark header + slide-out menu, Communities as default view
- No tab navigation — Profile, Join Community, Create Community accessed via `HomepageMenu` slide-out panel
- `HomepageMenu` (`src/components/identity/HomepageMenu.tsx`): full-height right-sliding panel with menu items + hidden communities count badge
- `AboutPage` / `ContactPage` (`src/components/identity/`): placeholder pages with back navigation
- `Communities` (`src/components/identity/Communities.tsx`): 2-column compact card grid, star (pin to top) + hide via three-dot menu, sorted starred-first
- `PageHeader` supports `layout="homepage"` (wordmark + menu) and `backButtonVariant="compact"` (icon-only)

## Community Page & Navigation

- `CommunityView` (`src/pages/CommunityView.tsx`): tabs are Initiative (Zap), Collab (Users2), Chat (MessageSquare), Currency (Coins), Members (Users)
- Default route: `/initiative` — old routes (`/activity`, `/share`, `/collaborations`, `/issues`) redirect to `/initiative` or `/members`
- `InitiativeList` (`src/components/community/InitiativeList.tsx`): full initiative list with "Start Initiative" button (extracted from ActivityHub)
- `CollabList` (`src/components/community/CollabList.tsx`): full collab list with "Start Collab" button (extracted from ActivityHub)
- `Members` (`src/components/community/Members.tsx`): Identity & Trust section (ID Card, Scanner, Share) at top, web of trust text, then member list
- ID Card, QR Scanner, Share all moved from PageHeader/CommunityView into Members component
- Swipe navigation between tabs via `useSwipeRef` on main content area
- `ActivityHub` still exists but is no longer a tab — its sections were extracted into InitiativeList and CollabList

## Initiative Pipeline

- `PipelineView` (`src/components/collaboration/PipelineView.tsx`): wraps initiative with 5-stage progress bar + "Global Problem"/"Global Solution" endpoint labels
- Stages: Problem Definition → Discussion → Proposals (ApprovalFlow) → Vote (QVFlow) → Mandate
- `viewStage` (read-only preview) vs `stage` (actual progress) — users can swipe/click to preview other stages without advancing
- Stage stored on initiative contract via `set_stage`/`get_stage`
- Step 1 (Problem): `ProblemVoteFlow` with upvote/downvote, 67% threshold + 50% concerns resolved metric
- Step 2 (Discussion): `DiscussionFlow` embedded with context text, 33% participation threshold
- Step 3 (Proposals): Problem context display above `ApprovalFlow`
- Step 4 (Vote): `QVFlow` unchanged
- Step 5 (Mandate): Pledge support button + mandate note (UI only, not yet wired to contract)
- `ProblemVoteFlow` (`src/components/collaboration/flows/voting/ProblemVoteFlow.tsx`): upvote/downvote with tally, progress bar, uses `problem_vote_contract.py`
- `CreateInitiativeDialog`: structured form with problem, evidence URLs, countries affected (KE, NG, MW, CD, OTHER)
- ConcernsFlow available as sidebar at any stage
- Advance bar only visible when viewing current stage
- Swipe navigation between stages via `useSwipeRef`
- `InitiativeView` now renders `PipelineView` instead of `CollaborationPage`

## Chat

- `ChatTopicList` + `ChatTopic` in `src/components/community/chat/`
- Local in-memory data via `chatApi.ts`, keyed by communityId
- Routes: `/community/:communityId/chat` and `/community/:communityId/chat/:topicId`
- Flat message stream (not threaded), sorted by activity

## Collab

- Template-based workspaces using Ouri's flow tools (Scheduling, Task Board, Roles, etc.)
- Templates defined in `src/components/collaboration/collabTemplates.ts` — Plan an Event, Run a Project, Fundraise, Custom
- `CreateCollabDialog`: name + template picker, pre-populates tabs via localStorage
- Stored on community contract with `type: 'collab'`

## CollaborationPage (still used by Collab)

- `CollaborationPage` (`src/pages/collaboration/CollaborationPage.tsx`): tab-based flow container
- Flow tabs persisted to `localStorage` under key `collaborationTabs` (keyed by `collaborationId`)
- `CollaborationPage` fetches community members on mount to populate profiles for CountryBadge
- Tab removal cleans up contract entries from `flowContractsSlice` via `removeContract`
- Add menu has click-outside-to-close handler
- Flow registry: `src/components/collaboration/flows/registry.ts` — all available flows grouped by category
- **Initiatives no longer use CollaborationPage** — they use PipelineView instead

## Deployment

- GitHub Pages via `.github/workflows/deploy.yml`, triggered on push to `eston/dev`
- Vite `base: '/Communities2/'` in production mode
- `public/404.html` + `index.html` redirect script handle SPA deep-link routing on GitHub Pages
- **Production build runs `tsc -b`** — all TypeScript errors must be fixed before pushing (dev server with Vite is more lenient)
- No delete/remove contract API exists — communities and contracts cannot be removed once deployed

## Decision Making Flows (Blockchain-backed)

Three blockchain-backed flows — contract method names match exactly between Python and TypeScript:
1. **Approval Voting** (ApprovalFlow) — proposals + thumbs up/down + country-segmented results
2. **Quadratic Voting** (QVFlow) — proposals + credit allocation + sqrt voting + results
3. **Concern Resolution** (ConcernsFlow) — raise concerns with severity, propose resolutions, author resolves

## Local Flows (In-memory, per-instance)

Six flows use local in-memory Maps keyed by `instanceId` — **all API functions take `instanceId` as first arg**, and all components must thread it to sub-components:
1. **Discussion** — threaded comments
2. **Document** — collaborative editing with proposals and majority voting
3. **Q&A** — questions, answers, upvoting
4. **Roles** — role creation, join/leave
5. **Scheduling** — event scheduling with availability grid
6. **Taskboard** — kanban board with claim/advance/revert

## Known Architecture Limitations

- **Collab flow contracts are per-user** — each user deploys their own contract via `useFlowContract` (no `parentContractId`). For Collabs to become truly collaborative, they'd need a shared contract mechanism similar to what PipelineView uses. PipelineView flows already use shared mode.
- **Community contracts are immutable after deploy** — if you add new methods to `community_contract.py` (like `add_collaboration`/`get_collaborations`), old communities won't have them. You must create a new community to test new contract methods. The server returns `null` for methods that don't exist on a deployed contract.
- **Mandate pledges** (Pipeline Step 5) are UI-only — pledge button not yet wired to contract storage via `add_contribution`.
- **Top 3 carry-over** from Proposals to Vote stage not yet implemented — QVFlow should auto-populate with top 3 approved proposals.
- **Chat data is ephemeral** — stored in-memory only, lost on page refresh. Future: persist to blockchain or IndexedDB.

## Design Docs

- Spec: `docs/superpowers/specs/2026-04-03-ui-redesign-activity-hub-pipeline.md`
- Plan: `docs/superpowers/plans/2026-04-03-ui-redesign-activity-hub-pipeline.md`
