# Communities2

**Branch:** `eston/dev` — deployed to GitHub Pages

## Stack

- React 19 + TypeScript + Vite + Redux Toolkit + SCSS Modules
- Python blockchain contracts: `Storage()`, `master()`, `timestamp()`, `partners()` — no imports, no `.get(key, default)`
- Contract API: `contractRead()`/`contractWrite()` from `src/services/api.ts`; `deployContract()`/`joinContract()` for contracts
- Vite `?raw` suffix for importing Python contract source
- **No test framework** — verify via `npm run dev` and browser DevTools

## Key Patterns

- `FlowProps`: `{ instanceId, collaborationId, collaborationType }` — **all flows must destructure `instanceId`**
- `useFlowContract` hook: `src/components/collaboration/flows/shared/useFlowContract.ts` — deploys contract, returns `{ contractId, isReady, isDeploying }`, includes unmount cancellation
- `flowContractsSlice`: `src/components/collaboration/flows/shared/flowContractsSlice.ts` (localStorage-backed, uses `current()` for serialization)
- `CountryBadge`: `src/components/collaboration/flows/shared/CountryBadge.tsx`
- `useAppSelector`/`useAppDispatch` from `src/store/hooks.ts`
- Profiles available at `state.communities.profiles[publicKey]` — keyed by member's public key (same as `master()` in contracts)
- User auth at `state.user.serverUrl` and `state.user.publicKey`
- Country utilities: `src/utils/countries.ts` — `COUNTRY_COLORS`, `getCountryByCode()`

## Activity Hub & Navigation

- `ActivityHub` (`src/components/community/ActivityHub.tsx`): dashboard with Initiative, Collab, Chat summary cards
- CommunityView default tab renamed from "Collaborations" to "Activity" at route `/activity`
- Old `/collaborations` route redirects to `/activity`
- Three sections: Initiative (pipeline), Collab (teamwork templates), Chat (topics + messages)
- Old components removed: `Collaborations.tsx`, `CollaborationCard.tsx`, `CollaborationFilterBar.tsx`, `CreateCollaborationButtons.tsx`

## Initiative Pipeline

- `PipelineView` (`src/components/collaboration/PipelineView.tsx`): wraps initiative with 5-stage progress bar
- Stages: Problem Definition → Discussion → Proposals (ApprovalFlow) → Vote (QVFlow) → Mandate
- Stage stored on initiative contract via `set_stage`/`get_stage`
- `CreateInitiativeDialog`: structured form with problem, evidence URLs, countries affected (KE, NG, MW, CD, OTHER)
- ConcernsFlow available as sidebar at any stage
- Stage advancement is manual (creator clicks "Move to next stage")
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

- Flow contracts are currently **single-user** — each user deploys their own contract via `useFlowContract`. Multi-user collaboration requires implementing a contract discovery/join mechanism so all community members read/write the same contract. The `joinContract()` API exists but is not yet wired into the flow system.
- **Community contracts are immutable after deploy** — if you add new methods to `community_contract.py` (like `add_collaboration`/`get_collaborations`), old communities won't have them. You must create a new community to test new contract methods. The server returns `null` for methods that don't exist on a deployed contract.
- **Discussion stage in Pipeline** is currently a placeholder — needs the Chat message stream component embedded inline.
- **Chat data is ephemeral** — stored in-memory only, lost on page refresh. Future: persist to blockchain or IndexedDB.

## Design Docs

- Spec: `docs/superpowers/specs/2026-04-03-ui-redesign-activity-hub-pipeline.md`
- Plan: `docs/superpowers/plans/2026-04-03-ui-redesign-activity-hub-pipeline.md`
