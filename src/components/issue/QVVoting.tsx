import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchMyAllocation } from '../../store/slices/qvSlice';
import { allocateCredits } from '../../services/contracts/qv';
import styles from './QVVoting.module.scss';

interface QVVotingProps {
  qvContractId: string;
  issueId: string;
}

const QVVoting: React.FC<QVVotingProps> = ({ qvContractId, issueId }) => {
  const { issueHostServer: encodedIssueHostServer, issueHostAgent } = useParams<{ issueHostServer: string; issueHostAgent: string }>();
  const issueHostServer = encodedIssueHostServer ? decodeURIComponent(encodedIssueHostServer) : '';

  const proposals = useAppSelector((state) => state.issues.issueProposals[issueId] || []);
  const config = useAppSelector((state) => state.qv.qvConfig[qvContractId] || {});
  const myAllocation = useAppSelector((state) => state.qv.myAllocation[qvContractId] || {});
  const dispatch = useAppDispatch();

  const totalCredits = (config.credits_per_voter as number) || 100;

  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Pre-fill from existing allocation
  useEffect(() => {
    if (Object.keys(myAllocation).length > 0) {
      setAllocations(myAllocation);
      setHasSubmitted(true);
    }
  }, [myAllocation]);

  const creditsUsed = useMemo(() => {
    return Object.values(allocations).reduce((sum, v) => sum + v, 0);
  }, [allocations]);

  const creditsRemaining = totalCredits - creditsUsed;

  const handleSliderChange = useCallback((proposalId: string, value: number) => {
    setAllocations((prev) => {
      const otherCredits = Object.entries(prev)
        .filter(([id]) => id !== proposalId)
        .reduce((sum, [, v]) => sum + v, 0);
      const maxForThis = totalCredits - otherCredits;
      const clamped = Math.min(value, maxForThis);
      return { ...prev, [proposalId]: clamped };
    });
    setHasSubmitted(false);
  }, [totalCredits]);

  const handleSubmit = async () => {
    if (!issueHostServer || !issueHostAgent) return;
    setIsSubmitting(true);
    try {
      await allocateCredits(issueHostServer, issueHostAgent, qvContractId, allocations);
      setHasSubmitted(true);
      dispatch(fetchMyAllocation({ serverUrl: issueHostServer, publicKey: issueHostAgent, contractId: qvContractId }));
    } catch (err) {
      console.error('Failed to submit QV allocation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.creditHeader}>
        <div className={styles.creditBar}>
          <div
            className={styles.creditBarFill}
            style={{ width: `${(creditsUsed / totalCredits) * 100}%` }}
          />
        </div>
        <div className={styles.creditLabel}>
          Credits: <strong>{creditsRemaining}</strong> / {totalCredits} remaining
        </div>
      </div>

      <div className={styles.costHint}>
        1 vote = 1 cr, 2 votes = 4 cr, 3 votes = 9 cr, 4 votes = 16 cr...
      </div>

      <div className={styles.proposalList}>
        {proposals.map((proposal: { id: string; title: string }) => {
          const credits = allocations[proposal.id] || 0;
          const otherCredits = Object.entries(allocations)
            .filter(([id]) => id !== proposal.id)
            .reduce((sum, [, v]) => sum + v, 0);
          const maxCredits = totalCredits - otherCredits;
          const effectiveVotes = Math.floor(Math.sqrt(credits) * 100) / 100;

          return (
            <div key={proposal.id} className={styles.proposalRow}>
              <div className={styles.proposalInfo}>
                <span className={styles.proposalTitle}>{proposal.title}</span>
                <span className={styles.voteDisplay}>
                  {effectiveVotes > 0 ? `${effectiveVotes} votes` : '0 votes'}
                </span>
              </div>
              <div className={styles.sliderRow}>
                <input
                  type="range"
                  min={0}
                  max={maxCredits}
                  value={credits}
                  onChange={(e) => handleSliderChange(proposal.id, Number(e.target.value))}
                  className={styles.slider}
                />
                <span className={styles.creditValue}>{credits} cr</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.actions}>
        <button
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={isSubmitting || hasSubmitted}
        >
          {isSubmitting ? 'Submitting...' : hasSubmitted ? 'Submitted' : 'Submit Allocation'}
        </button>
        {hasSubmitted && (
          <button
            className={styles.changeButton}
            onClick={() => setHasSubmitted(false)}
          >
            Change Allocation
          </button>
        )}
      </div>
    </div>
  );
};

export default QVVoting;
