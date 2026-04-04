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
- Profiles at `state.communities.profiles[publicKey]`; profile fields are `firstName`, `lastName`, `userPhoto`, `userBio`, `country?`
- Auth at `state.user.serverUrl`/`publicKey`
- Country utilities: `src/utils/countries.ts` — 197 countries (ISO 3166-1), `getCountryByCode()`, `getCountryColor()`, `getCountryName()`. `COUNTRY_COLORS` is a Proxy for backward compat. Pilot country colors are manual overrides; all others use algorithmic HSL hash.
- `SearchableSelect` (`components/shared/SearchableSelect.tsx`): reusable searchable dropdown, used for Profile country selector
- **Design system**: `DESIGN_SYSTEM.md` in project root — component patterns, spacing, typography, mobile standards. Reference when building UI.

## App Structure

**Navigation model**: Stage-first global footer (`StageFooter.tsx`). Fixed bottom bar with 5 icons — Problem, Discussion, Proposals, Vote, Mandate. Each icon navigates to `/stage/:stageId`. Footer appears on all authenticated pages. `HomepageMenu` (slide-out) provides access to Profile, Communities, Join, Create, About, Contact.

**Stage Feeds** (`StageFeedView.tsx`): Default landing page at `/stage/problem`. Shows all initiatives across all communities filtered by governance stage. Each card shows community name (clickable badge → community page), author, time, title, description. Problem stage has inline approve/reject voting with threshold progress bars.

**Community** (`CommunityView.tsx`): tabs are Initiative / Collab / Chat / Currency / Members. Default route `/initiative`. Old routes redirect. Swipe between tabs. `Members` includes ID Card, Scanner, Share, and web of trust text.

**Initiative Pipeline** (`PipelineView.tsx`): 5 stages with connected progress dots (green check = completed, blue = current). "Global Problem" → "Global Solution" labels. `viewStage` for preview vs `stage` for actual progress. All stage flows use shared contracts via `parentContractId={collaborationId}`.
- Step 1: `ProblemVoteFlow` — upvote/downvote, 67% threshold progress bar, "X more needed" display
- Step 2: `DiscussionFlow` — 33% participation threshold + `ModificationSuggestions` for problem title/description changes
- Step 3: `ApprovalFlow` with problem context, country-segmented results + `ModificationSuggestions` for solution text changes
- Step 4: `QVFlow` with country-segmented results
- Step 5: Mandate pledge (UI only)
- `ConcernsFlow` available as sidebar at any stage (resolved concerns collapsed by default)

**Identity** (`IdentityView.tsx`): Accessed via `/identity/*`. Default redirects to `/identity/communities`. Houses Communities grid, Profile, Join, About, Contact. No longer the homepage.

**Collab**: template-based workspaces via `CollaborationPage`. Templates in `collabTemplates.ts`. Per-user contracts (not shared).

**Chat**: `ChatTopicList` + `ChatTopic` in `community/chat/`. In-memory data, ephemeral.

## Routing

```
/ → /stage/problem (redirect)
/stage/:stageId → StageFeedView (Problem, Discussion, Proposals, Vote, Mandate)
/identity/* → IdentityView (communities, profile, join, about, contact)
/community/:communityId/* → CommunityView
/initiative/:host/:agent/:communityId/:initiativeId/* → InitiativeView → PipelineView
```

## Flows

**Blockchain-backed** (contract method names match Python ↔ TypeScript):
1. **ApprovalFlow** — proposals + approve/withdraw + country-segmented results
2. **QVFlow** — proposals + credit allocation + sqrt voting + results
3. **ConcernsFlow** — raise concerns, propose resolutions, author resolves
4. **ProblemVoteFlow** — upvote/downvote with tally + progress bar
5. **ModificationSuggestions** — suggest changes to title/description, community votes approve/reject, original author can accept/reject. Used in Discussion (Stage 2) and Proposals (Stage 3). Contract: `modification_contract.py`.

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
- **Modification Suggestions author-decide**: `originalAuthor` prop not yet wired (initiative contract doesn't store author in details) — author accept/reject buttons won't show until this is connected
