import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { PieChart, List, Plus } from 'lucide-react';

import type { FlowProps } from '../types';
import * as api from './budgetApi';
import { FlowLoading, FlowError } from '../FlowShell';
import styles from './BudgetFlow.module.scss';

// ---------------------------------------------------------------------------
// My Allocation tab
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
  onReload: () => void;
}> = ({ flowServer, flowAgent, instanceId, currentUser, items, allocations, myAllocation, onMyAllocationChange, onReload }) => {
  const [inputText, setInputText] = useState('');
  const [error,     setError]     = useState('');
  const [adding,    setAdding]    = useState(false);

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
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add item.');
    } finally {
      setAdding(false);
    }
  };

  const handlePoints = async (itemId: string, val: string) => {
    const n = val === '' ? 0 : Math.max(0, Math.min(api.TOTAL_POINTS, Number(val)));
    const updated = { ...myAllocation, [itemId]: n };
    onMyAllocationChange(updated);
    try {
      await api.saveMyAllocation(flowServer, flowAgent, instanceId, updated);
    } catch {
      // Allocation save failure is non-fatal; local state already updated
    }
  };

  return (
    <div className={styles.allocationTab}>
      {/* Points counter */}
      <div className={`${styles.pointsCounter} ${overBudget ? styles.overBudget : remaining === 0 ? styles.exact : ''}`}>
        <span className={styles.pointsUsed}>{used}</span>
        <span className={styles.pointsSep}> / {api.TOTAL_POINTS} points used</span>
        {remaining > 0  && <span className={styles.pointsRemaining}>({remaining} remaining)</span>}
        {remaining === 0 && <span className={styles.pointsDone}>✓ fully allocated</span>}
        {overBudget      && <span className={styles.pointsOver}>({Math.abs(remaining)} over limit!)</span>}
      </div>

      {/* Add item */}
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
    </div>
  );
};

// ---------------------------------------------------------------------------
// Results tab
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
                <div
                  className={styles.resultBarFill}
                  style={{ width: `${row.percentage}%` }}
                />
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
const BudgetFlow: React.FC<FlowProps> = ({ instanceId, flowServer, flowAgent, currentUser }) => {
  const [budgetState,   setBudgetState]   = useState<api.BudgetState | null>(null);
  const [myAllocation,  setMyAllocation]  = useState<Record<string, number>>({});
  const [activeTab,     setActiveTab]     = useState<'allocation' | 'results'>('allocation');
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const state = await api.loadBudget(flowServer, flowAgent, instanceId);
      setBudgetState(state);
      const mine = state.allocations.find(a => a.participantId === currentUser)?.allocation ?? {};
      setMyAllocation(mine);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load budget.');
    } finally {
      setLoading(false);
    }
  }, [flowServer, flowAgent, instanceId, currentUser]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <FlowLoading />;
  if (error)   return <FlowError message={error} onRetry={load} />;
  if (!budgetState) return null;

  const { items, allocations, fundLink } = budgetState;

  // Derive allocations with local myAllocation merged in for accurate point counting
  const allocationsWithMine: api.ParticipantAllocation[] = [
    ...allocations.filter(a => a.participantId !== currentUser),
    { participantId: currentUser, allocation: myAllocation },
  ];

  return (
    <div className={styles.container}>
      {/* Fund info bar (shown only if a fund is linked) */}
      {fundLink && (
        <div className={styles.fundBar}>
          <PieChart size={16} className={styles.fundBarIcon} />
          <span className={styles.fundBarName}>Linked Fund: {fundLink.id}</span>
        </div>
      )}

      {/* Tab bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'allocation' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('allocation')}
        >
          <List size={16} /> My Allocation
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'results' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('results')}
        >
          <PieChart size={16} /> Results
        </button>
      </div>

      {activeTab === 'allocation' && (
        <AllocationTab
          flowServer={flowServer}
          flowAgent={flowAgent}
          instanceId={instanceId}
          currentUser={currentUser}
          items={items}
          allocations={allocationsWithMine}
          myAllocation={myAllocation}
          onMyAllocationChange={setMyAllocation}
          onReload={load}
        />
      )}
      {activeTab === 'results' && (
        <ResultsTab
          items={items}
          allocations={allocationsWithMine}
        />
      )}
    </div>
  );
};

export default BudgetFlow;
