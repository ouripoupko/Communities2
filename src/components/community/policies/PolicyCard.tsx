import React from 'react';
import { Scale, Handshake } from 'lucide-react';
import type { Policy } from '../../../services/contracts/community';
import { describeSide, formatRate } from './policyDisplay';
import styles from '../Policies.module.scss';

interface PolicyCardProps {
  policy: Policy;
  accountLabels: Record<string, string>;
  onClick: (policy: Policy) => void;
}

const PolicyCard: React.FC<PolicyCardProps> = ({ policy, accountLabels, onClick }) => {
  const isCommitment = policy.rateType === 'self-set';
  const resolve = (id: string) => accountLabels[id] || `${id.slice(0, 8)}...`;
  const fromLabel = describeSide(policy.source, true, resolve);
  const toLabel = describeSide(policy.destination, false, resolve);

  return (
    <div className={styles.card} onClick={() => onClick(policy)} role="button">
      <div className={styles.cardTop}>
        <div className={`${styles.typeIcon} ${isCommitment ? styles.commitment : styles.policy}`}>
          {isCommitment ? <Handshake size={20} /> : <Scale size={20} />}
        </div>
        <div className={styles.cardContent}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardTitle}>{policy.name}</h3>
            <span className={`${styles.badge} ${isCommitment ? styles.commitment : styles.policy}`}>
              {isCommitment ? 'Commitment' : 'Policy'}
            </span>
          </div>
          <p className={styles.cardSummary}>
            {fromLabel} → {toLabel}
          </p>
        </div>
      </div>
      <div className={styles.cardRate}>{formatRate(policy.mode, policy.currentRate)}</div>
    </div>
  );
};

export default PolicyCard;
