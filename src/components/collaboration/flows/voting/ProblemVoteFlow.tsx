import React, { useState, useEffect, useCallback } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useFlowContract } from '../shared/useFlowContract';
import * as api from './problemVoteApi';
import { useAppSelector } from '../../../../store/hooks';
import problemVoteCode from '../../../../assets/contracts/problem_vote_contract.py?raw';
import styles from './ProblemVoteFlow.module.scss';

interface ProblemVoteFlowProps {
  instanceId: string;
  description: string;
  evidenceLinks: string[];
  countries: string[];
  communityMemberCount: number;
  parentContractId?: string;
  stageKey?: string;
}

interface Tally {
  up: number;
  down: number;
  total: number;
}

const ProblemVoteFlow: React.FC<ProblemVoteFlowProps> = ({
  instanceId,
  description,
  evidenceLinks,
  countries,
  communityMemberCount,
  parentContractId,
  stageKey,
}) => {
  const { contractId, isReady, isDeploying, hasError, retry } = useFlowContract(
    instanceId, 'problem_vote', 'problem_vote_contract.py', problemVoteCode, parentContractId, stageKey,
  );
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);

  const [tally, setTally] = useState<Tally>({ up: 0, down: 0, total: 0 });
  const [myVote, setMyVote] = useState<'up' | 'down' | null>(null);
  const [voting, setVoting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!serverUrl || !publicKey || !contractId) return;
    try {
      const [tallyRes, votesRes] = await Promise.all([
        api.getTally(serverUrl, publicKey, contractId),
        api.getVotes(serverUrl, publicKey, contractId),
      ]);
      setTally((tallyRes as Tally) || { up: 0, down: 0, total: 0 });
      const votes = (votesRes as Record<string, string>) || {};
      setMyVote(votes[publicKey] === 'up' ? 'up' : votes[publicKey] === 'down' ? 'down' : null);
    } catch (err) {
      console.error('Failed to fetch problem vote data:', err);
    }
  }, [serverUrl, publicKey, contractId]);

  useEffect(() => {
    if (isReady) fetchData();
  }, [isReady, fetchData]);

  const handleVote = async (direction: 'up' | 'down') => {
    if (!serverUrl || !publicKey || !contractId || voting) return;
    setVoting(true);
    try {
      if (myVote === direction) {
        await api.removeVote(serverUrl, publicKey, contractId);
      } else if (direction === 'up') {
        await api.upvote(serverUrl, publicKey, contractId);
      } else {
        await api.downvote(serverUrl, publicKey, contractId);
      }
      await fetchData();
    } catch (err) {
      console.error('Failed to vote:', err);
    } finally {
      setVoting(false);
    }
  };

  const upPercent = tally.total > 0 ? Math.round((tally.up / tally.total) * 100) : 0;
  const thresholdMet = communityMemberCount > 0 && tally.up / communityMemberCount >= 0.67;

  if (hasError) return (
    <div className={styles.loading}>
      <p>Failed to deploy voting contract.</p>
      <button onClick={retry} className={styles.retryBtn}>Retry</button>
    </div>
  );
  if (isDeploying) return <div className={styles.loading}>Setting up voting...</div>;
  if (!isReady) return <div className={styles.loading}>Connecting...</div>;

  return (
    <div className={styles.container}>
      {/* Problem details */}
      {description && <p className={styles.description}>{description}</p>}
      {evidenceLinks.length > 0 && (
        <div className={styles.evidence}>
          <h4>Evidence</h4>
          <ul>
            {evidenceLinks.map((link, i) => (
              <li key={i}>
                <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {countries.length > 0 && (
        <div className={styles.countries}>
          {countries.map((code) => (
            <span key={code} className={styles.chip}>{code}</span>
          ))}
        </div>
      )}

      {/* Voting */}
      <div className={styles.votingSection}>
        <h4>Does this problem truly cross borders?</h4>
        <div className={styles.voteButtons}>
          <button
            className={`${styles.voteBtn} ${styles.upBtn} ${myVote === 'up' ? styles.active : ''}`}
            onClick={() => handleVote('up')}
            disabled={voting}
          >
            <ThumbsUp size={20} />
            <span>{tally.up}</span>
          </button>
          <button
            className={`${styles.voteBtn} ${styles.downBtn} ${myVote === 'down' ? styles.active : ''}`}
            onClick={() => handleVote('down')}
            disabled={voting}
          >
            <ThumbsDown size={20} />
            <span>{tally.down}</span>
          </button>
        </div>
        {tally.total > 0 && (
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${upPercent}%` }} />
          </div>
        )}
        <p className={styles.metric}>
          {upPercent}% upvoted ({tally.up}/{tally.total} votes).
          {' '}
          <strong>67% of community ({Math.ceil(communityMemberCount * 0.67)}) must upvote to advance.</strong>
          {thresholdMet && <span className={styles.thresholdMet}> Threshold met!</span>}
        </p>
      </div>
    </div>
  );
};

export default ProblemVoteFlow;
