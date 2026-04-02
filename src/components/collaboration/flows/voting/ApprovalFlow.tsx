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
