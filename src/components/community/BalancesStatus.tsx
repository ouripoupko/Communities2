import React, { useState } from 'react';
import { updateBalances, type CurrencyState } from '../../services/contracts/community';
import styles from './BalancesStatus.module.scss';

interface BalancesStatusProps {
  communityId: string;
  currency: CurrencyState | null;
}

/**
 * When the balances were last calculated, and a button to bring them up to
 * date: policies apply once a day, and the community calculates them when
 * someone pays, changes a policy, or asks here.
 */
const BalancesStatus: React.FC<BalancesStatusProps> = ({ communityId, currency }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!currency) return null;

  // Updating may open the node's approval page, so it must start from this click.
  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      await updateBalances(communityId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update the balances.');
    } finally {
      setIsUpdating(false);
    }
  };

  // With the time zone: ticks fall at the community's creation time of day,
  // and members may live in different zones.
  const settledUntil = new Date(currency.settledUntil).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
  const pending = currency.pendingTicks;
  const steps = Math.ceil(pending / currency.maxTicksPerUpdate);
  return (
    <div className={styles.status}>
      <span>
        Balances calculated up to {settledUntil}
        {pending > 0 && (
          <>
            {' · '}
            <span className={styles.pending}>
              {pending === 1 ? '1 day' : `${pending} days`} of policies not applied yet
              {steps > 1 ? ` (${steps} updates)` : ''}
            </span>
          </>
        )}
      </span>
      {pending > 0 && (
        <button className={styles.updateButton} onClick={handleUpdate} disabled={isUpdating}>
          {isUpdating ? 'Updating…' : 'Update balances'}
        </button>
      )}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
};

export default BalancesStatus;
