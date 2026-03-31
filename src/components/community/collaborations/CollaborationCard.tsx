import React from 'react';
import { Zap, Heart, Shield } from 'lucide-react';
import type { Collaboration } from '../../../services/contracts/community';
import styles from '../Collaborations.module.scss';

export type CollaborationItemType = 'initiative' | 'wish' | 'agreement';

interface CollaborationCardProps {
  item: Collaboration;
  onInitiativeClick: (item: Collaboration) => void;
  onWishClick: (item: Collaboration) => void;
  onAgreementClick: (item: Collaboration) => void;
}

const getTypeIcon = (type: CollaborationItemType) => {
  switch (type) {
    case 'initiative': return <Zap size={20} />;
    case 'wish':       return <Heart size={20} />;
    case 'agreement':  return <Shield size={20} />;
  }
};

const getDisplayTitle = (item: Collaboration): string => {
  if (item.type === 'agreement') return item.rule || item.title;
  return item.title;
};

const getDisplayDescription = (item: Collaboration): string | undefined => {
  if (item.type === 'wish')      return item.dreamNeed;
  if (item.type === 'agreement') return item.protection;
  return item.description;
};

const CollaborationCard: React.FC<CollaborationCardProps> = ({ item, onInitiativeClick, onWishClick, onAgreementClick }) => {
  const isClickable = true;
  const description = getDisplayDescription(item);

  return (
    <div
      className={`${styles.card} ${isClickable ? styles.clickable : ''}`}
      onClick={
        item.type === 'initiative' ? () => onInitiativeClick(item) :
        item.type === 'wish'       ? () => onWishClick(item) :
        item.type === 'agreement'  ? () => onAgreementClick(item) :
        undefined
      }
      role="button"
    >
      <div className={styles.cardTop}>
        <div className={`${styles.typeIcon} ${styles[item.type]}`}>
          {getTypeIcon(item.type)}
        </div>
        <div className={styles.cardContent}>
          <h3 className={styles.cardTitle}>{getDisplayTitle(item)}</h3>
          {description && <p className={styles.cardDescription}>{description}</p>}
        </div>
      </div>

      {item.type === 'initiative' && item.currencyGoal !== undefined && (
        <div className={styles.progressBar}>
          <div className={styles.progressLabel}>
            <span>Gathered</span>
            <span>{item.currencyGathered ?? 0} / {item.currencyGoal} credits</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(100, ((item.currencyGathered ?? 0) / item.currencyGoal) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {item.type === 'agreement' && item.consensusStatus && (
        <div className={styles.consensusStatus}>
          Consensus: {item.consensusStatus}
        </div>
      )}
    </div>
  );
};

export default CollaborationCard;
