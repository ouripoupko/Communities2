# Communities2

**Branch:** `eston/dev` — deployed to GitHub Pages

## Stack

- React 19 + TypeScript + Vite + Redux Toolkit + SCSS Modules
- Python blockchain contracts: `Storage()`, `master()`, `timestamp()`, `partners()` — no imports, no `.get(key, default)`
- Contract API: `contractRead()`/`contractWrite()` from `src/services/api.ts`; `deployContract()`/`joinContract()` for contracts
- Vite `?raw` suffix for importing Python contract source
- **No test framework** — verify via `npm run dev` and browser DevTools

## Key Patterns

- `FlowProps`: `{ instanceId, collaborationId, collaborationType, parentContractId?, stageKey? }`
- `useFlowContract` hook (`flows/shared/useFlowContract.ts`): returns `{ contractId, isReady, isDeploying, hasError, retry }`. Two modes:
  - **Per-user** (default): deploys a contract per user. Used by Collab flows.
  - **Shared** (`parentContractId` + `stageKey`): reads parent contract for stored sub-contract; joins if found, deploys and stores if not. All PipelineView flows use this so community members share one contract.
  - **Resilience**: 30s deploy timeout (forces error + retry), stale deploying recovery on mount, cancellation-safe (caches result even if component unmounts). Diagnostic logs prefixed `[FlowContract]` in console.
- `flowContractsSlice` (`flows/shared/flowContractsSlice.ts`): localStorage-backed contract ID cache
- `preferencesSlice` (`store/slices/preferencesSlice.ts`): localStorage-backed starred/hidden community IDs
- `useSwipeRef` (`hooks/useSwipeNavigation.ts`): callback ref for horizontal swipe, used in CommunityView tabs and PipelineView stages
- Profiles at `state.communities.profiles[publicKey]`; auth at `state.user.serverUrl`/`publicKey`
- Country utilities: `src/utils/countries.ts` — 197 countries (ISO 3166-1), `getCountryByCode()`, `getCountryColor()`, `getCountryName()`. `COUNTRY_COLORS` is a Proxy for backward compat. Pilot country colors are manual overrides; all others use algorithmic HSL hash.
- `SearchableSelect` (`components/shared/SearchableSelect.tsx`): reusable searchable dropdown, used for Profile country selector
- **Design system**: `DESIGN_SYSTEM.md` in project root — component patterns, spacing, typography, mobile standards. Reference when building UI.

## App Structure

**Homepage** (`IdentityView.tsx`): "Gloki" wordmark + slide-out `HomepageMenu`. **Initiative feed as default landing page** (`InitiativeFeed.tsx`) — shows all initiatives across communities. Communities grid accessible via menu. Profile, Join, Create accessed via menu. `PageHeader` supports `layout="homepage"` and `backButtonVariant="compact"`.

**Community** (`CommunityView.tsx`): tabs are Initiative / Collab / Chat / Currency / Members. Default route `/initiative`. Old routes redirect. Swipe between tabs. `Members` includes ID Card, Scanner, Share, and web of trust text.

**Initiative Pipeline** (`PipelineView.tsx`): 5 stages with connected progress dots (green check = completed, blue = current). "Global Problem" → "Global Solution" labels. `viewStage` for preview vs `stage` for actual progress. All stage flows use shared contracts via `parentContractId={collaborationId}`.
- Step 1: `ProblemVoteFlow` — upvote/downvote, 67% threshold progress bar, "X more needed" display
- Step 2: `DiscussionFlow` — 33% participation threshold
- Step 3: `ApprovalFlow` with problem context, country-segmented results with full country names
- Step 4: `QVFlow` with country-segmented results
- Step 5: Mandate pledge (UI only)
- `ConcernsFlow` available as sidebar at any stage (resolved concerns collapsed by default)

**Collab**: template-based workspaces via `CollaborationPage`. Templates in `collabTemplates.ts`. Per-user contracts (not shared).

**Chat**: `ChatTopicList` + `ChatTopic` in `community/chat/`. In-memory data, ephemeral.

## Flows

**Blockchain-backed** (contract method names match Python ↔ TypeScript):
1. **ApprovalFlow** — proposals + approve/withdraw + country-segmented results
2. **QVFlow** — proposals + credit allocation + sqrt voting + results
3. **ConcernsFlow** — raise concerns, propose resolutions, author resolves
4. **ProblemVoteFlow** — upvote/downvote with tally + progress bar

**Local (in-memory)**: Discussion, Document, Q&A, Roles, Scheduling, Taskboard — all keyed by `instanceId`

## Deployment

- GitHub Pages via `.github/workflows/deploy.yml` on push to `eston/dev`
- `public/404.html` handles SPA deep-link routing
- **Production build runs `tsc -b`** — fix all TS errors before pushing
- Contracts are immutable after deploy — new methods require new communities

## Known Limitations

- **Collab contracts are per-user** — need shared mode (like Pipeline) to be truly collaborative
- **Mandate pledges** (Step 5) not wired to contract storage
- **Top 3 carry-over** from Proposals → Vote not yet implemented
- **Chat is ephemeral** — lost on refresh
