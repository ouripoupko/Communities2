# Migrate PR Features to Flows Architecture

**Date:** 2026-04-02
**Status:** Approved design, pending implementation

## Summary

Migrate three features (country-visible co-authorship, approval voting, quadratic voting) from the old Issue pipeline into the flows architecture. Replace the existing mock Ranking and Scoring flows with real blockchain-backed Approval Voting and Quadratic Voting flows. Make the existing mock Concerns flow functional with blockchain backing. Remove all Issue-pipeline modifications from our PRs.

## Decisions

- **Real blockchain-backed flows** — not mocks. These will be the first functional flows in the system.
- **Standalone flows** — each flow manages its own proposals internally. No dependency on the Issue pipeline.
- **One contract per flow instance** — each time a flow tab is added and first used, a dedicated Python contract is deployed.
- **Replace, don't add** — Ranking Vote becomes Approval Voting, Scoring Vote becomes Quadratic Voting. Keeps Decision Making at 3 options (kid-friendly).
- **Modular contract management** — a shared `FlowContractManager` layer handles contract deployment, ID storage, and retrieval. Individual flows are pure consumers.

## Architecture

### Flow Contract Manager (shared infrastructure)

A hook and Redux slice that all blockchain-backed flows use:

- **`useFlowContract(instanceId, contractCode)`** — returns `{ contractId, isReady, deploy() }`
- **`flowContractsSlice.ts`** — Redux slice caching `instanceId → contractId` mappings
- Deploys a Python contract the first time a flow instance is used
- Retrieves the existing contract ID on subsequent visits
- Reads/writes go through existing `contractRead()`/`contractWrite()` from `src/services/api.ts`
- Reads `serverUrl` and `publicKey` from the Redux user store for all API calls

**Contract code import:** Python contract source files are imported as raw strings via Vite's `?raw` suffix (e.g., `import approvalCode from '../../../assets/contracts/approval_contract.py?raw'`). This matches how the existing codebase loads contract code.

**Contract ID persistence:** Flow tab configuration (instanceId, flowId, contractId) is stored in localStorage keyed by collaborationId. This means tabs persist per-browser. Cross-user tab discovery is a follow-up — current CollaborationPage tabs don't persist at all, so localStorage is strictly better.

Flow components never touch deployment, storage, or lookup logic. They ask for their contract and start working:

```typescript
const ApprovalFlow: React.FC<FlowProps> = ({ instanceId, collaborationId }) => {
  const { contractId, isReady } = useFlowContract(instanceId, approvalContractCode);
  if (!isReady) return <Spinner />;
  // Use contractId to read/write — flow doesn't care about lifecycle
};
```

### Python Contracts

Three standalone contracts, one per flow type.

#### `approval_contract.py` — Proposal submission + thumbs up/down

- `Storage('proposals')` — proposal text, author (`master()`), timestamp, country
- `Storage('approvals')` — nested `{voter: {proposal_id: True}}`
- Methods:
  - `add_proposal(text)` — auto-stamps `master()`, `timestamp()`
  - `approve(proposal_id)` — sets `approvals[master()][proposal_id] = True`
  - `withdraw_approval(proposal_id)` — deletes `approvals[master()][proposal_id]`
  - `get_proposals()` — returns all proposals
  - `get_approvals()` — returns all voter approvals
  - `get_my_approvals()` — returns current user's approvals

#### `qv_contract.py` — Proposal submission + quadratic credit allocation

- `Storage('proposals')` — same pattern as approval
- `Storage('config')` — credits per voter, status (open/closed)
- `Storage('allocations')` — `{voter: {proposal_id: credits}}`
- Methods:
  - `add_proposal(text)` — auto-stamps `master()`, `timestamp()`
  - `set_credits(n)` — admin sets credit pool per voter
  - `set_status(status)` — admin opens/closes voting
  - `allocate(allocations)` — voter submits `{proposal_id: credits}`, validates total <= credits_per_voter
  - `get_results()` — calculates `sum(sqrt(credits))` per proposal
  - `get_proposals()` — returns all proposals

#### `concerns_contract.py` — Raise concerns + propose resolutions + mark resolved

- `Storage('concerns')` — text, severity (low/medium/high), author, timestamp, resolved status
- `Storage('resolutions')` — nested `{concern_id: {index: {text, author, timestamp}}}` using counter-based indexing (Storage Documents don't support arrays)
- `Storage('resolution_counts')` — `{concern_id: count}` to track next index per concern
- Methods:
  - `add_concern(text, severity)` — auto-stamps `master()`, `timestamp()`
  - `add_resolution(concern_id, text)` — auto-stamps author/timestamp, increments resolution count
  - `resolve_concern(concern_id)` — only original raiser can resolve
  - `get_concerns()` — returns all concerns
  - `get_resolutions(concern_id)` — returns resolutions for a concern, reconstructed as list from indexed storage

**Contract constraints:** Magic functions only (`Storage()`, `master()`, `timestamp()`, `partners()`). No imports. Storage Documents support `__getitem__`, `__setitem__`, `__delitem__`, `__contains__`, `__iter__`, `__len__`, `.get_dict()`, `.update()`, `.exists()` — but NOT `.get(key, default)`.

### Flow Components & UI

#### Approval Voting Flow (replaces Ranking Vote)

- **Registry:** id `approval`, label "Approval Voting", icon `ThumbsUp`, group "Decision Making"
- **Two tabs:** "Proposals" and "Results"
- **Proposals tab:** Text input to add proposals. List showing text, author name, country flag, approve/unapprove toggle (thumbs up). Approval count per proposal.
- **Results tab:** Horizontal stacked bar chart — approval counts broken down by country using `COUNTRY_COLORS`. Proposals sorted by total approvals, highest first.

#### Quadratic Voting Flow (replaces Scoring Vote)

- **Registry:** id `quadratic`, label "Quadratic Voting", icon `Scale`, group "Decision Making"
- **Three tabs:** "Proposals", "Allocate", and "Results"
- **Proposals tab:** Add proposals, see list with country flags. Same pattern as Approval.
- **Allocate tab:** +/- stepper per proposal for credit allocation. Shows remaining credits, cost display (credits squared = votes), total budget. Submit button.
- **Results tab:** Bar chart of effective votes (sum of sqrt(credits) across voters) per proposal, with country breakdown. Voter participation count.

#### Concerns Flow (existing, made functional)

- Keep existing UI structure: raise concern -> respond -> resolve
- Wire to `concerns_contract.py` instead of mock data
- Add country flags next to concern raisers and responders
- Registry entry unchanged (id `concerns`, icon `AlertTriangle`)

#### Shared: CountryBadge component

- Small reusable component: flag emoji + country code
- Pulls country from user profile
- Used next to any user-attributed content across all three flows
- Uses `PILOT_COUNTRIES` and `getCountryByCode()` from `src/utils/countries.ts`

### Registry Changes

Decision Making group:
- Remove: `ranking` (RankingFlow), `scoring` (ScoringFlow)
- Add: `approval` (ApprovalFlow), `quadratic` (QVFlow)
- Keep: `concerns` (ConcernsFlow, updated internals)

Net result: 3 items in Decision Making (same count, kid-friendly).

## File Changes

### New files

```
src/components/collaboration/flows/
  voting/
    ApprovalFlow.tsx + .module.scss
    approvalApi.ts                    (blockchain calls)
    QVFlow.tsx + .module.scss
    qvApi.ts                          (blockchain calls)
  concerns/
    concernsApi.ts                    (blockchain calls, replaces mock)
  shared/
    CountryBadge.tsx
    useFlowContract.ts
    flowContractsSlice.ts
src/assets/contracts/
    approval_contract.py
    qv_contract.py                    (updated: self-contained proposals)
    concerns_contract.py
```

### Files to remove (old mock flows being replaced)

```
src/components/collaboration/flows/voting/RankingFlow.tsx + .module.scss
src/components/collaboration/flows/voting/ScoringFlow.tsx + .module.scss
src/components/collaboration/flows/voting/rankingApi.ts
src/components/collaboration/flows/voting/scoringApi.ts
src/components/collaboration/flows/voting/smithSet.ts
src/components/collaboration/flows/voting/types.ts
```

### Files to remove (our old Issue-pipeline PR changes)

```
src/components/issue/ApprovalResults.tsx + .module.scss
src/components/issue/QVTab.tsx + .module.scss
src/components/issue/QVVoting.tsx + .module.scss
src/components/issue/QVResults.tsx + .module.scss
src/store/slices/qvSlice.ts
src/services/contracts/qv.ts
```

### Files to revert (undo our Issue-pipeline modifications)

- `src/pages/IssueView.tsx` — remove QV tab, fetchApprovals dispatch, Scale icon
- `src/components/issue/Proposals.tsx` — remove country flags, approval buttons
- `src/components/issue/Proposals.module.scss` — remove country/approval styles
- `src/components/issue/Outcome.tsx` — remove ApprovalResults import
- `src/store/slices/issuesSlice.ts` — remove issueApprovals state, fetchApprovals thunk
- `src/store/index.ts` — remove QV reducer registration
- `src/services/contracts/issue.ts` — remove approval/QV service functions
- `src/assets/contracts/issue_contract.py` — remove approval/QV additions (keep master/timestamp on add_proposal)

### Files to keep from our PRs

- `src/utils/countries.ts` — shared country utility
- `src/components/identity/Profile.tsx` changes — country selector
- `src/services/contracts/gloki.ts` changes — country in setValues
- `src/services/interfaces.ts` — `country?` on IProfile
- `.github/workflows/deploy.yml` — GitHub Pages deployment
- `vite.config.ts` — base path change

### Files to modify

- `src/components/collaboration/flows/registry.ts` — swap flow entries
- `src/components/collaboration/flows/concerns/ConcernsFlow.tsx` — wire to blockchain
- `src/components/collaboration/flows/concerns/concernsApi.ts` — replace mock with real calls
- `src/store/index.ts` — register flowContractsSlice (replacing qvSlice)
