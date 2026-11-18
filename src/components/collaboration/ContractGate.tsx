import React, { useCallback, useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { contractAccess, joinFailure } from '../../services/ibc';
import type { JoinOutcome } from '../../services/ibc';
import AllowAccess from '../AllowAccess';
import styles from './ContractGate.module.scss';

interface ContractGateProps {
  contractId: string;
  /** What the contract is, for the user: "this collaboration", "this tab". */
  what: string;
  /** Joins the contract as a guest; undefined when the app does not know through whom. */
  join?: () => Promise<JoinOutcome>;
  /** Called once the user can use the contract. */
  onReady?: () => void;
  children: React.ReactNode;
}

/**
 * Shows its children once the user can use a contract: it offers to join
 * the contract if the user did not, and to let the app read it if the app
 * may not.
 */
const ContractGate: React.FC<ContractGateProps> = ({ contractId, what, join, onReady, children }) => {
  const [access, setAccess] = useState<'checking' | 'none' | 'joined' | 'readable'>('checking');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(() => {
    contractAccess(contractId).then(setAccess, (err) => setError(err instanceof Error ? err.message : String(err)));
  }, [contractId]);

  // A different contract is a different gate: its parent keys it by the contract.
  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    if (access === 'readable') onReady?.();
  }, [access, onReady]);

  // Joining opens the node's approval page, so it must start from this click.
  const handleJoin = async () => {
    if (!join) return;
    try {
      setIsJoining(true);
      setError(null);
      const outcome = await join();
      if (!outcome.joined) throw new Error(joinFailure(outcome));
      check();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsJoining(false);
    }
  };

  if (access === 'readable') return <>{children}</>;

  if (access === 'joined') {
    return (
      <AllowAccess
        contractId={contractId}
        title={`Allow access to ${what}`}
        description={`You have ${what} on your node, but this app may not read it yet.`}
        onAllowed={check}
      />
    );
  }

  return (
    <div className={styles.gate}>
      {access === 'checking' && !error ? (
        <Loader size={24} className={styles.spinner} />
      ) : (
        <>
          <h2>Join {what}</h2>
          {join ? (
            <>
              <p>You take part as a guest: your node uses its host&apos;s copy, and you sign what you do.</p>
              <button onClick={() => void handleJoin()} className="edit-button" disabled={isJoining}>
                {isJoining ? 'Joining… approve on your node' : 'Join'}
              </button>
            </>
          ) : (
            <p>Open it from its community&apos;s page to join it.</p>
          )}
        </>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default ContractGate;
