import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Heart, Target, Users, X, List, PieChart, Plus } from 'lucide-react';

import type { FlowProps } from '../types';
import { useEventStream } from '../../../../hooks/useEventStream';
import * as api from './fundingApi';
import { FlowLoading, FlowError } from '../FlowShell';
import styles from './FundingFlow.module.scss';

// ---------------------------------------------------------------------------
// Setup dialog (exported for pre-create use)
// ---------------------------------------------------------------------------
export const FundingSetupDialog: React.FC<{
  onDone:   (config: Record<string, unknown>) => void;
  onCancel: () => void;
}> = ({ onDone, onCancel }) => {
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [goalInput,   setGoalInput]   = useState('');
  const [error,       setError]       = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { setError('Please give the fund a name.'); return; }
    const goal = goalInput.trim() ? Number(goalInput) : null;
    if (goalInput.trim() && (isNaN(goal!) || goal! <= 0)) {
      setError('Goal must be a positive number.');
      return;
    }
    onDone({ name: name.trim(), description: description.trim(), goal });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.dialogHeader}>
          <h2 className={styles.dialogTitle}>Set Up Funding</h2>
          <button className={styles.closeButton} onClick={onCancel}><X size={18} /></button>
        </div>

        <div className={styles.dialogContent}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="fund-name">Fund name *</label>
            <input
              id="fund-name"
              className={styles.input}
              type="text"
              placeholder="e.g. Community Garden Renovation"
              value={name}
              autoFocus
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel(); }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="fund-desc">
              Description <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="fund-desc"
              className={styles.textarea}
              rows={3}
              placeholder="What will the funds be used for?"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="fund-goal">
              Target goal <span className={styles.optional}>(optional, in {api.CURRENCY_SYMBOL})</span>
            </label>
            <input
              id="fund-goal"
              className={styles.input}
              type="number"
              min={1}
              placeholder="e.g. 500"
              value={goalInput}
              onChange={e => { setGoalInput(e.target.value); setError(''); }}
            />
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}
        </div>

        <div className={styles.dialogActions}>
          <button className={styles.btnSecondary} onClick={onCancel}>Cancel</button>
          <button className={styles.btnPrimary} onClick={handleSubmit}>
            <Heart size={15} /> Launch Fund
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------
const ProgressBar: React.FC<{ raised: number; goal: number | null }> = ({ raised, goal }) => {
  const pct = goal ? Math.min((raised / goal) * 100, 100) : null;
  return (
    <div className={styles.progressSection}>
      <div className={styles.progressNumbers}>
        <span className={styles.raised}>
          {raised.toLocaleString()} <span className={styles.symbol}>{api.CURRENCY_SYMBOL}</span>
        </span>
        {goal && (
          <span className={styles.goal}>
            of {goal.toLocaleString()} {api.CURRENCY_SYMBOL} goal
          </span>
        )}
      </div>
      {goal && (
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
      )}
      {goal && pct !== null && (
        <div className={styles.pct}>{pct.toFixed(0)}% reached</div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Contribution form
// ---------------------------------------------------------------------------
const ContributeForm: React.FC<{
  flowServer: string;
  flowAgent: string;
  instanceId: string;
  currentUser: string;
  communityInfo: api.CommunityInfo | null;
}> = ({ flowServer, flowAgent, instanceId, currentUser, communityInfo }) => {
  const [amountInput, setAmountInput] = useState('');
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);
  const [submitting,  setSubmitting]  = useState(false);

  const handlePay = async () => {
    const amount = Number(amountInput);
    if (!amount || amount <= 0) { setError('Amount must be positive.'); return; }
    setSubmitting(true);
    try {
      await api.contribute(flowServer, flowAgent, instanceId, currentUser, amount, communityInfo ?? undefined);
      setAmountInput('');
      setError('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to record contribution.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.contributeCard}>
      <h3 className={styles.cardTitle}>Contribute</h3>
      <div className={styles.contributeRow}>
        <input
          className={styles.input}
          type="number"
          min={1}
          step={1}
          placeholder={`Amount in ${api.CURRENCY_SYMBOL}`}
          value={amountInput}
          onChange={e => { setAmountInput(e.target.value); setError(''); setSuccess(false); }}
          onKeyDown={e => { if (e.key === 'Enter') handlePay(); }}
        />
        <button
          className={styles.btnPrimary}
          onClick={handlePay}
          disabled={submitting || !amountInput || Number(amountInput) <= 0}
        >
          <Heart size={16} /> {submitting ? 'Sending…' : 'Contribute'}
        </button>
      </div>
      {error   && <p className={styles.errorMsg}>{error}</p>}
      {success && <p className={styles.successMsg}>Thank you for your contribution!</p>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Contributions list
// ---------------------------------------------------------------------------
const ContributionsList: React.FC<{
  contributions: api.Contribution[];
  currentUser: string;
}> = ({ contributions, currentUser }) => {
  if (contributions.length === 0) {
    return <p className={styles.noData}>No contributions yet. Be the first!</p>;
  }
  const sorted = [...contributions].sort((a, b) => b.timestamp - a.timestamp);
  const fmt    = (ts: number) => new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const label  = (id: string) => (id === currentUser ? 'You' : id);

  return (
    <div className={styles.contributionsList}>
      {sorted.map(c => (
        <div key={c.id} className={styles.contributionRow}>
          <div className={styles.contributorInfo}>
            <span className={`${styles.avatar} ${c.participantId === currentUser ? styles.avatarMe : ''}`}>
              {label(c.participantId)[0].toUpperCase()}
            </span>
            <div>
              <span className={styles.contributorName}>{label(c.participantId)}</span>
              <span className={styles.contributionTime}>{fmt(c.timestamp)}</span>
            </div>
          </div>
          <span className={styles.contributionAmount}>
            +{c.amount} <span className={styles.symbol}>{api.CURRENCY_SYMBOL}</span>
          </span>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Budget — allocation tab
// ---------------------------------------------------------------------------
const AllocationTab: React.FC<{
  flowServer: string;
  flowAgent: string;
  instanceId: string;
  currentUser: string;
  items: api.BudgetItem[];
  allocations: api.ParticipantAllocation[];
  myAllocation: Record<string, number>;
  onMyAllocationChange: (updated: Record<string, number>) => void;
  onSaveAllocation: () => Promise<void>;
}> = ({ flowServer, flowAgent, instanceId, currentUser, items, allocations, myAllocation, onMyAllocationChange, onSaveAllocation }) => {
  const [inputText, setInputText] = useState('');
  const [error,     setError]     = useState('');
  const [adding,    setAdding]    = useState(false);
  const [saving,    setSaving]    = useState(false);

  const used       = api.myPointsUsed(allocations, currentUser);
  const remaining  = api.TOTAL_POINTS - used;
  const overBudget = remaining < 0;

  const handleAdd = async () => {
    const name = inputText.trim();
    if (!name) return;
    setAdding(true);
    try {
      await api.addItem(flowServer, flowAgent, instanceId, currentUser, name);
      setInputText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add item.');
    } finally {
      setAdding(false);
    }
  };

  const handlePoints = (itemId: string, val: string) => {
    const n = val === '' ? 0 : Math.max(0, Math.min(api.TOTAL_POINTS, Number(val)));
    onMyAllocationChange({ ...myAllocation, [itemId]: n });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveAllocation();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.allocationTab}>
      <div className={`${styles.pointsCounter} ${overBudget ? styles.overBudget : remaining === 0 ? styles.exact : ''}`}>
        <span className={styles.pointsUsed}>{used}</span>
        <span className={styles.pointsSep}> / {api.TOTAL_POINTS} points used</span>
        {remaining > 0   && <span className={styles.pointsRemaining}>({remaining} remaining)</span>}
        {remaining === 0 && <span className={styles.pointsDone}>✓ fully allocated</span>}
        {overBudget      && <span className={styles.pointsOver}>({Math.abs(remaining)} over limit!)</span>}
      </div>

      <div className={styles.addForm}>
        <input
          className={styles.addInput}
          type="text"
          placeholder="Add a budget item…"
          value={inputText}
          onChange={e => { setInputText(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        />
        <button className={styles.addBtn} onClick={handleAdd} disabled={adding}>
          <Plus size={16} /> {adding ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p className={styles.errorMsg}>{error}</p>}

      {items.length === 0 ? (
        <p className={styles.noData}>No items yet. Add one above.</p>
      ) : (
        <div className={styles.itemList}>
          {items.map(item => {
            const pts = myAllocation[item.id] ?? 0;
            const pct = api.TOTAL_POINTS > 0 ? (pts / api.TOTAL_POINTS) * 100 : 0;
            return (
              <div key={item.id} className={styles.itemRow}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemName}>{item.name}</span>
                  <div className={styles.itemBarTrack}>
                    <div className={styles.itemBarFill} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
                <div className={styles.pointsInput}>
                  <input
                    type="number"
                    min={0}
                    max={api.TOTAL_POINTS}
                    step={10}
                    className={styles.ptsField}
                    value={pts === 0 ? '' : pts}
                    placeholder="0"
                    onChange={e => handlePoints(item.id, e.target.value)}
                  />
                  <span className={styles.ptsLabel}>pts</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.saveRow}>
        <button className={styles.addBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Allocation'}
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Budget — results tab
// ---------------------------------------------------------------------------
const ResultsTab: React.FC<{
  items: api.BudgetItem[];
  allocations: api.ParticipantAllocation[];
}> = ({ items, allocations }) => {
  const aggregated = useMemo(() => api.getAggregated(items, allocations), [items, allocations]);

  if (aggregated.length === 0) {
    return <p className={styles.noData}>No items yet. Add some in the My Allocation tab.</p>;
  }

  return (
    <div className={styles.resultsTab}>
      <div className={styles.resultsList}>
        {aggregated.map((row, idx) => (
          <div key={row.item.id} className={styles.resultRow}>
            <span className={styles.resultRank}>#{idx + 1}</span>
            <div className={styles.resultInfo}>
              <div className={styles.resultNameRow}>
                <span className={styles.resultName}>{row.item.name}</span>
                <span className={styles.resultPct}>{row.percentage.toFixed(1)}%</span>
              </div>
              <div className={styles.resultBarTrack}>
                <div className={styles.resultBarFill} style={{ width: `${row.percentage}%` }} />
              </div>
            </div>
            <div className={styles.resultAmount}>
              <span className={styles.resultAmountValue}>{row.totalPoints}</span>
              <span className={styles.resultAmountSymbol}>pts</span>
            </div>
          </div>
        ))}
      </div>
      <p className={styles.resultsNote}>
        Percentages are normalized across all items based on total points allocated.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const FundingFlow: React.FC<FlowProps> = ({ instanceId, flowServer, flowAgent, currentUser }) => {
  const [fund,          setFund]          = useState<api.FundState | null>(null);
  const [communityInfo, setCommunityInfo] = useState<api.CommunityInfo | null>(null);
  const [budgetState,   setBudgetState]   = useState<api.BudgetState | null>(null);
  const [myAllocation,  setMyAllocation]  = useState<Record<string, number>>({});
  const [budgetTab,     setBudgetTab]     = useState<'allocation' | 'results'>('allocation');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  // Tracks whether we've seeded myAllocation from the server for this instance.
  // SSE reloads must NOT overwrite in-progress local edits.
  const myAllocationInitialized = useRef(false);
  useEffect(() => { myAllocationInitialized.current = false; }, [instanceId]);

  // Always-current ref so handleSaveAllocation never needs myAllocation as a dep.
  const myAllocationRef = useRef(myAllocation);
  myAllocationRef.current = myAllocation;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fundState, info, budget] = await Promise.all([
        api.loadFund(flowServer, flowAgent, instanceId),
        api.loadCommunityInfo(flowServer, flowAgent, instanceId),
        api.loadBudget(flowServer, flowAgent, instanceId),
      ]);
      setFund(fundState);
      setCommunityInfo(info);
      setBudgetState(budget);
      if (!myAllocationInitialized.current) {
        const mine = budget.allocations.find(a => a.participantId === currentUser)?.allocation ?? {};
        setMyAllocation(mine);
        myAllocationInitialized.current = true;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load funding data.');
    } finally {
      setLoading(false);
    }
  }, [flowServer, flowAgent, instanceId, currentUser]);

  useEffect(() => { load(); }, [load]);

  useEventStream('contract_write', useCallback((event) => {
    if (event.contract === instanceId) void load();
  }, [instanceId, load]));

  const handleSaveAllocation = useCallback(async () => {
    await api.saveMyAllocation(flowServer, flowAgent, instanceId, myAllocationRef.current);
  }, [flowServer, flowAgent, instanceId]);

  if (loading) return <FlowLoading />;
  if (error)   return <FlowError message={error} onRetry={load} />;
  if (!fund || fund.config === null || !budgetState) return <FlowLoading />;

  const raised      = api.totalRaised(fund.contributions);
  const myContrib   = api.contributionByUser(fund.contributions, currentUser);
  const contributors = new Set(fund.contributions.map(c => c.participantId)).size;

  const allocationsWithMine: api.ParticipantAllocation[] = [
    ...budgetState.allocations.filter(a => a.participantId !== currentUser),
    { participantId: currentUser, allocation: myAllocation },
  ];

  return (
    <div className={styles.activeFund}>
      {/* Fund header */}
      <div className={styles.descriptionCard}>
        <h3 className={styles.fundName}>{fund.config.name}</h3>
        {fund.config.description && <p className={styles.description}>{fund.config.description}</p>}
      </div>

      {/* Stats row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <Heart size={20} className={styles.statIcon} />
          <span className={styles.statValue}>{raised.toLocaleString()}</span>
          <span className={styles.statLabel}>Total raised ({api.CURRENCY_SYMBOL})</span>
        </div>
        <div className={styles.statCard}>
          <Users size={20} className={styles.statIcon} />
          <span className={styles.statValue}>{contributors}</span>
          <span className={styles.statLabel}>Contributors</span>
        </div>
        {fund.config.goal && (
          <div className={styles.statCard}>
            <Target size={20} className={styles.statIcon} />
            <span className={styles.statValue}>{fund.config.goal.toLocaleString()}</span>
            <span className={styles.statLabel}>Goal ({api.CURRENCY_SYMBOL})</span>
          </div>
        )}
        {myContrib > 0 && (
          <div className={`${styles.statCard} ${styles.statCardMe}`}>
            <Heart size={20} className={styles.statIcon} />
            <span className={styles.statValue}>{myContrib.toLocaleString()}</span>
            <span className={styles.statLabel}>Your contribution</span>
          </div>
        )}
      </div>

      <ProgressBar raised={raised} goal={fund.config.goal ?? null} />

      <ContributeForm
        flowServer={flowServer}
        flowAgent={flowAgent}
        instanceId={instanceId}
        currentUser={currentUser}
        communityInfo={communityInfo}
      />

      <div className={styles.historySection}>
        <h3 className={styles.cardTitle}>Contributions</h3>
        <ContributionsList contributions={fund.contributions} currentUser={currentUser} />
      </div>

      {/* Budget allocation section */}
      <div className={styles.sectionDivider}>
        <div className={styles.sectionDividerLine} />
        <span className={styles.sectionDividerLabel}>Budget Allocation</span>
        <div className={styles.sectionDividerLine} />
      </div>

      <div className={styles.budgetSection}>
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${budgetTab === 'allocation' ? styles.activeTab : ''}`}
            onClick={() => setBudgetTab('allocation')}
          >
            <List size={16} /> My Allocation
          </button>
          <button
            className={`${styles.tab} ${budgetTab === 'results' ? styles.activeTab : ''}`}
            onClick={() => setBudgetTab('results')}
          >
            <PieChart size={16} /> Results
          </button>
        </div>

        {budgetTab === 'allocation' && (
          <AllocationTab
            flowServer={flowServer}
            flowAgent={flowAgent}
            instanceId={instanceId}
            currentUser={currentUser}
            items={budgetState.items}
            allocations={allocationsWithMine}
            myAllocation={myAllocation}
            onMyAllocationChange={setMyAllocation}
            onSaveAllocation={handleSaveAllocation}
          />
        )}
        {budgetTab === 'results' && (
          <ResultsTab
            items={budgetState.items}
            allocations={allocationsWithMine}
          />
        )}
      </div>
    </div>
  );
};

export default FundingFlow;
