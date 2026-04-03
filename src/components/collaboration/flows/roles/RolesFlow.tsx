import React, { useState, useCallback } from 'react';
import { Award, Plus, Trash2, UserPlus, UserMinus } from 'lucide-react';

import type { FlowProps } from '../types';
import * as api from './rolesApi';
import type { Role } from './rolesApi';
import styles from './RolesFlow.module.scss';

// ---------------------------------------------------------------------------
// Add-role form
// ---------------------------------------------------------------------------
const AddRoleForm: React.FC<{
  onSubmit: (name: string, description: string) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [name, setName]   = useState('');
  const [desc, setDesc]   = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim()) { setError('Role name is required.'); return; }
    onSubmit(name, desc);
  };

  return (
    <div className={styles.addForm}>
      <input
        className={styles.nameInput}
        type="text"
        placeholder="Role name…"
        value={name}
        autoFocus
        onChange={e => { setName(e.target.value); setError(''); }}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
      />
      <input
        className={styles.descInput}
        type="text"
        placeholder="Short description (optional)"
        value={desc}
        onChange={e => setDesc(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
      />
      {error && <p className={styles.errorMsg}>{error}</p>}
      <div className={styles.formActions}>
        <button className={styles.btnConfirm} onClick={submit}>Add Role</button>
        <button className={styles.btnCancel}  onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Role card
// ---------------------------------------------------------------------------
const RoleCard: React.FC<{
  role: Role;
  instanceId: string;
  onRefresh: () => void;
}> = ({ role, instanceId, onRefresh }) => {
  const assigned = api.isAssigned(role);
  const act = (fn: () => void) => { fn(); onRefresh(); };

  return (
    <div className={`${styles.card} ${assigned ? styles.cardAssigned : ''}`}>
      <div className={styles.cardHeader}>
        <span className={styles.roleName}>{role.name}</span>
        <div className={styles.cardActions}>
          {assigned ? (
            <button
              className={`${styles.assignBtn} ${styles.assignBtnLeave}`}
              onClick={() => act(() => api.leaveRole(instanceId, role.id))}
              title="Leave this role"
            >
              <UserMinus size={13} /> Leave
            </button>
          ) : (
            <button
              className={`${styles.assignBtn} ${styles.assignBtnJoin}`}
              onClick={() => act(() => api.joinRole(instanceId, role.id))}
              title="Join this role"
            >
              <UserPlus size={13} /> Join
            </button>
          )}
          {api.canDelete(role) && (
            <button
              className={styles.deleteBtn}
              onClick={() => act(() => api.deleteRole(instanceId, role.id))}
              title="Delete role"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {role.description && (
        <p className={styles.roleDesc}>{role.description}</p>
      )}

      <div className={styles.assignees}>
        {role.assignees.length === 0 ? (
          <span className={styles.noAssignees}>No one assigned yet</span>
        ) : (
          role.assignees.map(a => (
            <span
              key={a}
              className={`${styles.chip} ${a === api.CURRENT_USER ? styles.chipMe : ''}`}
            >
              {a === api.CURRENT_USER ? 'you' : a}
            </span>
          ))
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const RolesFlow: React.FC<FlowProps> = ({ instanceId }) => {
  const [roles,   setRoles]   = useState(() => api.getRoles(instanceId));
  const [adding,  setAdding]  = useState(false);

  const refresh = useCallback(() => setRoles(api.getRoles(instanceId)), [instanceId]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Award size={18} className={styles.headerIcon} />
        <span>{roles.length} role{roles.length !== 1 ? 's' : ''}</span>
      </div>

      {adding ? (
        <AddRoleForm
          onSubmit={(name, desc) => {
            api.addRole(instanceId, name, desc);
            refresh();
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <button className={styles.addBtn} onClick={() => setAdding(true)}>
          <Plus size={15} /> Add Role
        </button>
      )}

      {roles.length === 0 ? (
        <p className={styles.noData}>No roles defined yet. Add one above.</p>
      ) : (
        <div className={styles.roleList}>
          {roles.map(r => (
            <RoleCard key={r.id} role={r} instanceId={instanceId} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
};

export default RolesFlow;
