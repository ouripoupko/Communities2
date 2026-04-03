# Communities2

**Branch:** `eston/dev` — deployed to GitHub Pages

## Stack

- React 19 + TypeScript + Vite + Redux Toolkit + SCSS Modules
- Python blockchain contracts: `Storage()`, `master()`, `timestamp()`, `partners()` — no imports, no `.get(key, default)`
- Contract API: `contractRead()`/`contractWrite()` from `src/services/api.ts`; `deployContract()` for new contracts
- Vite `?raw` suffix for importing Python contract source

## Key Patterns

- `FlowProps`: `{ instanceId, collaborationId, collaborationType }`
- `useFlowContract` hook: `src/components/collaboration/flows/shared/useFlowContract.ts`
- `flowContractsSlice`: `src/components/collaboration/flows/shared/flowContractsSlice.ts` (localStorage-backed)
- `CountryBadge`: `src/components/collaboration/flows/shared/CountryBadge.tsx`
- `useAppSelector`/`useAppDispatch` from `src/store/hooks.ts`
- Profiles available at `state.communities.profiles[publicKey]`
- User auth at `state.user.serverUrl` and `state.user.publicKey`
- Country utilities: `src/utils/countries.ts` — `COUNTRY_COLORS`, `getCountryByCode()`

## Decision Making Flows

Three blockchain-backed flows in the collaboration system:
1. **Approval Voting** (ApprovalFlow) — proposals + thumbs up/down + country-segmented results
2. **Quadratic Voting** (QVFlow) — proposals + credit allocation + sqrt voting + results
3. **Concern Resolution** (ConcernsFlow) — raise concerns with severity, propose resolutions, author resolves
