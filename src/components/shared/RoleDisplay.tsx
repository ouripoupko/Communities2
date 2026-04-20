import React from 'react';
import { useAppSelector } from '../../store/hooks';
import type { InitiativeRoles } from '../../services/initiativeRoles';
import RoleChip from './RoleChip';
import styles from './RoleDisplay.module.scss';

interface RoleDisplayProps {
  roles: InitiativeRoles;
  maxCoAuthors?: number;
  maxExperts?: number;
}

function initials(firstName?: string, lastName?: string, key?: string): string {
  const fn = (firstName || '').trim();
  const ln = (lastName || '').trim();
  if (fn || ln) return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() || fn.charAt(0).toUpperCase();
  return (key || '?').slice(0, 2).toUpperCase();
}

const RoleDisplay: React.FC<RoleDisplayProps> = ({ roles, maxCoAuthors = 3, maxExperts = 3 }) => {
  const profiles = useAppSelector((s) => s.communities.profiles);

  const renderAvatar = (key: string, title: string) => {
    const p = profiles[key];
    const init = initials(p?.firstName, p?.lastName, key);
    const photo = p?.userPhoto;
    return (
      <div key={key} className={styles.avatar} title={title}>
        {photo ? <img src={photo} alt={title} /> : <span>{init}</span>}
      </div>
    );
  };

  const extraCoAuthors = Math.max(0, roles.coAuthors.length - maxCoAuthors);
  const extraExperts = Math.max(0, roles.experts.length - maxExperts);

  return (
    <div className={styles.strip}>
      <div className={styles.group}>
        <RoleChip role="author" />
        {roles.author && renderAvatar(roles.author, 'Author')}
      </div>
      {roles.coAuthors.length > 0 && (
        <div className={styles.group}>
          <RoleChip role="co-author" />
          {roles.coAuthors.slice(0, maxCoAuthors).map((k) => renderAvatar(k, 'Co-author'))}
          {extraCoAuthors > 0 && <span className={styles.more}>+{extraCoAuthors}</span>}
        </div>
      )}
      {roles.experts.length > 0 && (
        <div className={styles.group}>
          <RoleChip role="expert" />
          {roles.experts.slice(0, maxExperts).map((k) => {
            const count = roles.endorsementCounts[k] ?? 0;
            return (
              <div key={k} className={styles.expertAvatar} title={`Expert · ${count} endorsements`}>
                {renderAvatar(k, 'Expert')}
                <span className={styles.endorseBadge}>{count}</span>
              </div>
            );
          })}
          {extraExperts > 0 && <span className={styles.more}>+{extraExperts}</span>}
        </div>
      )}
    </div>
  );
};

export default RoleDisplay;
