import React from 'react';
import type { Collaboration } from '../../../services/contracts/community';
import { kindOf } from '../../collaboration/kinds';
import styles from '../Collaborations.module.scss';

interface CollaborationCardProps {
  item: Collaboration;
  onOpen: (item: Collaboration) => void;
}

const CollaborationCard: React.FC<CollaborationCardProps> = ({ item, onOpen }) => {
  const kind = kindOf(item.type);
  const summary = kind.summary(item);

  return (
    <div className={`${styles.card} ${styles.clickable}`} onClick={() => onOpen(item)} role="button">
      <div className={styles.cardTop}>
        <div className={`${styles.typeIcon} ${styles[item.type]}`}>
          <kind.icon size={20} />
        </div>
        <div className={styles.cardContent}>
          <h3 className={styles.cardTitle}>{item.title}</h3>
          {summary && <p className={styles.cardDescription}>{summary}</p>}
        </div>
      </div>
    </div>
  );
};

export default CollaborationCard;
