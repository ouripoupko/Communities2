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
  const { contractId, isReady, isDeploying, hasError, errorMessage, statusMessage, retry } = useFlowContract(
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

  const thresholdMet = communityMemberCount > 0 && tally.up / communityMemberCount >= 0.67;

  if (hasError) return (
    <div className={styles.loading}>
      <p>{errorMessage || 'Failed to set up voting.'}</p>
      <button onClick={retry} className={styles.retryBtn}>Retry</button>
    </div>
  );
  if (isDeploying || !isReady) return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <p>{statusMessage || 'Setting up voting...'}</p>
    </div>
  );

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
            <span className={styles.voteCount}>{tally.up}</span>
          </button>
          <button
            className={`${styles.voteBtn} ${styles.downBtn} ${myVote === 'down' ? styles.active : ''}`}
            onClick={() => handleVote('down')}
            disabled={voting}
          >
            <ThumbsDown size={20} />
            <span className={styles.voteCount}>{tally.down}</span>
          </button>
        </div>

        {/* Threshold progress bar */}
        <div className={styles.thresholdSection}>
          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${thresholdMet ? styles.thresholdMet : ''}`}
              style={{ width: `${Math.min((tally.up / Math.max(Math.ceil(communityMemberCount * 0.67), 1)) * 100, 100)}%` }}
            />
            <div className={styles.thresholdMarker} style={{ left: '100%' }} />
          </div>
          <div className={styles.thresholdLabels}>
            <span>{tally.up} upvote{tally.up !== 1 ? 's' : ''}</span>
            <span className={styles.thresholdTarget}>
              {thresholdMet ? 'Threshold met!' : `${Math.max(Math.ceil(communityMemberCount * 0.67) - tally.up, 0)} more needed`}
            </span>
          </div>
        </div>

        {myVote && (
          <p className={styles.yourVote}>
            You voted: <strong>{myVote === 'up' ? 'Yes' : 'No'}</strong> (tap again to remove)
          </p>
        )}
      </div>
    </div>
  );
};

export default ProblemVoteFlow;
