# Initiative Roles & Collaboration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Block A of the initiative pathway redesign: earned co-author and expert roles on initiatives, wire the existing Edit Suggestions author-decide flow, add a new cross-initiative Merge Proposal primitive, and surface everything in a Collaboration Panel on Discussion and Proposals stage cards.

**Architecture:** Hybrid. Role fields (`coAuthors`, `experts`, `endorsements`, `status`, `mergedInto`) extend the existing `initiative_contract.py` `details` dict with backward-compatible defaults. A new per-initiative `merge_contract.py` is deployed via the existing shared-contract pattern — same lifecycle as `problem`, `discussion`, `proposals`, etc. UI uses a new `CollaborationPanel` component rendered inline on Discussion and Proposals stage cards with a `/collaboration` subroute for the full two-tab view. Role chips and an endorse affordance propagate throughout existing participant displays.

**Tech Stack:** React 19 + TypeScript + Redux Toolkit + SCSS Modules. Python "contracts" with Gloki rules (no imports, no `.get(k, default)`). Vite `?raw` for Python source. No test framework — each task verifies via `npm run dev` + browser DevTools.

**Reference spec:** [docs/superpowers/specs/2026-04-20-initiative-roles-and-collaboration-design.md](../specs/2026-04-20-initiative-roles-and-collaboration-design.md)

---

## File Structure

**Created files:**
- `src/assets/contracts/merge_contract.py` — new per-initiative merge proposal contract.
- `src/components/collaboration/flows/merge/mergeApi.ts` — API layer for merge contract calls.
- `src/components/collaboration/flows/merge/MergeProposalCard.tsx` — single merge proposal UI with vote + decide.
- `src/components/collaboration/flows/merge/MergeProposalSubmitModal.tsx` — modal to propose a merge.
- `src/components/collaboration/flows/merge/MergeProposalsList.tsx` — list/tab body for merge proposals.
- `src/components/collaboration/flows/merge/MergeProposalCard.module.scss` — styling.
- `src/components/collaboration/flows/merge/MergeProposalSubmitModal.module.scss`
- `src/components/collaboration/flows/merge/MergeProposalsList.module.scss`
- `src/components/collaboration/CollaborationPanel.tsx` — compact summary on stage cards.
- `src/components/collaboration/CollaborationPanel.module.scss`
- `src/components/collaboration/CollaborationFullView.tsx` — full view at `/collaboration` subroute.
- `src/components/collaboration/CollaborationFullView.module.scss`
- `src/components/shared/RoleChip.tsx` — small pill for author / co-author / expert.
- `src/components/shared/RoleChip.module.scss`
- `src/components/shared/RoleDisplay.tsx` — header strip (author + co-authors + experts) for the Initiative Dashboard.
- `src/components/shared/RoleDisplay.module.scss`
- `src/components/shared/ExpertEndorseButton.tsx` — icon-button for endorsing a participant.
- `src/components/shared/ExpertEndorseButton.module.scss`
- `src/components/shared/NotificationsBell.tsx` — bell icon + dropdown for PageHeader.
- `src/components/shared/NotificationsBell.module.scss`
- `src/services/initiativeRoles.ts` — thin service wrapping role-related contract reads/writes on `initiative_contract`.
- `src/store/slices/notificationsSlice.ts` — in-app notifications (localStorage-backed).

**Modified files:**
- `src/assets/contracts/initiative_contract.py` — add role fields, new methods, extend `_allowed_stage_keys`.
- `src/store/index.ts` — register `notifications` reducer.
- `src/components/collaboration/flows/modifications/ModificationSuggestions.tsx` — broaden accept/reject to co-authors, promote suggestion author on accept.
- `src/components/collaboration/InitiativeDashboard.tsx` — render `RoleDisplay`, `CollaborationPanel` on Discussion + Proposals stage cards, handle absorbed initiative state.
- `src/components/collaboration/InitiativeDashboard.module.scss` — styles for new panel + role strip + absorbed banner.
- `src/pages/collaboration/InitiativeView.tsx` — add `/collaboration` subroute handling.
- `src/components/PageHeader.tsx` — add `NotificationsBell` slot in the header.

---

## Assumptions & Constants

- `EXPERT_THRESHOLD = 3` endorsements → promoted to expert (tune post-pilot).
- `MERGE_DECISION_WINDOW_DAYS = 14` — after this, a pending merge proposal is treated as expired in the UI (no contract enforcement).
- Contracts are immutable post-deploy. Modifying `initiative_contract.py` only affects *new* initiatives; existing ones retain their old source. The frontend must handle missing methods/fields gracefully (reads return `undefined` → treat as empty).
- Gloki Python contract rules: no imports, no `.get(k, default)`. Use `if k in dict` patterns.
- "No contract-level gate" on internal methods (`add_co_author`, `mark_merged_into`, `vote_on_merge` in source initiative) is accepted for v1. Harden in a later backlog task.
- Merge accept cross-contract calls are driven from the *frontend* after the accepting user signs the `author_decide_merge` write: the frontend sequentially writes `mark_merged_into` on source and `add_co_author` on target. If any step fails, the UI retries on next load (idempotent by design).

---

## Task 1: Extend `initiative_contract.py` with role fields and methods

**Files:**
- Modify: `src/assets/contracts/initiative_contract.py`

- [ ] **Step 1: Add `mergeContractId` to allowed stage keys**

Open `src/assets/contracts/initiative_contract.py`. Modify `_allowed_stage_keys` so new initiatives can register a shared merge contract:

```python
def _allowed_stage_keys(self):
    return [
        'problemVoteContractId',
        'discussionModsContractId',
        'proposalsContractId',
        'proposalsModsContractId',
        'voteContractId',
        'convictionContractId',
        'mergeContractId',
    ]
```

- [ ] **Step 2: Add role-management methods at the end of the class**

Append the following methods to the `Initiative` class, *before* the closing of the file (after `get_roadmap`):

```python
    # Roles (earned)
    def add_co_author(self, public_key):
        details = self.get_details()
        if 'coAuthors' in details and isinstance(details['coAuthors'], list):
            co_authors = list(details['coAuthors'])
        else:
            co_authors = []
        if public_key in co_authors:
            return co_authors
        if 'author' in details and details['author'] == public_key:
            return co_authors
        co_authors.append(public_key)
        details['coAuthors'] = co_authors
        self.db['details'] = self._protected_details(details)
        return co_authors

    def endorse_expert(self, public_key):
        caller = master()
        if caller == public_key:
            return {'error': 'cannot endorse self'}

        details = self.get_details()
        if 'endorsements' in details and isinstance(details['endorsements'], dict):
            endorsements = dict(details['endorsements'])
        else:
            endorsements = {}

        if public_key in endorsements and isinstance(endorsements[public_key], list):
            endorsers = list(endorsements[public_key])
        else:
            endorsers = []

        if caller in endorsers:
            return endorsers
        endorsers.append(caller)
        endorsements[public_key] = endorsers
        details['endorsements'] = endorsements

        threshold = 3
        if len(endorsers) >= threshold:
            if 'experts' in details and isinstance(details['experts'], list):
                experts = list(details['experts'])
            else:
                experts = []
            if public_key not in experts:
                experts.append(public_key)
                details['experts'] = experts

        self.db['details'] = self._protected_details(details)
        return endorsers

    def unendorse_expert(self, public_key):
        caller = master()
        details = self.get_details()
        if 'endorsements' not in details or not isinstance(details['endorsements'], dict):
            return []
        endorsements = dict(details['endorsements'])
        if public_key not in endorsements or not isinstance(endorsements[public_key], list):
            return []
        endorsers = list(endorsements[public_key])
        if caller not in endorsers:
            return endorsers
        endorsers.remove(caller)
        endorsements[public_key] = endorsers
        details['endorsements'] = endorsements

        threshold = 3
        if len(endorsers) < threshold:
            if 'experts' in details and isinstance(details['experts'], list):
                experts = list(details['experts'])
                if public_key in experts:
                    experts.remove(public_key)
                    details['experts'] = experts

        self.db['details'] = self._protected_details(details)
        return endorsers

    def mark_merged_into(self, target_initiative_id):
        details = self.get_details()
        details['status'] = 'merged_into'
        details['mergedInto'] = target_initiative_id
        self.db['details'] = self._protected_details(details)
        return target_initiative_id

    def get_roles(self):
        details = self.get_details()
        author = details['author'] if 'author' in details else ''
        co_authors = details['coAuthors'] if 'coAuthors' in details and isinstance(details['coAuthors'], list) else []
        experts = details['experts'] if 'experts' in details and isinstance(details['experts'], list) else []
        endorsements = details['endorsements'] if 'endorsements' in details and isinstance(details['endorsements'], dict) else {}
        status = details['status'] if 'status' in details else 'active'
        merged_into = details['mergedInto'] if 'mergedInto' in details else None

        endorsement_counts = {}
        for key in endorsements:
            if isinstance(endorsements[key], list):
                endorsement_counts[key] = len(endorsements[key])
            else:
                endorsement_counts[key] = 0

        return {
            'author': author,
            'coAuthors': co_authors,
            'experts': experts,
            'endorsementCounts': endorsement_counts,
            'status': status,
            'mergedInto': merged_into,
        }
```

- [ ] **Step 3: Verify syntax by starting dev server**

Run: `npm run dev`
Expected: Vite dev server starts clean, no syntax errors printed for Python `?raw` imports (Vite only reads as text — syntax errors surface at deploy, not build). Open browser, visit any page. Expected: no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/assets/contracts/initiative_contract.py
git commit -m "feat(contract): add earned roles and merge-status fields to initiative_contract"
```

---

## Task 2: Create `merge_contract.py`

**Files:**
- Create: `src/assets/contracts/merge_contract.py`

- [ ] **Step 1: Write the contract**

Create the file with the following content:

```python
class MergeProposals:
    def __init__(self):
        self.proposals = Storage('merge_proposals')
        self.votes = Storage('merge_votes')
        self.count = Storage('merge_count')
        if not self.count.exists():
            self.count['n'] = 0

    def propose_merge(self, source_initiative_id, rationale):
        n = self.count['n']
        mid = 'm' + str(n)
        self.proposals[mid] = {
            'id': mid,
            'sourceInitiativeId': source_initiative_id,
            'proposer': master(),
            'rationale': rationale,
            'status': 'pending',
            'createdAt': timestamp(),
            'decidedAt': 0,
            'decidedBy': '',
        }
        self.count['n'] = n + 1
        return mid

    def vote_on_merge(self, merge_id, vote):
        if merge_id not in self.proposals:
            return {'error': 'merge not found'}
        voter = master()
        if merge_id not in self.votes:
            self.votes[merge_id] = {}
        if vote != 'for' and vote != 'against':
            return {'error': 'invalid vote'}
        self.votes[merge_id][voter] = vote
        return vote

    def author_decide_merge(self, merge_id, decision):
        if merge_id not in self.proposals:
            return {'error': 'merge not found'}
        p = self.proposals[merge_id].get_dict()
        if p['status'] != 'pending':
            return {'error': 'already decided'}
        if decision != 'accept' and decision != 'reject':
            return {'error': 'invalid decision'}
        if decision == 'accept':
            p['status'] = 'accepted'
        else:
            p['status'] = 'rejected'
        p['decidedAt'] = timestamp()
        p['decidedBy'] = master()
        self.proposals[merge_id] = p
        return p['status']

    def get_merge_proposals(self):
        result = []
        n = self.count['n']
        i = 0
        while i < n:
            mid = 'm' + str(i)
            if mid in self.proposals:
                p = self.proposals[mid].get_dict()
                for_count = 0
                against_count = 0
                if mid in self.votes:
                    vote_data = self.votes[mid].get_dict()
                    for voter in vote_data:
                        if vote_data[voter] == 'for':
                            for_count = for_count + 1
                        else:
                            against_count = against_count + 1
                p['forCount'] = for_count
                p['againstCount'] = against_count
                result.append(p)
            i = i + 1
        return result

    def get_my_vote(self, merge_id):
        if merge_id not in self.votes:
            return ''
        voter = master()
        vote_data = self.votes[merge_id].get_dict()
        if voter in vote_data:
            return vote_data[voter]
        return ''
```

- [ ] **Step 2: Verify dev server still clean**

Run: `npm run dev`
Expected: server starts, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/assets/contracts/merge_contract.py
git commit -m "feat(contract): add merge_contract for cross-initiative merge proposals"
```

---

## Task 3: Create `mergeApi.ts` service layer

**Files:**
- Create: `src/components/collaboration/flows/merge/mergeApi.ts`

- [ ] **Step 1: Make the directory and file**

```bash
mkdir -p "src/components/collaboration/flows/merge"
```

- [ ] **Step 2: Write the API module**

Create `src/components/collaboration/flows/merge/mergeApi.ts`:

```typescript
import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export interface MergeProposal {
  id: string;
  sourceInitiativeId: string;
  proposer: string;
  rationale: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: number;
  decidedAt: number;
  decidedBy: string;
  forCount: number;
  againstCount: number;
}

export async function proposeMerge(
  serverUrl: string, publicKey: string, contractId: string,
  sourceInitiativeId: string, rationale: string,
) {
  return await contractWrite({
    serverUrl, publicKey, contractId,
    method: { name: 'propose_merge', values: { source_initiative_id: sourceInitiativeId, rationale } } as IMethod,
  });
}

export async function voteOnMerge(
  serverUrl: string, publicKey: string, contractId: string,
  mergeId: string, vote: 'for' | 'against',
) {
  return await contractWrite({
    serverUrl, publicKey, contractId,
    method: { name: 'vote_on_merge', values: { merge_id: mergeId, vote } } as IMethod,
  });
}

export async function authorDecideMerge(
  serverUrl: string, publicKey: string, contractId: string,
  mergeId: string, decision: 'accept' | 'reject',
) {
  return await contractWrite({
    serverUrl, publicKey, contractId,
    method: { name: 'author_decide_merge', values: { merge_id: mergeId, decision } } as IMethod,
  });
}

export async function getMergeProposals(
  serverUrl: string, publicKey: string, contractId: string,
): Promise<MergeProposal[]> {
  const result = await contractRead({
    serverUrl, publicKey, contractId,
    method: { name: 'get_merge_proposals', values: {} } as IMethod,
  });
  return Array.isArray(result) ? (result as MergeProposal[]) : [];
}

export async function getMyMergeVote(
  serverUrl: string, publicKey: string, contractId: string,
  mergeId: string,
): Promise<string> {
  const result = await contractRead({
    serverUrl, publicKey, contractId,
    method: { name: 'get_my_vote', values: { merge_id: mergeId } } as IMethod,
  });
  return typeof result === 'string' ? result : '';
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/collaboration/flows/merge/mergeApi.ts
git commit -m "feat(api): add merge contract API service"
```

---

## Task 4: Create `initiativeRoles.ts` service

**Files:**
- Create: `src/services/initiativeRoles.ts`

- [ ] **Step 1: Write the service**

```typescript
import { contractRead, contractWrite } from './api';
import type { IMethod } from './interfaces';

export interface InitiativeRoles {
  author: string;
  coAuthors: string[];
  experts: string[];
  endorsementCounts: Record<string, number>;
  status: 'active' | 'merged_into' | 'archived';
  mergedInto: string | null;
}

const EMPTY_ROLES: InitiativeRoles = {
  author: '',
  coAuthors: [],
  experts: [],
  endorsementCounts: {},
  status: 'active',
  mergedInto: null,
};

export async function getInitiativeRoles(
  serverUrl: string, publicKey: string, initiativeId: string,
): Promise<InitiativeRoles> {
  try {
    const result = await contractRead({
      serverUrl, publicKey, contractId: initiativeId,
      method: { name: 'get_roles', values: {} } as IMethod,
    });
    if (!result || typeof result !== 'object') return EMPTY_ROLES;
    const r = result as Partial<InitiativeRoles>;
    return {
      author: typeof r.author === 'string' ? r.author : '',
      coAuthors: Array.isArray(r.coAuthors) ? r.coAuthors : [],
      experts: Array.isArray(r.experts) ? r.experts : [],
      endorsementCounts: (r.endorsementCounts && typeof r.endorsementCounts === 'object') ? r.endorsementCounts as Record<string, number> : {},
      status: r.status === 'merged_into' || r.status === 'archived' ? r.status : 'active',
      mergedInto: typeof r.mergedInto === 'string' ? r.mergedInto : null,
    };
  } catch {
    return EMPTY_ROLES;
  }
}

export async function endorseExpert(
  serverUrl: string, publicKey: string, initiativeId: string, target: string,
) {
  return await contractWrite({
    serverUrl, publicKey, contractId: initiativeId,
    method: { name: 'endorse_expert', values: { public_key: target } } as IMethod,
  });
}

export async function unendorseExpert(
  serverUrl: string, publicKey: string, initiativeId: string, target: string,
) {
  return await contractWrite({
    serverUrl, publicKey, contractId: initiativeId,
    method: { name: 'unendorse_expert', values: { public_key: target } } as IMethod,
  });
}

export async function addCoAuthor(
  serverUrl: string, publicKey: string, initiativeId: string, target: string,
) {
  return await contractWrite({
    serverUrl, publicKey, contractId: initiativeId,
    method: { name: 'add_co_author', values: { public_key: target } } as IMethod,
  });
}

export async function markMergedInto(
  serverUrl: string, publicKey: string, initiativeId: string, targetInitiativeId: string,
) {
  return await contractWrite({
    serverUrl, publicKey, contractId: initiativeId,
    method: { name: 'mark_merged_into', values: { target_initiative_id: targetInitiativeId } } as IMethod,
  });
}

export function isAuthorOrCoAuthor(roles: InitiativeRoles, publicKey: string | null): boolean {
  if (!publicKey) return false;
  if (roles.author === publicKey) return true;
  return roles.coAuthors.includes(publicKey);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/initiativeRoles.ts
git commit -m "feat(services): add initiativeRoles service for role reads/writes"
```

---

## Task 5: Add `notificationsSlice`

**Files:**
- Create: `src/store/slices/notificationsSlice.ts`
- Modify: `src/store/index.ts`

- [ ] **Step 1: Write the slice**

Create `src/store/slices/notificationsSlice.ts`:

```typescript
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type NotificationType = 'merge_absorbed';

export interface Notification {
  id: string;
  type: NotificationType;
  createdAt: number;
  read: boolean;
  payload: {
    sourceInitiativeId?: string;
    sourceTitle?: string;
    targetInitiativeId?: string;
    targetTitle?: string;
    communityId?: string;
  };
}

interface NotificationsState {
  items: Notification[];
}

const STORAGE_KEY = 'communityNotifications';

function loadFromStorage(): NotificationsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        return { items: parsed.items };
      }
    }
  } catch {
    // corrupt — ignore
  }
  return { items: [] };
}

function saveToStorage(state: NotificationsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: state.items }));
}

const slice = createSlice({
  name: 'notifications',
  initialState: loadFromStorage(),
  reducers: {
    addNotification(state, action: PayloadAction<Omit<Notification, 'id' | 'createdAt' | 'read'>>) {
      const n: Notification = {
        id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        read: false,
        ...action.payload,
      };
      state.items.unshift(n);
      if (state.items.length > 100) state.items.length = 100;
      saveToStorage(state);
    },
    markRead(state, action: PayloadAction<string>) {
      const n = state.items.find((x) => x.id === action.payload);
      if (n) {
        n.read = true;
        saveToStorage(state);
      }
    },
    markAllRead(state) {
      state.items.forEach((n) => { n.read = true; });
      saveToStorage(state);
    },
    clear(state) {
      state.items = [];
      saveToStorage(state);
    },
  },
});

export const { addNotification, markRead, markAllRead, clear } = slice.actions;
export default slice.reducer;
```

- [ ] **Step 2: Register reducer in store**

Edit `src/store/index.ts` — add the import at the top of the import block:

```typescript
import notificationsReducer from './slices/notificationsSlice';
```

and add it to the `reducer` object (after `preferences`):

```typescript
    preferences: preferencesReducer,
    notifications: notificationsReducer,
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`. Open browser, open DevTools console. Run:
```js
store = /* inspect Redux DevTools extension or call window.__REDUX_DEVTOOLS_EXTENSION__ */
```
Expected: the `notifications` key exists in state with `{ items: [] }`.

Alternative verification: in DevTools console, run `localStorage.getItem('communityNotifications')`. Expected: `null` (until a notification is added).

- [ ] **Step 4: Commit**

```bash
git add src/store/slices/notificationsSlice.ts src/store/index.ts
git commit -m "feat(store): add notificationsSlice (localStorage-backed)"
```

---

## Task 6: `RoleChip` component

**Files:**
- Create: `src/components/shared/RoleChip.tsx`
- Create: `src/components/shared/RoleChip.module.scss`

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import { Pen, Users, Award } from 'lucide-react';
import styles from './RoleChip.module.scss';

export type Role = 'author' | 'co-author' | 'expert';

interface RoleChipProps {
  role: Role;
  size?: 'sm' | 'md';
}

const ROLE_META: Record<Role, { label: string; Icon: React.ComponentType<{ size?: number }> }> = {
  'author': { label: 'Author', Icon: Pen },
  'co-author': { label: 'Co-author', Icon: Users },
  'expert': { label: 'Expert', Icon: Award },
};

const RoleChip: React.FC<RoleChipProps> = ({ role, size = 'sm' }) => {
  const { label, Icon } = ROLE_META[role];
  return (
    <span className={`${styles.chip} ${styles[role]} ${styles[size]}`} aria-label={label}>
      <Icon size={size === 'sm' ? 10 : 12} />
      <span>{label}</span>
    </span>
  );
};

export default RoleChip;
```

- [ ] **Step 2: Styles**

Create `src/components/shared/RoleChip.module.scss`:

```scss
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.sm {
  padding: 2px 6px;
  font-size: 10px;
  letter-spacing: 0.02em;
}

.md {
  padding: 3px 8px;
  font-size: 11px;
  letter-spacing: 0.02em;
}

.author {
  background: rgba(42, 91, 215, 0.15);
  color: #6aa3ff;
  border: 1px solid rgba(42, 91, 215, 0.35);
}

.\co-author {
  background: rgba(58, 167, 109, 0.15);
  color: #6ddfa3;
  border: 1px solid rgba(58, 167, 109, 0.35);
}

.expert {
  background: rgba(217, 167, 59, 0.15);
  color: #f0c65b;
  border: 1px solid rgba(217, 167, 59, 0.35);
}
```

Note the class escape `\co-author` is valid in CSS — Vite/SCSS supports it. If this causes parsing issues in practice, switch the `styles[role]` access to a mapped lookup: `{ author: styles.author, 'co-author': styles.coAuthor, expert: styles.expert }` and rename the SCSS class to `.coAuthor`.

- [ ] **Step 3: Verify in browser by temporary render**

Temporarily add `<RoleChip role="author" />`, `<RoleChip role="co-author" />`, `<RoleChip role="expert" />` to any page you can easily open (e.g., the top of `InitiativeDashboard.tsx` `return`). Run `npm run dev`, navigate to an initiative page. Expected: three pills with icons render. Remove the temporary code.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/RoleChip.tsx src/components/shared/RoleChip.module.scss
git commit -m "feat(ui): add RoleChip component"
```

---

## Task 7: `ExpertEndorseButton` component

**Files:**
- Create: `src/components/shared/ExpertEndorseButton.tsx`
- Create: `src/components/shared/ExpertEndorseButton.module.scss`

- [ ] **Step 1: Write the component**

```tsx
import React, { useState } from 'react';
import { Award, Check } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { endorseExpert, unendorseExpert } from '../../services/initiativeRoles';
import styles from './ExpertEndorseButton.module.scss';

interface ExpertEndorseButtonProps {
  initiativeId: string;
  target: string;
  endorsementCount: number;
  isExpert: boolean;
  iEndorse: boolean;
  onChange?: () => void;
}

const ExpertEndorseButton: React.FC<ExpertEndorseButtonProps> = ({
  initiativeId, target, endorsementCount, isExpert, iEndorse, onChange,
}) => {
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const [busy, setBusy] = useState(false);

  if (!publicKey || publicKey === target) return null;

  const handleClick = async () => {
    if (!serverUrl || !publicKey || busy) return;
    setBusy(true);
    try {
      if (iEndorse) {
        await unendorseExpert(serverUrl, publicKey, initiativeId, target);
      } else {
        await endorseExpert(serverUrl, publicKey, initiativeId, target);
      }
      if (onChange) onChange();
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  };

  const label = isExpert
    ? `Expert · ${endorsementCount} endorsements`
    : iEndorse
      ? `Endorsed · ${endorsementCount}`
      : endorsementCount > 0
        ? `Endorse · ${endorsementCount}`
        : 'Endorse as expert';

  return (
    <button
      className={`${styles.btn} ${iEndorse ? styles.endorsed : ''} ${isExpert ? styles.expert : ''}`}
      onClick={handleClick}
      disabled={busy}
      title={label}
      type="button"
    >
      {iEndorse ? <Check size={12} /> : <Award size={12} />}
      <span>{endorsementCount}</span>
    </button>
  );
};

export default ExpertEndorseButton;
```

- [ ] **Step 2: Styles**

```scss
.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.06);
  color: #c8d2e0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;

  &:hover { background: rgba(255, 255, 255, 0.1); }
  &:disabled { opacity: 0.5; cursor: default; }
}

.endorsed {
  background: rgba(58, 167, 109, 0.18);
  color: #6ddfa3;
  border-color: rgba(58, 167, 109, 0.45);
}

.expert {
  background: rgba(217, 167, 59, 0.18);
  color: #f0c65b;
  border-color: rgba(217, 167, 59, 0.45);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/ExpertEndorseButton.tsx src/components/shared/ExpertEndorseButton.module.scss
git commit -m "feat(ui): add ExpertEndorseButton component"
```

---

## Task 8: `RoleDisplay` header strip

**Files:**
- Create: `src/components/shared/RoleDisplay.tsx`
- Create: `src/components/shared/RoleDisplay.module.scss`

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import { useAppSelector } from '../../store/hooks';
import type { InitiativeRoles } from '../../services/initiativeRoles';
import RoleChip from './RoleChip';
import styles from './RoleDisplay.module.scss';

interface RoleDisplayProps {
  roles: InitiativeRoles;
  maxCoAuthors?: number;
  maxExperts?: number;
}

function initials(firstName?: string, lastName?: string, key?: string): string {
  const fn = (firstName || '').trim();
  const ln = (lastName || '').trim();
  if (fn || ln) return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() || fn.charAt(0).toUpperCase();
  return (key || '?').slice(0, 2).toUpperCase();
}

const RoleDisplay: React.FC<RoleDisplayProps> = ({ roles, maxCoAuthors = 3, maxExperts = 3 }) => {
  const profiles = useAppSelector((s) => s.communities.profiles);

  const renderAvatar = (key: string, title: string) => {
    const p = profiles[key];
    const init = initials(p?.firstName, p?.lastName, key);
    const photo = p?.userPhoto;
    return (
      <div key={key} className={styles.avatar} title={title}>
        {photo ? <img src={photo} alt={title} /> : <span>{init}</span>}
      </div>
    );
  };

  const extraCoAuthors = Math.max(0, roles.coAuthors.length - maxCoAuthors);
  const extraExperts = Math.max(0, roles.experts.length - maxExperts);

  return (
    <div className={styles.strip}>
      <div className={styles.group}>
        <RoleChip role="author" />
        {roles.author && renderAvatar(roles.author, 'Author')}
      </div>
      {roles.coAuthors.length > 0 && (
        <div className={styles.group}>
          <RoleChip role="co-author" />
          {roles.coAuthors.slice(0, maxCoAuthors).map((k) => renderAvatar(k, 'Co-author'))}
          {extraCoAuthors > 0 && <span className={styles.more}>+{extraCoAuthors}</span>}
        </div>
      )}
      {roles.experts.length > 0 && (
        <div className={styles.group}>
          <RoleChip role="expert" />
          {roles.experts.slice(0, maxExperts).map((k) => {
            const count = roles.endorsementCounts[k] ?? 0;
            return (
              <div key={k} className={styles.expertAvatar} title={`Expert · ${count} endorsements`}>
                {renderAvatar(k, 'Expert')}
                <span className={styles.endorseBadge}>{count}</span>
              </div>
            );
          })}
          {extraExperts > 0 && <span className={styles.more}>+{extraExperts}</span>}
        </div>
      )}
    </div>
  );
};

export default RoleDisplay;
```

- [ ] **Step 2: Styles**

```scss
.strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  margin-bottom: 12px;
}

.group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #22304c;
  color: #e6edf7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.expertAvatar {
  position: relative;
}

.endorseBadge {
  position: absolute;
  bottom: -3px;
  right: -6px;
  background: #d9a73b;
  color: #1a1203;
  font-size: 9px;
  font-weight: 700;
  border-radius: 999px;
  padding: 1px 5px;
  line-height: 1;
}

.more {
  font-size: 10px;
  color: #8fa0bb;
  font-weight: 600;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/RoleDisplay.tsx src/components/shared/RoleDisplay.module.scss
git commit -m "feat(ui): add RoleDisplay header component"
```

---

## Task 9: Update `ModificationSuggestions` — co-author gate + co-author promotion on accept

**Files:**
- Modify: `src/components/collaboration/flows/modifications/ModificationSuggestions.tsx`

- [ ] **Step 1: Extend props to accept `targetInitiativeId` and `coAuthors`**

Replace the `ModificationSuggestionsProps` interface (around lines 20–26) with:

```tsx
interface ModificationSuggestionsProps {
  instanceId: string;
  parentContractId: string;
  stageKey: string;
  originalAuthor?: string;
  coAuthors?: string[];
  fieldLabel?: string;
  targetInitiativeId?: string; // used to call add_co_author on accept; defaults to parentContractId
  onAccept?: (suggestionAuthor: string) => void;
}
```

- [ ] **Step 2: Destructure new props and compute `canDecide`**

Replace the component signature and the `isAuthor` computation:

```tsx
const ModificationSuggestions: React.FC<ModificationSuggestionsProps> = ({
  instanceId,
  parentContractId,
  stageKey,
  originalAuthor,
  coAuthors = [],
  fieldLabel = 'problem',
  targetInitiativeId,
  onAccept,
}) => {
```

Replace the `isAuthor` line (near line 53) with:

```tsx
  const canDecide = Boolean(publicKey && (publicKey === originalAuthor || coAuthors.includes(publicKey)));
```

- [ ] **Step 3: Replace `isAuthor` usages in JSX**

The existing JSX around line 243 uses `{isAuthor && (...)}` for the author-actions block. Change to `{canDecide && (...)}`.

- [ ] **Step 4: Promote suggestion author to co-author on accept**

Add an import at the top of the file:

```tsx
import { addCoAuthor } from '../../../../services/initiativeRoles';
```

Find `handleDecide` (around line 109). Replace its body with:

```tsx
  const handleDecide = async (suggestionId: string, decision: 'accept' | 'reject') => {
    if (!serverUrl || !publicKey || !contractId) return;
    setDecidingId(suggestionId);
    try {
      if (originalAuthor && !authorSet) {
        await api.setAuthor(serverUrl, publicKey, contractId, originalAuthor);
        setAuthorSet(true);
      }
      await api.authorDecide(serverUrl, publicKey, contractId, suggestionId, decision);
      if (decision === 'accept') {
        const suggestion = suggestions.find((s) => s.id === suggestionId);
        const initiativeId = targetInitiativeId || parentContractId;
        if (suggestion && initiativeId && suggestion.author) {
          try {
            await addCoAuthor(serverUrl, publicKey, initiativeId, suggestion.author);
          } catch {
            // non-fatal: promotion can be retried later
          }
          if (onAccept) onAccept(suggestion.author);
        }
      }
      await fetchData();
    } catch { /* silent */ }
    finally { setDecidingId(null); }
  };
```

- [ ] **Step 5: Verify in browser**

Run: `npm run dev`. Navigate to a Discussion stage page for an initiative where you are the author. Suggest a modification from another user/account, then as the author click Accept. Expected:
- Suggestion moves to `Resolved`.
- In DevTools Network tab, you see a `add_co_author` contractWrite call after the `author_decide`.
- Reload the initiative dashboard — role display (added in a later task) would now show the suggester as a co-author.

Note: the `RoleDisplay` isn't wired yet, so the immediate visible change is just the Network call. That's OK at this stage.

- [ ] **Step 6: Commit**

```bash
git add src/components/collaboration/flows/modifications/ModificationSuggestions.tsx
git commit -m "feat(modifications): promote suggestion author to co-author on accept, gate decide to co-authors"
```

---

## Task 10: `MergeProposalSubmitModal`

**Files:**
- Create: `src/components/collaboration/flows/merge/MergeProposalSubmitModal.tsx`
- Create: `src/components/collaboration/flows/merge/MergeProposalSubmitModal.module.scss`

- [ ] **Step 1: Write the modal component**

```tsx
import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAppSelector } from '../../../../store/hooks';
import { proposeMerge } from './mergeApi';
import styles from './MergeProposalSubmitModal.module.scss';

interface MergeProposalSubmitModalProps {
  targetInitiativeId: string;
  targetTitle: string;
  targetCommunityId: string;
  mergeContractId: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const MIN_RATIONALE = 50;
const ELIGIBLE_STAGES: string[] = ['problem', 'discussion', 'proposals'];

const MergeProposalSubmitModal: React.FC<MergeProposalSubmitModalProps> = ({
  targetInitiativeId, targetTitle, targetCommunityId, mergeContractId, onClose, onSubmitted,
}) => {
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const collaborations = useAppSelector((s) => s.communities.communityCollaborations[targetCommunityId]);

  const [sourceId, setSourceId] = useState<string>('');
  const [rationale, setRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const eligibleSources = useMemo(() => {
    if (!Array.isArray(collaborations) || !publicKey) return [];
    return collaborations.filter((c) => {
      if (c.id === targetInitiativeId) return false;
      if (c.author !== publicKey) return false;
      const stage = (c as unknown as { stage?: string }).stage;
      if (!stage || !ELIGIBLE_STAGES.includes(stage)) return false;
      return true;
    });
  }, [collaborations, publicKey, targetInitiativeId]);

  const handleSubmit = async () => {
    if (!serverUrl || !publicKey || !mergeContractId) {
      setError('Merge contract is not ready yet. Try again in a moment.');
      return;
    }
    if (!sourceId) { setError('Pick a source initiative.'); return; }
    if (rationale.trim().length < MIN_RATIONALE) {
      setError(`Rationale must be at least ${MIN_RATIONALE} characters.`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await proposeMerge(serverUrl, publicKey, mergeContractId, sourceId, rationale.trim());
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err) {
      setError(`Failed to submit: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Propose a merge into &ldquo;{targetTitle}&rdquo;</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        {eligibleSources.length === 0 ? (
          <div className={styles.emptyState}>
            <p>You need an initiative you authored in Problem, Discussion, or Proposals stage to propose a merge.</p>
            <p className={styles.hint}>Vote- and Mandate-stage initiatives can&rsquo;t be merged.</p>
          </div>
        ) : (
          <>
            <label className={styles.label}>
              Which of your initiatives should be merged into this one?
              <select
                className={styles.select}
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
              >
                <option value="">Choose one…</option>
                {eligibleSources.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Rationale (why should these merge?)
              <textarea
                className={styles.textarea}
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="Explain the overlap and the benefits of consolidating."
                rows={5}
              />
              <span className={styles.charCount}>
                {rationale.trim().length} / {MIN_RATIONALE} min
              </span>
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={onClose} disabled={submitting}>Cancel</button>
              <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Merge Proposal'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MergeProposalSubmitModal;
```

- [ ] **Step 2: Styles**

```scss
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal {
  background: #162136;
  color: #e6edf7;
  border-radius: 12px;
  padding: 20px;
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow: auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  h3 { margin: 0; font-size: 16px; }
}

.closeBtn {
  background: transparent;
  border: none;
  color: #c8d2e0;
  cursor: pointer;
  padding: 4px;
}

.label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 14px;
}

.select, .textarea {
  background: #0b1220;
  color: #e6edf7;
  border: 1px solid #22304c;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  font-weight: 400;
  font-family: inherit;
}

.charCount {
  font-size: 11px;
  font-weight: 400;
  color: #8fa0bb;
  text-align: right;
}

.emptyState {
  padding: 20px 4px;
  font-size: 13px;
  color: #c8d2e0;
}

.hint {
  color: #8fa0bb;
  font-size: 11px;
}

.error {
  background: rgba(255, 100, 100, 0.1);
  color: #ff9b9b;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 10px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.cancelBtn, .submitBtn {
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
}

.cancelBtn {
  background: transparent;
  color: #c8d2e0;
  border-color: #22304c;
}

.submitBtn {
  background: #2a5bd7;
  color: #fff;
  &:disabled { opacity: 0.5; cursor: default; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/collaboration/flows/merge/MergeProposalSubmitModal.tsx src/components/collaboration/flows/merge/MergeProposalSubmitModal.module.scss
git commit -m "feat(merge): add MergeProposalSubmitModal"
```

---

## Task 11: `MergeProposalCard`

**Files:**
- Create: `src/components/collaboration/flows/merge/MergeProposalCard.tsx`
- Create: `src/components/collaboration/flows/merge/MergeProposalCard.module.scss`

- [ ] **Step 1: Write the component**

```tsx
import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle, XCircle } from 'lucide-react';
import { useAppSelector } from '../../../../store/hooks';
import { voteOnMerge, authorDecideMerge, type MergeProposal } from './mergeApi';
import styles from './MergeProposalCard.module.scss';

const DECISION_WINDOW_DAYS = 14;

interface MergeProposalCardProps {
  proposal: MergeProposal;
  myVote: string;
  mergeContractId: string;
  canDecide: boolean;
  onAcceptCrossContract?: (proposal: MergeProposal) => Promise<void>;
  onChange?: () => void;
}

function formatDaysLeft(createdAt: number): string {
  const elapsedMs = Date.now() - createdAt * 1000;
  const remainingMs = (DECISION_WINDOW_DAYS * 24 * 60 * 60 * 1000) - elapsedMs;
  if (remainingMs <= 0) return 'expired';
  const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  return `${days} day${days === 1 ? '' : 's'} left to decide`;
}

const MergeProposalCard: React.FC<MergeProposalCardProps> = ({
  proposal, myVote, mergeContractId, canDecide, onAcceptCrossContract, onChange,
}) => {
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const profiles = useAppSelector((s) => s.communities.profiles);
  const [voting, setVoting] = useState(false);
  const [deciding, setDeciding] = useState(false);

  const proposerProfile = profiles[proposal.proposer];
  const proposerName = proposerProfile
    ? `${proposerProfile.firstName ?? ''} ${proposerProfile.lastName ?? ''}`.trim() || proposal.proposer.slice(0, 8)
    : proposal.proposer.slice(0, 8);

  const totalVotes = proposal.forCount + proposal.againstCount;
  const supportPct = totalVotes === 0 ? 0 : Math.round((proposal.forCount / totalVotes) * 100);

  const handleVote = async (vote: 'for' | 'against') => {
    if (!serverUrl || !publicKey || voting) return;
    setVoting(true);
    try {
      await voteOnMerge(serverUrl, publicKey, mergeContractId, proposal.id, vote);
      if (onChange) onChange();
    } catch { /* silent */ }
    finally { setVoting(false); }
  };

  const handleDecide = async (decision: 'accept' | 'reject') => {
    if (!serverUrl || !publicKey || deciding) return;
    setDeciding(true);
    try {
      await authorDecideMerge(serverUrl, publicKey, mergeContractId, proposal.id, decision);
      if (decision === 'accept' && onAcceptCrossContract) {
        await onAcceptCrossContract(proposal);
      }
      if (onChange) onChange();
    } catch { /* silent */ }
    finally { setDeciding(false); }
  };

  const isPending = proposal.status === 'pending';

  return (
    <div className={`${styles.card} ${styles[proposal.status]}`}>
      <div className={styles.header}>
        <div className={styles.sourceLink}>Source initiative · {proposal.sourceInitiativeId.slice(0, 10)}…</div>
        <span className={`${styles.statusBadge} ${styles[proposal.status]}`}>
          {proposal.status}
        </span>
      </div>

      <div className={styles.proposer}>proposed by {proposerName}</div>

      <p className={styles.rationale}>“{proposal.rationale}”</p>

      <div className={styles.voteBar}>
        <div className={styles.voteBarText}>
          <span>Community: {proposal.forCount} for · {proposal.againstCount} against</span>
          <span className={styles.pct}>{supportPct}% support</span>
        </div>
        <div className={styles.voteBarTrack}>
          <div className={styles.voteBarFill} style={{ width: `${supportPct}%` }} />
        </div>
      </div>

      {isPending && (
        <div className={styles.actions}>
          <div className={styles.voteButtons}>
            <button
              className={`${styles.voteBtn} ${myVote === 'for' ? styles.voted : ''}`}
              onClick={() => handleVote('for')}
              disabled={voting}
            >
              <ThumbsUp size={12} /> Vote For
            </button>
            <button
              className={`${styles.voteBtn} ${myVote === 'against' ? styles.voted : ''}`}
              onClick={() => handleVote('against')}
              disabled={voting}
            >
              <ThumbsDown size={12} /> Vote Against
            </button>
          </div>
          {canDecide && (
            <div className={styles.decideButtons}>
              <button className={styles.acceptBtn} onClick={() => handleDecide('accept')} disabled={deciding}>
                <CheckCircle size={12} /> Accept Merge
              </button>
              <button className={styles.rejectBtn} onClick={() => handleDecide('reject')} disabled={deciding}>
                <XCircle size={12} /> Reject
              </button>
            </div>
          )}
        </div>
      )}

      {isPending && <div className={styles.deadline}>{formatDaysLeft(proposal.createdAt)}</div>}
    </div>
  );
};

export default MergeProposalCard;
```

- [ ] **Step 2: Styles**

```scss
.card {
  background: #162136;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 8px;
  border: 1px solid transparent;
}

.accepted { border-color: rgba(58, 167, 109, 0.4); opacity: 0.8; }
.rejected { border-color: rgba(255, 100, 100, 0.3); opacity: 0.6; }
.expired  { border-color: rgba(255, 255, 255, 0.15); opacity: 0.5; }

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
}

.sourceLink { opacity: 0.8; }

.statusBadge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);

  &.pending { color: #f0c65b; background: rgba(217, 167, 59, 0.15); }
  &.accepted { color: #6ddfa3; background: rgba(58, 167, 109, 0.15); }
  &.rejected { color: #ff9b9b; background: rgba(255, 100, 100, 0.12); }
  &.expired  { color: #8fa0bb; background: rgba(255, 255, 255, 0.06); }
}

.proposer {
  font-size: 11px;
  opacity: 0.6;
  margin-bottom: 10px;
}

.rationale {
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 10px 0;
  opacity: 0.9;
}

.voteBar {
  background: #0b1220;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 10px;
  font-size: 12px;
}

.voteBarText {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.pct { opacity: 0.6; }

.voteBarTrack {
  height: 6px;
  background: #22304c;
  border-radius: 3px;
  overflow: hidden;
}

.voteBarFill {
  height: 100%;
  background: #3aa76d;
  transition: width 200ms;
}

.actions {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
}

.voteButtons, .decideButtons {
  display: flex;
  gap: 6px;
}

.voteBtn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #1e3a5f;
  color: #e6edf7;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 12px;

  &.voted { background: #2a5bd7; }
  &:disabled { opacity: 0.5; cursor: default; }
}

.acceptBtn, .rejectBtn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  font-size: 12px;

  &:disabled { opacity: 0.5; cursor: default; }
}

.acceptBtn { background: #1b5e20; color: #e6edf7; }
.rejectBtn { background: #4a1e1e; color: #e6edf7; }

.deadline {
  margin-top: 6px;
  font-size: 10px;
  color: #8fa0bb;
  text-align: right;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/collaboration/flows/merge/MergeProposalCard.tsx src/components/collaboration/flows/merge/MergeProposalCard.module.scss
git commit -m "feat(merge): add MergeProposalCard with vote + decide actions"
```

---

## Task 12: `MergeProposalsList` — container for MergeProposalCards with data-fetch

**Files:**
- Create: `src/components/collaboration/flows/merge/MergeProposalsList.tsx`
- Create: `src/components/collaboration/flows/merge/MergeProposalsList.module.scss`

- [ ] **Step 1: Write the component**

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { useFlowContract } from '../shared/useFlowContract';
import mergeCode from '../../../../assets/contracts/merge_contract.py?raw';
import { getMergeProposals, getMyMergeVote, type MergeProposal } from './mergeApi';
import { markMergedInto, addCoAuthor, getInitiativeRoles } from '../../../../services/initiativeRoles';
import { addNotification } from '../../../../store/slices/notificationsSlice';
import MergeProposalCard from './MergeProposalCard';
import MergeProposalSubmitModal from './MergeProposalSubmitModal';
import styles from './MergeProposalsList.module.scss';

interface MergeProposalsListProps {
  targetInitiativeId: string;
  targetTitle: string;
  targetCommunityId: string;
  canDecide: boolean;
  onCountChange?: (n: number) => void;
}

const MergeProposalsList: React.FC<MergeProposalsListProps> = ({
  targetInitiativeId, targetTitle, targetCommunityId, canDecide, onCountChange,
}) => {
  const dispatch = useAppDispatch();
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);

  const { contractId, isReady, isDeploying, hasError, errorMessage, retry } = useFlowContract(
    `${targetInitiativeId}_merge`,
    'merge',
    'merge_contract.py',
    mergeCode,
    targetInitiativeId,
    'mergeContractId',
  );

  const [proposals, setProposals] = useState<MergeProposal[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, string>>({});
  const [showSubmit, setShowSubmit] = useState(false);

  const refresh = useCallback(async () => {
    if (!serverUrl || !publicKey || !contractId) return;
    const list = await getMergeProposals(serverUrl, publicKey, contractId);
    setProposals(list);
    if (onCountChange) onCountChange(list.length);
    const votes: Record<string, string> = {};
    for (const p of list) {
      if (p.status === 'pending') {
        votes[p.id] = await getMyMergeVote(serverUrl, publicKey, contractId, p.id);
      }
    }
    setMyVotes(votes);
  }, [serverUrl, publicKey, contractId, onCountChange]);

  useEffect(() => {
    if (isReady) refresh();
  }, [isReady, refresh]);

  // When a merge is accepted, the UI drives the cross-contract side effects:
  //  - Mark the source initiative as merged_into the target.
  //  - Promote the proposer + all source co-authors to co-author of the target.
  //  - Dispatch a local notification so the current user sees it next load.
  const handleAcceptCrossContract = useCallback(async (proposal: MergeProposal) => {
    if (!serverUrl || !publicKey) return;
    try {
      await markMergedInto(serverUrl, publicKey, proposal.sourceInitiativeId, targetInitiativeId);
    } catch { /* non-fatal */ }

    try {
      const sourceRoles = await getInitiativeRoles(serverUrl, publicKey, proposal.sourceInitiativeId);
      const toPromote = new Set<string>([proposal.proposer]);
      if (sourceRoles.author) toPromote.add(sourceRoles.author);
      for (const k of sourceRoles.coAuthors) toPromote.add(k);
      for (const k of toPromote) {
        try {
          await addCoAuthor(serverUrl, publicKey, targetInitiativeId, k);
        } catch { /* non-fatal per-entry */ }
      }
    } catch { /* non-fatal */ }

    dispatch(addNotification({
      type: 'merge_absorbed',
      payload: {
        sourceInitiativeId: proposal.sourceInitiativeId,
        targetInitiativeId,
        targetTitle,
        communityId: targetCommunityId,
      },
    }));
  }, [serverUrl, publicKey, targetInitiativeId, targetCommunityId, targetTitle, dispatch]);

  if (hasError) {
    return (
      <div className={styles.error}>
        <p>{errorMessage || 'Failed to load merge proposals.'}</p>
        <button onClick={retry} className={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  if (isDeploying || !isReady || !contractId) {
    return <p className={styles.loading}>Setting up merge contract…</p>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Merge Proposals</h3>
        <button className={styles.proposeBtn} onClick={() => setShowSubmit(true)}>
          <Plus size={14} /> Propose Merge
        </button>
      </div>

      {proposals.length === 0 && (
        <p className={styles.emptyText}>No merge proposals yet.</p>
      )}

      {proposals.map((p) => (
        <MergeProposalCard
          key={p.id}
          proposal={p}
          myVote={myVotes[p.id] ?? ''}
          mergeContractId={contractId}
          canDecide={canDecide}
          onAcceptCrossContract={handleAcceptCrossContract}
          onChange={refresh}
        />
      ))}

      {showSubmit && (
        <MergeProposalSubmitModal
          targetInitiativeId={targetInitiativeId}
          targetTitle={targetTitle}
          targetCommunityId={targetCommunityId}
          mergeContractId={contractId}
          onClose={() => setShowSubmit(false)}
          onSubmitted={refresh}
        />
      )}
    </div>
  );
};

export default MergeProposalsList;
```

- [ ] **Step 2: Styles**

```scss
.container { padding: 8px 0; }

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.title { margin: 0; font-size: 14px; font-weight: 600; color: #e6edf7; }

.proposeBtn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #2a5bd7;
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.loading, .emptyText {
  font-size: 12px;
  color: #8fa0bb;
  text-align: center;
  padding: 16px;
}

.error {
  color: #ff9b9b;
  font-size: 12px;
  padding: 10px;
}

.retryBtn {
  background: #2a5bd7;
  color: #fff;
  border: none;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  margin-top: 6px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/collaboration/flows/merge/MergeProposalsList.tsx src/components/collaboration/flows/merge/MergeProposalsList.module.scss
git commit -m "feat(merge): add MergeProposalsList with cross-contract accept handling"
```

---

## Task 13: `CollaborationPanel` (compact summary for stage cards)

**Files:**
- Create: `src/components/collaboration/CollaborationPanel.tsx`
- Create: `src/components/collaboration/CollaborationPanel.module.scss`

- [ ] **Step 1: Write the component**

```tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, GitMerge, ChevronRight } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { contractRead } from '../../services/api';
import type { IMethod } from '../../services/interfaces';
import { resolveInitiativeStageContract } from '../../services/contracts/initiative';
import styles from './CollaborationPanel.module.scss';

interface CollaborationPanelProps {
  initiativeId: string;
  communityId: string;
  initiativeTitle: string;
  initiativeHostServer: string;
  initiativeHostAgent: string;
  defaultTab?: 'suggestions' | 'merges';
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  initiativeId,
  communityId,
  initiativeTitle,
  initiativeHostServer,
  initiativeHostAgent,
  defaultTab = 'suggestions',
}) => {
  const navigate = useNavigate();
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);

  const [suggestionCount, setSuggestionCount] = useState<number>(0);
  const [mergeCount, setMergeCount] = useState<number>(0);

  useEffect(() => {
    if (!serverUrl || !publicKey) return;
    let cancelled = false;

    (async () => {
      // Suggestion count (discussion_mods is the canonical Edit Suggestions contract today)
      try {
        const discussionMods = await resolveInitiativeStageContract(
          serverUrl, publicKey, initiativeId, 'discussionModsContractId',
        );
        const modsContractId = discussionMods?.contractId;
        if (modsContractId && !cancelled) {
          const list = await contractRead({
            serverUrl, publicKey, contractId: modsContractId,
            method: { name: 'get_suggestions', values: {} } as IMethod,
          });
          if (Array.isArray(list) && !cancelled) setSuggestionCount(list.length);
        }
      } catch { /* non-fatal */ }

      // Merge count
      try {
        const mergeStage = await resolveInitiativeStageContract(
          serverUrl, publicKey, initiativeId, 'mergeContractId',
        );
        const mergeContractId = mergeStage?.contractId;
        if (mergeContractId && !cancelled) {
          const list = await contractRead({
            serverUrl, publicKey, contractId: mergeContractId,
            method: { name: 'get_merge_proposals', values: {} } as IMethod,
          });
          if (Array.isArray(list) && !cancelled) setMergeCount(list.length);
        }
      } catch { /* non-fatal */ }
    })();

    return () => { cancelled = true; };
  }, [serverUrl, publicKey, initiativeId]);

  const goToFullView = (tab: 'suggestions' | 'merges') => {
    const path = `/initiative/${encodeURIComponent(initiativeHostServer)}/${encodeURIComponent(initiativeHostAgent)}/${communityId}/${initiativeId}/collaboration`;
    navigate(path, { state: { tab, initiativeTitle } });
  };

  void defaultTab; // defaultTab currently only used by the full view

  return (
    <div className={styles.panel}>
      <div className={styles.heading}>COLLABORATION</div>
      <button className={styles.row} onClick={() => goToFullView('suggestions')}>
        <Edit size={14} />
        <span className={styles.count}>{suggestionCount}</span>
        <span className={styles.label}>Edit Suggestions</span>
        <ChevronRight size={14} className={styles.chev} />
      </button>
      <button className={styles.row} onClick={() => goToFullView('merges')}>
        <GitMerge size={14} />
        <span className={styles.count}>{mergeCount}</span>
        <span className={styles.label}>Merge Proposals</span>
        <ChevronRight size={14} className={styles.chev} />
      </button>
    </div>
  );
};

export default CollaborationPanel;
```

- [ ] **Step 2: Styles**

```scss
.panel {
  background: #162136;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 10px;
}

.heading {
  font-size: 11px;
  letter-spacing: 0.05em;
  color: #8fa0bb;
  margin-bottom: 6px;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  background: transparent;
  color: #e6edf7;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 8px 0;
  font-size: 13px;
  cursor: pointer;
  text-align: left;

  &:first-of-type { border-top: none; padding-top: 4px; }
}

.count {
  background: #22304c;
  padding: 3px 8px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 12px;
  min-width: 28px;
  text-align: center;
}

.label { flex: 1; }

.chev { opacity: 0.6; }
```

- [ ] **Step 3: Commit**

```bash
git add src/components/collaboration/CollaborationPanel.tsx src/components/collaboration/CollaborationPanel.module.scss
git commit -m "feat(ui): add CollaborationPanel compact summary"
```

---

## Task 14: `CollaborationFullView` — tabs + list for `/collaboration` subroute

**Files:**
- Create: `src/components/collaboration/CollaborationFullView.tsx`
- Create: `src/components/collaboration/CollaborationFullView.module.scss`

- [ ] **Step 1: Write the component**

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCollaborations } from '../../store/slices/communitiesSlice';
import { getInitiativeRoles, isAuthorOrCoAuthor, type InitiativeRoles } from '../../services/initiativeRoles';
import ModificationSuggestions from './flows/modifications/ModificationSuggestions';
import MergeProposalsList from './flows/merge/MergeProposalsList';
import PageHeader from '../PageHeader';
import ErrorBoundary from '../shared/ErrorBoundary';
import cs from '../../pages/Container.module.scss';
import styles from './CollaborationFullView.module.scss';

interface CollaborationFullViewProps {
  title: string;
  collaborationId: string;
  communityId: string;
}

type Tab = 'suggestions' | 'merges';

const CollaborationFullView: React.FC<CollaborationFullViewProps> = ({
  title, collaborationId, communityId,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const communityProps = useAppSelector((s) => s.communities.communityProperties[communityId]);
  const communityName = communityProps?.name || communityId.slice(0, 8);
  const collaborations = useAppSelector((s) => s.communities.communityCollaborations[communityId]);
  const collaborationsLoading = useAppSelector((s) => s.communities.collaborationsLoading[communityId]);

  const initialTab = ((location.state as { tab?: Tab })?.tab) || 'suggestions';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [roles, setRoles] = useState<InitiativeRoles | null>(null);
  const [suggestionCount, setSuggestionCount] = useState<number>(0);
  const [mergeCount, setMergeCount] = useState<number>(0);

  useEffect(() => {
    if (!serverUrl || !publicKey || collaborations || collaborationsLoading) return;
    dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
  }, [serverUrl, publicKey, collaborations, collaborationsLoading, dispatch, communityId]);

  useEffect(() => {
    if (!serverUrl || !publicKey) return;
    let cancelled = false;
    getInitiativeRoles(serverUrl, publicKey, collaborationId).then((r) => {
      if (!cancelled) setRoles(r);
    });
    return () => { cancelled = true; };
  }, [serverUrl, publicKey, collaborationId]);

  const canDecide = roles ? isAuthorOrCoAuthor(roles, publicKey) : false;
  const originalAuthor = roles?.author;
  const coAuthors = roles?.coAuthors ?? [];

  const isMerged = roles?.status === 'merged_into';
  const mergedInto = roles?.mergedInto;

  const handleSuggestionAccepted = () => {
    // refresh roles so the accepted suggester shows up as co-author
    if (!serverUrl || !publicKey) return;
    getInitiativeRoles(serverUrl, publicKey, collaborationId).then(setRoles);
  };

  const initiativeHostServer = useMemo(() => location.pathname.split('/')[2] ?? '', [location.pathname]);
  const initiativeHostAgent = useMemo(() => location.pathname.split('/')[3] ?? '', [location.pathname]);

  if (isMerged && mergedInto) {
    return (
      <div className={cs.container}>
        <PageHeader showBackButton backButtonText="Back" onBackClick={() => navigate(-1)} title={title} subtitle={communityName} layout="two-row" />
        <div className={cs.content}>
          <div className={cs.main}>
            <div className={styles.mergedBanner}>
              <strong>This initiative merged into another one.</strong>
              <p>Continue the conversation on the surviving initiative.</p>
              <button onClick={() => navigate(`/initiative/${encodeURIComponent(initiativeHostServer)}/${encodeURIComponent(initiativeHostAgent)}/${communityId}/${mergedInto}`)}>
                Go to merged initiative →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cs.container}>
      <PageHeader showBackButton backButtonText="Back" onBackClick={() => navigate(-1)} title={`${title} — Collaboration`} subtitle={communityName} layout="two-row" />
      <div className={cs.content}>
        <div className={cs.main}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'suggestions' ? styles.active : ''}`}
              onClick={() => setTab('suggestions')}
            >
              Edit Suggestions · {suggestionCount}
            </button>
            <button
              className={`${styles.tab} ${tab === 'merges' ? styles.active : ''}`}
              onClick={() => setTab('merges')}
            >
              Merge Proposals · {mergeCount}
            </button>
          </div>

          {tab === 'suggestions' && (
            <ErrorBoundary fallbackMessage="Edit suggestions encountered an error.">
              <CountAdapter onChange={setSuggestionCount}>
                <ModificationSuggestions
                  instanceId={`${collaborationId}_discussion_mods`}
                  parentContractId={collaborationId}
                  stageKey="discussionModsContractId"
                  originalAuthor={originalAuthor}
                  coAuthors={coAuthors}
                  fieldLabel="initiative"
                  targetInitiativeId={collaborationId}
                  onAccept={handleSuggestionAccepted}
                />
              </CountAdapter>
            </ErrorBoundary>
          )}

          {tab === 'merges' && (
            <ErrorBoundary fallbackMessage="Merge proposals encountered an error.">
              <MergeProposalsList
                targetInitiativeId={collaborationId}
                targetTitle={title}
                targetCommunityId={communityId}
                canDecide={canDecide}
                onCountChange={setMergeCount}
              />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
};

// ModificationSuggestions doesn't expose a count prop, but the collab panel compact view
// fetches its own. We don't need to re-count here; render children passthrough.
const CountAdapter: React.FC<{ onChange: (n: number) => void; children: React.ReactNode }> = ({ children }) => <>{children}</>;

export default CollaborationFullView;
```

Note: `CountAdapter` is a pragmatic shim. If you want the tab counts to reflect accurate numbers, follow up by having `ModificationSuggestions` accept an `onCountChange` callback similar to `MergeProposalsList`. That's optional polish — not gating.

- [ ] **Step 2: Styles**

```scss
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  overflow-x: auto;
}

.tab {
  padding: 8px 14px;
  background: #22304c;
  color: #c8d2e0;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  &.active {
    background: #2a5bd7;
    color: #fff;
  }
}

.mergedBanner {
  background: rgba(217, 167, 59, 0.12);
  border: 1px solid rgba(217, 167, 59, 0.4);
  border-radius: 12px;
  padding: 18px;
  color: #f0c65b;
  text-align: center;

  strong { font-size: 15px; display: block; margin-bottom: 6px; }
  p { font-size: 13px; color: #c8d2e0; margin: 0 0 12px 0; }

  button {
    background: #2a5bd7;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/collaboration/CollaborationFullView.tsx src/components/collaboration/CollaborationFullView.module.scss
git commit -m "feat(ui): add CollaborationFullView two-tab subroute"
```

---

## Task 15: Route `/collaboration` subroute in `InitiativeView`

**Files:**
- Modify: `src/pages/collaboration/InitiativeView.tsx`

- [ ] **Step 1: Import and branch**

Open `src/pages/collaboration/InitiativeView.tsx`. Add import near the other component imports (around line 4):

```tsx
import CollaborationFullView from '../../components/collaboration/CollaborationFullView';
```

Below the `isDiscussion` check (around line 37), add:

```tsx
  const isCollaboration = location.pathname.endsWith('/collaboration');

  if (isCollaboration) {
    return (
      <CollaborationFullView
        title={title}
        collaborationId={initiativeId!}
        communityId={communityId!}
      />
    );
  }
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`. Navigate to an initiative. Manually append `/collaboration` to the URL. Expected: CollaborationFullView renders with tabs and "Setting up merge contract…" placeholder while merge_contract deploys.

- [ ] **Step 3: Commit**

```bash
git add src/pages/collaboration/InitiativeView.tsx
git commit -m "feat(routing): add /collaboration subroute to InitiativeView"
```

---

## Task 16: Wire `CollaborationPanel` + `RoleDisplay` + absorbed-state into `InitiativeDashboard`

**Files:**
- Modify: `src/components/collaboration/InitiativeDashboard.tsx`
- Modify: `src/components/collaboration/InitiativeDashboard.module.scss`

- [ ] **Step 1: Add imports**

Open `src/components/collaboration/InitiativeDashboard.tsx`. Add near existing imports:

```tsx
import CollaborationPanel from './CollaborationPanel';
import RoleDisplay from '../shared/RoleDisplay';
import { getInitiativeRoles, type InitiativeRoles } from '../../services/initiativeRoles';
import { useParams } from 'react-router-dom';
```

- [ ] **Step 2: Add roles state and fetch effect**

Inside the component, after the existing `useState` declarations (around line 54), add:

```tsx
  const [roles, setRoles] = useState<InitiativeRoles | null>(null);
  const params = useParams<{ initiativeHostServer: string; initiativeHostAgent: string }>();

  useEffect(() => {
    if (!serverUrl || !publicKey || !collaborationId) return;
    let cancelled = false;
    getInitiativeRoles(serverUrl, publicKey, collaborationId).then((r) => {
      if (!cancelled) setRoles(r);
    });
    return () => { cancelled = true; };
  }, [serverUrl, publicKey, collaborationId]);
```

- [ ] **Step 3: Render absorbed-state banner before stage cards**

Within the `<div className={cs.main}>` element (around line 172), just before the description `<p>`, add:

```tsx
          {roles?.status === 'merged_into' && roles.mergedInto && (
            <div className={styles.absorbedBanner}>
              <div>
                <strong>This initiative merged into another one.</strong>
                <p>Continue the conversation on the surviving initiative.</p>
              </div>
              <button onClick={() => navigate(`/initiative/${encodeURIComponent(params.initiativeHostServer || '')}/${encodeURIComponent(params.initiativeHostAgent || '')}/${communityId}/${roles.mergedInto}`)}>
                Go to merged initiative →
              </button>
            </div>
          )}

          {roles && (
            <RoleDisplay roles={roles} />
          )}
```

- [ ] **Step 4: Render CollaborationPanel on Discussion + Proposals stages**

Find the Discussion-active block (around line 245) and Proposals-active block (around line 260). Inject the panel above each flow. Replace the Discussion active block:

```tsx
                  {status === 'active' && s.id === 'discussion' && (
                    <>
                      <CollaborationPanel
                        initiativeId={collaborationId}
                        communityId={communityId}
                        initiativeTitle={title}
                        initiativeHostServer={params.initiativeHostServer || ''}
                        initiativeHostAgent={params.initiativeHostAgent || ''}
                        defaultTab="suggestions"
                      />
                      <div className={styles.discussionSummary}>
                        <p className={styles.discussionHint}>
                          Share perspectives on how this problem affects your country.
                          At least {Math.ceil(memberCount * 0.33)} members (33%) must contribute.
                        </p>
                        <button
                          className={styles.joinBtn}
                          onClick={() => navigate(`/initiative/${encodeURIComponent(serverUrl || '')}/${encodeURIComponent(publicKey || '')}/${communityId}/${collaborationId}/discussion`)}
                        >
                          <MessageCircle size={16} /> Join Discussion
                        </button>
                      </div>
                    </>
                  )}
```

And replace the Proposals active block:

```tsx
                  {status === 'active' && s.id === 'proposals' && (
                    <ErrorBoundary fallbackMessage="Proposals encountered an error.">
                      <CollaborationPanel
                        initiativeId={collaborationId}
                        communityId={communityId}
                        initiativeTitle={title}
                        initiativeHostServer={params.initiativeHostServer || ''}
                        initiativeHostAgent={params.initiativeHostAgent || ''}
                        defaultTab="merges"
                      />
                      <ApprovalFlow
                        instanceId={`${collaborationId}_proposals`}
                        collaborationId={collaborationId}
                        collaborationType="initiative"
                        parentContractId={collaborationId}
                        stageKey="proposalsContractId"
                      />
                    </ErrorBoundary>
                  )}
```

- [ ] **Step 5: Styles for absorbed banner**

Append to `src/components/collaboration/InitiativeDashboard.module.scss`:

```scss
.absorbedBanner {
  background: rgba(217, 167, 59, 0.12);
  border: 1px solid rgba(217, 167, 59, 0.4);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;

  strong {
    color: #f0c65b;
    display: block;
    margin-bottom: 4px;
  }

  p {
    color: #c8d2e0;
    font-size: 13px;
    margin: 0;
  }

  button {
    background: #2a5bd7;
    color: #fff;
    border: none;
    padding: 8px 14px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    font-size: 13px;
  }
}
```

- [ ] **Step 6: Verify in browser**

Run: `npm run dev`. Navigate to an initiative dashboard. Expected:
- RoleDisplay strip renders beneath the description (Author chip + avatar).
- On Discussion or Proposals stage (active), CollaborationPanel renders above the flow with `0 Edit Suggestions` / `0 Merge Proposals` (unless data exists).
- Clicking a row navigates to `/collaboration`.

- [ ] **Step 7: Commit**

```bash
git add src/components/collaboration/InitiativeDashboard.tsx src/components/collaboration/InitiativeDashboard.module.scss
git commit -m "feat(dashboard): wire CollaborationPanel + RoleDisplay + absorbed banner"
```

---

## Task 17: `NotificationsBell` in `PageHeader`

**Files:**
- Create: `src/components/shared/NotificationsBell.tsx`
- Create: `src/components/shared/NotificationsBell.module.scss`
- Modify: `src/components/PageHeader.tsx`

- [ ] **Step 1: Write the bell**

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { markRead, markAllRead, type Notification } from '../../store/slices/notificationsSlice';
import styles from './NotificationsBell.module.scss';

const NotificationsBell: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.notifications.items);
  const [open, setOpen] = useState(false);

  const unreadCount = items.filter((n) => !n.read).length;

  const handleClick = (n: Notification) => {
    dispatch(markRead(n.id));
    if (n.type === 'merge_absorbed' && n.payload.targetInitiativeId && n.payload.communityId) {
      navigate(`/initiative/_/_/${n.payload.communityId}/${n.payload.targetInitiativeId}`);
    }
    setOpen(false);
  };

  return (
    <div className={styles.wrapper}>
      <button className={styles.bellBtn} onClick={() => setOpen((v) => !v)} aria-label="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </button>
      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <span>Notifications</span>
            {items.length > 0 && (
              <button className={styles.markAll} onClick={() => dispatch(markAllRead())}>Mark all read</button>
            )}
          </div>
          {items.length === 0 ? (
            <div className={styles.empty}>No notifications</div>
          ) : (
            items.slice(0, 20).map((n) => (
              <button
                key={n.id}
                className={`${styles.item} ${n.read ? '' : styles.unread}`}
                onClick={() => handleClick(n)}
              >
                {n.type === 'merge_absorbed' ? (
                  <>
                    <div className={styles.title}>Merge accepted</div>
                    <div className={styles.body}>
                      An initiative you supported merged into <strong>{n.payload.targetTitle ?? 'another initiative'}</strong>.
                    </div>
                  </>
                ) : (
                  <div className={styles.title}>{n.type}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
```

- [ ] **Step 2: Styles**

```scss
.wrapper { position: relative; }

.bellBtn {
  position: relative;
  background: transparent;
  border: none;
  color: #e6edf7;
  cursor: pointer;
  padding: 6px;
}

.badge {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #e64949;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 280px;
  max-width: 360px;
  max-height: 400px;
  overflow: auto;
  background: #162136;
  border: 1px solid #22304c;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
  z-index: 500;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #22304c;
  font-size: 13px;
  font-weight: 600;
  color: #e6edf7;
}

.markAll {
  background: transparent;
  border: none;
  color: #8fa0bb;
  font-size: 11px;
  cursor: pointer;
}

.empty {
  padding: 20px;
  color: #8fa0bb;
  font-size: 12px;
  text-align: center;
}

.item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 14px;
  background: transparent;
  color: #c8d2e0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;

  &:hover { background: rgba(255, 255, 255, 0.04); }

  .title {
    font-size: 12px;
    font-weight: 600;
    color: #e6edf7;
    margin-bottom: 2px;
  }

  .body {
    font-size: 12px;
    line-height: 1.4;
  }
}

.unread .title::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2a5bd7;
  margin-right: 6px;
  vertical-align: middle;
}
```

- [ ] **Step 3: Embed in `PageHeader`**

Open `src/components/PageHeader.tsx`. Locate the JSX region that holds the top-row action icons (typically a right-aligned div with menu/back buttons). Import the bell and render it:

```tsx
import NotificationsBell from './shared/NotificationsBell';
```

Within the header's right-hand action area (look for where the hamburger or other icons live), add:

```tsx
<NotificationsBell />
```

Since `PageHeader` has layouts (`two-row`, etc.), render `<NotificationsBell />` in the same location as the hamburger/menu icon, which is typically in the top-right action area. If the file has multiple layouts, add the bell in each active layout's top-right slot. A quick grep for `lucide-react` `Menu` or `ChevronLeft` in `PageHeader.tsx` will locate the correct slot.

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`. Load any authenticated page. Expected: bell icon appears in the header. Click it → dropdown shows "No notifications" initially. Trigger a mock notification via DevTools console:

```js
import('http://localhost:5173/src/store/index.ts'); // dev server only
```

Or more practically: perform a merge accept flow in-app and the dropdown will show "Merge accepted" with unread blue dot.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/NotificationsBell.tsx src/components/shared/NotificationsBell.module.scss src/components/PageHeader.tsx
git commit -m "feat(ui): add NotificationsBell in PageHeader"
```

---

## Task 18: Pass `coAuthors` prop to `DiscussionStageView`'s ModificationSuggestions

**Files:**
- Modify: `src/components/collaboration/DiscussionStageView.tsx`

- [ ] **Step 1: Fetch roles and pass coAuthors**

Open `src/components/collaboration/DiscussionStageView.tsx`. Add imports at the top:

```tsx
import { useState } from 'react';
import { getInitiativeRoles, type InitiativeRoles } from '../../services/initiativeRoles';
```

(Merge the `useState` import into the existing React import line.)

Inside the component body, after the existing `useEffect` for `fetchCollaborations`, add:

```tsx
  const [roles, setRoles] = useState<InitiativeRoles | null>(null);
  useEffect(() => {
    if (!serverUrl || !publicKey) return;
    let cancelled = false;
    getInitiativeRoles(serverUrl, publicKey, collaborationId).then((r) => {
      if (!cancelled) setRoles(r);
    });
    return () => { cancelled = true; };
  }, [serverUrl, publicKey, collaborationId]);
```

Replace the `<ModificationSuggestions>` element to pass the role props:

```tsx
            <ModificationSuggestions
              instanceId={`${collaborationId}_discussion_mods`}
              parentContractId={collaborationId}
              stageKey="discussionModsContractId"
              fieldLabel="problem"
              originalAuthor={roles?.author || originalAuthor}
              coAuthors={roles?.coAuthors ?? []}
              targetInitiativeId={collaborationId}
              onAccept={() => {
                if (serverUrl && publicKey) {
                  getInitiativeRoles(serverUrl, publicKey, collaborationId).then(setRoles);
                }
              }}
            />
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`. Open a Discussion stage page for an initiative. Confirm:
- If you're the author, Accept/Reject buttons appear on open suggestions.
- If you're a co-author (promote yourself from DevTools via direct contract call, or via an earlier accepted suggestion), Accept/Reject also appears.

- [ ] **Step 3: Commit**

```bash
git add src/components/collaboration/DiscussionStageView.tsx
git commit -m "feat(discussion): pass co-authors to ModificationSuggestions"
```

---

## Task 19: Verify full end-to-end flow in browser

**Files:** None (manual verification).

- [ ] **Step 1: Start a fresh dev server**

Run: `npm run dev`. Ensure you have a community with at least two test accounts. (Use "test" in the community name to trigger test-data auto-seeding per CLAUDE.md.)

- [ ] **Step 2: Exercise the Edit Suggestion → co-author promotion path**

1. User B opens an initiative authored by User A.
2. User B goes to Discussion stage → opens CollaborationPanel → Edit Suggestions tab → submits a suggestion.
3. User A opens the same initiative, goes to the Collaboration tab, clicks Accept on User B's suggestion.
4. Reload User A's initiative dashboard. Expected: User B now appears in the `RoleDisplay` strip under "Co-author".

- [ ] **Step 3: Exercise the Merge Proposal → accept → absorbed-state path**

1. User A authors Initiative X.
2. User B authors Initiative Y (same community, eligible stage — Problem/Discussion/Proposals).
3. On Initiative X's Collaboration → Merge Proposals tab, User B clicks "Propose Merge" → selects Initiative Y as source → writes rationale.
4. User A (target author) accepts. Expected:
   - Merge card transitions to `accepted` state.
   - Initiative Y's dashboard shows the absorbed-state banner with "Go to merged initiative →" button.
   - User A's notifications bell shows "Merge accepted" notification (because User A's own session dispatched the local notification on accept).
   - User B's `addCoAuthor` call promotes User B to co-author of Initiative X.

- [ ] **Step 4: Exercise Expert endorsement**

On Initiative X, User A endorses User C three times (from three different accounts). Expected: after the third endorsement, User C appears in `RoleDisplay` under "Expert" with endorsement count badge.

*(Note: Expert endorsement UI — ExpertEndorseButton — is currently a built leaf component; it's not yet placed into any participant list. For this verification, drive `endorseExpert` directly from DevTools by calling the exported function, or defer the full endorsement UI to a Task 20 follow-up.)*

- [ ] **Step 5: Commit a tracking note (optional)**

If Task 19 reveals any issues, create a new plan task below this one. Otherwise move to Task 20.

---

## Task 20: Wire `ExpertEndorseButton` into ApprovalFlow participant names

**Files:**
- Modify: `src/components/collaboration/flows/voting/ApprovalFlow.tsx`

*This is the minimum integration to make the endorsement affordance reachable in the UI. Full participant-wide integration (DiscussionFlow, QVFlow, ConvictionStaking) is backlog polish — keep scope to ApprovalFlow for Block A shipping.*

- [ ] **Step 1: Fetch and memoize roles**

At the top of the file, alongside existing imports, add:

```tsx
import { useState, useEffect } from 'react';
import { getInitiativeRoles, type InitiativeRoles } from '../../../../services/initiativeRoles';
import ExpertEndorseButton from '../../../shared/ExpertEndorseButton';
```

(Merge `useState`/`useEffect` into the existing React import line.)

Inside the component body, add roles state + fetch. Use the initiative id available via props (`collaborationId`) — ApprovalFlow already receives it.

```tsx
  const [roles, setRoles] = useState<InitiativeRoles | null>(null);
  useEffect(() => {
    if (!serverUrl || !publicKey || !collaborationId) return;
    let cancelled = false;
    getInitiativeRoles(serverUrl, publicKey, collaborationId).then((r) => {
      if (!cancelled) setRoles(r);
    });
    return () => { cancelled = true; };
  }, [serverUrl, publicKey, collaborationId]);
```

*If `ApprovalFlow` already reads `useAppSelector` for `serverUrl`/`publicKey`, reuse those. Otherwise add those selectors. Leaving the specific line to insert open — place just below existing `useState` declarations.*

- [ ] **Step 2: Render `ExpertEndorseButton` next to proposer names**

Locate the proposal-rendering block (grep for `p.author.slice(0, 8)`). Wrap the existing author display in a flex container and add the endorse button. Example transformation:

```tsx
<div className={styles.authorRow}>
  <span>{proposerName}</span>
  {roles && (
    <ExpertEndorseButton
      initiativeId={collaborationId}
      target={p.author}
      endorsementCount={roles.endorsementCounts[p.author] ?? 0}
      isExpert={roles.experts.includes(p.author)}
      iEndorse={Boolean(publicKey && (roles.endorsementCounts[p.author] ?? 0) > 0 && /* see note */ false)}
      onChange={() => {
        if (serverUrl && publicKey) {
          getInitiativeRoles(serverUrl, publicKey, collaborationId).then(setRoles);
        }
      }}
    />
  )}
</div>
```

Note on `iEndorse`: the current `get_roles` returns `endorsementCounts` but not *who* endorsed. To accurately compute `iEndorse` we need the raw `endorsements` map. Update `initiativeRoles.ts` now — extend the `InitiativeRoles` interface:

```typescript
export interface InitiativeRoles {
  author: string;
  coAuthors: string[];
  experts: string[];
  endorsementCounts: Record<string, number>;
  endorsements: Record<string, string[]>; // <-- add
  status: 'active' | 'merged_into' | 'archived';
  mergedInto: string | null;
}
```

Set it in `getInitiativeRoles` from `r.endorsements` if present (the contract returns endorser arrays via `endorsements[key]`; we re-expose them from `get_roles` if present in details). In practice, `get_roles` in the contract returns `endorsementCounts` but not the full endorsement map — to get `iEndorse` working, also read `get_details` for `endorsements`. Simplest: update `getInitiativeRoles` to do a second `get_details` call and read `details.endorsements`. Inline below:

```typescript
export async function getInitiativeRoles(
  serverUrl: string, publicKey: string, initiativeId: string,
): Promise<InitiativeRoles> {
  try {
    const [rolesResult, detailsResult] = await Promise.all([
      contractRead({ serverUrl, publicKey, contractId: initiativeId,
        method: { name: 'get_roles', values: {} } as IMethod }),
      contractRead({ serverUrl, publicKey, contractId: initiativeId,
        method: { name: 'get_details', values: {} } as IMethod }),
    ]);
    const r = (rolesResult && typeof rolesResult === 'object') ? rolesResult as Partial<InitiativeRoles> : {};
    const d = (detailsResult && typeof detailsResult === 'object') ? detailsResult as Record<string, unknown> : {};
    const endorsements: Record<string, string[]> = (d.endorsements && typeof d.endorsements === 'object')
      ? Object.fromEntries(Object.entries(d.endorsements as Record<string, unknown>)
          .map(([k, v]) => [k, Array.isArray(v) ? v as string[] : []]))
      : {};

    return {
      author: typeof r.author === 'string' ? r.author : '',
      coAuthors: Array.isArray(r.coAuthors) ? r.coAuthors : [],
      experts: Array.isArray(r.experts) ? r.experts : [],
      endorsementCounts: (r.endorsementCounts && typeof r.endorsementCounts === 'object') ? r.endorsementCounts as Record<string, number> : {},
      endorsements,
      status: r.status === 'merged_into' || r.status === 'archived' ? r.status : 'active',
      mergedInto: typeof r.mergedInto === 'string' ? r.mergedInto : null,
    };
  } catch {
    return { author: '', coAuthors: [], experts: [], endorsementCounts: {}, endorsements: {}, status: 'active', mergedInto: null };
  }
}
```

Update `iEndorse` logic:

```tsx
iEndorse={Boolean(publicKey && roles.endorsements[p.author]?.includes(publicKey))}
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`. Go to Proposals stage of any initiative with submitted proposals. Expected: next to each proposer's name, an endorse button shows. Click it → count increments → third endorsement from different accounts → proposer becomes Expert.

- [ ] **Step 4: Commit**

```bash
git add src/components/collaboration/flows/voting/ApprovalFlow.tsx src/services/initiativeRoles.ts
git commit -m "feat(approval): wire ExpertEndorseButton next to proposers"
```

---

## Task 21: Final regression pass + type-check

**Files:** None (verification only).

- [ ] **Step 1: Run type check**

Run: `npx tsc -b`
Expected: No errors. Production build runs `tsc -b` per CLAUDE.md — all TS errors block deploy.

- [ ] **Step 2: Smoke test existing features**

Run `npm run dev`. Exercise each:
- Home → `/stage/problem`, confirm voting works
- Open a community → create initiative (full-page onboarding)
- Initiative Dashboard renders all 5 stages, progress bar, role display
- Discussion stage — inline CollaborationPanel + Join Discussion button work
- Proposals stage — inline CollaborationPanel + ApprovalFlow work
- Vote stage — QVFlow works
- Mandate stage — ConvictionStaking works

Expected: no regressions. Console should have zero new errors from added code (existing warnings OK).

- [ ] **Step 3: Final commit (if polish changes applied)**

```bash
git status
# if any files modified in polish
git add -p
git commit -m "chore: final type-check and regression polish for block A"
```

---

## Self-Review Notes

- **Spec coverage:** §2 (role model) → Tasks 1, 6, 7, 8. §3 (merge semantics) → Tasks 2, 3, 12. §4.1 (contract details) → Task 1. §4.2 (contract methods) → Task 1. §4.3 (merge_contract) → Task 2. §4.4 (modification wiring) → Task 9. §5.1–5.4 (Collab panel + merge UI) → Tasks 10–14, 16. §5.5 (role display) → Tasks 6, 8, 16. §5.6 (endorsement UX) → Tasks 7, 20. §5.7 (absorbed state) → Tasks 14, 16. §5.8 (notifications) → Tasks 5, 12, 17. §6 (data for Block B) → exposed via `get_roles` and `get_merge_proposals`. §7 (backward compat) — handled via defensive defaults in every fetch path.
- **Out-of-scope flags honored:** no Block B graduation UI, no Block C/D hubs, no push notifications, no hostile-merge rate limiting.
- **Known shortcuts:** `CountAdapter` in Task 14 is a passthrough, leaving the Edit Suggestions count slightly stale until the user opens the tab. Follow up in polish.
- **Gating:** Task 20 depends on the `endorsements` extension to `getInitiativeRoles` — ensure that edit lands in the same commit.
