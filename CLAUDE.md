# Communities2

**Branch:** `eston/dev` — deployed to GitHub Pages

## Stack

- React 19 + TypeScript + Vite + Redux Toolkit + SCSS Modules
- Python blockchain contracts: `Storage()`, `master()`, `timestamp()`, `partners()` — no imports, no `.get(key, default)`
- Contract API: `contractRead()`/`contractWrite()` from `src/services/api.ts`; `deployContract()`/`joinContract()` for contracts
- Vite `?raw` suffix for importing Python contract source

## Key Patterns

- `FlowProps`: `{ instanceId, collaborationId, collaborationType }` — **all flows must destructure `instanceId`**
- `useFlowContract` hook: `src/components/collaboration/flows/shared/useFlowContract.ts` — deploys contract, returns `{ contractId, isReady, isDeploying }`, includes unmount cancellation
- `flowContractsSlice`: `src/components/collaboration/flows/shared/flowContractsSlice.ts` (localStorage-backed, uses `current()` for serialization)
- `CountryBadge`: `src/components/collaboration/flows/shared/CountryBadge.tsx`
- `useAppSelector`/`useAppDispatch` from `src/store/hooks.ts`
- Profiles available at `state.communities.profiles[publicKey]` — keyed by member's public key (same as `master()` in contracts)
- User auth at `state.user.serverUrl` and `state.user.publicKey`
- Country utilities: `src/utils/countries.ts` — `COUNTRY_COLORS`, `getCountryByCode()`

## Collaboration Pages

- `CollaborationPage` (`src/pages/collaboration/CollaborationPage.tsx`): tab-based flow container shared by initiatives, wishes, agreements
- Flow tabs persisted to `localStorage` under key `collaborationTabs` (keyed by `collaborationId`)
- All three views (Initiative, Wish, Agreement) fetch title from contract via `get_details` on page refresh
- `CollaborationPage` fetches community members on mount to populate profiles for CountryBadge
- Tab removal cleans up contract entries from `flowContractsSlice` via `removeContract`
- Add menu has click-outside-to-close handler
- Flow registry: `src/components/collaboration/flows/registry.ts` — all available flows grouped by category

## Deployment

- GitHub Pages via `.github/workflows/deploy.yml`, triggered on push to `eston/dev`
- Vite `base: '/Communities2/'` in production mode
- `public/404.html` + `index.html` redirect script handle SPA deep-link routing on GitHub Pages

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

## Known Architecture Limitation

Flow contracts are currently **single-user** — each user deploys their own contract via `useFlowContract`. Multi-user collaboration requires implementing a contract discovery/join mechanism so all community members read/write the same contract. The `joinContract()` API exists but is not yet wired into the flow system.
