import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { FlowProps } from '../types';
import { useFlowContract } from '../shared/useFlowContract';
import CountryBadge from '../shared/CountryBadge';
import * as api from './qvApi';
import { useAppSelector } from '../../../../store/hooks';
import { getCountryColor, getCountryName } from '../../../../utils/countries';
import qvContractCode from '../../../../assets/contracts/qv_contract.py?raw';
import styles from './QVFlow.module.scss';

interface Proposal { id: string; text: string; author: string; timestamp: string; }
interface Config { credits_per_voter: number; status: string; }

const QVFlow: React.FC<FlowProps> = ({ instanceId, parentContractId, stageKey }) => {
  const { contractId, isReady, isDeploying, hasError, errorMessage, statusMessage, retry } = useFlowContract(instanceId, 'quadratic_vote', 'qv_contract.py', qvContractCode, parentContractId, stageKey);
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const profiles = useAppSelector((s) => s.communities.profiles);

  const [activeTab, setActiveTab] = useState<'proposals' | 'allocate' | 'results'>('proposals');
  const [showHelp, setShowHelp] = useState(false);
  const [proposals, setProposals] = useState<Record<string, Proposal>>({});
  const [config, setConfig] = useState<Config>({ credits_per_voter: 100, status: 'open' });
  const draftInitialized = useRef(false);
  const [allAllocations, setAllAllocations] = useState<Record<string, Record<string, number>>>({});
  const [results, setResults] = useState<Record<string, number>>({});
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    if (!serverUrl || !publicKey || !contractId) return;
    setLoading(true);
    try {
      const showDetailedResults = activeTab === 'results';
      const [p, c, ma, aa, r] = await Promise.all([
        api.getProposals(serverUrl, publicKey, contractId),
        api.getConfig(serverUrl, publicKey, contractId),
        api.getMyAllocation(serverUrl, publicKey, contractId),
        showDetailedResults
          ? api.getAllocations(serverUrl, publicKey, contractId)
          : Promise.resolve(null),
        showDetailedResults
          ? api.getResults(serverUrl, publicKey, contractId)
          : Promise.resolve(null),
      ]);
      setProposals((p as Record<string, Proposal>) || {});
      setConfig((c as Config) || { credits_per_voter: 100, status: 'open' });
      const myAlloc = (ma as Record<string, number>) || {};
      if (!draftInitialized.current) {
        setDraft(myAlloc);
        draftInitialized.current = true;
      }
      setAllAllocations(showDetailedResults ? ((aa as Record<string, Record<string, number>>) || {}) : {});
      setResults(showDetailedResults ? ((r as Record<string, number>) || {}) : {});
    } catch (err) { console.error('Failed to fetch QV data:', err); }
    finally { setLoading(false); }
  }, [activeTab, serverUrl, publicKey, contractId]);

  useEffect(() => { if (isReady) fetchData(); }, [isReady, fetchData]);

  const handleAddProposal = async () => {
    const trimmed = newText.trim();
    if (!serverUrl || !publicKey || !contractId || !trimmed || trimmed.length > 500) return;
    setSubmitting(true);
    try {
      await api.addProposal(serverUrl, publicKey, contractId, trimmed);
      setNewText('');
      await fetchData();
    } catch (err) { console.error('Failed to add proposal:', err); }
    finally { setSubmitting(false); }
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
      const prevTotal = Object.values(prev).reduce((sum, c) => sum + c, 0);
      const otherTotal = prevTotal - current;
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
    } catch (err) { console.error('Failed to submit allocation:', err); }
    finally { setSubmitting(false); }
  };

  if (hasError) return (
    <div className={styles.loading}>
      <p>{errorMessage || 'Failed to set up voting.'}</p>
      <button onClick={retry} style={{ marginTop: 8, padding: '6px 16px', cursor: 'pointer' }}>Retry</button>
    </div>
  );
  if (isDeploying || !isReady) return (
    <div className={styles.loading}>{statusMessage || 'Setting up voting...'}</div>
  );
  if (loading && Object.keys(proposals).length === 0) return <div className={styles.loading}>Loading...</div>;

  const proposalList = Object.values(proposals).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const getCountryQVBreakdown = (proposalId: string): Record<string, number> => {
    const breakdown: Record<string, number> = {};
    for (const [voter, voterAlloc] of Object.entries(allAllocations)) {
      const credits = voterAlloc[proposalId];
      if (!credits) continue;
      const profile = profiles[voter];
      const country = profile?.country || 'OTHER';
      breakdown[country] = (breakdown[country] || 0) + Math.sqrt(credits);
    }
    return breakdown;
  };

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {(['proposals', 'allocate', 'results'] as const).map((t) => (
          <button key={t} className={`${styles.tab} ${activeTab === t ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t)}>
            {t === 'proposals' ? 'Proposals' : t === 'allocate' ? 'Vote' : 'Results'}
          </button>
        ))}
      </div>

      <div className={styles.helpSection}>
        <button className={styles.helpToggle} onClick={() => setShowHelp(v => !v)}>
          {showHelp ? 'Hide explanation' : 'How does weighted voting work?'}
        </button>
        {showHelp && (
          <div className={styles.helpBox}>
            <p><strong>Weighted voting</strong> lets you spread your influence across multiple proposals instead of picking just one.</p>
            <p>You get <strong>{config.credits_per_voter} credits</strong> to distribute. The more credits you put on one proposal, the stronger your support — but with diminishing returns. Putting 4 credits on a proposal gives ~2 votes; 9 credits gives ~3 votes. This encourages spreading support rather than going all-in on one option.</p>
          </div>
        )}
      </div>

      {activeTab === 'proposals' && (
        <>
          <div className={styles.addForm}>
            <input className={styles.addInput} type="text" placeholder="Add a proposal..."
              value={newText} onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddProposal(); }}
              maxLength={500}
              disabled={submitting} />
            <button className={styles.addBtn} onClick={handleAddProposal}
              disabled={submitting || !newText.trim()}>
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

      {activeTab === 'allocate' && (
        <>
          <div className={styles.budget}>
            <span className={styles.budgetLabel}>Your Voting Budget:</span>
            <span className={styles.budgetRemaining}>{remaining}</span>
            <span>/ {config.credits_per_voter} remaining</span>
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
                        <button className={styles.stepperBtn} onClick={() => adjustCredit(p.id, -1)} disabled={credits === 0}>-</button>
                        <span className={styles.creditDisplay}>{credits}</span>
                        <button className={styles.stepperBtn} onClick={() => adjustCredit(p.id, 1)} disabled={remaining <= 0}>+</button>
                        <span className={styles.voteDisplay}>{votes.toFixed(1)} influence</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={styles.submitRow}>
                <button className={styles.submitBtn} onClick={handleSubmitAllocation} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Allocation'}
                </button>
              </div>
            </>
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
                .sort((a, b) => (results[b.id] || 0) - (results[a.id] || 0))
                .map((p) => {
                  const totalVotes = results[p.id] || 0;
                  const breakdown = getCountryQVBreakdown(p.id);
                  const maxVotes = Math.max(...Object.values(results), 1);
                  return (
                    <div key={p.id} className={styles.resultRow}>
                      <div className={styles.resultLabel}>{p.text}</div>
                      <div className={styles.resultBar}>
                        {Object.entries(breakdown).map(([country, votes]) => (
                          <div key={country} className={styles.resultSegment}
                            style={{ width: `${(votes / maxVotes) * 100}%`, backgroundColor: getCountryColor(country) }}
                            title={`${getCountryName(country)}: ${votes.toFixed(1)} votes`} />
                        ))}
                      </div>
                      <div className={styles.resultCount}>{totalVotes.toFixed(1)} weighted votes</div>
                    </div>
                  );
                })}
              <div className={styles.participation}>
                {Object.keys(allAllocations).length} voter{Object.keys(allAllocations).length !== 1 ? 's' : ''} participated
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QVFlow;
