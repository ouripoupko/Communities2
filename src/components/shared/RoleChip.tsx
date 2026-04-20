import React from 'react';
import { Pen, Users, Award } from 'lucide-react';
import styles from './RoleChip.module.scss';

export type Role = 'author' | 'co-author' | 'expert';

interface RoleChipProps {
  role: Role;
  size?: 'sm' | 'md';
}

const ROLE_META: Record<Role, { label: string; Icon: React.ComponentType<{ size?: number }> }> = {
  'author': { label: 'Author', Icon: Pen },
  'co-author': { label: 'Co-author', Icon: Users },
  'expert': { label: 'Expert', Icon: Award },
};

const RoleChip: React.FC<RoleChipProps> = ({ role, size = 'sm' }) => {
  const { label, Icon } = ROLE_META[role];
  const sizeClass = size === 'sm' ? styles.sm : styles.md;
  const roleClass = role === 'author' ? styles.author : role === 'co-author' ? styles.coAuthor : styles.expert;
  return (
    <span className={`${styles.chip} ${roleClass} ${sizeClass}`} aria-label={label}>
      <Icon size={size === 'sm' ? 10 : 12} />
      <span>{label}</span>
    </span>
  );
};

export default RoleChip;
