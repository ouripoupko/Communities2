import React, { useState } from 'react';
import { allowAccess } from '../services/ibc';
import styles from './AllowAccess.module.scss';

interface AllowAccessProps {
  contractId: string;
  title: string;
  description: string;
  /** Called once the user allowed access, to read again. */
  onAllowed: () => void;
}

/**
 * Shown where the app may not read a contract the user has: the button asks
 * the user, on their node, to let the app read it (and, if they choose, call
 * some of its functions) without asking again.
 */
const AllowAccess: React.FC<AllowAccessProps> = ({ contractId, title, description, onAllowed }) => {
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Opens the node's approval page, so it must start from this click.
  const handleAllow = async () => {
    try {
      setIsAsking(true);
      setError(null);
      await allowAccess(contractId);
      onAllowed();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className={styles.panel}>
      <h2>{title}</h2>
      <p>{description}</p>
      <button onClick={handleAllow} className="edit-button" disabled={isAsking}>
        {isAsking ? 'Approve on your node…' : 'Allow Access'}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default AllowAccess;
