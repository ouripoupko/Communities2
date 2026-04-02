# Flows Migration — Implementation Status

**Plan:** `docs/superpowers/plans/2026-04-02-flows-migration.md`
**Spec:** `docs/superpowers/specs/2026-04-02-flows-migration-design.md`
**Branch:** `eston/dev`

## Task Status

| # | Task | Status |
|---|------|--------|
| 1 | Revert Issue Pipeline Changes | pending |
| 2 | Delete Old Mock Voting Flows | pending |
| 3 | Flow Contract Manager (Shared Infra) | pending |
| 4 | CountryBadge Component | pending |
| 5 | Approval Voting Python Contract | pending |
| 6 | Approval Voting Flow (Frontend) | pending |
| 7 | Quadratic Voting Python Contract | pending |
| 8 | Quadratic Voting Flow (Frontend) | pending |
| 9 | Concerns Python Contract | pending |
| 10 | Wire ConcernsFlow to Blockchain | pending |
| 11 | Final Registry Cleanup + Build + Push | pending |

## Key Context for Resuming

- React 19 + TypeScript + Vite + Redux Toolkit + SCSS Modules
- Python blockchain contracts: `Storage()`, `master()`, `timestamp()`, `partners()` — no imports, no `.get(key, default)`
- Contract API: `contractRead()`/`contractWrite()` from `src/services/api.ts`; `deployContract()` for new contracts
- Vite `?raw` suffix for importing Python contract source
- `FlowProps`: `{ instanceId, collaborationId, collaborationType }`
- `useAppSelector`/`useAppDispatch` from `src/store/hooks.ts`
- Profiles available at `state.communities.profiles[publicKey]`
- User auth at `state.user.serverUrl` and `state.user.publicKey`
- Country utilities: `src/utils/countries.ts` — `COUNTRY_COLORS`, `getCountryByCode()`
