# Flows Migration — COMPLETE

**Plan:** `docs/superpowers/plans/2026-04-02-flows-migration.md`
**Spec:** `docs/superpowers/specs/2026-04-02-flows-migration-design.md`
**Branch:** `eston/dev` — deployed to GitHub Pages

## All 11 Tasks Done

All flows migration tasks completed and pushed. Three blockchain-backed flows now in Decision Making:
1. **Approval Voting** (ApprovalFlow) — proposals + thumbs up/down + country-segmented results
2. **Quadratic Voting** (QVFlow) — proposals + credit allocation + sqrt voting + results
3. **Concern Resolution** (ConcernsFlow) — raise concerns with severity, propose resolutions, author resolves

## Key Context

- React 19 + TypeScript + Vite + Redux Toolkit + SCSS Modules
- Python blockchain contracts: `Storage()`, `master()`, `timestamp()`, `partners()` — no imports, no `.get(key, default)`
- Contract API: `contractRead()`/`contractWrite()` from `src/services/api.ts`; `deployContract()` for new contracts
- Vite `?raw` suffix for importing Python contract source
- `FlowProps`: `{ instanceId, collaborationId, collaborationType }`
- `useFlowContract` hook: `src/components/collaboration/flows/shared/useFlowContract.ts`
- `flowContractsSlice`: `src/components/collaboration/flows/shared/flowContractsSlice.ts` (localStorage-backed)
- `CountryBadge`: `src/components/collaboration/flows/shared/CountryBadge.tsx`
- `useAppSelector`/`useAppDispatch` from `src/store/hooks.ts`
- Profiles available at `state.communities.profiles[publicKey]`
- User auth at `state.user.serverUrl` and `state.user.publicKey`
- Country utilities: `src/utils/countries.ts` — `COUNTRY_COLORS`, `getCountryByCode()`
