# Flows Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate approval voting, quadratic voting, and concerns from the Issue pipeline into the flows architecture as real blockchain-backed flows.

**Architecture:** Each flow gets a dedicated Python contract deployed on first use. A shared `useFlowContract` hook + Redux `flowContractsSlice` manage contract lifecycle (deploy, cache, retrieve). Flow components are pure consumers that ask for their contract and start working. Issue pipeline reverts remove all our PR additions.

**Tech Stack:** React 19, TypeScript, Redux Toolkit (`createSlice`/`createAsyncThunk`), Vite (`?raw` imports), Python blockchain contracts (Storage/master/timestamp/partners), SCSS Modules

---

## File Structure

### New files

```
src/components/collaboration/flows/shared/
  useFlowContract.ts              — Hook: deploy-or-retrieve contract for a flow instance
  flowContractsSlice.ts           — Redux slice: instanceId → contractId cache
  CountryBadge.tsx                — Reusable flag+code badge component

src/components/collaboration/flows/voting/
  ApprovalFlow.tsx                — Approval voting flow (replaces RankingFlow)
  ApprovalFlow.module.scss        — Styles for approval flow
  approvalApi.ts                  — Blockchain service calls for approval contract
  QVFlow.tsx                      — Quadratic voting flow (replaces ScoringFlow)
  QVFlow.module.scss              — Styles for QV flow
  qvApi.ts                        — Blockchain service calls for QV contract

src/components/collaboration/flows/concerns/
  concernsApi.ts                  — (REWRITE) Blockchain service calls replacing mock

src/assets/contracts/
  approval_contract.py            — Python contract: proposals + thumbs up/down
  qv_contract.py                  — (REWRITE) Self-contained proposals + quadratic credits
  concerns_contract.py            — Python contract: concerns + resolutions + resolve
```

### Files to delete

```
src/components/collaboration/flows/voting/RankingFlow.tsx
src/components/collaboration/flows/voting/RankingFlow.module.scss
src/components/collaboration/flows/voting/ScoringFlow.tsx
src/components/collaboration/flows/voting/ScoringFlow.module.scss
src/components/collaboration/flows/voting/rankingApi.ts
src/components/collaboration/flows/voting/scoringApi.ts
src/components/collaboration/flows/voting/smithSet.ts
src/components/collaboration/flows/voting/types.ts
src/components/issue/ApprovalResults.tsx
src/components/issue/ApprovalResults.module.scss
src/components/issue/QVTab.tsx
src/components/issue/QVTab.module.scss
src/components/issue/QVVoting.tsx
src/components/issue/QVVoting.module.scss
src/components/issue/QVResults.tsx
src/components/issue/QVResults.module.scss
src/store/slices/qvSlice.ts
src/services/contracts/qv.ts
```

### Files to modify

```
src/store/index.ts                — Replace qvReducer with flowContractsReducer
src/components/collaboration/flows/registry.ts — Swap ranking/scoring entries for approval/quadratic
src/components/collaboration/flows/concerns/ConcernsFlow.tsx — Wire to blockchain API
src/pages/IssueView.tsx           — Revert to origin/main (remove QV tab, fetchApprovals)
src/components/issue/Proposals.tsx — Revert to origin/main (remove country flags, approval buttons)
src/components/issue/Proposals.module.scss — Revert to origin/main (remove country/approval styles)
src/components/issue/Outcome.tsx  — Revert to origin/main (remove ApprovalResults)
src/store/slices/issuesSlice.ts   — Revert to origin/main (remove approval state/thunks)
src/services/contracts/issue.ts   — Revert to origin/main (remove approval/QV functions)
src/assets/contracts/issue_contract.py — Revert to origin/main (remove approval/QV additions)
```

---

## Task 1: Revert Issue Pipeline Changes

Restore all Issue-pipeline files to their origin/main versions and delete files that only exist from our PRs. This must be done first so we have a clean baseline.

**Files:**
- Revert: `src/pages/IssueView.tsx`, `src/components/issue/Proposals.tsx`, `src/components/issue/Proposals.module.scss`, `src/components/issue/Outcome.tsx`, `src/store/slices/issuesSlice.ts`, `src/services/contracts/issue.ts`, `src/assets/contracts/issue_contract.py`
- Delete: `src/components/issue/ApprovalResults.tsx`, `src/components/issue/ApprovalResults.module.scss`, `src/components/issue/QVTab.tsx`, `src/components/issue/QVTab.module.scss`, `src/components/issue/QVVoting.tsx`, `src/components/issue/QVVoting.module.scss`, `src/components/issue/QVResults.tsx`, `src/components/issue/QVResults.module.scss`

- [ ] **Step 1: Revert Issue-pipeline files to origin/main**

```bash
git checkout origin/main -- \
  src/pages/IssueView.tsx \
  src/components/issue/Proposals.tsx \
  src/components/issue/Proposals.module.scss \
  src/components/issue/Outcome.tsx \
  src/store/slices/issuesSlice.ts \
  src/services/contracts/issue.ts \
  src/assets/contracts/issue_contract.py
```

- [ ] **Step 2: Delete our Issue-pipeline PR files**

```bash
git rm \
  src/components/issue/ApprovalResults.tsx \
  src/components/issue/ApprovalResults.module.scss \
  src/components/issue/QVTab.tsx \
  src/components/issue/QVTab.module.scss \
  src/components/issue/QVVoting.tsx \
  src/components/issue/QVVoting.module.scss \
  src/components/issue/QVResults.tsx \
  src/components/issue/QVResults.module.scss
```

- [ ] **Step 3: Delete old QV slice and service (Issue-pipeline era)**

```bash
git rm \
  src/store/slices/qvSlice.ts \
  src/services/contracts/qv.ts
```

- [ ] **Step 4: Update store to remove qvReducer**

In `src/store/index.ts`, remove the qvReducer import and registration:

```typescript
// Remove this import:
// import qvReducer from './slices/qvSlice';

// Remove from reducer map:
//   qv: qvReducer,
```

Result should be:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import communitiesReducer from './slices/communitiesSlice';
import issuesReducer from './slices/issuesSlice';
import userReducer from './slices/userSlice';
import currencyReducer from './slices/currencySlice';
import initiativeReducer from './slices/initiativeSlice';
import wishReducer from './slices/wishSlice';
import agreementReducer from './slices/agreementSlice';

export const store = configureStore({
  reducer: {
    communities: communitiesReducer,
    issues: issuesReducer,
    user: userReducer,
    currency: currencyReducer,
    initiative: initiativeReducer,
    wish: wishReducer,
    agreement: agreementReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 5: Verify build**

```bash
npx tsc -b && npx vite build --mode production
```

Expected: Build succeeds with 0 errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Revert Issue-pipeline PR changes to clean baseline"
```

---

## Task 2: Delete Old Mock Voting Flows

Remove the Ranking and Scoring mock flows that are being replaced.

**Files:**
- Delete: `src/components/collaboration/flows/voting/RankingFlow.tsx`, `src/components/collaboration/flows/voting/RankingFlow.module.scss`, `src/components/collaboration/flows/voting/ScoringFlow.tsx`, `src/components/collaboration/flows/voting/ScoringFlow.module.scss`, `src/components/collaboration/flows/voting/rankingApi.ts`, `src/components/collaboration/flows/voting/scoringApi.ts`, `src/components/collaboration/flows/voting/smithSet.ts`, `src/components/collaboration/flows/voting/types.ts`

- [ ] **Step 1: Delete old mock flow files**

```bash
git rm \
  src/components/collaboration/flows/voting/RankingFlow.tsx \
  src/components/collaboration/flows/voting/RankingFlow.module.scss \
  src/components/collaboration/flows/voting/ScoringFlow.tsx \
  src/components/collaboration/flows/voting/ScoringFlow.module.scss \
  src/components/collaboration/flows/voting/rankingApi.ts \
  src/components/collaboration/flows/voting/scoringApi.ts \
  src/components/collaboration/flows/voting/smithSet.ts \
  src/components/collaboration/flows/voting/types.ts
```

- [ ] **Step 2: Update registry to remove old flow entries (temporary stubs)**

Replace the ranking/scoring entries in `src/components/collaboration/flows/registry.ts` with temporary placeholders that will be replaced in later tasks. For now, comment them out so the file compiles:

```typescript
import { FileText, Heart, MessageSquare, CalendarDays, PieChart, KanbanSquare, AlertTriangle, HelpCircle, Award } from 'lucide-react';
// RankingFlow and ScoringFlow imports removed — will be replaced by ApprovalFlow and QVFlow
import DocFlow from './document/DocFlow';
import FundraisingFlow from './fundraising/FundraisingFlow';
import DiscussionFlow from './discussion/DiscussionFlow';
import SchedulingFlow from './scheduling/SchedulingFlow';
import BudgetFlow from './budget/BudgetFlow';
import { hasAvailableFunds } from './budget/budgetApi';
import TaskboardFlow from './taskboard/TaskboardFlow';
import ConcernsFlow from './concerns/ConcernsFlow';
import QAFlow from './qa/QAFlow';
import RolesFlow from './roles/RolesFlow';
import type { FlowDefinition } from './types';

/** Ordered list of group names as they appear in the Add Tab menu. */
export const FLOW_GROUPS = [
  'Decision Making',
  'Planning & Execution',
  'Governance & Finance',
  'Communication',
] as const;

export const FLOW_REGISTRY: FlowDefinition[] = [
  // ── Decision Making ────────────────────────────────────────────────────────
  // ApprovalFlow and QVFlow will be added here in Task 6/7
  {
    id: 'concerns',
    label: 'Concern Resolution',
    icon: AlertTriangle,
    component: ConcernsFlow,
    group: 'Decision Making',
  },

  // ── Planning & Execution ───────────────────────────────────────────────────
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: CalendarDays,
    component: SchedulingFlow,
    group: 'Planning & Execution',
  },
  {
    id: 'task-board',
    label: 'Task Board',
    icon: KanbanSquare,
    component: TaskboardFlow,
    group: 'Planning & Execution',
  },
  {
    id: 'roles',
    label: 'Role Nomination',
    icon: Award,
    component: RolesFlow,
    group: 'Planning & Execution',
  },

  // ── Governance & Finance ───────────────────────────────────────────────────
  {
    id: 'fundraising',
    label: 'Fundraising',
    icon: Heart,
    component: FundraisingFlow,
    group: 'Governance & Finance',
  },
  {
    id: 'budget-allocation',
    label: 'Budget Allocation',
    icon: PieChart,
    component: BudgetFlow,
    group: 'Governance & Finance',
    isAvailable: () => hasAvailableFunds(),
  },

  // ── Communication ──────────────────────────────────────────────────────────
  {
    id: 'discussion',
    label: 'Discussion',
    icon: MessageSquare,
    component: DiscussionFlow,
    group: 'Communication',
  },
  {
    id: 'qa',
    label: 'Q&A',
    icon: HelpCircle,
    component: QAFlow,
    group: 'Communication',
  },
  {
    id: 'document',
    label: 'Document',
    icon: FileText,
    component: DocFlow,
    group: 'Communication',
  },
];

export function getFlow(id: string): FlowDefinition | undefined {
  return FLOW_REGISTRY.find((f) => f.id === id);
}
```

- [ ] **Step 3: Verify build**

```bash
npx tsc -b && npx vite build --mode production
```

Expected: Build succeeds. Decision Making group now has only Concerns.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Remove old mock ranking and scoring flows"
```

---

## Task 3: Flow Contract Manager (Shared Infrastructure)

Build the Redux slice and hook that all blockchain-backed flows will use to deploy and retrieve contracts.

**Files:**
- Create: `src/components/collaboration/flows/shared/flowContractsSlice.ts`
- Create: `src/components/collaboration/flows/shared/useFlowContract.ts`
- Modify: `src/store/index.ts`

- [ ] **Step 1: Create flowContractsSlice**

Create `src/components/collaboration/flows/shared/flowContractsSlice.ts`:

```typescript
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface FlowContractsState {
  /** instanceId → contractId */
  contracts: Record<string, string>;
  /** instanceId → true while deploying */
  deploying: Record<string, boolean>;
}

const STORAGE_KEY = 'flowContracts';

function loadFromStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveToStorage(contracts: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts));
  } catch {
    // localStorage full or unavailable — silent fail
  }
}

const initialState: FlowContractsState = {
  contracts: loadFromStorage(),
  deploying: {},
};

const flowContractsSlice = createSlice({
  name: 'flowContracts',
  initialState,
  reducers: {
    setContract(state, action: PayloadAction<{ instanceId: string; contractId: string }>) {
      state.contracts[action.payload.instanceId] = action.payload.contractId;
      state.deploying[action.payload.instanceId] = false;
      saveToStorage(state.contracts);
    },
    setDeploying(state, action: PayloadAction<{ instanceId: string }>) {
      state.deploying[action.payload.instanceId] = true;
    },
    clearDeploying(state, action: PayloadAction<{ instanceId: string }>) {
      state.deploying[action.payload.instanceId] = false;
    },
  },
});

export const { setContract, setDeploying, clearDeploying } = flowContractsSlice.actions;
export default flowContractsSlice.reducer;
```

- [ ] **Step 2: Create useFlowContract hook**

Create `src/components/collaboration/flows/shared/useFlowContract.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { useAppSelector, useAppDispatch } from '../../../../store/hooks';
import { setContract, setDeploying, clearDeploying } from './flowContractsSlice';
import { deployContract } from '../../../../services/api';

interface UseFlowContractResult {
  contractId: string | null;
  isReady: boolean;
  isDeploying: boolean;
}

/**
 * Manages contract lifecycle for a flow instance.
 * Deploys a new contract on first use; returns cached contractId on subsequent uses.
 *
 * @param instanceId  Unique ID for this flow tab instance
 * @param contractName  Human-readable name for the contract (e.g. 'approval_voting')
 * @param contractFileName  Python file name (e.g. 'approval_contract.py')
 * @param contractCode  Raw Python source imported via ?raw
 */
export function useFlowContract(
  instanceId: string,
  contractName: string,
  contractFileName: string,
  contractCode: string,
): UseFlowContractResult {
  const dispatch = useAppDispatch();
  const contractId = useAppSelector((s) => s.flowContracts.contracts[instanceId] ?? null);
  const isDeploying = useAppSelector((s) => s.flowContracts.deploying[instanceId] ?? false);
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const deployAttempted = useRef(false);

  useEffect(() => {
    if (contractId || isDeploying || deployAttempted.current) return;
    if (!serverUrl || !publicKey) return;

    deployAttempted.current = true;
    dispatch(setDeploying({ instanceId }));

    deployContract({
      serverUrl,
      publicKey,
      name: `${contractName}_${instanceId}`,
      contract: contractFileName,
      code: contractCode,
    })
      .then((response) => {
        const id = (response as { id?: string }).id || (response as string);
        dispatch(setContract({ instanceId, contractId: id }));
      })
      .catch((err) => {
        console.error(`Failed to deploy contract for ${instanceId}:`, err);
        dispatch(clearDeploying({ instanceId }));
        deployAttempted.current = false;
      });
  }, [instanceId, contractId, isDeploying, serverUrl, publicKey, contractName, contractFileName, contractCode, dispatch]);

  return {
    contractId,
    isReady: contractId !== null,
    isDeploying,
  };
}
```

- [ ] **Step 3: Register flowContractsSlice in the store**

Update `src/store/index.ts` to add the new slice:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import communitiesReducer from './slices/communitiesSlice';
import issuesReducer from './slices/issuesSlice';
import userReducer from './slices/userSlice';
import currencyReducer from './slices/currencySlice';
import initiativeReducer from './slices/initiativeSlice';
import wishReducer from './slices/wishSlice';
import agreementReducer from './slices/agreementSlice';
import flowContractsReducer from '../components/collaboration/flows/shared/flowContractsSlice';

export const store = configureStore({
  reducer: {
    communities: communitiesReducer,
    issues: issuesReducer,
    user: userReducer,
    currency: currencyReducer,
    initiative: initiativeReducer,
    wish: wishReducer,
    agreement: agreementReducer,
    flowContracts: flowContractsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

- [ ] **Step 4: Verify build**

```bash
npx tsc -b && npx vite build --mode production
```

Expected: Build succeeds. The new slice is registered but not yet used by any flow.

- [ ] **Step 5: Commit**

```bash
git add \
  src/components/collaboration/flows/shared/flowContractsSlice.ts \
  src/components/collaboration/flows/shared/useFlowContract.ts \
  src/store/index.ts
git commit -m "Add flow contract manager (useFlowContract hook + Redux slice)"
```

---

## Task 4: CountryBadge Component

A small reusable component used next to user-attributed content in all three flows.

**Files:**
- Create: `src/components/collaboration/flows/shared/CountryBadge.tsx`

- [ ] **Step 1: Create CountryBadge**

Create `src/components/collaboration/flows/shared/CountryBadge.tsx`:

```tsx
import React from 'react';
import { getCountryByCode } from '../../../../utils/countries';

interface CountryBadgeProps {
  countryCode: string | undefined;
}

/** Renders flag emoji + country code. Returns null if no code provided. */
const CountryBadge: React.FC<CountryBadgeProps> = ({ countryCode }) => {
  if (!countryCode) return null;
  const country = getCountryByCode(countryCode);
  return (
    <span title={country.name} style={{ fontSize: '0.8em', marginLeft: 4 }}>
      {country.flag}
    </span>
  );
};

export default CountryBadge;
```

- [ ] **Step 2: Verify build**

```bash
npx tsc -b && npx vite build --mode production
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/collaboration/flows/shared/CountryBadge.tsx
git commit -m "Add CountryBadge component for flow user attribution"
```

---

## Task 5: Approval Voting Python Contract

The blockchain contract that stores proposals and thumbs-up/down approvals.

**Files:**
- Create: `src/assets/contracts/approval_contract.py`

- [ ] **Step 1: Write the approval contract**

Create `src/assets/contracts/approval_contract.py`:

```python
class ApprovalVoting:
    def __init__(self):
        self.proposals = Storage('proposals')
        self.proposal_count = Storage('proposal_count')
        self.approvals = Storage('approvals')
        if not self.proposal_count.exists():
            self.proposal_count['count'] = 0

    def add_proposal(self, text):
        count = self.proposal_count['count']
        proposal_id = 'p' + str(count)
        self.proposals[proposal_id] = {
            'id': proposal_id,
            'text': text,
            'author': master(),
            'timestamp': timestamp(),
        }
        self.proposal_count['count'] = count + 1
        return proposal_id

    def approve(self, proposal_id):
        voter = master()
        if voter not in self.approvals:
            self.approvals[voter] = {}
        self.approvals[voter][proposal_id] = True

    def withdraw_approval(self, proposal_id):
        voter = master()
        if voter in self.approvals:
            voter_approvals = self.approvals[voter].get_dict()
            if proposal_id in voter_approvals:
                del self.approvals[voter][proposal_id]

    def get_proposals(self):
        result = {}
        for pid in self.proposals:
            result[pid] = self.proposals[pid].get_dict()
        return result

    def get_approvals(self):
        result = {}
        for voter in self.approvals:
            result[voter] = self.approvals[voter].get_dict()
        return result

    def get_my_approvals(self):
        voter = master()
        if voter in self.approvals:
            return self.approvals[voter].get_dict()
        return {}
```

- [ ] **Step 2: Commit**

```bash
git add src/assets/contracts/approval_contract.py
git commit -m "Add approval voting Python contract"
```

---

## Task 6: Approval Voting Flow (Frontend)

The React flow component, API service, styles, and registry entry that replace RankingFlow.

**Files:**
- Create: `src/components/collaboration/flows/voting/approvalApi.ts`
- Create: `src/components/collaboration/flows/voting/ApprovalFlow.tsx`
- Create: `src/components/collaboration/flows/voting/ApprovalFlow.module.scss`
- Modify: `src/components/collaboration/flows/registry.ts`

- [ ] **Step 1: Create approvalApi service**

Create `src/components/collaboration/flows/voting/approvalApi.ts`:

```typescript
import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export async function addProposal(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  text: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'add_proposal', values: { text } } as IMethod,
  });
}

export async function approve(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  proposalId: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'approve', values: { proposal_id: proposalId } } as IMethod,
  });
}

export async function withdrawApproval(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  proposalId: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'withdraw_approval', values: { proposal_id: proposalId } } as IMethod,
  });
}

export async function getProposals(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_proposals', values: {} } as IMethod,
  });
}

export async function getApprovals(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_approvals', values: {} } as IMethod,
  });
}

export async function getMyApprovals(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_my_approvals', values: {} } as IMethod,
  });
}
```

- [ ] **Step 2: Create ApprovalFlow.module.scss**

Create `src/components/collaboration/flows/voting/ApprovalFlow.module.scss`:

```scss
@use '../../../../styles/variables' as *;

.container {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.tabs {
  display: flex;
  gap: $spacing-xs;
  border-bottom: 1.5px solid $gray-200;
  padding-bottom: $spacing-xs;
}

.tab {
  padding: $spacing-sm $spacing-lg;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: $text-sm;
  font-weight: $font-medium;
  color: $gray-500;
  cursor: pointer;
  transition: all $transition-base;

  &:hover { color: $gray-700; }
}

.tabActive {
  color: $primary;
  border-bottom-color: $primary;
}

// ─── Add proposal ──────────────────────────────────────────────────────
.addForm {
  display: flex;
  gap: $spacing-sm;
}

.addInput {
  flex: 1;
  padding: $spacing-sm $spacing-md;
  border: 1px solid $gray-200;
  border-radius: $radius-md;
  font-size: $text-sm;
  color: $gray-800;
  outline: none;
  box-sizing: border-box;

  &:focus { border-color: $primary; }
  &::placeholder { color: $gray-400; }
}

.addBtn {
  padding: $spacing-sm $spacing-lg;
  background: $primary;
  color: white;
  border: none;
  border-radius: $radius-md;
  font-size: $text-sm;
  font-weight: $font-medium;
  cursor: pointer;
  white-space: nowrap;
  transition: background $transition-base;

  &:hover:not(:disabled) { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

// ─── Proposal list ─────────────────────────────────────────────────────
.proposalList {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.proposalCard {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  background: white;
  border: 1.5px solid $gray-200;
  border-radius: $radius-md;
  box-shadow: $shadow-sm;
}

.proposalBody {
  flex: 1;
  min-width: 0;
}

.proposalText {
  font-size: $text-sm;
  font-weight: $font-medium;
  color: $gray-800;
  word-break: break-word;
}

.proposalMeta {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $text-xs;
  color: $gray-400;
  margin-top: 2px;
}

.approveBtn {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-sm $spacing-md;
  background: none;
  border: 1.5px solid $gray-200;
  border-radius: $radius-full;
  font-size: $text-sm;
  font-weight: $font-medium;
  color: $gray-500;
  cursor: pointer;
  transition: all $transition-base;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    border-color: $primary;
    color: $primary;
    background: rgba($primary, 0.05);
  }

  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.approveBtnActive {
  background: rgba($primary, 0.1);
  border-color: $primary;
  color: $primary;
}

.approvalCount {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 $spacing-xs;
  background: $gray-100;
  border-radius: $radius-full;
  font-size: $text-xs;
  font-weight: $font-bold;

  .approveBtnActive & {
    background: rgba($primary, 0.15);
  }
}

// ─── Results ───────────────────────────────────────────────────────────
.resultsList {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.resultRow {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.resultLabel {
  font-size: $text-sm;
  font-weight: $font-medium;
  color: $gray-700;
}

.resultBar {
  height: 24px;
  border-radius: $radius-sm;
  overflow: hidden;
  display: flex;
  background: $gray-100;
}

.resultSegment {
  height: 100%;
  transition: width 0.3s ease;
}

.resultCount {
  font-size: $text-xs;
  color: $gray-500;
  margin-top: 2px;
}

// ─── States ────────────────────────────────────────────────────────────
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xl;
  color: $gray-400;
  font-size: $text-sm;
}

.noData {
  font-size: $text-sm;
  color: $gray-400;
  font-style: italic;
  padding: $spacing-lg 0;
}

.error {
  font-size: $text-sm;
  color: $error;
  padding: $spacing-md;
}
```

- [ ] **Step 3: Create ApprovalFlow component**

Create `src/components/collaboration/flows/voting/ApprovalFlow.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { ThumbsUp } from 'lucide-react';

import type { FlowProps } from '../types';
import { useFlowContract } from '../shared/useFlowContract';
import CountryBadge from '../shared/CountryBadge';
import * as api from './approvalApi';
import { useAppSelector } from '../../../../store/hooks';
import { COUNTRY_COLORS } from '../../../../utils/countries';
import approvalContractCode from '../../../../assets/contracts/approval_contract.py?raw';
import styles from './ApprovalFlow.module.scss';

interface Proposal {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

const ApprovalFlow: React.FC<FlowProps> = ({ instanceId }) => {
  const { contractId, isReady, isDeploying } = useFlowContract(
    instanceId,
    'approval_voting',
    'approval_contract.py',
    approvalContractCode,
  );
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const profiles = useAppSelector((s) => s.communities.profiles);

  const [activeTab, setActiveTab] = useState<'proposals' | 'results'>('proposals');
  const [proposals, setProposals] = useState<Record<string, Proposal>>({});
  const [approvals, setApprovals] = useState<Record<string, Record<string, boolean>>>({});
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!serverUrl || !publicKey || !contractId) return;
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        api.getProposals(serverUrl, publicKey, contractId),
        api.getApprovals(serverUrl, publicKey, contractId),
      ]);
      setProposals((p as Record<string, Proposal>) || {});
      setApprovals((a as Record<string, Record<string, boolean>>) || {});
    } catch (err) {
      console.error('Failed to fetch approval data:', err);
    } finally {
      setLoading(false);
    }
  }, [serverUrl, publicKey, contractId]);

  useEffect(() => {
    if (isReady) fetchData();
  }, [isReady, fetchData]);

  const handleAdd = async () => {
    if (!serverUrl || !publicKey || !contractId || !newText.trim()) return;
    setSubmitting(true);
    try {
      await api.addProposal(serverUrl, publicKey, contractId, newText.trim());
      setNewText('');
      await fetchData();
    } catch (err) {
      console.error('Failed to add proposal:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleApproval = async (proposalId: string) => {
    if (!serverUrl || !publicKey || !contractId) return;
    setTogglingId(proposalId);
    try {
      const isApproved = approvals[publicKey]?.[proposalId];
      if (isApproved) {
        await api.withdrawApproval(serverUrl, publicKey, contractId, proposalId);
      } else {
        await api.approve(serverUrl, publicKey, contractId, proposalId);
      }
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle approval:', err);
    } finally {
      setTogglingId(null);
    }
  };

  if (isDeploying) return <div className={styles.loading}>Deploying contract...</div>;
  if (!isReady) return <div className={styles.loading}>Connecting...</div>;
  if (loading && Object.keys(proposals).length === 0) return <div className={styles.loading}>Loading...</div>;

  const proposalList = Object.values(proposals).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const getApprovalCount = (proposalId: string): number =>
    Object.values(approvals).filter((va) => va[proposalId]).length;

  const getCountryBreakdown = (proposalId: string): Record<string, number> => {
    const breakdown: Record<string, number> = {};
    for (const [voter, voterApprovals] of Object.entries(approvals)) {
      if (!voterApprovals[proposalId]) continue;
      const profile = profiles[voter];
      const country = profile?.country || 'OTHER';
      breakdown[country] = (breakdown[country] || 0) + 1;
    }
    return breakdown;
  };

  const isMyApproval = (proposalId: string): boolean =>
    publicKey ? approvals[publicKey]?.[proposalId] === true : false;

  return (
    <div className={styles.container}>
      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'proposals' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('proposals')}
        >
          Proposals
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'results' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('results')}
        >
          Results
        </button>
      </div>

      {activeTab === 'proposals' && (
        <>
          {/* Add proposal */}
          <div className={styles.addForm}>
            <input
              className={styles.addInput}
              type="text"
              placeholder="Add a proposal..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              disabled={submitting}
            />
            <button
              className={styles.addBtn}
              onClick={handleAdd}
              disabled={submitting || !newText.trim()}
            >
              {submitting ? 'Adding...' : 'Add'}
            </button>
          </div>

          {/* Proposal list */}
          {proposalList.length === 0 ? (
            <p className={styles.noData}>No proposals yet. Add one above.</p>
          ) : (
            <div className={styles.proposalList}>
              {proposalList.map((p) => (
                <div key={p.id} className={styles.proposalCard}>
                  <div className={styles.proposalBody}>
                    <div className={styles.proposalText}>{p.text}</div>
                    <div className={styles.proposalMeta}>
                      <span>{p.author.slice(0, 8)}...</span>
                      <CountryBadge countryCode={profiles[p.author]?.country} />
                    </div>
                  </div>
                  <button
                    className={`${styles.approveBtn} ${isMyApproval(p.id) ? styles.approveBtnActive : ''}`}
                    onClick={() => handleToggleApproval(p.id)}
                    disabled={togglingId === p.id}
                  >
                    <ThumbsUp size={16} />
                    <span className={styles.approvalCount}>{getApprovalCount(p.id)}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'results' && (
        <>
          {proposalList.length === 0 ? (
            <p className={styles.noData}>No proposals to show results for.</p>
          ) : (
            <div className={styles.resultsList}>
              {[...proposalList]
                .sort((a, b) => getApprovalCount(b.id) - getApprovalCount(a.id))
                .map((p) => {
                  const total = getApprovalCount(p.id);
                  const breakdown = getCountryBreakdown(p.id);
                  const maxApprovals = Math.max(
                    ...proposalList.map((pp) => getApprovalCount(pp.id)),
                    1,
                  );
                  return (
                    <div key={p.id} className={styles.resultRow}>
                      <div className={styles.resultLabel}>{p.text}</div>
                      <div className={styles.resultBar}>
                        {Object.entries(breakdown).map(([country, count]) => (
                          <div
                            key={country}
                            className={styles.resultSegment}
                            style={{
                              width: `${(count / maxApprovals) * 100}%`,
                              backgroundColor: COUNTRY_COLORS[country] || COUNTRY_COLORS.OTHER,
                            }}
                            title={`${country}: ${count}`}
                          />
                        ))}
                      </div>
                      <div className={styles.resultCount}>{total} approval{total !== 1 ? 's' : ''}</div>
                    </div>
                  );
                })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ApprovalFlow;
```

- [ ] **Step 4: Add ApprovalFlow to registry**

Update `src/components/collaboration/flows/registry.ts` — add the import and entry:

Add to imports:
```typescript
import { ThumbsUp } from 'lucide-react';
import ApprovalFlow from './voting/ApprovalFlow';
```

Add to FLOW_REGISTRY Decision Making section (before concerns):
```typescript
  {
    id: 'approval',
    label: 'Approval Voting',
    icon: ThumbsUp,
    component: ApprovalFlow,
    group: 'Decision Making',
  },
```

- [ ] **Step 5: Verify build**

```bash
npx tsc -b && npx vite build --mode production
```

Expected: Build succeeds. Decision Making now has Approval Voting + Concerns.

- [ ] **Step 6: Commit**

```bash
git add \
  src/components/collaboration/flows/voting/approvalApi.ts \
  src/components/collaboration/flows/voting/ApprovalFlow.tsx \
  src/components/collaboration/flows/voting/ApprovalFlow.module.scss \
  src/components/collaboration/flows/registry.ts
git commit -m "Add blockchain-backed Approval Voting flow"
```

---

## Task 7: Quadratic Voting Python Contract

Rewrite the QV contract to be self-contained with its own proposal management.

**Files:**
- Rewrite: `src/assets/contracts/qv_contract.py`

- [ ] **Step 1: Write the self-contained QV contract**

Overwrite `src/assets/contracts/qv_contract.py`:

```python
class QuadraticVote:
    def __init__(self):
        self.proposals = Storage('proposals')
        self.proposal_count = Storage('proposal_count')
        self.config = Storage('config')
        self.allocations = Storage('allocations')
        if not self.proposal_count.exists():
            self.proposal_count['count'] = 0
        if not self.config.exists():
            self.config['credits_per_voter'] = 100
            self.config['status'] = 'open'

    def add_proposal(self, text):
        count = self.proposal_count['count']
        proposal_id = 'p' + str(count)
        self.proposals[proposal_id] = {
            'id': proposal_id,
            'text': text,
            'author': master(),
            'timestamp': timestamp(),
        }
        self.proposal_count['count'] = count + 1
        return proposal_id

    def set_credits(self, credits):
        self.config['credits_per_voter'] = credits

    def set_status(self, status):
        self.config['status'] = status

    def get_config(self):
        return self.config.get_dict()

    def get_proposals(self):
        result = {}
        for pid in self.proposals:
            result[pid] = self.proposals[pid].get_dict()
        return result

    def allocate(self, allocations):
        status = self.config['status']
        if status != 'open':
            return {'error': 'Voting is not open'}
        credits_per_voter = self.config['credits_per_voter']
        total = 0
        for pid in allocations:
            total = total + allocations[pid]
        if total > credits_per_voter:
            return {'error': 'Exceeds credit budget'}
        voter = master()
        self.allocations[voter] = allocations

    def get_allocations(self):
        result = {}
        for voter in self.allocations:
            result[voter] = self.allocations[voter].get_dict()
        return result

    def get_my_allocation(self):
        voter = master()
        if voter in self.allocations:
            return self.allocations[voter].get_dict()
        return {}

    def get_results(self):
        proposal_votes = {}
        for voter in self.allocations:
            voter_alloc = self.allocations[voter].get_dict()
            for pid in voter_alloc:
                credits = voter_alloc[pid]
                votes = credits ** 0.5
                if pid in proposal_votes:
                    proposal_votes[pid] = proposal_votes[pid] + votes
                else:
                    proposal_votes[pid] = votes
        return proposal_votes
```

- [ ] **Step 2: Commit**

```bash
git add src/assets/contracts/qv_contract.py
git commit -m "Rewrite QV contract as self-contained with proposal management"
```

---

## Task 8: Quadratic Voting Flow (Frontend)

The React flow component, API service, styles, and registry entry that replace ScoringFlow.

**Files:**
- Create: `src/components/collaboration/flows/voting/qvApi.ts`
- Create: `src/components/collaboration/flows/voting/QVFlow.tsx`
- Create: `src/components/collaboration/flows/voting/QVFlow.module.scss`
- Modify: `src/components/collaboration/flows/registry.ts`

- [ ] **Step 1: Create qvApi service**

Create `src/components/collaboration/flows/voting/qvApi.ts`:

```typescript
import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export async function addProposal(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  text: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'add_proposal', values: { text } } as IMethod,
  });
}

export async function setCredits(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  credits: number,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'set_credits', values: { credits } } as IMethod,
  });
}

export async function setStatus(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  status: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'set_status', values: { status } } as IMethod,
  });
}

export async function getConfig(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_config', values: {} } as IMethod,
  });
}

export async function getProposals(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_proposals', values: {} } as IMethod,
  });
}

export async function allocate(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  allocations: Record<string, number>,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'allocate', values: { allocations } } as IMethod,
  });
}

export async function getAllocations(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_allocations', values: {} } as IMethod,
  });
}

export async function getMyAllocation(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_my_allocation', values: {} } as IMethod,
  });
}

export async function getResults(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_results', values: {} } as IMethod,
  });
}
```

- [ ] **Step 2: Create QVFlow.module.scss**

Create `src/components/collaboration/flows/voting/QVFlow.module.scss`:

```scss
@use '../../../../styles/variables' as *;

.container {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.tabs {
  display: flex;
  gap: $spacing-xs;
  border-bottom: 1.5px solid $gray-200;
  padding-bottom: $spacing-xs;
}

.tab {
  padding: $spacing-sm $spacing-lg;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: $text-sm;
  font-weight: $font-medium;
  color: $gray-500;
  cursor: pointer;
  transition: all $transition-base;

  &:hover { color: $gray-700; }
}

.tabActive {
  color: $primary;
  border-bottom-color: $primary;
}

// ─── Add proposal ──────────────────────────────────────────────────────
.addForm {
  display: flex;
  gap: $spacing-sm;
}

.addInput {
  flex: 1;
  padding: $spacing-sm $spacing-md;
  border: 1px solid $gray-200;
  border-radius: $radius-md;
  font-size: $text-sm;
  color: $gray-800;
  outline: none;
  box-sizing: border-box;

  &:focus { border-color: $primary; }
  &::placeholder { color: $gray-400; }
}

.addBtn {
  padding: $spacing-sm $spacing-lg;
  background: $primary;
  color: white;
  border: none;
  border-radius: $radius-md;
  font-size: $text-sm;
  font-weight: $font-medium;
  cursor: pointer;
  white-space: nowrap;
  transition: background $transition-base;

  &:hover:not(:disabled) { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

// ─── Allocate ──────────────────────────────────────────────────────────
.budget {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  background: $gray-50;
  border-radius: $radius-md;
  border: 1px solid $gray-200;
  font-size: $text-sm;
  color: $gray-700;
}

.budgetLabel {
  font-weight: $font-semibold;
}

.budgetRemaining {
  font-weight: $font-bold;
  color: $primary;
}

.allocateList {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.allocateRow {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  background: white;
  border: 1.5px solid $gray-200;
  border-radius: $radius-md;
}

.allocateLabel {
  flex: 1;
  font-size: $text-sm;
  font-weight: $font-medium;
  color: $gray-800;
  min-width: 0;
  word-break: break-word;
}

.allocateControls {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  flex-shrink: 0;
}

.stepperBtn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $gray-100;
  border: 1px solid $gray-200;
  border-radius: $radius-sm;
  font-size: $text-base;
  font-weight: $font-bold;
  color: $gray-600;
  cursor: pointer;
  transition: all $transition-base;

  &:hover:not(:disabled) { background: $gray-200; color: $gray-800; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
}

.creditDisplay {
  min-width: 3rem;
  text-align: center;
  font-size: $text-sm;
  font-weight: $font-bold;
  color: $gray-800;
}

.voteDisplay {
  font-size: $text-xs;
  color: $gray-400;
  min-width: 4rem;
  text-align: right;
}

.submitRow {
  display: flex;
  justify-content: flex-end;
}

.submitBtn {
  padding: $spacing-sm $spacing-xl;
  background: $primary;
  color: white;
  border: none;
  border-radius: $radius-md;
  font-size: $text-sm;
  font-weight: $font-semibold;
  cursor: pointer;
  transition: background $transition-base;

  &:hover:not(:disabled) { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

// ─── Results ───────────────────────────────────────────────────────────
.resultsList {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.resultRow {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.resultLabel {
  font-size: $text-sm;
  font-weight: $font-medium;
  color: $gray-700;
}

.resultBar {
  height: 24px;
  border-radius: $radius-sm;
  overflow: hidden;
  display: flex;
  background: $gray-100;
}

.resultSegment {
  height: 100%;
  transition: width 0.3s ease;
}

.resultCount {
  font-size: $text-xs;
  color: $gray-500;
  margin-top: 2px;
}

.participation {
  font-size: $text-xs;
  color: $gray-400;
  padding-top: $spacing-sm;
  border-top: 1px solid $gray-100;
}

// ─── States ────────────────────────────────────────────────────────────
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xl;
  color: $gray-400;
  font-size: $text-sm;
}

.noData {
  font-size: $text-sm;
  color: $gray-400;
  font-style: italic;
  padding: $spacing-lg 0;
}

.error {
  font-size: $text-sm;
  color: $error;
  padding: $spacing-md;
}

// ─── Proposal list (shared in proposals tab) ───────────────────────────
.proposalList {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.proposalCard {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-md;
  background: white;
  border: 1.5px solid $gray-200;
  border-radius: $radius-md;
  box-shadow: $shadow-sm;
}

.proposalBody {
  flex: 1;
  min-width: 0;
}

.proposalText {
  font-size: $text-sm;
  font-weight: $font-medium;
  color: $gray-800;
  word-break: break-word;
}

.proposalMeta {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $text-xs;
  color: $gray-400;
  margin-top: 2px;
}
```

- [ ] **Step 3: Create QVFlow component**

Create `src/components/collaboration/flows/voting/QVFlow.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react';

import type { FlowProps } from '../types';
import { useFlowContract } from '../shared/useFlowContract';
import CountryBadge from '../shared/CountryBadge';
import * as api from './qvApi';
import { useAppSelector } from '../../../../store/hooks';
import { COUNTRY_COLORS } from '../../../../utils/countries';
import qvContractCode from '../../../../assets/contracts/qv_contract.py?raw';
import styles from './QVFlow.module.scss';

interface Proposal {
  id: string;
  text: string;
  author: string;
  timestamp: string;
}

interface Config {
  credits_per_voter: number;
  status: string;
}

const QVFlow: React.FC<FlowProps> = ({ instanceId }) => {
  const { contractId, isReady, isDeploying } = useFlowContract(
    instanceId,
    'quadratic_vote',
    'qv_contract.py',
    qvContractCode,
  );
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const profiles = useAppSelector((s) => s.communities.profiles);

  const [activeTab, setActiveTab] = useState<'proposals' | 'allocate' | 'results'>('proposals');
  const [proposals, setProposals] = useState<Record<string, Proposal>>({});
  const [config, setConfig] = useState<Config>({ credits_per_voter: 100, status: 'open' });
  const [myAllocation, setMyAllocation] = useState<Record<string, number>>({});
  const [allAllocations, setAllAllocations] = useState<Record<string, Record<string, number>>>({});
  const [results, setResults] = useState<Record<string, number>>({});
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Local draft of credits being allocated (not yet submitted)
  const [draft, setDraft] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    if (!serverUrl || !publicKey || !contractId) return;
    setLoading(true);
    try {
      const [p, c, ma, aa, r] = await Promise.all([
        api.getProposals(serverUrl, publicKey, contractId),
        api.getConfig(serverUrl, publicKey, contractId),
        api.getMyAllocation(serverUrl, publicKey, contractId),
        api.getAllocations(serverUrl, publicKey, contractId),
        api.getResults(serverUrl, publicKey, contractId),
      ]);
      setProposals((p as Record<string, Proposal>) || {});
      setConfig((c as Config) || { credits_per_voter: 100, status: 'open' });
      const myAlloc = (ma as Record<string, number>) || {};
      setMyAllocation(myAlloc);
      setDraft(myAlloc);
      setAllAllocations((aa as Record<string, Record<string, number>>) || {});
      setResults((r as Record<string, number>) || {});
    } catch (err) {
      console.error('Failed to fetch QV data:', err);
    } finally {
      setLoading(false);
    }
  }, [serverUrl, publicKey, contractId]);

  useEffect(() => {
    if (isReady) fetchData();
  }, [isReady, fetchData]);

  const handleAddProposal = async () => {
    if (!serverUrl || !publicKey || !contractId || !newText.trim()) return;
    setSubmitting(true);
    try {
      await api.addProposal(serverUrl, publicKey, contractId, newText.trim());
      setNewText('');
      await fetchData();
    } catch (err) {
      console.error('Failed to add proposal:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalDraftCredits = Object.values(draft).reduce((sum, c) => sum + c, 0);
  const remaining = config.credits_per_voter - totalDraftCredits;

  const adjustCredit = (proposalId: string, delta: number) => {
    setDraft((prev) => {
      const current = prev[proposalId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [proposalId]: _, ...rest } = prev;
        return rest;
      }
      // Check budget
      const otherTotal = totalDraftCredits - current;
      if (otherTotal + next > config.credits_per_voter) return prev;
      return { ...prev, [proposalId]: next };
    });
  };

  const handleSubmitAllocation = async () => {
    if (!serverUrl || !publicKey || !contractId) return;
    setSubmitting(true);
    try {
      await api.allocate(serverUrl, publicKey, contractId, draft);
      await fetchData();
    } catch (err) {
      console.error('Failed to submit allocation:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (isDeploying) return <div className={styles.loading}>Deploying contract...</div>;
  if (!isReady) return <div className={styles.loading}>Connecting...</div>;
  if (loading && Object.keys(proposals).length === 0) return <div className={styles.loading}>Loading...</div>;

  const proposalList = Object.values(proposals).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const voterCount = Object.keys(allAllocations).length;

  const getCountryBreakdownForResults = (proposalId: string): Record<string, number> => {
    const breakdown: Record<string, number> = {};
    for (const [voter, voterAlloc] of Object.entries(allAllocations)) {
      const credits = voterAlloc[proposalId];
      if (!credits) continue;
      const profile = profiles[voter];
      const country = profile?.country || 'OTHER';
      const votes = Math.sqrt(credits);
      breakdown[country] = (breakdown[country] || 0) + votes;
    }
    return breakdown;
  };

  return (
    <div className={styles.container}>
      {/* Tabs */}
      <div className={styles.tabs}>
        {(['proposals', 'allocate', 'results'] as const).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t === 'proposals' ? 'Proposals' : t === 'allocate' ? 'Allocate' : 'Results'}
          </button>
        ))}
      </div>

      {/* Proposals tab */}
      {activeTab === 'proposals' && (
        <>
          <div className={styles.addForm}>
            <input
              className={styles.addInput}
              type="text"
              placeholder="Add a proposal..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddProposal(); }}
              disabled={submitting}
            />
            <button
              className={styles.addBtn}
              onClick={handleAddProposal}
              disabled={submitting || !newText.trim()}
            >
              {submitting ? 'Adding...' : 'Add'}
            </button>
          </div>

          {proposalList.length === 0 ? (
            <p className={styles.noData}>No proposals yet. Add one above.</p>
          ) : (
            <div className={styles.proposalList}>
              {proposalList.map((p) => (
                <div key={p.id} className={styles.proposalCard}>
                  <div className={styles.proposalBody}>
                    <div className={styles.proposalText}>{p.text}</div>
                    <div className={styles.proposalMeta}>
                      <span>{p.author.slice(0, 8)}...</span>
                      <CountryBadge countryCode={profiles[p.author]?.country} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Allocate tab */}
      {activeTab === 'allocate' && (
        <>
          {config.status !== 'open' ? (
            <p className={styles.noData}>Voting is currently closed.</p>
          ) : (
            <>
              <div className={styles.budget}>
                <span className={styles.budgetLabel}>Credit Budget:</span>
                <span>{config.credits_per_voter} total</span>
                <span>|</span>
                <span className={styles.budgetRemaining}>{remaining} remaining</span>
              </div>

              {proposalList.length === 0 ? (
                <p className={styles.noData}>No proposals to allocate credits to.</p>
              ) : (
                <>
                  <div className={styles.allocateList}>
                    {proposalList.map((p) => {
                      const credits = draft[p.id] || 0;
                      const votes = Math.sqrt(credits);
                      return (
                        <div key={p.id} className={styles.allocateRow}>
                          <div className={styles.allocateLabel}>{p.text}</div>
                          <div className={styles.allocateControls}>
                            <button
                              className={styles.stepperBtn}
                              onClick={() => adjustCredit(p.id, -1)}
                              disabled={credits === 0}
                            >
                              −
                            </button>
                            <div className={styles.creditDisplay}>{credits}</div>
                            <button
                              className={styles.stepperBtn}
                              onClick={() => adjustCredit(p.id, 1)}
                              disabled={remaining <= 0}
                            >
                              +
                            </button>
                            <div className={styles.voteDisplay}>
                              = {votes.toFixed(2)} votes
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.submitRow}>
                    <button
                      className={styles.submitBtn}
                      onClick={handleSubmitAllocation}
                      disabled={submitting}
                    >
                      {submitting ? 'Submitting...' : 'Submit Allocation'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Results tab */}
      {activeTab === 'results' && (
        <>
          {proposalList.length === 0 ? (
            <p className={styles.noData}>No proposals to show results for.</p>
          ) : (
            <>
              <div className={styles.resultsList}>
                {[...proposalList]
                  .sort((a, b) => (results[b.id] || 0) - (results[a.id] || 0))
                  .map((p) => {
                    const totalVotes = results[p.id] || 0;
                    const breakdown = getCountryBreakdownForResults(p.id);
                    const maxVotes = Math.max(...Object.values(results), 1);
                    return (
                      <div key={p.id} className={styles.resultRow}>
                        <div className={styles.resultLabel}>{p.text}</div>
                        <div className={styles.resultBar}>
                          {Object.entries(breakdown).map(([country, votes]) => (
                            <div
                              key={country}
                              className={styles.resultSegment}
                              style={{
                                width: `${(votes / maxVotes) * 100}%`,
                                backgroundColor: COUNTRY_COLORS[country] || COUNTRY_COLORS.OTHER,
                              }}
                              title={`${country}: ${votes.toFixed(2)} votes`}
                            />
                          ))}
                        </div>
                        <div className={styles.resultCount}>
                          {totalVotes.toFixed(2)} effective votes
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className={styles.participation}>
                {voterCount} voter{voterCount !== 1 ? 's' : ''} have participated
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default QVFlow;
```

- [ ] **Step 4: Add QVFlow to registry**

Update `src/components/collaboration/flows/registry.ts` — add the import and entry:

Add to imports:
```typescript
import { Scale } from 'lucide-react';
import QVFlow from './voting/QVFlow';
```

Add to FLOW_REGISTRY Decision Making section (after approval, before concerns):
```typescript
  {
    id: 'quadratic',
    label: 'Quadratic Voting',
    icon: Scale,
    component: QVFlow,
    group: 'Decision Making',
  },
```

- [ ] **Step 5: Verify build**

```bash
npx tsc -b && npx vite build --mode production
```

Expected: Build succeeds. Decision Making now has Approval Voting + Quadratic Voting + Concerns.

- [ ] **Step 6: Commit**

```bash
git add \
  src/components/collaboration/flows/voting/qvApi.ts \
  src/components/collaboration/flows/voting/QVFlow.tsx \
  src/components/collaboration/flows/voting/QVFlow.module.scss \
  src/assets/contracts/qv_contract.py \
  src/components/collaboration/flows/registry.ts
git commit -m "Add blockchain-backed Quadratic Voting flow"
```

---

## Task 9: Concerns Python Contract

A new contract for the Concerns flow, replacing the mock API with blockchain-backed state.

**Files:**
- Create: `src/assets/contracts/concerns_contract.py`

- [ ] **Step 1: Write the concerns contract**

Create `src/assets/contracts/concerns_contract.py`:

```python
class ConcernResolution:
    def __init__(self):
        self.concerns = Storage('concerns')
        self.concern_count = Storage('concern_count')
        self.resolutions = Storage('resolutions')
        self.resolution_counts = Storage('resolution_counts')
        if not self.concern_count.exists():
            self.concern_count['count'] = 0

    def add_concern(self, text, severity):
        count = self.concern_count['count']
        concern_id = 'c' + str(count)
        self.concerns[concern_id] = {
            'id': concern_id,
            'text': text,
            'severity': severity,
            'author': master(),
            'timestamp': timestamp(),
            'resolved': False,
        }
        self.concern_count['count'] = count + 1
        return concern_id

    def add_resolution(self, concern_id, text):
        if concern_id not in self.resolution_counts:
            self.resolution_counts[concern_id] = 0
        idx = self.resolution_counts[concern_id]
        if concern_id not in self.resolutions:
            self.resolutions[concern_id] = {}
        self.resolutions[concern_id][str(idx)] = {
            'text': text,
            'author': master(),
            'timestamp': timestamp(),
        }
        self.resolution_counts[concern_id] = idx + 1

    def resolve_concern(self, concern_id):
        if concern_id in self.concerns:
            concern = self.concerns[concern_id].get_dict()
            if concern['author'] == master():
                concern['resolved'] = True
                self.concerns[concern_id] = concern

    def get_concerns(self):
        result = {}
        for cid in self.concerns:
            result[cid] = self.concerns[cid].get_dict()
        return result

    def get_resolutions(self, concern_id):
        result = []
        if concern_id in self.resolution_counts:
            count = self.resolution_counts[concern_id]
            idx = 0
            while idx < count:
                if concern_id in self.resolutions:
                    res_data = self.resolutions[concern_id]
                    if str(idx) in res_data:
                        result.append(res_data[str(idx)].get_dict())
                idx = idx + 1
        return result
```

- [ ] **Step 2: Commit**

```bash
git add src/assets/contracts/concerns_contract.py
git commit -m "Add concerns resolution Python contract"
```

---

## Task 10: Wire ConcernsFlow to Blockchain

Replace the mock `concernsApi.ts` with real blockchain calls and update `ConcernsFlow.tsx` to use async API + contract lifecycle.

**Files:**
- Rewrite: `src/components/collaboration/flows/concerns/concernsApi.ts`
- Modify: `src/components/collaboration/flows/concerns/ConcernsFlow.tsx`

- [ ] **Step 1: Rewrite concernsApi with blockchain calls**

Overwrite `src/components/collaboration/flows/concerns/concernsApi.ts`:

```typescript
import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export interface Concern {
  id: string;
  text: string;
  severity: string;
  author: string;
  timestamp: string;
  resolved: boolean;
}

export interface Resolution {
  text: string;
  author: string;
  timestamp: string;
}

export async function addConcern(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  text: string,
  severity: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'add_concern', values: { text, severity } } as IMethod,
  });
}

export async function addResolution(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  concernId: string,
  text: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'add_resolution', values: { concern_id: concernId, text } } as IMethod,
  });
}

export async function resolveConcern(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  concernId: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'resolve_concern', values: { concern_id: concernId } } as IMethod,
  });
}

export async function getConcerns(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_concerns', values: {} } as IMethod,
  });
}

export async function getResolutions(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  concernId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_resolutions', values: { concern_id: concernId } } as IMethod,
  });
}
```

- [ ] **Step 2: Rewrite ConcernsFlow.tsx for blockchain**

Overwrite `src/components/collaboration/flows/concerns/ConcernsFlow.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Plus, Check } from 'lucide-react';

import type { FlowProps } from '../types';
import { useFlowContract } from '../shared/useFlowContract';
import CountryBadge from '../shared/CountryBadge';
import * as api from './concernsApi';
import type { Concern, Resolution } from './concernsApi';
import { useAppSelector } from '../../../../store/hooks';
import concernsContractCode from '../../../../assets/contracts/concerns_contract.py?raw';
import styles from './ConcernsFlow.module.scss';

// ---------------------------------------------------------------------------
// Add concern form
// ---------------------------------------------------------------------------
const AddConcernForm: React.FC<{
  onAdd: (text: string, severity: string) => Promise<void>;
}> = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!text.trim()) { setError('Description is required.'); return; }
    setSubmitting(true);
    try {
      await onAdd(text.trim(), severity);
      setText(''); setSeverity('medium'); setError(''); setOpen(false);
    } catch {
      setError('Failed to submit concern.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button className={styles.addBtn} onClick={() => setOpen(true)}>
        <Plus size={15} /> Raise a concern
      </button>
    );
  }

  return (
    <div className={styles.addForm}>
      <textarea
        className={styles.addDescInput}
        rows={2}
        placeholder="Describe your concern *"
        value={text}
        autoFocus
        onChange={(e) => { setText(e.target.value); setError(''); }}
      />
      <div className={styles.severityRow}>
        {(['low', 'medium', 'high'] as const).map((s) => (
          <button
            key={s}
            className={`${styles.severityBtn} ${severity === s ? styles.severityBtnActive : ''}`}
            onClick={() => setSeverity(s)}
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className={styles.errorMsg}>{error}</p>}
      <div className={styles.addFormActions}>
        <button className={styles.btnConfirm} onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
        <button className={styles.btnCancel} onClick={() => { setOpen(false); setError(''); }}>
          Cancel
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Concern card
// ---------------------------------------------------------------------------
const ConcernCard: React.FC<{
  concern: Concern;
  resolutions: Resolution[];
  isAuthor: boolean;
  profiles: Record<string, { country?: string }>;
  onResolve: () => Promise<void>;
  onAddResolution: (text: string) => Promise<void>;
}> = ({ concern, resolutions, isAuthor, profiles, onResolve, onAddResolution }) => {
  const [resText, setResText] = useState('');
  const [showResForm, setShowResForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const severityColor = concern.severity === 'high' ? 'rgba(220,38,38,0.85)'
    : concern.severity === 'medium' ? 'rgba(220,38,38,0.5)'
    : 'rgba(220,38,38,0.25)';

  const handleSubmitResolution = async () => {
    if (!resText.trim()) return;
    setSubmitting(true);
    try {
      await onAddResolution(resText.trim());
      setResText(''); setShowResForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`${styles.card} ${concern.resolved ? styles.card_resolved : styles.card_active}`}
      style={!concern.resolved ? { borderLeftColor: severityColor } : undefined}
    >
      {/* Severity badge */}
      {!concern.resolved && (
        <div className={styles.weightBadge} style={{ background: severityColor }} title={concern.severity}>
          {concern.severity[0].toUpperCase()}
        </div>
      )}

      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>{concern.text}</span>
          <span className={styles.cardCreator}>
            {concern.author.slice(0, 8)}...
            <CountryBadge countryCode={profiles[concern.author]?.country} />
          </span>
        </div>

        {/* Resolutions */}
        {resolutions.length > 0 && (
          <div className={styles.resolutionList}>
            {resolutions.map((r, i) => (
              <div key={i} className={styles.resolution}>
                <span className={styles.resolutionText}>{r.text}</span>
                <span className={styles.resolutionAuthor}>
                  — {r.author.slice(0, 8)}...
                  <CountryBadge countryCode={profiles[r.author]?.country} />
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {!concern.resolved && (
          <div className={styles.voteButtons}>
            <button
              className={styles.voteBtn}
              onClick={() => setShowResForm((v) => !v)}
            >
              Propose Resolution
            </button>
            {isAuthor && (
              <button
                className={`${styles.voteBtn} ${styles.voteBtn_resolved}`}
                onClick={onResolve}
              >
                <Check size={14} /> Mark Resolved
              </button>
            )}
          </div>
        )}

        {showResForm && (
          <div className={styles.addForm} style={{ marginTop: 8 }}>
            <input
              className={styles.addTitleInput}
              type="text"
              placeholder="Propose a resolution..."
              value={resText}
              onChange={(e) => setResText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitResolution(); }}
            />
            <div className={styles.addFormActions}>
              <button className={styles.btnConfirm} onClick={handleSubmitResolution} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <button className={styles.btnCancel} onClick={() => setShowResForm(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------
const CollapsibleSection: React.FC<{
  label: string;
  count: number;
  colorClass: string;
  children: React.ReactNode;
}> = ({ label, count, colorClass, children }) => {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className={styles.section}>
      <button
        className={`${styles.sectionToggle} ${colorClass}`}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        {label}
        <span className={styles.sectionCount}>{count}</span>
      </button>
      {open && <div className={styles.sectionCards}>{children}</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const ConcernsFlow: React.FC<FlowProps> = ({ instanceId }) => {
  const { contractId, isReady, isDeploying } = useFlowContract(
    instanceId,
    'concern_resolution',
    'concerns_contract.py',
    concernsContractCode,
  );
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const profiles = useAppSelector((s) => s.communities.profiles);

  const [concerns, setConcerns] = useState<Concern[]>([]);
  const [resolutionsMap, setResolutionsMap] = useState<Record<string, Resolution[]>>({});
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!serverUrl || !publicKey || !contractId) return;
    setLoading(true);
    try {
      const raw = await api.getConcerns(serverUrl, publicKey, contractId);
      const concernsObj = (raw as Record<string, Concern>) || {};
      const concernList = Object.values(concernsObj);
      setConcerns(concernList);

      // Fetch resolutions for all concerns
      const resMap: Record<string, Resolution[]> = {};
      await Promise.all(
        concernList.map(async (c) => {
          try {
            const res = await api.getResolutions(serverUrl, publicKey, contractId, c.id);
            resMap[c.id] = (res as Resolution[]) || [];
          } catch {
            resMap[c.id] = [];
          }
        }),
      );
      setResolutionsMap(resMap);
    } catch (err) {
      console.error('Failed to fetch concerns:', err);
    } finally {
      setLoading(false);
    }
  }, [serverUrl, publicKey, contractId]);

  useEffect(() => {
    if (isReady) fetchData();
  }, [isReady, fetchData]);

  const handleAddConcern = async (text: string, severity: string) => {
    if (!serverUrl || !publicKey || !contractId) return;
    await api.addConcern(serverUrl, publicKey, contractId, text, severity);
    await fetchData();
  };

  const handleResolve = async (concernId: string) => {
    if (!serverUrl || !publicKey || !contractId) return;
    await api.resolveConcern(serverUrl, publicKey, contractId, concernId);
    await fetchData();
  };

  const handleAddResolution = async (concernId: string, text: string) => {
    if (!serverUrl || !publicKey || !contractId) return;
    await api.addResolution(serverUrl, publicKey, contractId, concernId, text);
    await fetchData();
  };

  if (isDeploying) return <div className={styles.loading}>Deploying contract...</div>;
  if (!isReady) return <div className={styles.loading}>Connecting...</div>;
  if (loading && concerns.length === 0) return <div className={styles.loading}>Loading...</div>;

  const active = concerns.filter((c) => !c.resolved);
  const resolved = concerns.filter((c) => c.resolved);

  // Sort active by severity (high first), then timestamp desc
  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  active.sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 1) - (severityOrder[b.severity] ?? 1) ||
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <AlertTriangle size={18} className={styles.headerIcon} />
        <span>{active.length} active concern{active.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Add form */}
      <AddConcernForm onAdd={handleAddConcern} />

      {/* Active concerns */}
      {active.length === 0 ? (
        <p className={styles.noData}>No active concerns. The floor is open — raise one above.</p>
      ) : (
        <div className={styles.concernList}>
          {active.map((c) => (
            <ConcernCard
              key={c.id}
              concern={c}
              resolutions={resolutionsMap[c.id] || []}
              isAuthor={publicKey === c.author}
              profiles={profiles}
              onResolve={() => handleResolve(c.id)}
              onAddResolution={(text) => handleAddResolution(c.id, text)}
            />
          ))}
        </div>
      )}

      {/* Resolved (collapsible) */}
      <CollapsibleSection label="Resolved" count={resolved.length} colorClass={styles.toggleResolved}>
        <div className={styles.concernList}>
          {resolved.map((c) => (
            <ConcernCard
              key={c.id}
              concern={c}
              resolutions={resolutionsMap[c.id] || []}
              isAuthor={publicKey === c.author}
              profiles={profiles}
              onResolve={() => handleResolve(c.id)}
              onAddResolution={(text) => handleAddResolution(c.id, text)}
            />
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default ConcernsFlow;
```

- [ ] **Step 3: Add new SCSS classes for concerns updates**

Add these rules to the end of `src/components/collaboration/flows/concerns/ConcernsFlow.module.scss` (before the closing, after `.sectionCards`):

```scss
// ─── Severity ────────────────────────────────────────────────────────────────
.severityRow {
  display: flex;
  gap: $spacing-xs;
}

.severityBtn {
  padding: $spacing-xs $spacing-md;
  background: none;
  border: 1px solid $gray-200;
  border-radius: $radius-sm;
  font-size: $text-xs;
  font-weight: $font-medium;
  color: $gray-500;
  cursor: pointer;
  text-transform: capitalize;
  transition: all $transition-base;

  &:hover { border-color: $gray-400; color: $gray-700; }
}

.severityBtnActive {
  border-color: $error;
  color: $error;
  background: rgba(220, 38, 38, 0.06);
}

// ─── Resolutions ─────────────────────────────────────────────────────────────
.resolutionList {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  padding: $spacing-xs 0;
}

.resolution {
  font-size: $text-xs;
  color: $gray-600;
  padding: $spacing-xs $spacing-sm;
  background: $gray-50;
  border-radius: $radius-sm;
  border-left: 2px solid $success;
}

.resolutionText {
  display: block;
}

.resolutionAuthor {
  display: block;
  color: $gray-400;
  margin-top: 2px;
}

// ─── Loading ─────────────────────────────────────────────────────────────────
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xl;
  color: $gray-400;
  font-size: $text-sm;
}
```

- [ ] **Step 4: Verify build**

```bash
npx tsc -b && npx vite build --mode production
```

Expected: Build succeeds. ConcernsFlow now uses blockchain backend.

- [ ] **Step 5: Commit**

```bash
git add \
  src/assets/contracts/concerns_contract.py \
  src/components/collaboration/flows/concerns/concernsApi.ts \
  src/components/collaboration/flows/concerns/ConcernsFlow.tsx \
  src/components/collaboration/flows/concerns/ConcernsFlow.module.scss
git commit -m "Wire ConcernsFlow to blockchain contract"
```

---

## Task 11: Final Registry Cleanup and Build Verification

Ensure the registry is complete and the full app builds cleanly.

**Files:**
- Verify: `src/components/collaboration/flows/registry.ts`

- [ ] **Step 1: Verify final registry state**

The final `src/components/collaboration/flows/registry.ts` should look like:

```typescript
import { ThumbsUp, Scale, FileText, Heart, MessageSquare, CalendarDays, PieChart, KanbanSquare, AlertTriangle, HelpCircle, Award } from 'lucide-react';
import ApprovalFlow from './voting/ApprovalFlow';
import QVFlow from './voting/QVFlow';
import DocFlow from './document/DocFlow';
import FundraisingFlow from './fundraising/FundraisingFlow';
import DiscussionFlow from './discussion/DiscussionFlow';
import SchedulingFlow from './scheduling/SchedulingFlow';
import BudgetFlow from './budget/BudgetFlow';
import { hasAvailableFunds } from './budget/budgetApi';
import TaskboardFlow from './taskboard/TaskboardFlow';
import ConcernsFlow from './concerns/ConcernsFlow';
import QAFlow from './qa/QAFlow';
import RolesFlow from './roles/RolesFlow';
import type { FlowDefinition } from './types';

/** Ordered list of group names as they appear in the Add Tab menu. */
export const FLOW_GROUPS = [
  'Decision Making',
  'Planning & Execution',
  'Governance & Finance',
  'Communication',
] as const;

export const FLOW_REGISTRY: FlowDefinition[] = [
  // ── Decision Making ────────────────────────────────────────────────────────
  {
    id: 'approval',
    label: 'Approval Voting',
    icon: ThumbsUp,
    component: ApprovalFlow,
    group: 'Decision Making',
  },
  {
    id: 'quadratic',
    label: 'Quadratic Voting',
    icon: Scale,
    component: QVFlow,
    group: 'Decision Making',
  },
  {
    id: 'concerns',
    label: 'Concern Resolution',
    icon: AlertTriangle,
    component: ConcernsFlow,
    group: 'Decision Making',
  },

  // ── Planning & Execution ───────────────────────────────────────────────────
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: CalendarDays,
    component: SchedulingFlow,
    group: 'Planning & Execution',
  },
  {
    id: 'task-board',
    label: 'Task Board',
    icon: KanbanSquare,
    component: TaskboardFlow,
    group: 'Planning & Execution',
  },
  {
    id: 'roles',
    label: 'Role Nomination',
    icon: Award,
    component: RolesFlow,
    group: 'Planning & Execution',
  },

  // ── Governance & Finance ───────────────────────────────────────────────────
  {
    id: 'fundraising',
    label: 'Fundraising',
    icon: Heart,
    component: FundraisingFlow,
    group: 'Governance & Finance',
  },
  {
    id: 'budget-allocation',
    label: 'Budget Allocation',
    icon: PieChart,
    component: BudgetFlow,
    group: 'Governance & Finance',
    isAvailable: () => hasAvailableFunds(),
  },

  // ── Communication ──────────────────────────────────────────────────────────
  {
    id: 'discussion',
    label: 'Discussion',
    icon: MessageSquare,
    component: DiscussionFlow,
    group: 'Communication',
  },
  {
    id: 'qa',
    label: 'Q&A',
    icon: HelpCircle,
    component: QAFlow,
    group: 'Communication',
  },
  {
    id: 'document',
    label: 'Document',
    icon: FileText,
    component: DocFlow,
    group: 'Communication',
  },
];

export function getFlow(id: string): FlowDefinition | undefined {
  return FLOW_REGISTRY.find((f) => f.id === id);
}
```

- [ ] **Step 2: Full production build**

```bash
npx tsc -b && npx vite build --mode production
```

Expected: Build succeeds with 0 errors.

- [ ] **Step 3: Commit if any final adjustments were needed**

```bash
# Only if changes were made in this task
git add -A
git commit -m "Finalize registry with all three blockchain-backed flows"
```

- [ ] **Step 4: Push to remote**

```bash
git push origin eston/dev
```

Expected: Push succeeds. GitHub Pages deploy triggers.
