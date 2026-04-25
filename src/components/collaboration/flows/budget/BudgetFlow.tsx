import React, { useState, useCallback, useMemo } from 'react';
import { PieChart, List, Plus } from 'lucide-react';

import type { FlowProps } from '../types';
import * as api from './budgetApi';
import { CURRENCY_SYMBOL } from '../fundraising/fundraisingApi';
import styles from './BudgetFlow.module.scss';

// ---------------------------------------------------------------------------
// Setup screen — select a fund
// ---------------------------------------------------------------------------
const SetupScreen: React.FC<{ instanceId: string; onDone: () => void }> = ({ instanceId, onDone }) => {
  const available = api.getAvailableFunds(instanceId);
  const [selectedFundId, setSelectedFundId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!selectedFundId) { setError('Please select a fund.'); return; }
    api.linkFund(instanceId, selectedFundId);
    onDone();
  };

  if (available.length === 0) {
    return (
      <div className={styles.setup}>
        <div className={styles.setupIcon}><PieChart size={40} /></div>
        <h2 className={styles.setupTitle}>Budget Allocation</h2>
        <p className={styles.noFunds}>
          No fundraising funds are available to allocate. Add and configure a <strong>Fundraising</strong> tab first.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.setup}>
      <div className={styles.setupIcon}><PieChart size={40} /></div>
      <h2 className={styles.setupTitle}>Budget Allocation</h2>
      <p className={styles.setupSubtitle}>
        Select the fund whose raised credits you want to distribute across budget items.
      </p>

      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="fund-select">Select fund *</label>
        <select
          id="fund-select"
          className={styles.select}
          value={selectedFundId}
          onChange={e => { setSelectedFundId(e.target.value); setError(''); }}
        >
          <option value="">— choose a fund —</option>
          {available.map(f => (
            <option key={f.instanceId} value={f.instanceId}>
              {f.name} ({f.totalRaised.toLocaleString()} {CURRENCY_SYMBOL} raised)
            </option>
          ))}
        </select>
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <button className={styles.btnPrimary} onClick={handleSubmit}>
        <PieChart size={16} /> Start Allocating
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// My Allocation tab
// ---------------------------------------------------------------------------
const AllocationTab: React.FC<{
  instanceId: string;
  state: ReturnType<typeof api.getState>;
  onRefresh: () => void;
}> = ({ instanceId, state, onRefresh }) => {
  const [inputText, setInputText] = useState('');
  const [error, setError]         = useState('');

  const used      = api.myPointsUsed(instanceId);
  const remaining = api.TOTAL_POINTS - used;
  const overBudget = remaining < 0;

  const handleAdd = () => {
    const name = inputText.trim();
    if (!name) return;
    api.addItem(instanceId, name);
    setInputText('');
    onRefresh();
  };

  const handlePoints = (itemId: string, val: string) => {
    const n = val === '' ? 0 : Math.max(0, Math.min(api.TOTAL_POINTS, Number(val)));
    api.setAllocation(instanceId, itemId, n);
    onRefresh();
  };

  const myAlloc = state.allocations[api.CURRENT_USER] ?? {};

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
        <button className={styles.addBtn} onClick={handleAdd}>
          <Plus size={16} /> Add
        </button>
      </div>
      {error && <p className={styles.errorMsg}>{error}</p>}

      {state.items.length === 0 ? (
        <p className={styles.noData}>No items yet. Add one above.</p>
      ) : (
        <div className={styles.itemList}>
          {state.items.map(item => {
            const pts = myAlloc[item.id] ?? 0;
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
  instanceId: string;
  fundName: string;
  totalRaised: number;
}> = ({ instanceId, fundName, totalRaised }) => {
  const aggregated = useMemo(() => api.getAggregated(instanceId), [instanceId]);

  if (aggregated.length === 0) {
    return <p className={styles.noData}>No items yet. Add some in the My Allocation tab.</p>;
  }

  return (
    <div className={styles.resultsTab}>
      <div className={styles.resultsHeader}>
        <span className={styles.fundLabel}>{fundName}</span>
        <span className={styles.fundTotal}>{totalRaised.toLocaleString()} {CURRENCY_SYMBOL} total</span>
      </div>

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
              <span className={styles.resultAmountValue}>
                {row.amount.toFixed(1)}
              </span>
              <span className={styles.resultAmountSymbol}>{CURRENCY_SYMBOL}</span>
            </div>
          </div>
        ))}
      </div>

      <p className={styles.resultsNote}>
        Percentages are normalized across all items. Amounts are calculated from the total raised.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const BudgetFlow: React.FC<FlowProps> = ({ instanceId }) => {
  const [activeTab, setActiveTab]   = useState<'allocation' | 'results'>('allocation');
  const [budgetState, setBudgetState] = useState(() => api.getState(instanceId));
  const [configured, setConfigured]  = useState(() => api.getState(instanceId).fundInstanceId !== null);

  const refresh = useCallback(() => setBudgetState(api.getState(instanceId)), [instanceId]);

  const handleSetupDone = useCallback(() => {
    setBudgetState(api.getState(instanceId));
    setConfigured(true);
  }, [instanceId]);

  if (!configured) {
    return <SetupScreen instanceId={instanceId} onDone={handleSetupDone} />;
  }

  const available = api.getAvailableFunds(instanceId);
  const fundInfo  = available.find(f => f.instanceId === budgetState.fundInstanceId)
    ?? { name: 'Fund', totalRaised: 0 };

  return (
    <div className={styles.container}>
      {/* Fund info bar */}
      <div className={styles.fundBar}>
        <PieChart size={16} className={styles.fundBarIcon} />
        <span className={styles.fundBarName}>{fundInfo.name}</span>
        <span className={styles.fundBarAmount}>
          {fundInfo.totalRaised.toLocaleString()} {CURRENCY_SYMBOL}
        </span>
      </div>

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
        <AllocationTab instanceId={instanceId} state={budgetState} onRefresh={refresh} />
      )}
      {activeTab === 'results' && (
        <ResultsTab
          instanceId={instanceId}
          fundName={fundInfo.name}
          totalRaised={fundInfo.totalRaised}
        />
      )}
    </div>
  );
};

export default BudgetFlow;
