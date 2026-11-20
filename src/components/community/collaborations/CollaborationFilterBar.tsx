import React from 'react';
import type { CollaborationType } from '../../../services/contracts/community';
import { COLLABORATION_KINDS } from '../../collaboration/kinds';
import styles from '../Collaborations.module.scss';

export type FilterType = 'all' | CollaborationType;

interface CollaborationFilterBarProps {
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const CollaborationFilterBar: React.FC<CollaborationFilterBarProps> = ({ filter, onFilterChange }) => (
  <div className={styles.filterBar}>
    <div className={styles.filterTabs}>
      {[{ type: 'all' as const, label: 'All' }, ...COLLABORATION_KINDS].map(({ type, label }) => (
        <button
          key={type}
          className={`${styles.filterTab} ${filter === type ? styles.active : ''}`}
          onClick={() => onFilterChange(type)}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);

export default CollaborationFilterBar;
