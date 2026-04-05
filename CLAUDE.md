# Communities2

**Branch:** `eston/dev` — deployed to GitHub Pages

## Stack

- React 19 + TypeScript + Vite + Redux Toolkit + SCSS Modules
- Python blockchain contracts: `Storage()`, `master()`, `timestamp()`, `partners()` — no imports, no `.get(key, default)`
- Contract API: `contractRead()`/`contractWrite()` from `src/services/api.ts`; `deployContract()`/`joinContract()` for contracts
- Vite `?raw` suffix for importing Python contract source
- **No test framework** — verify via `npm run dev` and browser DevTools
- **Design system**: `DESIGN_SYSTEM.md` — component patterns, spacing, typography, mobile standards. Reference when building UI.

## Key Patterns

- `FlowProps`: `{ instanceId, collaborationId, collaborationType, parentContractId?, stageKey? }`
- `useFlowContract` hook (`flows/shared/useFlowContract.ts`): returns `{ contractId, isReady, isDeploying, hasError, retry }`. Two modes:
  - **Per-user** (default): deploys a contract per user. Used by Collab flows.
  - **Shared** (`parentContractId` + `stageKey`): reads parent contract for stored sub-contract; joins if found, deploys and stores if not. All PipelineView flows use this so community members share one contract.
  - **Resilience**: 30s deploy timeout, stale deploying recovery on mount, cancellation-safe. Diagnostic logs prefixed `[FlowContract]`.
- `flowContractsSlice` (`flows/shared/flowContractsSlice.ts`): localStorage-backed contract ID cache
- `preferencesSlice` (`store/slices/preferencesSlice.ts`): localStorage-backed starred/hidden community IDs
- `useSwipeRef` (`hooks/useSwipeNavigation.ts`): callback ref for horizontal swipe, used in PipelineView stages
- Profiles at `state.communities.profiles[publicKey]`; fields: `firstName`, `lastName`, `userPhoto`, `userBio`, `country?`
- Auth at `state.user.serverUrl`/`publicKey`
- Country utilities: `src/utils/countries.ts` — 197 countries (ISO 3166-1), `getCountryByCode()`, `getCountryColor()`, `getCountryName()`
- `SearchableSelect` (`components/shared/SearchableSelect.tsx`): reusable searchable dropdown

## App Structure

**Navigation**: Global footer (`StageFooter.tsx`) — fixed bottom bar with 5 stage icons (Problem, Discussion, Proposals, Vote, Mandate), navigates to `/stage/:stageId`, appears on all authenticated pages. `HomepageMenu` (slide-out) provides access to Profile, Communities, Join, Create, About, Contact.

**Stage Feeds** (`StageFeedView.tsx`): Default landing page at `/stage/problem`. Shows initiatives across all communities filtered by governance stage. Problem stage has inline "Problem for me" / "Not a problem for me" voting with threshold progress bars. Problem cards do not navigate (vote inline only); other stages navigate to the initiative pipeline.

**Community** (`CommunityView.tsx`): Dark header with name, description, member count. Inline horizontal tab bar (Collab, Chat, Currency, Members, Options) below header. Default view is the activity feed showing initiatives with stage badges. Options popup provides Share, Invite, Leave.

**Initiative Pipeline** (`PipelineView.tsx`): 5 stages with connected progress dots (green = completed, blue = current). Swipe navigation between stages. All stage flows use shared contracts via `parentContractId={collaborationId}`.
- Step 1: `ProblemVoteFlow` — upvote/downvote, 67% threshold, "X more needed"
- Step 2: `DiscussionFlow` — 33% participation threshold + `ModificationSuggestions`
- Step 3: `ApprovalFlow` — country-segmented results + `ModificationSuggestions`
- Step 4: `QVFlow` — credit allocation + sqrt voting, country-segmented results
- Step 5: Mandate pledge (UI only)
- `ConcernsFlow` sidebar at any stage

**Identity** (`IdentityView.tsx`): At `/identity/*`, default `/identity/communities`. Single-column communities list with description, member count, star/hide controls. Profile page with identity info hints. Join, About, Contact pages.

**Collab**: Template-based workspaces via `CollaborationPage`. Navigates from community collab tab to `/community/:communityId/collab/:collabId`. Templates in `collabTemplates.ts`. Per-user contracts.

**Chat**: `ChatTopicList` + `ChatTopic` in `community/chat/`. In-memory only (ephemeral, lost on refresh). Defensive try-catch in `chatApi.ts`.

**Currency**: Balance display, send payment, median-voted mint/burn preferences. Explainer card at top. Single-column card layout.

## Routing

```
/ → /stage/problem (redirect)
/stage/:stageId → StageFeedView
/identity/* → IdentityView (communities, profile, join, about, contact)
/community/:communityId/* → CommunityView (feed, collab, collab/:collabId, chat, chat/:topicId, currency, members)
/initiative/:host/:agent/:communityId/:initiativeId/* → InitiativeView → PipelineView
```

## Flows

**Blockchain-backed** (contract methods match Python ↔ TypeScript):
1. **ProblemVoteFlow** — upvote/downvote with tally + threshold progress bar
2. **DiscussionFlow** — threaded comments, participation threshold
3. **ApprovalFlow** — proposals + approve/withdraw + country-segmented results
4. **QVFlow** — proposals + credit allocation + sqrt voting + results
5. **ConcernsFlow** — raise concerns, propose resolutions, author resolves
6. **ModificationSuggestions** — suggest changes to title/description, community votes, original author accept/reject. Used in Discussion (Stage 2) and Proposals (Stage 3). Contract: `modification_contract.py`.

**Local (in-memory)**: Discussion, Document, Q&A, Roles, Scheduling, Taskboard — keyed by `instanceId`

## Deployment

- GitHub Pages via `.github/workflows/deploy.yml` on push to `eston/dev`
- `public/404.html` handles SPA deep-link routing
- **Production build runs `tsc -b`** — fix all TS errors before pushing
- Contracts are immutable after deploy — new methods require new communities

## Known Limitations

- **Collab contracts are per-user** — need shared mode (like Pipeline) to be truly collaborative
- **Mandate pledges** (Step 5) not wired to contract storage
- **Top 3 carry-over** from Proposals → Vote not yet implemented
- **Chat is ephemeral** — in-memory only, lost on refresh
- **Modification Suggestions author-decide**: `originalAuthor` prop not yet wired — author accept/reject buttons won't show until initiative contract stores author in details
