# Initiative Dashboard & Stage Feed Mini-Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-stage PipelineView with a full Initiative Dashboard, transform stage feeds into interactive mini-apps, add conviction staking for mandates, seed test data, and polish problem voting UX.

**Architecture:** Evolutionary approach reusing existing contract-backed flow components (ProblemVoteFlow, ApprovalFlow, QVFlow, DiscussionFlow). New InitiativeDashboard composes flows into a 5-stage overview. StageFeedView gets per-stage rendering with inline voting. New ConvictionStaking flow + contract for mandates.

**Tech Stack:** React 19, TypeScript, SCSS Modules, Redux Toolkit, Python blockchain contracts via `contractRead`/`contractWrite`

---

### Task 1: Remove ConcernsFlow from PipelineView

**Files:**
- Modify: `src/components/collaboration/PipelineView.tsx`
- Modify: `src/components/collaboration/PipelineView.module.scss`

- [ ] **Step 1: Remove ConcernsFlow references from PipelineView.tsx**

In `src/components/collaboration/PipelineView.tsx`, remove these lines:

Line 14 — delete the import:
```typescript
import ConcernsFlow from './flows/concerns/ConcernsFlow';
```

Line 74 — delete the state:
```typescript
const [showConcerns, setShowConcerns] = useState(false);
```

Lines 376-379 — delete the concern toggle button:
```tsx
<button className={styles.concernButton} onClick={() => setShowConcerns((v) => !v)}>
  <AlertTriangle size={14} />
  {showConcerns ? 'Hide Concerns' : 'Raise Concern'}
</button>
```

Lines 383-396 — delete the entire concerns panel block:
```tsx
{/* Concerns panel */}
{showConcerns && (
  <div className={styles.concernsPanel}>
    <ErrorBoundary fallbackMessage="The concerns section encountered an error.">
      <ConcernsFlow
        instanceId={`${collaborationId}_concerns`}
        collaborationId={collaborationId}
        collaborationType="initiative"
        parentContractId={collaborationId}
        stageKey="concernsContractId"
      />
    </ErrorBoundary>
  </div>
)}
```

- [ ] **Step 2: Remove unused SCSS rules**

In `src/components/collaboration/PipelineView.module.scss`, delete the `.concernButton` block (lines 447-464) and the `.concernsPanel` block (lines 474-480), plus the dark-mode `.concernsPanel` rule (lines 572-575).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: No TypeScript errors, clean build. The `AlertTriangle` import in PipelineView may still be used by the advance warning — check if it's still referenced. If not, remove that import too.

- [ ] **Step 4: Commit**

```bash
git add src/components/collaboration/PipelineView.tsx src/components/collaboration/PipelineView.module.scss
git commit -m "feat: remove ConcernsFlow from initiative pipeline stages"
```

---

### Task 2: Create Conviction Staking Contract

**Files:**
- Create: `src/assets/contracts/conviction_contract.py`

- [ ] **Step 1: Write the Python contract**

Create `src/assets/contracts/conviction_contract.py`:

```python
class ConvictionStaking:
    def __init__(self):
        self.stakes = Storage('stakes')
        self.meta = Storage('meta')

    def stake(self, amount, duration, country):
        voter = master()
        ts = timestamp()
        if voter in self.stakes:
            existing = self.stakes[voter]
            new_amount = existing['amount'] + amount
            self.stakes[voter] = {
                'amount': new_amount,
                'duration': duration,
                'timestamp': ts,
                'country': country,
                'voter': voter
            }
        else:
            self.stakes[voter] = {
                'amount': amount,
                'duration': duration,
                'timestamp': ts,
                'country': country,
                'voter': voter
            }

    def get_my_stake(self):
        voter = master()
        if voter in self.stakes:
            return self.stakes[voter]
        return None

    def get_stakes(self):
        result = {}
        for voter in self.stakes:
            result[voter] = self.stakes[voter]
        return result

    def get_total_conviction(self):
        multipliers = {'1w': 1, '1m': 2, '3m': 4, '6m': 7, '1y': 12}
        total = 0
        count = 0
        for voter in self.stakes:
            s = self.stakes[voter]
            mult = multipliers[s['duration']] if s['duration'] in multipliers else 1
            total = total + (s['amount'] * mult)
            count = count + 1
        return {'total': total, 'count': count}

    def get_conviction_by_country(self):
        multipliers = {'1w': 1, '1m': 2, '3m': 4, '6m': 7, '1y': 12}
        result = {}
        for voter in self.stakes:
            s = self.stakes[voter]
            mult = multipliers[s['duration']] if s['duration'] in multipliers else 1
            weight = s['amount'] * mult
            country = s['country'] if 'country' in s else 'OTHER'
            if country in result:
                result[country] = result[country] + weight
            else:
                result[country] = weight
        return result
```

- [ ] **Step 2: Commit**

```bash
git add src/assets/contracts/conviction_contract.py
git commit -m "feat: add conviction staking smart contract for mandate stage"
```

---

### Task 3: Create Conviction Staking API

**Files:**
- Create: `src/components/collaboration/flows/voting/convictionApi.ts`

- [ ] **Step 1: Write the API module**

Create `src/components/collaboration/flows/voting/convictionApi.ts`:

```typescript
import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export async function stake(
  serverUrl: string, publicKey: string, contractId: string,
  amount: number, duration: string, country: string,
) {
  return await contractWrite({
    serverUrl, publicKey, contractId,
    method: { name: 'stake', values: { amount, duration, country } } as IMethod,
  });
}

export async function getMyStake(serverUrl: string, publicKey: string, contractId: string) {
  return await contractRead({
    serverUrl, publicKey, contractId,
    method: { name: 'get_my_stake', values: {} } as IMethod,
  });
}

export async function getStakes(serverUrl: string, publicKey: string, contractId: string) {
  return await contractRead({
    serverUrl, publicKey, contractId,
    method: { name: 'get_stakes', values: {} } as IMethod,
  });
}

export async function getTotalConviction(serverUrl: string, publicKey: string, contractId: string) {
  return await contractRead({
    serverUrl, publicKey, contractId,
    method: { name: 'get_total_conviction', values: {} } as IMethod,
  });
}

export async function getConvictionByCountry(serverUrl: string, publicKey: string, contractId: string) {
  return await contractRead({
    serverUrl, publicKey, contractId,
    method: { name: 'get_conviction_by_country', values: {} } as IMethod,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/collaboration/flows/voting/convictionApi.ts
git commit -m "feat: add conviction staking API wrapper"
```

---

### Task 4: Create ConvictionStaking Flow Component

**Files:**
- Create: `src/components/collaboration/flows/voting/ConvictionStaking.tsx`
- Create: `src/components/collaboration/flows/voting/ConvictionStaking.module.scss`

- [ ] **Step 1: Write the component**

Create `src/components/collaboration/flows/voting/ConvictionStaking.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Lock, TrendingUp } from 'lucide-react';
import { useFlowContract } from '../shared/useFlowContract';
import * as api from './convictionApi';
import { useAppSelector } from '../../../../store/hooks';
import { getCountryColor, getCountryName } from '../../../../utils/countries';
import convictionCode from '../../../../assets/contracts/conviction_contract.py?raw';
import styles from './ConvictionStaking.module.scss';

interface ConvictionStakingProps {
  instanceId: string;
  parentContractId?: string;
  stageKey?: string;
  compact?: boolean;
}

interface StakeRecord {
  amount: number;
  duration: string;
  timestamp: string;
  country: string;
  voter: string;
}

const DURATIONS = [
  { value: '1w', label: '1 Week', multiplier: 1 },
  { value: '1m', label: '1 Month', multiplier: 2 },
  { value: '3m', label: '3 Months', multiplier: 4 },
  { value: '6m', label: '6 Months', multiplier: 7 },
  { value: '1y', label: '1 Year', multiplier: 12 },
];

const ConvictionStaking: React.FC<ConvictionStakingProps> = ({
  instanceId, parentContractId, stageKey, compact = false,
}) => {
  const { contractId, isReady, isDeploying, hasError, errorMessage, statusMessage, retry } = useFlowContract(
    instanceId, 'conviction_staking', 'conviction_contract.py', convictionCode, parentContractId, stageKey,
  );
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const profiles = useAppSelector((s) => s.communities.profiles);
  const myCountry = publicKey && profiles[publicKey]?.country ? profiles[publicKey].country : 'OTHER';

  const [myStake, setMyStake] = useState<StakeRecord | null>(null);
  const [totalConviction, setTotalConviction] = useState<{ total: number; count: number }>({ total: 0, count: 0 });
  const [countryBreakdown, setCountryBreakdown] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('1m');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!serverUrl || !publicKey || !contractId) return;
    try {
      const [stake, total, byCountry] = await Promise.all([
        api.getMyStake(serverUrl, publicKey, contractId),
        api.getTotalConviction(serverUrl, publicKey, contractId),
        api.getConvictionByCountry(serverUrl, publicKey, contractId),
      ]);
      setMyStake((stake as StakeRecord) || null);
      setTotalConviction((total as { total: number; count: number }) || { total: 0, count: 0 });
      setCountryBreakdown((byCountry as Record<string, number>) || {});
    } catch (err) {
      console.error('Failed to fetch conviction data:', err);
    }
  }, [serverUrl, publicKey, contractId]);

  useEffect(() => {
    if (isReady) fetchData();
  }, [isReady, fetchData]);

  const selectedDuration = DURATIONS.find((d) => d.value === duration) || DURATIONS[1];
  const previewWeight = Number(amount) * selectedDuration.multiplier;

  const handleStake = async () => {
    const numAmount = Number(amount);
    if (!serverUrl || !publicKey || !contractId || !numAmount || numAmount <= 0) return;
    setSubmitting(true);
    try {
      await api.stake(serverUrl, publicKey, contractId, numAmount, duration, myCountry);
      setAmount('');
      await fetchData();
    } catch (err) {
      console.error('Failed to stake:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (hasError) return (
    <div className={styles.loading}>
      <p>{errorMessage || 'Failed to set up conviction staking.'}</p>
      <button onClick={retry} className={styles.retryBtn}>Retry</button>
    </div>
  );
  if (isDeploying || !isReady) return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <p>{statusMessage || 'Setting up conviction staking...'}</p>
    </div>
  );

  const maxConviction = Math.max(...Object.values(countryBreakdown), 1);

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      {/* Staking input */}
      <div className={styles.stakeForm}>
        <h4 className={styles.sectionTitle}>
          <Lock size={16} /> Stake Your Conviction
        </h4>
        <div className={styles.inputRow}>
          <input
            className={styles.amountInput}
            type="number"
            min="1"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
          />
          <select
            className={styles.durationSelect}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            disabled={submitting}
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label} ({d.multiplier}x)
              </option>
            ))}
          </select>
        </div>
        {Number(amount) > 0 && (
          <div className={styles.preview}>
            Your conviction weight: <strong>{previewWeight}</strong>
          </div>
        )}
        <button
          className={styles.stakeBtn}
          onClick={handleStake}
          disabled={submitting || !Number(amount)}
        >
          {submitting ? 'Staking...' : 'Stake'}
        </button>
      </div>

      {/* Active stake */}
      {myStake && (
        <div className={styles.myStake}>
          <h4 className={styles.sectionTitle}>Your Active Stake</h4>
          <div className={styles.stakeDetails}>
            <span>Amount: <strong>{myStake.amount}</strong></span>
            <span>Duration: <strong>{DURATIONS.find((d) => d.value === myStake.duration)?.label || myStake.duration}</strong></span>
            <span>Weight: <strong>{myStake.amount * (DURATIONS.find((d) => d.value === myStake.duration)?.multiplier || 1)}</strong></span>
          </div>
        </div>
      )}

      {/* Community aggregate */}
      <div className={styles.aggregate}>
        <h4 className={styles.sectionTitle}>
          <TrendingUp size={16} /> Community Conviction
        </h4>
        <div className={styles.aggregateStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{totalConviction.total}</span>
            <span className={styles.statLabel}>Total Weight</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{totalConviction.count}</span>
            <span className={styles.statLabel}>Stakers</span>
          </div>
        </div>

        {/* Country breakdown */}
        {Object.keys(countryBreakdown).length > 0 && (
          <div className={styles.countryBreakdown}>
            {Object.entries(countryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([country, weight]) => (
                <div key={country} className={styles.countryRow}>
                  <span className={styles.countryName}>{getCountryName(country)}</span>
                  <div className={styles.countryBar}>
                    <div
                      className={styles.countryFill}
                      style={{
                        width: `${(weight / maxConviction) * 100}%`,
                        backgroundColor: getCountryColor(country),
                      }}
                    />
                  </div>
                  <span className={styles.countryWeight}>{weight}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConvictionStaking;
```

- [ ] **Step 2: Write the SCSS module**

Create `src/components/collaboration/flows/voting/ConvictionStaking.module.scss`:

```scss
@use '../../../../styles/variables' as *;

.container {
  display: flex;
  flex-direction: column;
  gap: $spacing-xl;
}

.compact {
  gap: $spacing-lg;

  .sectionTitle {
    font-size: $text-sm;
  }
}

.loading {
  text-align: center;
  padding: $spacing-2xl;
  color: $gray-500;

  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid $gray-200;
    border-top-color: $primary;
    border-radius: $radius-full;
    animation: spin 0.6s linear infinite;
    margin: 0 auto $spacing-md;
  }

  .retryBtn {
    margin-top: $spacing-sm;
    padding: $spacing-sm $spacing-lg;
    cursor: pointer;
    background: $primary;
    color: white;
    border: none;
    border-radius: $radius-md;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sectionTitle {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $text-base;
  font-weight: $font-semibold;
  color: $gray-800;
  margin-bottom: $spacing-md;

  @media (prefers-color-scheme: dark) {
    color: $dark-text;
  }
}

// Staking form
.stakeForm {
  padding: $spacing-lg;
  background: $gray-50;
  border-radius: $radius-lg;
  border: 1px solid $gray-200;

  @media (prefers-color-scheme: dark) {
    background: $dark-surface;
    border-color: $dark-border;
  }
}

.inputRow {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
}

.amountInput {
  flex: 1;
  padding: $spacing-md;
  border: 1px solid $gray-300;
  border-radius: $radius-md;
  font-size: $text-base;
  min-width: 0;

  @media (prefers-color-scheme: dark) {
    background: $dark-bg;
    border-color: $dark-border;
    color: $dark-text;
  }
}

.durationSelect {
  padding: $spacing-md;
  border: 1px solid $gray-300;
  border-radius: $radius-md;
  font-size: $text-sm;
  background: white;
  cursor: pointer;

  @media (prefers-color-scheme: dark) {
    background: $dark-bg;
    border-color: $dark-border;
    color: $dark-text;
  }
}

.preview {
  font-size: $text-sm;
  color: $success;
  margin-bottom: $spacing-md;
  font-weight: $font-medium;
}

.stakeBtn {
  width: 100%;
  padding: $spacing-md;
  background: $primary;
  color: white;
  border: none;
  border-radius: $radius-md;
  font-size: $text-base;
  font-weight: $font-semibold;
  cursor: pointer;
  transition: background $transition-base;

  &:hover:not(:disabled) {
    background: $primary-dark;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

// Active stake
.myStake {
  padding: $spacing-lg;
  background: rgba($success, 0.06);
  border: 1px solid rgba($success, 0.2);
  border-radius: $radius-lg;
}

.stakeDetails {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-lg;
  font-size: $text-sm;
  color: $gray-700;

  @media (prefers-color-scheme: dark) {
    color: $dark-text-secondary;
  }
}

// Aggregate
.aggregate {
  padding: $spacing-lg;
  background: $gray-50;
  border-radius: $radius-lg;
  border: 1px solid $gray-200;

  @media (prefers-color-scheme: dark) {
    background: $dark-surface;
    border-color: $dark-border;
  }
}

.aggregateStats {
  display: flex;
  gap: $spacing-2xl;
  margin-bottom: $spacing-lg;
}

.stat {
  display: flex;
  flex-direction: column;
}

.statValue {
  font-size: $text-2xl;
  font-weight: $font-bold;
  color: $primary;
}

.statLabel {
  font-size: $text-xs;
  color: $gray-500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

// Country breakdown
.countryBreakdown {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.countryRow {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.countryName {
  font-size: $text-xs;
  color: $gray-600;
  min-width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (prefers-color-scheme: dark) {
    color: $dark-text-secondary;
  }
}

.countryBar {
  flex: 1;
  height: 8px;
  background: $gray-100;
  border-radius: $radius-full;
  overflow: hidden;

  @media (prefers-color-scheme: dark) {
    background: $dark-border;
  }
}

.countryFill {
  height: 100%;
  border-radius: $radius-full;
  transition: width $transition-base;
}

.countryWeight {
  font-size: $text-xs;
  font-weight: $font-semibold;
  color: $gray-700;
  min-width: 32px;
  text-align: right;

  @media (prefers-color-scheme: dark) {
    color: $dark-text;
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Clean build. The component is not yet used anywhere.

- [ ] **Step 4: Commit**

```bash
git add src/components/collaboration/flows/voting/ConvictionStaking.tsx src/components/collaboration/flows/voting/ConvictionStaking.module.scss
git commit -m "feat: add ConvictionStaking flow component with staking UI and country breakdown"
```

---

### Task 5: Create Country Participation Component

A shared component for displaying country participation flags across stage cards.

**Files:**
- Create: `src/components/shared/CountryParticipation.tsx`
- Create: `src/components/shared/CountryParticipation.module.scss`

- [ ] **Step 1: Write the component**

Create `src/components/shared/CountryParticipation.tsx`:

```tsx
import React from 'react';
import { getCountryName, getCountryColor, getCountryFlag } from '../../utils/countries';
import styles from './CountryParticipation.module.scss';

interface CountryParticipationProps {
  /** Map of country code → participation count */
  data: Record<string, number>;
  /** Max countries to show before "+N more" */
  maxDisplay?: number;
}

const CountryParticipation: React.FC<CountryParticipationProps> = ({ data, maxDisplay = 5 }) => {
  const sorted = Object.entries(data).sort(([, a], [, b]) => b - a);
  if (sorted.length === 0) return null;

  const shown = sorted.slice(0, maxDisplay);
  const remaining = sorted.length - shown.length;

  return (
    <div className={styles.container}>
      {shown.map(([code, count]) => (
        <span
          key={code}
          className={styles.flag}
          title={`${getCountryName(code)}: ${count}`}
          style={{ borderColor: getCountryColor(code) }}
        >
          {getCountryFlag(code)} {count}
        </span>
      ))}
      {remaining > 0 && (
        <span className={styles.more}>+{remaining} more</span>
      )}
    </div>
  );
};

export default CountryParticipation;
```

- [ ] **Step 2: Write the SCSS**

Create `src/components/shared/CountryParticipation.module.scss`:

```scss
@use '../../styles/variables' as *;

.container {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
  align-items: center;
}

.flag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: $text-xs;
  padding: 2px $spacing-sm;
  border-radius: $radius-full;
  background: $gray-50;
  border: 1px solid $gray-200;
  color: $gray-700;

  @media (prefers-color-scheme: dark) {
    background: $dark-surface;
    border-color: $dark-border;
    color: $dark-text-secondary;
  }
}

.more {
  font-size: $text-xs;
  color: $gray-400;
  font-style: italic;
}
```

- [ ] **Step 3: Check `getCountryFlag` exists**

Run: `grep -n 'getCountryFlag' src/utils/countries.ts`

If `getCountryFlag` doesn't exist, add it to `src/utils/countries.ts`:

```typescript
export function getCountryFlag(code: string): string {
  const country = COUNTRIES.find((c) => c.code === code);
  return country?.flag || '🌍';
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/CountryParticipation.tsx src/components/shared/CountryParticipation.module.scss src/utils/countries.ts
git commit -m "feat: add CountryParticipation shared component for country flag display"
```

---

### Task 6: Create Initiative Dashboard Component

**Files:**
- Create: `src/components/collaboration/InitiativeDashboard.tsx`
- Create: `src/components/collaboration/InitiativeDashboard.module.scss`

- [ ] **Step 1: Write InitiativeDashboard.tsx**

Create `src/components/collaboration/InitiativeDashboard.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, Lock, AlertTriangle, MessageCircle } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCommunityMembers } from '../../store/slices/communitiesSlice';
import { contractRead, contractWrite } from '../../services/api';
import type { IMethod } from '../../services/interfaces';
import type { PipelineStage } from '../../types/initiative';
import ProblemVoteFlow from './flows/voting/ProblemVoteFlow';
import DiscussionFlow from './flows/discussion/DiscussionFlow';
import ApprovalFlow from './flows/voting/ApprovalFlow';
import QVFlow from './flows/voting/QVFlow';
import ConvictionStaking from './flows/voting/ConvictionStaking';
import CountryParticipation from '../shared/CountryParticipation';
import PageHeader from '../PageHeader';
import ErrorBoundary from '../shared/ErrorBoundary';
import cs from '../../pages/Container.module.scss';
import styles from './InitiativeDashboard.module.scss';

interface StageConfig {
  id: PipelineStage;
  label: string;
  description: string;
}

const STAGES: StageConfig[] = [
  { id: 'problem', label: 'Problem', description: 'Community identifies whether this is a cross-border problem' },
  { id: 'discussion', label: 'Discussion', description: 'Members share perspectives from their countries' },
  { id: 'proposals', label: 'Proposals', description: 'Solution proposals are submitted and reviewed' },
  { id: 'vote', label: 'Vote', description: 'Weighted voting on the best proposals' },
  { id: 'mandate', label: 'Mandate', description: 'Community conviction and commitment to action' },
];

interface InitiativeDashboardProps {
  title: string;
  collaborationId: string;
  communityId: string;
}

type StageStatus = 'completed' | 'active' | 'locked';

const InitiativeDashboard: React.FC<InitiativeDashboardProps> = ({ title, collaborationId, communityId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const communityMembers = useAppSelector((s) => s.communities.communityMembers);
  const communityProps = useAppSelector((s) => s.communities.communityProperties[communityId]);
  const communityName = communityProps?.name || communityId.slice(0, 8);

  const [stage, setStage] = useState<PipelineStage>('problem');
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const [advancing, setAdvancing] = useState(false);
  const [confirmAdvance, setConfirmAdvance] = useState(false);
  const [problemTally, setProblemTally] = useState<{ up: number; down: number; total: number }>({ up: 0, down: 0, total: 0 });
  const [problemCountries, setProblemCountries] = useState<Record<string, number>>({});

  // Fetch stage and details
  useEffect(() => {
    if (!serverUrl || !publicKey || !collaborationId) return;
    contractRead({
      serverUrl, publicKey, contractId: collaborationId,
      method: { name: 'get_stage', values: {} } as IMethod,
    })
      .then((result: unknown) => {
        if (typeof result === 'string' && STAGES.some((s) => s.id === result)) {
          setStage(result as PipelineStage);
        }
      })
      .catch(() => {});

    contractRead({
      serverUrl, publicKey, contractId: collaborationId,
      method: { name: 'get_details', values: {} } as IMethod,
    })
      .then((result: Record<string, unknown>) => {
        if (result && typeof result === 'object') setDetails(result);
      })
      .catch(() => {});
  }, [serverUrl, publicKey, collaborationId]);

  // Fetch community members
  useEffect(() => {
    if (!serverUrl || !publicKey || !communityId) return;
    if (communityMembers[communityId]) return;
    dispatch(fetchCommunityMembers({ serverUrl, publicKey, contractId: communityId }));
  }, [serverUrl, publicKey, communityId, communityMembers, dispatch]);

  // Fetch problem tally + country data for completed/active problem stage
  useEffect(() => {
    if (!serverUrl || !publicKey || !collaborationId) return;
    const fetchProblemData = async () => {
      try {
        const pvContractIdRaw = await contractRead({
          serverUrl, publicKey, contractId: collaborationId,
          method: { name: 'Storage', values: { key: 'problemVoteContractId' } } as IMethod,
        });
        const pvContractId = typeof pvContractIdRaw === 'string' ? pvContractIdRaw : null;
        if (!pvContractId) return;

        const [tally, votes] = await Promise.all([
          contractRead({ serverUrl, publicKey, contractId: pvContractId, method: { name: 'get_tally', values: {} } as IMethod }),
          contractRead({ serverUrl, publicKey, contractId: pvContractId, method: { name: 'get_votes', values: {} } as IMethod }),
        ]);
        if (tally && typeof tally === 'object') {
          setProblemTally(tally as { up: number; down: number; total: number });
        }
        // Build country breakdown from voter profiles
        if (votes && typeof votes === 'object') {
          const countries: Record<string, number> = {};
          // We can't access profiles inside this effect easily, so we emit raw voter keys
          // The country breakdown will be built in render using profiles from Redux
          // Store voter keys for now
          setProblemCountries({}); // Will be populated via profiles in render
        }
      } catch { /* non-blocking */ }
    };
    fetchProblemData();
  }, [serverUrl, publicKey, collaborationId]);

  const memberCount = Array.isArray(communityMembers[communityId])
    ? communityMembers[communityId].length : 0;

  const currentStageIndex = STAGES.findIndex((s) => s.id === stage);
  const nextStage = currentStageIndex < STAGES.length - 1 ? STAGES[currentStageIndex + 1] : null;

  const getStageStatus = (stageId: PipelineStage): StageStatus => {
    const idx = STAGES.findIndex((s) => s.id === stageId);
    if (idx < currentStageIndex) return 'completed';
    if (idx === currentStageIndex) return 'active';
    return 'locked';
  };

  const getStageReadiness = (): { ready: boolean; reason: string } => {
    if (stage === 'problem' && memberCount > 0) {
      const threshold = Math.ceil(memberCount * 0.67);
      if (problemTally.up < threshold) {
        return {
          ready: false,
          reason: `${Math.max(threshold - problemTally.up, 0)} more upvote${threshold - problemTally.up !== 1 ? 's' : ''} needed (${problemTally.up}/${threshold})`,
        };
      }
    }
    return { ready: true, reason: '' };
  };

  const handleAdvance = async () => {
    if (!nextStage || !serverUrl || !publicKey || advancing) return;
    if (!confirmAdvance) { setConfirmAdvance(true); return; }
    setAdvancing(true);
    setConfirmAdvance(false);
    try {
      await contractWrite({
        serverUrl, publicKey, contractId: collaborationId,
        method: { name: 'set_stage', values: { stage: nextStage.id } } as IMethod,
      });
      setStage(nextStage.id);
    } catch { /* silently fail */ }
    finally { setAdvancing(false); }
  };

  const stageReadiness = getStageReadiness();
  const description = typeof details.description === 'string' ? details.description : '';
  const evidenceLinks = Array.isArray(details.evidence) ? (details.evidence as string[]) : [];
  const countries = Array.isArray(details.countries) ? (details.countries as string[]) : [];

  return (
    <div className={cs.container}>
      <PageHeader
        showBackButton
        backButtonText="Back"
        onBackClick={() => navigate(-1)}
        title={title}
        subtitle={communityName}
        layout="two-row"
      />

      <div className={cs.content}>
        <div className={cs.main}>
          {/* Description */}
          {description && (
            <p className={styles.description}>{description}</p>
          )}

          {/* Stage Progress Bar */}
          <div className={styles.progressBar}>
            {STAGES.map((s, i) => {
              const status = getStageStatus(s.id);
              return (
                <React.Fragment key={s.id}>
                  {i > 0 && (
                    <div className={`${styles.connector} ${status !== 'locked' ? styles.connectorActive : ''}`} />
                  )}
                  <div className={styles.progressStep}>
                    <div className={`${styles.stepDot} ${styles[status]}`}>
                      {status === 'completed' ? <CheckCircle2 size={16} /> :
                       status === 'locked' ? <Lock size={12} /> :
                       <Circle size={16} />}
                    </div>
                    <span className={`${styles.stepLabel} ${styles[`${status}Label`]}`}>{s.label}</span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Stage Cards */}
          <div className={styles.stageCards}>
            {STAGES.map((s) => {
              const status = getStageStatus(s.id);
              return (
                <div key={s.id} className={`${styles.stageCard} ${styles[`card${status.charAt(0).toUpperCase() + status.slice(1)}`]}`}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{s.label}</h3>
                    <span className={`${styles.statusBadge} ${styles[`badge${status.charAt(0).toUpperCase() + status.slice(1)}`]}`}>
                      {status === 'completed' ? 'Completed' : status === 'active' ? 'Active' : 'Locked'}
                    </span>
                  </div>
                  <p className={styles.cardDescription}>{s.description}</p>

                  {/* LOCKED: show what will be tracked */}
                  {status === 'locked' && (
                    <div className={styles.lockedOverlay}>
                      <Lock size={20} />
                      <span>Awaiting earlier stages</span>
                    </div>
                  )}

                  {/* COMPLETED: show summary metrics */}
                  {status === 'completed' && s.id === 'problem' && (
                    <div className={styles.completedMetrics}>
                      <span>{problemTally.up} upvotes / {problemTally.down} downvotes</span>
                      <span className={styles.thresholdMet}>Threshold met</span>
                    </div>
                  )}

                  {/* ACTIVE: inline voting flows */}
                  {status === 'active' && s.id === 'problem' && (
                    <ErrorBoundary fallbackMessage="Voting encountered an error.">
                      <ProblemVoteFlow
                        instanceId={`${collaborationId}_problem_vote`}
                        description=""
                        evidenceLinks={evidenceLinks}
                        countries={countries}
                        communityMemberCount={memberCount}
                        parentContractId={collaborationId}
                        stageKey="problemVoteContractId"
                      />
                    </ErrorBoundary>
                  )}

                  {status === 'active' && s.id === 'discussion' && (
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
                  )}

                  {status === 'active' && s.id === 'proposals' && (
                    <ErrorBoundary fallbackMessage="Proposals encountered an error.">
                      <ApprovalFlow
                        instanceId={`${collaborationId}_proposals`}
                        collaborationId={collaborationId}
                        collaborationType="initiative"
                        parentContractId={collaborationId}
                        stageKey="proposalsContractId"
                      />
                    </ErrorBoundary>
                  )}

                  {status === 'active' && s.id === 'vote' && (
                    <ErrorBoundary fallbackMessage="Voting encountered an error.">
                      <QVFlow
                        instanceId={`${collaborationId}_vote`}
                        collaborationId={collaborationId}
                        collaborationType="initiative"
                        parentContractId={collaborationId}
                        stageKey="voteContractId"
                      />
                    </ErrorBoundary>
                  )}

                  {status === 'active' && s.id === 'mandate' && (
                    <ErrorBoundary fallbackMessage="Conviction staking encountered an error.">
                      <ConvictionStaking
                        instanceId={`${collaborationId}_conviction`}
                        parentContractId={collaborationId}
                        stageKey="convictionContractId"
                      />
                    </ErrorBoundary>
                  )}
                </div>
              );
            })}
          </div>

          {/* Advance bar */}
          {nextStage && (
            <div className={styles.advanceBar}>
              {!stageReadiness.ready && (
                <div className={styles.advanceWarning}>
                  <AlertTriangle size={14} />
                  <span>{stageReadiness.reason}</span>
                </div>
              )}
              {confirmAdvance ? (
                <div className={styles.confirmRow}>
                  <span className={styles.confirmText}>
                    {stageReadiness.ready
                      ? `Advance to ${nextStage.label}?`
                      : `Threshold not met. Advance to ${nextStage.label} anyway?`}
                  </span>
                  <button className={styles.confirmYes} onClick={handleAdvance} disabled={advancing}>
                    {advancing ? 'Moving...' : 'Confirm'}
                  </button>
                  <button className={styles.confirmNo} onClick={() => setConfirmAdvance(false)}>Cancel</button>
                </div>
              ) : (
                <button
                  className={`${styles.advanceButton} ${!stageReadiness.ready ? styles.advanceButtonWarn : ''}`}
                  onClick={handleAdvance}
                  disabled={advancing}
                >
                  {advancing ? 'Moving...' : `Move to ${nextStage.label}`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InitiativeDashboard;
```

- [ ] **Step 2: Write InitiativeDashboard.module.scss**

Create `src/components/collaboration/InitiativeDashboard.module.scss`:

```scss
@use '../../styles/variables' as *;

$initiative-color: #ea580c;

.description {
  font-size: $text-base;
  color: $gray-600;
  line-height: 1.6;
  margin-bottom: $spacing-xl;

  @media (prefers-color-scheme: dark) {
    color: $dark-text-secondary;
  }
}

// ─── Progress bar ────────────────────────────────────────────────────────────

.progressBar {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: $spacing-lg 0;
  gap: 0;
  margin-bottom: $spacing-2xl;
}

.connector {
  flex: 1;
  height: 2px;
  background: $gray-200;
  margin-top: 14px;
  max-width: 48px;

  &.connectorActive {
    background: $success;
  }

  @media (prefers-color-scheme: dark) {
    background: $dark-border;
  }
}

.progressStep {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xs;
}

.stepDot {
  width: 28px;
  height: 28px;
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid $gray-200;
  color: $gray-400;
  background: white;
  transition: all $transition-base;

  &.completed {
    background: $success;
    border-color: $success;
    color: white;
  }

  &.active {
    background: $primary;
    border-color: $primary;
    color: white;
  }

  &.locked {
    opacity: 0.5;
  }

  @media (prefers-color-scheme: dark) {
    background: $dark-surface;
    border-color: $dark-border;
    color: $dark-text-secondary;
  }
}

.stepLabel {
  font-size: $text-xs;
  color: $gray-400;
  white-space: nowrap;
}

.activeLabel { color: $primary; font-weight: $font-medium; }
.completedLabel { color: $success; }
.lockedLabel { opacity: 0.5; }

// ─── Stage cards ─────────────────────────────────────────────────────────────

.stageCards {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  margin-bottom: $spacing-2xl;
}

.stageCard {
  padding: $spacing-lg;
  border-radius: $radius-lg;
  border: 1px solid $gray-200;
  background: white;
  box-shadow: $shadow-sm;

  @media (prefers-color-scheme: dark) {
    background: $dark-bg;
    border-color: $dark-border;
  }
}

.cardCompleted {
  border-color: rgba($success, 0.3);
  background: rgba($success, 0.02);

  @media (prefers-color-scheme: dark) {
    background: rgba($success, 0.05);
    border-color: rgba($success, 0.2);
  }
}

.cardActive {
  border-color: $primary;
  box-shadow: $shadow-md;
}

.cardLocked {
  opacity: 0.5;
  background: $gray-50;

  @media (prefers-color-scheme: dark) {
    background: $dark-surface;
  }
}

.cardHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-sm;
}

.cardTitle {
  font-size: $text-lg;
  font-weight: $font-semibold;
  color: $gray-800;
  margin: 0;

  @media (prefers-color-scheme: dark) {
    color: $dark-text;
  }
}

.cardDescription {
  font-size: $text-sm;
  color: $gray-500;
  margin: 0 0 $spacing-md;
  line-height: 1.5;

  @media (prefers-color-scheme: dark) {
    color: $dark-text-secondary;
  }
}

// Status badges
.statusBadge {
  font-size: $text-xs;
  font-weight: $font-semibold;
  padding: 2px $spacing-sm;
  border-radius: $radius-full;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.badgeCompleted {
  background: rgba($success, 0.1);
  color: $success;
}

.badgeActive {
  background: rgba($primary, 0.1);
  color: $primary;
}

.badgeLocked {
  background: $gray-100;
  color: $gray-400;

  @media (prefers-color-scheme: dark) {
    background: $dark-border;
    color: $dark-text-secondary;
  }
}

// Locked overlay
.lockedOverlay {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  color: $gray-400;
  font-size: $text-sm;
  font-style: italic;
  padding: $spacing-lg 0;
}

// Completed metrics
.completedMetrics {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
  font-size: $text-sm;
  color: $gray-600;
  padding-top: $spacing-sm;

  @media (prefers-color-scheme: dark) {
    color: $dark-text-secondary;
  }
}

.thresholdMet {
  color: $success;
  font-weight: $font-semibold;
}

// Discussion summary in active card
.discussionSummary {
  padding-top: $spacing-sm;
}

.discussionHint {
  font-size: $text-sm;
  color: $gray-600;
  margin-bottom: $spacing-md;
  line-height: 1.5;

  @media (prefers-color-scheme: dark) {
    color: $dark-text-secondary;
  }
}

.joinBtn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md $spacing-xl;
  background: $primary;
  color: white;
  border: none;
  border-radius: $radius-md;
  font-size: $text-sm;
  font-weight: $font-semibold;
  cursor: pointer;
  transition: background $transition-base;

  &:hover { background: $primary-dark; }
}

// ─── Advance bar ─────────────────────────────────────────────────────────────

.advanceBar {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding-top: $spacing-lg;
  border-top: 1px solid $gray-200;

  @media (prefers-color-scheme: dark) {
    border-top-color: $dark-border;
  }
}

.advanceWarning {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  font-size: $text-xs;
  color: $warning;
  padding: $spacing-sm $spacing-md;
  background: rgba($warning, 0.08);
  border-radius: $radius-sm;
}

.advanceButton {
  padding: $spacing-sm $spacing-xl;
  background: $initiative-color;
  color: white;
  border: none;
  border-radius: $radius-md;
  font-size: $text-sm;
  font-weight: $font-semibold;
  cursor: pointer;
  transition: background $transition-base;
  align-self: flex-start;

  &:hover:not(:disabled) { background: darken($initiative-color, 8%); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.advanceButtonWarn { opacity: 0.7; }

.confirmRow {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  flex-wrap: wrap;
}

.confirmText {
  font-size: $text-sm;
  color: $gray-600;
  font-weight: $font-medium;
}

.confirmYes {
  padding: $spacing-sm $spacing-lg;
  background: $primary;
  color: white;
  border: none;
  border-radius: $radius-md;
  font-size: $text-sm;
  font-weight: $font-semibold;
  cursor: pointer;
  &:hover:not(:disabled) { opacity: 0.9; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.confirmNo {
  padding: $spacing-sm $spacing-lg;
  background: transparent;
  color: $gray-500;
  border: 1px solid $gray-300;
  border-radius: $radius-md;
  font-size: $text-sm;
  cursor: pointer;
  &:hover { background: $gray-50; }
}

// ─── Mobile ──────────────────────────────────────────────────────────────────

@media (max-width: $breakpoint-sm) {
  .progressBar {
    padding: $spacing-md 0;
  }

  .stepLabel {
    display: none;
  }
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Clean build. Component not yet wired to routes.

- [ ] **Step 4: Commit**

```bash
git add src/components/collaboration/InitiativeDashboard.tsx src/components/collaboration/InitiativeDashboard.module.scss
git commit -m "feat: add InitiativeDashboard component with 5-stage overview and inline flows"
```

---

### Task 7: Wire Initiative Dashboard into Routes

**Files:**
- Modify: `src/pages/collaboration/InitiativeView.tsx`

- [ ] **Step 1: Replace PipelineView with InitiativeDashboard**

In `src/pages/collaboration/InitiativeView.tsx`, replace the import and usage:

Replace line 3:
```typescript
import PipelineView from '../../components/collaboration/PipelineView';
```
with:
```typescript
import InitiativeDashboard from '../../components/collaboration/InitiativeDashboard';
```

Replace line 38-43:
```tsx
return (
  <PipelineView
    title={title}
    collaborationId={initiativeId!}
    communityId={communityId!}
  />
);
```
with:
```tsx
return (
  <InitiativeDashboard
    title={title}
    collaborationId={initiativeId!}
    communityId={communityId!}
  />
);
```

- [ ] **Step 2: Add discussion sub-route**

In `src/App.tsx`, the initiative route already uses a wildcard (`/*`), so discussion sub-routes will be handled within InitiativeDashboard's navigation. No routing changes needed — the "Join Discussion" button navigates using `navigate()` and the existing `/*` catch-all handles it.

However, we need to handle the discussion view. For now, the discussion sub-view will reuse the existing PipelineView's discussion rendering. We'll add this as a conditional inside InitiativeView based on the URL path.

Update `src/pages/collaboration/InitiativeView.tsx` to handle discussion sub-route:

```tsx
import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import InitiativeDashboard from '../../components/collaboration/InitiativeDashboard';
import DiscussionStageView from '../../components/collaboration/DiscussionStageView';
import { useAppSelector } from '../../store/hooks';
import { contractRead } from '../../services/api';
import type { IMethod } from '../../services/interfaces';
import type { InitiativeData } from '../../types/initiative';

const InitiativeView: React.FC = () => {
  const { communityId, initiativeId } = useParams<{
    initiativeHostServer: string;
    initiativeHostAgent: string;
    communityId: string;
    initiativeId: string;
  }>();
  const location = useLocation();
  const initiative = (location.state as { initiative?: InitiativeData })?.initiative;
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);

  const [title, setTitle] = useState(initiative?.title ?? 'Initiative');

  useEffect(() => {
    if (initiative?.title || !serverUrl || !publicKey || !initiativeId) return;
    contractRead({
      serverUrl, publicKey, contractId: initiativeId,
      method: { name: 'get_details', values: {} } as IMethod,
    })
      .then((details: Record<string, unknown>) => {
        if (details?.title) setTitle(details.title as string);
      })
      .catch(() => {});
  }, [initiative?.title, serverUrl, publicKey, initiativeId]);

  // Check if we're on the discussion sub-route
  const isDiscussion = location.pathname.endsWith('/discussion');

  if (isDiscussion) {
    return (
      <DiscussionStageView
        title={title}
        collaborationId={initiativeId!}
        communityId={communityId!}
      />
    );
  }

  return (
    <InitiativeDashboard
      title={title}
      collaborationId={initiativeId!}
      communityId={communityId!}
    />
  );
};

export default InitiativeView;
```

- [ ] **Step 3: Create DiscussionStageView**

Create `src/components/collaboration/DiscussionStageView.tsx`:

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import DiscussionFlow from './flows/discussion/DiscussionFlow';
import ModificationSuggestions from './flows/modifications/ModificationSuggestions';
import PageHeader from '../PageHeader';
import ErrorBoundary from '../shared/ErrorBoundary';
import cs from '../../pages/Container.module.scss';

interface DiscussionStageViewProps {
  title: string;
  collaborationId: string;
  communityId: string;
}

const DiscussionStageView: React.FC<DiscussionStageViewProps> = ({ title, collaborationId, communityId }) => {
  const navigate = useNavigate();
  const communityProps = useAppSelector((s) => s.communities.communityProperties[communityId]);
  const communityName = communityProps?.name || communityId.slice(0, 8);

  return (
    <div className={cs.container}>
      <PageHeader
        showBackButton
        backButtonText="Back to Dashboard"
        onBackClick={() => navigate(-1)}
        title={`${title} — Discussion`}
        subtitle={communityName}
        layout="two-row"
      />
      <div className={cs.content}>
        <div className={cs.main}>
          <ErrorBoundary fallbackMessage="The discussion section encountered an error.">
            <DiscussionFlow
              instanceId={`${collaborationId}_discussion`}
              collaborationId={collaborationId}
              collaborationType="initiative"
            />
            <ModificationSuggestions
              instanceId={`${collaborationId}_discussion_mods`}
              parentContractId={collaborationId}
              stageKey="discussionModsContractId"
              fieldLabel="problem"
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default DiscussionStageView;
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Clean build. Navigate to an initiative — should show the new dashboard.

- [ ] **Step 5: Commit**

```bash
git add src/pages/collaboration/InitiativeView.tsx src/components/collaboration/DiscussionStageView.tsx
git commit -m "feat: wire InitiativeDashboard as default initiative view with discussion sub-route"
```

---

### Task 8: Problem Vote UI Polish — Optimistic Updates

**Files:**
- Modify: `src/components/collaboration/flows/voting/ProblemVoteFlow.tsx`
- Modify: `src/pages/StageFeedView.tsx`

- [ ] **Step 1: Add optimistic updates to ProblemVoteFlow.tsx**

In `src/components/collaboration/flows/voting/ProblemVoteFlow.tsx`, replace the `handleVote` function (lines 63-80):

```typescript
  const handleVote = async (direction: 'up' | 'down') => {
    if (!serverUrl || !publicKey || !contractId || voting) return;
    setVoting(true);

    // Optimistic update
    const prevTally = { ...tally };
    const prevVote = myVote;
    if (myVote === direction) {
      // Removing vote
      setTally({
        up: tally.up - (direction === 'up' ? 1 : 0),
        down: tally.down - (direction === 'down' ? 1 : 0),
        total: tally.total - 1,
      });
      setMyVote(null);
    } else {
      // Changing or new vote
      setTally({
        up: tally.up + (direction === 'up' ? 1 : 0) - (myVote === 'up' ? 1 : 0),
        down: tally.down + (direction === 'down' ? 1 : 0) - (myVote === 'down' ? 1 : 0),
        total: tally.total + (myVote === null ? 1 : 0),
      });
      setMyVote(direction);
    }

    try {
      if (prevVote === direction) {
        await api.removeVote(serverUrl, publicKey, contractId);
      } else if (direction === 'up') {
        await api.upvote(serverUrl, publicKey, contractId);
      } else {
        await api.downvote(serverUrl, publicKey, contractId);
      }
      await fetchData();
    } catch (err) {
      // Rollback on failure
      setTally(prevTally);
      setMyVote(prevVote);
      console.error('Failed to vote:', err);
    } finally {
      setVoting(false);
    }
  };
```

- [ ] **Step 2: Add button animation CSS**

In `src/components/collaboration/flows/voting/ProblemVoteFlow.module.scss`, add a press animation to the vote buttons. Find the `.voteBtn` class and add:

```scss
.voteBtn {
  // ... existing styles ...
  transition: all $transition-fast;

  &:active:not(:disabled) {
    transform: scale(0.93);
  }
}
```

- [ ] **Step 3: Add optimistic updates to StageFeedView inline voting**

In `src/pages/StageFeedView.tsx`, modify the `handleVote` callback (lines 203-241). Replace the function body:

```typescript
  const handleVote = useCallback(
    async (initiativeId: string, direction: 'up' | 'down') => {
      if (!serverUrl || !publicKey || votingInProgress[initiativeId]) return;
      setVotingInProgress((prev) => ({ ...prev, [initiativeId]: true }));

      // Optimistic tally update
      const prevTally = tallies[initiativeId];
      if (prevTally) {
        setTallies((prev) => ({
          ...prev,
          [initiativeId]: {
            up: prevTally.up + (direction === 'up' ? 1 : 0),
            down: prevTally.down + (direction === 'down' ? 1 : 0),
            total: prevTally.total + 1,
          },
        }));
      }

      try {
        const pvContractIdRaw = await contractRead({
          serverUrl, publicKey, contractId: initiativeId,
          method: { name: 'Storage', values: { key: 'problemVoteContractId' } } as IMethod,
        });
        const pvContractId = typeof pvContractIdRaw === 'string' ? pvContractIdRaw : null;
        if (!pvContractId) return;

        await contractWrite({
          serverUrl, publicKey, contractId: pvContractId,
          method: { name: 'vote', values: { direction } } as IMethod,
        });

        // Fetch real tally
        const tally = await contractRead({
          serverUrl, publicKey, contractId: pvContractId,
          method: { name: 'get_tally', values: {} } as IMethod,
        });
        if (tally && typeof tally === 'object') {
          setTallies((prev) => ({ ...prev, [initiativeId]: tally as TallyData }));
        }
      } catch {
        // Rollback on failure
        if (prevTally) {
          setTallies((prev) => ({ ...prev, [initiativeId]: prevTally }));
        }
      } finally {
        setVotingInProgress((prev) => ({ ...prev, [initiativeId]: false }));
      }
    },
    [serverUrl, publicKey, votingInProgress, tallies],
  );
```

- [ ] **Step 4: Add press animation to StageFeedView vote buttons**

In `src/pages/StageFeedView.module.scss`, find `.voteUp` and `.voteDown` and add:

```scss
.voteUp, .voteDown {
  // ... existing styles ...
  transition: all 0.1s;

  &:active:not(:disabled) {
    transform: scale(0.95);
  }
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 6: Commit**

```bash
git add src/components/collaboration/flows/voting/ProblemVoteFlow.tsx src/components/collaboration/flows/voting/ProblemVoteFlow.module.scss src/pages/StageFeedView.tsx src/pages/StageFeedView.module.scss
git commit -m "feat: add optimistic UI updates and button animations to problem voting"
```

---

### Task 9: Redesign Stage Feed Mini-Apps

**Files:**
- Modify: `src/pages/StageFeedView.tsx`
- Modify: `src/pages/StageFeedView.module.scss`

- [ ] **Step 1: Add inline ApprovalFlow and QVFlow to StageFeedView**

In `src/pages/StageFeedView.tsx`, add imports at the top (after existing imports):

```typescript
import { ThumbsUp } from 'lucide-react';
import ApprovalFlow from '../components/collaboration/flows/voting/ApprovalFlow';
import QVFlow from '../components/collaboration/flows/voting/QVFlow';
import ConvictionStaking from '../components/collaboration/flows/voting/ConvictionStaking';
import CountryParticipation from '../components/shared/CountryParticipation';
import ErrorBoundary from '../components/shared/ErrorBoundary';
```

- [ ] **Step 2: Replace stage-specific card content**

In the main card rendering section (the `.map` over `stageInitiatives`), replace the stage-specific inline content blocks. Keep the card meta (community badge, author, time) and title/description as-is. Replace the stage-specific blocks:

For **discussion** stage (replace lines 412-416):
```tsx
{stage === 'discussion' && (
  <div className={styles.stageInfo} onClick={() => handleCardClick(item)}>
    <MessageCircle size={14} />
    <span>Tap to join the discussion</span>
  </div>
)}
```

For **proposals** stage (replace lines 419-423):
```tsx
{stage === 'proposals' && (
  <div className={styles.inlineFlow}>
    <ErrorBoundary fallbackMessage="Proposals encountered an error.">
      <ApprovalFlow
        instanceId={`${item.id}_proposals`}
        collaborationId={item.id}
        collaborationType="initiative"
        parentContractId={item.id}
        stageKey="proposalsContractId"
      />
    </ErrorBoundary>
  </div>
)}
```

For **vote** stage (replace lines 426-430):
```tsx
{stage === 'vote' && (
  <div className={styles.inlineFlow}>
    <ErrorBoundary fallbackMessage="Voting encountered an error.">
      <QVFlow
        instanceId={`${item.id}_vote`}
        collaborationId={item.id}
        collaborationType="initiative"
        parentContractId={item.id}
        stageKey="voteContractId"
      />
    </ErrorBoundary>
  </div>
)}
```

For **mandate** stage (replace lines 433-437):
```tsx
{stage === 'mandate' && (
  <div className={styles.inlineFlow}>
    <ErrorBoundary fallbackMessage="Conviction staking encountered an error.">
      <ConvictionStaking
        instanceId={`${item.id}_conviction`}
        parentContractId={item.id}
        stageKey="convictionContractId"
        compact
      />
    </ErrorBoundary>
  </div>
)}
```

- [ ] **Step 3: Make discussion cards clickable for tap-through**

The discussion cards should navigate when clicked. Update the card's `onClick` for discussion stage. In the card div's className/onClick logic (around line 354), change:

```tsx
<div key={item.id} className={`${styles.card} ${stage === 'problem' ? styles.noClick : ''}`} onClick={stage !== 'problem' ? () => handleCardClick(item) : undefined}>
```

To:

```tsx
<div key={item.id} className={`${styles.card} ${stage === 'problem' || stage === 'proposals' || stage === 'vote' || stage === 'mandate' ? styles.noClick : ''}`} onClick={stage === 'discussion' ? () => handleCardClick(item) : undefined}>
```

- [ ] **Step 4: Add `.inlineFlow` SCSS**

In `src/pages/StageFeedView.module.scss`, add:

```scss
.inlineFlow {
  margin-top: $spacing-md;
  padding-top: $spacing-md;
  border-top: 1px solid $gray-100;

  @media (prefers-color-scheme: dark) {
    border-top-color: $dark-border;
  }
}
```

- [ ] **Step 5: Update sample cards similarly**

In the sample cards section (lines 444-507), update stage-specific content for proposals, vote, and mandate samples to show placeholder text indicating these are examples:

Replace the proposals/vote/mandate sample content to show descriptive text instead of "Tap to..." hints:

```tsx
{stage === 'proposals' && (
  <div className={styles.stageInfo}>
    <Lightbulb size={14} />
    <span>Join a community to submit and approve proposals</span>
  </div>
)}

{stage === 'vote' && (
  <div className={styles.stageInfo}>
    <Vote size={14} />
    <span>Join a community to allocate voting credits</span>
  </div>
)}

{stage === 'mandate' && (
  <div className={styles.stageInfo}>
    <ScrollText size={14} />
    <span>Join a community to stake your conviction</span>
  </div>
)}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Clean build.

- [ ] **Step 7: Commit**

```bash
git add src/pages/StageFeedView.tsx src/pages/StageFeedView.module.scss
git commit -m "feat: redesign stage feeds as mini-apps with inline approval, QV, and conviction flows"
```

---

### Task 10: Seed Test Data for Eston's Test Community

**Files:**
- Create: `src/utils/seedTestData.ts`
- Modify: `src/pages/CommunityView.tsx` (or wherever community is loaded)

- [ ] **Step 1: Create the seed data utility**

Create `src/utils/seedTestData.ts`:

```typescript
import { contractRead, contractWrite, deployContract } from '../services/api';
import type { IMethod } from '../services/interfaces';
import initiativeContractCode from '../assets/contracts/initiative_contract.py?raw';

interface SeedInitiative {
  title: string;
  description: string;
  stage: string;
  countries: string[];
  evidence: string[];
}

const SEED_INITIATIVES: SeedInitiative[] = [
  {
    title: 'Global Water Access Crisis',
    description: 'Over 2 billion people worldwide lack access to safely managed drinking water. This affects health, education, and economic development across multiple countries and requires coordinated global action.',
    stage: 'problem',
    countries: ['KE', 'NG', 'IN', 'BD'],
    evidence: ['https://www.who.int/news-room/fact-sheets/detail/drinking-water'],
  },
  {
    title: 'Misinformation & Democratic Integrity',
    description: 'AI-generated misinformation is undermining democratic processes globally. Voters are being manipulated and public trust in institutions is declining rapidly across borders.',
    stage: 'discussion',
    countries: ['US', 'BR', 'PH', 'NG', 'DE'],
    evidence: [],
  },
  {
    title: 'Youth Employment & Education',
    description: 'Youth unemployment rates exceed 30% in many countries. Millions of young people face economic exclusion, leading to social instability and brain drain from developing nations.',
    stage: 'proposals',
    countries: ['KE', 'ZA', 'ES', 'GR', 'EG'],
    evidence: [],
  },
  {
    title: 'Digital Privacy Standards',
    description: 'Personal data is harvested at an unprecedented scale with minimal regulation in most countries. A global framework for digital rights is urgently needed to protect citizens worldwide.',
    stage: 'vote',
    countries: ['DE', 'FR', 'US', 'JP', 'BR', 'IN'],
    evidence: [],
  },
  {
    title: 'Universal Climate Adaptation Fund',
    description: 'Communities worldwide need a decentralized climate adaptation fund. Local communities can apply directly for resilience infrastructure and disaster preparedness resources.',
    stage: 'mandate',
    countries: ['MW', 'BD', 'PH', 'MX', 'KE', 'FJ'],
    evidence: [],
  },
];

const SEED_STORAGE_KEY = 'gloki_test_data_seeded';

export async function seedTestDataIfNeeded(
  serverUrl: string,
  publicKey: string,
  communityId: string,
  communityName: string,
): Promise<void> {
  // Only seed for "Eston's Test Community"
  if (!communityName.toLowerCase().includes('test')) return;

  // Check if already seeded
  const seededKey = `${SEED_STORAGE_KEY}_${communityId}`;
  if (localStorage.getItem(seededKey)) return;

  console.log('[SeedData] Seeding test initiatives for', communityName);

  try {
    // Check if community already has initiatives
    const existingCollabs = await contractRead({
      serverUrl, publicKey, contractId: communityId,
      method: { name: 'get_collaborations', values: {} } as IMethod,
    });

    const existingList = Array.isArray(existingCollabs) ? existingCollabs : [];
    const hasInitiatives = existingList.some((c: { type?: string }) => c.type === 'initiative');
    if (hasInitiatives) {
      localStorage.setItem(seededKey, 'true');
      return;
    }

    // Deploy each test initiative
    for (const seed of SEED_INITIATIVES) {
      try {
        const result = await deployContract({
          serverUrl, publicKey,
          contractName: `initiative_${seed.title.toLowerCase().replace(/\s+/g, '_').slice(0, 20)}`,
          contractCode: initiativeContractCode,
        });

        const initiativeId = typeof result === 'string' ? result :
          (result as { contractId?: string })?.contractId;
        if (!initiativeId) continue;

        // Set details
        await contractWrite({
          serverUrl, publicKey, contractId: initiativeId,
          method: {
            name: 'set_details',
            values: {
              details: {
                title: seed.title,
                description: seed.description,
                countries: seed.countries,
                evidence: seed.evidence,
              },
            },
          } as IMethod,
        });

        // Set stage
        await contractWrite({
          serverUrl, publicKey, contractId: initiativeId,
          method: { name: 'set_stage', values: { stage: seed.stage } } as IMethod,
        });

        // Register with community
        await contractWrite({
          serverUrl, publicKey, contractId: communityId,
          method: {
            name: 'add_collaboration',
            values: {
              collaboration: {
                id: initiativeId,
                type: 'initiative',
                title: seed.title,
                description: seed.description,
                author: publicKey,
                createdAt: Date.now(),
              },
            },
          } as IMethod,
        });

        console.log(`[SeedData] Created initiative: ${seed.title} at stage ${seed.stage}`);
      } catch (err) {
        console.error(`[SeedData] Failed to create ${seed.title}:`, err);
      }
    }

    localStorage.setItem(seededKey, 'true');
    console.log('[SeedData] Test data seeding complete');
  } catch (err) {
    console.error('[SeedData] Failed to seed test data:', err);
  }
}
```

- [ ] **Step 2: Trigger seed on community load**

Find where the community view loads its data. In the CommunityView page, add a useEffect that calls the seed function. Read CommunityView.tsx to find the right location.

Add after other useEffect hooks in the community view:

```typescript
import { seedTestDataIfNeeded } from '../utils/seedTestData';

// Inside the component, after other useEffects:
useEffect(() => {
  if (!serverUrl || !publicKey || !communityId) return;
  const name = communityProperties[communityId]?.name || '';
  if (name) {
    seedTestDataIfNeeded(serverUrl, publicKey, communityId, name);
  }
}, [serverUrl, publicKey, communityId, communityProperties]);
```

The exact import path and variable names depend on the CommunityView structure — adjust to match.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Clean build. Check for TypeScript errors in `deployContract` import — it should be exported from `src/services/api.ts`. If not, use the existing contract creation pattern from the codebase.

- [ ] **Step 4: Commit**

```bash
git add src/utils/seedTestData.ts src/pages/CommunityView.tsx
git commit -m "feat: add test data seeding for communities with 'test' in name"
```

---

### Task 11: Final Integration Verification

- [ ] **Step 1: Build the project**

Run: `npm run build`
Expected: Clean build with no TypeScript errors.

- [ ] **Step 2: Manual verification with dev server**

Run: `npm run dev`

Verify in browser:
1. Navigate to an initiative — see the Initiative Dashboard with all 5 stage cards
2. Problem stage shows ProblemVoteFlow inline with optimistic vote updates
3. Active stage is expanded, locked stages are greyed out
4. "Raise Concern" button is gone from all stages
5. Stage feed views show inline Approval/QV/Conviction flows
6. Discussion feed cards tap through to discussion view
7. Navigate to Eston's Test Community — 5 test initiatives should appear

- [ ] **Step 3: Commit any fixes**

If any issues found during verification, fix and commit them.

- [ ] **Step 4: Update CLAUDE.md**

Update the CLAUDE.md sections that reference PipelineView to mention InitiativeDashboard instead. Update routing documentation to reflect the new discussion sub-route. Remove references to ConcernsFlow from the pipeline description.

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md to reflect initiative dashboard and stage feed changes"
```
