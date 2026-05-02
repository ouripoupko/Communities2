import React, { useState, useCallback, useEffect } from 'react';
import { Heart, Target, Users, X } from 'lucide-react';

import type { FlowProps } from '../types';
import { useEventStream } from '../../../../hooks/useEventStream';
import * as api from './fundraisingApi';
import { FlowLoading, FlowError } from '../FlowShell';
import styles from './FundraisingFlow.module.scss';

// ---------------------------------------------------------------------------
// Setup dialog (exported for pre-create use)
// ---------------------------------------------------------------------------
export const FundraisingSetupDialog: React.FC<{
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
          <h2 className={styles.dialogTitle}>Set Up Fundraiser</h2>
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
            <Heart size={15} /> Launch Fundraiser
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
// Active fundraiser screen
// ---------------------------------------------------------------------------
const ActiveFund: React.FC<{
  flowServer: string;
  flowAgent: string;
  instanceId: string;
  currentUser: string;
  fund: api.FundState;
  communityInfo: api.CommunityInfo | null;
}> = ({ flowServer, flowAgent, instanceId, currentUser, fund, communityInfo }) => {
  const raised       = api.totalRaised(fund.contributions);
  const myContrib    = api.contributionByUser(fund.contributions, currentUser);
  const contributors = new Set(fund.contributions.map(c => c.participantId)).size;

  return (
    <div className={styles.activeFund}>
      {/* Fund name + description */}
      <div className={styles.descriptionCard}>
        <h3 className={styles.fundName}>{fund.config?.name}</h3>
        {fund.config?.description && <p className={styles.description}>{fund.config.description}</p>}
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
        {fund.config?.goal && (
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

      <ProgressBar raised={raised} goal={fund.config?.goal ?? null} />

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
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const FundraisingFlow: React.FC<FlowProps> = ({ instanceId, flowServer, flowAgent, currentUser }) => {
  const [fund,          setFund]          = useState<api.FundState | null>(null);
  const [communityInfo, setCommunityInfo] = useState<api.CommunityInfo | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [state, info] = await Promise.all([
        api.loadFund(flowServer, flowAgent, instanceId),
        api.loadCommunityInfo(flowServer, flowAgent, instanceId),
      ]);
      setFund(state);
      setCommunityInfo(info);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load fund.');
    } finally {
      setLoading(false);
    }
  }, [flowServer, flowAgent, instanceId]);

  useEffect(() => { load(); }, [load]);

  useEventStream('contract_write', useCallback((event) => {
    if (event.contract === instanceId) void load();
  }, [instanceId, load]));

  if (loading) return <FlowLoading />;
  if (error)   return <FlowError message={error} onRetry={load} />;

  if (!fund || fund.config === null) return <FlowLoading />;

  return (
    <ActiveFund
      flowServer={flowServer}
      flowAgent={flowAgent}
      instanceId={instanceId}
      currentUser={currentUser}
      fund={fund}
      communityInfo={communityInfo}
    />
  );
};

export default FundraisingFlow;
