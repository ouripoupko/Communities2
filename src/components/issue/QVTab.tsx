import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchQVConfig, fetchMyAllocation, fetchQVResults, fetchQVAllocations } from '../../store/slices/qvSlice';
import { getQVContract, setQVContract } from '../../services/contracts/issue';
import { deployQVContract, setQVProposals, setQVStatus } from '../../services/contracts/qv';
import { eventStreamService } from '../../services/eventStream';
import QVVoting from './QVVoting';
import QVResults from './QVResults';
import styles from './QVTab.module.scss';

interface QVTabProps {
  issueId: string;
}

const QVTab: React.FC<QVTabProps> = ({ issueId }) => {
  const { issueHostServer: encodedIssueHostServer, issueHostAgent } = useParams<{ issueHostServer: string; issueHostAgent: string }>();
  const issueHostServer = encodedIssueHostServer ? decodeURIComponent(encodedIssueHostServer) : '';

  const user = useAppSelector((state) => state.user);
  const proposals = useAppSelector((state) => state.issues.issueProposals[issueId] || []);
  const dispatch = useAppDispatch();

  const [qvContractId, setQvContractId] = useState<string | null>(null);
  const [loadingQvId, setLoadingQvId] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const config = useAppSelector((state) => qvContractId ? state.qv.qvConfig[qvContractId] : null);
  const configLoading = useAppSelector((state) => qvContractId ? state.qv.loading[qvContractId] : false);
  const status = (config?.status as string) || '';
  const isAdmin = issueHostAgent === user.publicKey;

  // Load QV contract ID from issue
  useEffect(() => {
    if (!issueId || !issueHostServer || !issueHostAgent) return;
    setLoadingQvId(true);
    getQVContract(issueHostServer, issueHostAgent, issueId)
      .then((id) => {
        setQvContractId(id || null);
      })
      .catch(() => setQvContractId(null))
      .finally(() => setLoadingQvId(false));
  }, [issueId, issueHostServer, issueHostAgent]);

  // Load QV config when contract ID is known
  useEffect(() => {
    if (!qvContractId || !issueHostServer || !issueHostAgent) return;
    dispatch(fetchQVConfig({ serverUrl: issueHostServer, publicKey: issueHostAgent, contractId: qvContractId }));
    dispatch(fetchMyAllocation({ serverUrl: issueHostServer, publicKey: issueHostAgent, contractId: qvContractId }));
  }, [qvContractId, issueHostServer, issueHostAgent, dispatch]);

  // Load results and allocations when closed
  useEffect(() => {
    if (!qvContractId || !issueHostServer || !issueHostAgent || status !== 'closed') return;
    dispatch(fetchQVResults({ serverUrl: issueHostServer, publicKey: issueHostAgent, contractId: qvContractId }));
    dispatch(fetchQVAllocations({ serverUrl: issueHostServer, publicKey: issueHostAgent, contractId: qvContractId }));
  }, [qvContractId, issueHostServer, issueHostAgent, status, dispatch]);

  // SSE handler for QV contract writes
  const handleContractWrite = useCallback((event: any) => {
    if (event.contract === qvContractId && qvContractId && issueHostServer && issueHostAgent) {
      dispatch(fetchQVConfig({ serverUrl: issueHostServer, publicKey: issueHostAgent, contractId: qvContractId }));
      dispatch(fetchMyAllocation({ serverUrl: issueHostServer, publicKey: issueHostAgent, contractId: qvContractId }));
      if (status === 'closed') {
        dispatch(fetchQVResults({ serverUrl: issueHostServer, publicKey: issueHostAgent, contractId: qvContractId }));
        dispatch(fetchQVAllocations({ serverUrl: issueHostServer, publicKey: issueHostAgent, contractId: qvContractId }));
      }
    }
  }, [qvContractId, issueHostServer, issueHostAgent, status, dispatch]);

  useEffect(() => {
    eventStreamService.addEventListener('contract_write', handleContractWrite);
    return () => {
      eventStreamService.removeEventListener('contract_write', handleContractWrite);
    };
  }, [handleContractWrite]);

  const handleStartQV = async () => {
    if (!issueHostServer || !issueHostAgent || !issueId) return;
    setDeploying(true);
    try {
      const newContractId = await deployQVContract(issueHostServer, issueHostAgent, `QV-${issueId}`);
      // Link QV contract to issue
      await setQVContract(issueHostServer, issueHostAgent, issueId, newContractId);
      // Set proposals on QV contract
      const proposalIds = proposals.map((p: { id: string }) => p.id);
      await setQVProposals(issueHostServer, issueHostAgent, newContractId, proposalIds);
      // Open voting
      await setQVStatus(issueHostServer, issueHostAgent, newContractId, 'open');
      setQvContractId(newContractId);
    } catch (err) {
      console.error('Failed to start QV vote:', err);
    } finally {
      setDeploying(false);
    }
  };

  const handleCloseVoting = async () => {
    if (!qvContractId || !issueHostServer || !issueHostAgent) return;
    setChangingStatus(true);
    try {
      await setQVStatus(issueHostServer, issueHostAgent, qvContractId, 'closed');
    } catch (err) {
      console.error('Failed to close QV voting:', err);
    } finally {
      setChangingStatus(false);
    }
  };

  if (loadingQvId || configLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading QV vote...</p>
        </div>
      </div>
    );
  }

  // No QV contract yet
  if (!qvContractId) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Quadratic Voting</h2>
          <p>Allocate credits across proposals. More credits on one proposal means diminishing returns — encouraging balanced preferences.</p>
        </div>
        {isAdmin ? (
          <div className={styles.startSection}>
            <p>No quadratic vote has been started for this issue yet.</p>
            <button
              className={styles.startButton}
              onClick={handleStartQV}
              disabled={deploying || proposals.length === 0}
            >
              {deploying ? 'Starting...' : 'Start QV Vote'}
            </button>
            {proposals.length === 0 && (
              <p className={styles.hint}>Add proposals before starting a QV vote.</p>
            )}
          </div>
        ) : (
          <div className={styles.startSection}>
            <p>No quadratic vote has been started for this issue yet. The issue creator can start one.</p>
          </div>
        )}
      </div>
    );
  }

  // QV voting is open
  if (status === 'open') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Quadratic Voting</h2>
          <p>Allocate your credits across proposals. The cost of each additional vote on a proposal increases quadratically.</p>
        </div>
        <QVVoting
          qvContractId={qvContractId}
          issueId={issueId}
        />
        {isAdmin && (
          <div className={styles.adminActions}>
            <button
              className={styles.closeButton}
              onClick={handleCloseVoting}
              disabled={changingStatus}
            >
              {changingStatus ? 'Closing...' : 'Close Voting'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // QV voting is closed — show results
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Quadratic Voting Results</h2>
        <p>Voting is closed. Results are shown below.</p>
      </div>
      <QVResults
        qvContractId={qvContractId}
        issueId={issueId}
      />
    </div>
  );
};

export default QVTab;
