import React from 'react';
import type { CollaborationItemType } from './CollaborationCard';
import styles from '../Collaborations.module.scss';

export type FilterType = 'all' | CollaborationItemType;
export type SortType = 'newest' | 'mostActive';

interface CollaborationFilterBarProps {
  filter: FilterType;
  sort: SortType;
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
}

const CollaborationFilterBar: React.FC<CollaborationFilterBarProps> = ({ filter, sort, onFilterChange, onSortChange }) => (
  <div className={styles.filterBar}>
    <div className={styles.filterTabs}>
      {(['all', 'initiative', 'wish', 'agreement'] as const).map((f) => (
        <button
          key={f}
          className={`${styles.filterTab} ${filter === f ? styles.active : ''}`}
          onClick={() => onFilterChange(f)}
        >
          {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
        </button>
      ))}
    </div>
    <select
      className={styles.sortSelect}
      value={sort}
      onChange={(e) => onSortChange(e.target.value as SortType)}
    >
      <option value="newest">Newest</option>
      <option value="mostActive">Most Active</option>
    </select>
  </div>
);

export default CollaborationFilterBar;
