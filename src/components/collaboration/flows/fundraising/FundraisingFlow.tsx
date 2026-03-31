import React, { useState, useCallback } from 'react';
import { Heart, Target, Users } from 'lucide-react';

import type { FlowProps } from '../types';
import * as api from './fundraisingApi';
import styles from './FundraisingFlow.module.scss';

// ---------------------------------------------------------------------------
// Setup screen
// ---------------------------------------------------------------------------
const SetupScreen: React.FC<{ instanceId: string; onDone: () => void }> = ({ instanceId, onDone }) => {
  const [name,      setName]      = useState('');
  const [description, setDescription] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [error,     setError]     = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { setError('Please give the fund a name.'); return; }
    const goal = goalInput.trim() ? Number(goalInput) : null;
    if (goalInput.trim() && (isNaN(goal!) || goal! <= 0)) {
      setError('Goal must be a positive number.');
      return;
    }
    api.configureFund(instanceId, name, description, goal);
    onDone();
  };

  return (
    <div className={styles.setup}>
      <div className={styles.setupIcon}><Heart size={40} /></div>
      <h2 className={styles.setupTitle}>Set Up the Fund</h2>
      <p className={styles.setupSubtitle}>
        Name this fundraiser so participants and budget allocations can identify it.
      </p>

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
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
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

      <button className={styles.btnPrimary} onClick={handleSubmit}>
        Launch Fundraiser
      </button>
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
const ContributeForm: React.FC<{ instanceId: string; onContributed: () => void }> = ({ instanceId, onContributed }) => {
  const balance = api.getBalance(api.CURRENT_USER);
  const [amountInput, setAmountInput] = useState('');
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);

  const handlePay = () => {
    const amount = Number(amountInput);
    const result = api.contribute(instanceId, amount);
    if (!result.ok) { setError(result.reason); return; }
    setAmountInput('');
    setError('');
    setSuccess(true);
    onContributed();
    setTimeout(() => setSuccess(false), 2500);
  };

  return (
    <div className={styles.contributeCard}>
      <h3 className={styles.cardTitle}>Contribute</h3>
      <p className={styles.balanceHint}>
        Your balance: <strong>{balance} {api.CURRENCY_SYMBOL}</strong>
      </p>
      <div className={styles.contributeRow}>
        <input
          className={styles.input}
          type="number"
          min={1}
          max={balance}
          step={1}
          placeholder={`Amount in ${api.CURRENCY_SYMBOL}`}
          value={amountInput}
          onChange={e => { setAmountInput(e.target.value); setError(''); setSuccess(false); }}
          onKeyDown={e => { if (e.key === 'Enter') handlePay(); }}
        />
        <button
          className={styles.btnPrimary}
          onClick={handlePay}
          disabled={!amountInput || Number(amountInput) <= 0}
        >
          <Heart size={16} /> Contribute
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
const ContributionsList: React.FC<{ contributions: api.Contribution[] }> = ({ contributions }) => {
  if (contributions.length === 0) {
    return <p className={styles.noData}>No contributions yet. Be the first!</p>;
  }
  const sorted = [...contributions].sort((a, b) => b.timestamp - a.timestamp);
  const fmt    = (ts: number) => new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const label  = (id: string) => (id === api.CURRENT_USER ? 'You' : id);

  return (
    <div className={styles.contributionsList}>
      {sorted.map(c => (
        <div key={c.id} className={styles.contributionRow}>
          <div className={styles.contributorInfo}>
            <span className={`${styles.avatar} ${c.participantId === api.CURRENT_USER ? styles.avatarMe : ''}`}>
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
// Active fundraiser screen
// ---------------------------------------------------------------------------
const ActiveFund: React.FC<{ instanceId: string }> = ({ instanceId }) => {
  const [fundState, setFundState] = useState(() => api.getFund(instanceId));

  const refresh     = useCallback(() => setFundState(api.getFund(instanceId)), [instanceId]);
  const raised      = api.totalRaised(instanceId);
  const myContrib   = api.contributionByUser(instanceId, api.CURRENT_USER);
  const contributors = new Set(fundState.contributions.map(c => c.participantId)).size;

  return (
    <div className={styles.activeFund}>
      {/* Fund name + description */}
      <div className={styles.descriptionCard}>
        <h3 className={styles.fundName}>{fundState.name}</h3>
        {fundState.description && <p className={styles.description}>{fundState.description}</p>}
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
        {fundState.goal && (
          <div className={styles.statCard}>
            <Target size={20} className={styles.statIcon} />
            <span className={styles.statValue}>{fundState.goal.toLocaleString()}</span>
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

      <ProgressBar raised={raised} goal={fundState.goal} />

      <ContributeForm instanceId={instanceId} onContributed={refresh} />

      <div className={styles.historySection}>
        <h3 className={styles.cardTitle}>Contributions</h3>
        <ContributionsList contributions={fundState.contributions} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const FundraisingFlow: React.FC<FlowProps> = ({ instanceId }) => {
  const [configured, setConfigured] = useState(() => api.getFund(instanceId).name !== null);

  if (!configured) {
    return <SetupScreen instanceId={instanceId} onDone={() => setConfigured(true)} />;
  }
  return <ActiveFund instanceId={instanceId} />;
};

export default FundraisingFlow;
