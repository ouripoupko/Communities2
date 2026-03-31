import React, { useState, useCallback, useMemo } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Plus } from 'lucide-react';

import type { FlowProps } from '../types';
import * as api from './concernsApi';
import type { Concern, ConcernVote, ConcernStatus } from './concernsApi';
import styles from './ConcernsFlow.module.scss';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const VOTE_LABELS: Record<ConcernVote, string> = {
  support:  'Support',
  reject:   'Reject',
  resolved: 'Resolved',
};

/** Red RGBA string whose alpha scales with the support weight (0.12 → 0.85) */
function redIntensity(weight: number): string {
  const alpha = 0.12 + weight * 0.73; // 0.12 at 0%, 0.85 at 100%
  return `rgba(220, 38, 38, ${alpha.toFixed(2)})`;
}

// ---------------------------------------------------------------------------
// Add concern form
// ---------------------------------------------------------------------------
const AddConcernForm: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const [open,  setOpen]  = useState(false);
  const [title, setTitle] = useState('');
  const [desc,  setDesc]  = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    api.addConcern(title, desc);
    setTitle(''); setDesc(''); setError(''); setOpen(false);
    onAdd();
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
      <input
        className={styles.addTitleInput}
        type="text"
        placeholder="Concern title *"
        value={title}
        autoFocus
        onChange={e => { setTitle(e.target.value); setError(''); }}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false); }}
      />
      <textarea
        className={styles.addDescInput}
        rows={2}
        placeholder="Description (optional)"
        value={desc}
        onChange={e => setDesc(e.target.value)}
      />
      {error && <p className={styles.errorMsg}>{error}</p>}
      <div className={styles.addFormActions}>
        <button className={styles.btnConfirm} onClick={submit}>Submit</button>
        <button className={styles.btnCancel} onClick={() => { setOpen(false); setError(''); }}>Cancel</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Concern card
// ---------------------------------------------------------------------------
const ConcernCard: React.FC<{
  concern: Concern;
  status: ConcernStatus;
  onRefresh: () => void;
}> = ({ concern, status, onRefresh }) => {
  const counts = api.voteCounts(concern);
  const weight = api.supportWeight(concern);
  const myVote = concern.votes[api.CURRENT_USER] as ConcernVote | undefined;

  const handleVote = (v: ConcernVote) => {
    if (myVote === v) api.clearVote(concern.id);
    else              api.vote(concern.id, v);
    onRefresh();
  };

  const borderColor = status === 'active' ? redIntensity(weight) : undefined;

  return (
    <div
      className={`${styles.card} ${styles[`card_${status}`]}`}
      style={status === 'active' ? { borderLeftColor: borderColor } : undefined}
    >
      {/* Weight badge (active only) */}
      {status === 'active' && (
        <div
          className={styles.weightBadge}
          style={{ background: redIntensity(weight) }}
          title={`${Math.round(weight * 100)}% support`}
        >
          {counts.support}
        </div>
      )}

      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>{concern.title}</span>
          <span className={styles.cardCreator}>
            by {concern.createdBy === api.CURRENT_USER ? 'you' : concern.createdBy}
          </span>
        </div>

        {concern.description && (
          <p className={styles.cardDesc}>{concern.description}</p>
        )}

        {/* Vote counts */}
        <div className={styles.voteCounts}>
          <span className={styles.countSupport}>{counts.support} support</span>
          <span className={styles.countReject}>{counts.reject} reject</span>
          <span className={styles.countResolved}>{counts.resolved} resolved</span>
        </div>

        {/* Vote buttons */}
        {status === 'active' && (
          <div className={styles.voteButtons}>
            {(['support', 'reject', 'resolved'] as ConcernVote[]).map(v => (
              <button
                key={v}
                className={`${styles.voteBtn} ${styles[`voteBtn_${v}`]} ${myVote === v ? styles.voteBtnActive : ''}`}
                onClick={() => handleVote(v)}
                title={myVote === v ? 'Click to remove your vote' : VOTE_LABELS[v]}
              >
                {VOTE_LABELS[v]}{myVote === v ? ' ✓' : ''}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Collapsible section (for Resolved / Rejected)
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
        onClick={() => setOpen(v => !v)}
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
const ConcernsFlow: React.FC<FlowProps> = () => {
  const [concerns, setConcerns] = useState<Concern[]>(() => api.getConcerns());

  const refresh = useCallback(() => setConcerns(api.getConcerns()), []);

  const { active, resolved, rejected } = useMemo(() => {
    const active:   Concern[] = [];
    const resolved: Concern[] = [];
    const rejected: Concern[] = [];

    for (const c of concerns) {
      const s = api.concernStatus(c);
      if      (s === 'active')   active.push(c);
      else if (s === 'resolved') resolved.push(c);
      else                       rejected.push(c);
    }

    // Sort active by support weight desc, then by createdAt desc
    active.sort((a, b) => api.supportWeight(b) - api.supportWeight(a) || b.createdAt - a.createdAt);

    return { active, resolved, rejected };
  }, [concerns]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <AlertTriangle size={18} className={styles.headerIcon} />
        <span>{active.length} active concern{active.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Add form */}
      <AddConcernForm onAdd={refresh} />

      {/* Active concerns */}
      {active.length === 0 ? (
        <p className={styles.noData}>No active concerns. The floor is open — raise one above.</p>
      ) : (
        <div className={styles.concernList}>
          {active.map(c => (
            <ConcernCard key={c.id} concern={c} status="active" onRefresh={refresh} />
          ))}
        </div>
      )}

      {/* Resolved + Rejected (collapsible) */}
      <CollapsibleSection label="Resolved" count={resolved.length} colorClass={styles.toggleResolved}>
        <div className={styles.concernList}>
          {resolved.map(c => (
            <ConcernCard key={c.id} concern={c} status="resolved" onRefresh={refresh} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection label="Rejected" count={rejected.length} colorClass={styles.toggleRejected}>
        <div className={styles.concernList}>
          {rejected.map(c => (
            <ConcernCard key={c.id} concern={c} status="rejected" onRefresh={refresh} />
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default ConcernsFlow;
