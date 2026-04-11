import React, { useState, useEffect, useCallback } from 'react';
import { Award, Plus, Trash2, UserPlus, UserMinus, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Pencil, Check, X } from 'lucide-react';

import type { FlowProps } from '../types';
import * as api from './rolesApi';
import type { Role, RoleItem, RoleSection, VoteValue } from './rolesApi';
import { FlowLoading, FlowError } from '../FlowShell';
import styles from './RolesFlow.module.scss';

// ---------------------------------------------------------------------------
// Vote buttons
// ---------------------------------------------------------------------------
const VoteButtons: React.FC<{
  voteKey: string;
  votes: Record<string, Record<string, VoteValue>>;
  currentUser: string;
  onVote:  (key: string, v: VoteValue) => Promise<void>;
  onClear: (key: string) => Promise<void>;
}> = ({ voteKey, votes, currentUser, onVote, onClear }) => {
  const keyVotes       = votes[voteKey] ?? {};
  const myVote         = keyVotes[currentUser];
  const approveCount   = Object.values(keyVotes).filter(v => v === 'approve').length;
  const disapproveCount = Object.values(keyVotes).filter(v => v === 'disapprove').length;

  const handle = (v: VoteValue) => {
    void (myVote === v ? onClear(voteKey) : onVote(voteKey, v));
  };

  return (
    <div className={styles.voteButtons}>
      <button
        className={`${styles.voteBtn} ${styles.voteBtnApprove} ${myVote === 'approve' ? styles.voteBtnActive : ''}`}
        onClick={() => handle('approve')}
        title="Approve"
      >
        <ThumbsUp size={11} />
        {approveCount > 0 && <span className={styles.voteCount}>{approveCount}</span>}
      </button>
      <button
        className={`${styles.voteBtn} ${styles.voteBtnDisapprove} ${myVote === 'disapprove' ? styles.voteBtnActive : ''}`}
        onClick={() => handle('disapprove')}
        title="Disapprove"
      >
        <ThumbsDown size={11} />
        {disapproveCount > 0 && <span className={styles.voteCount}>{disapproveCount}</span>}
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Purpose section
// ---------------------------------------------------------------------------
const PurposeSection: React.FC<{
  purpose: string;
  isHolder: boolean;
  votes: Record<string, Record<string, VoteValue>>;
  currentUser: string;
  onSave:  (text: string) => Promise<void>;
  onVote:  (key: string, v: VoteValue) => Promise<void>;
  onClear: (key: string) => Promise<void>;
}> = ({ purpose, isHolder, votes, currentUser, onSave, onVote, onClear }) => {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(purpose);

  useEffect(() => { if (!editing) setDraft(purpose); }, [purpose, editing]);

  const save = async () => {
    await onSave(draft.trim());
    setEditing(false);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>Purpose</span>
        {isHolder && !editing && (
          <button className={styles.iconBtn} onClick={() => setEditing(true)} title="Edit purpose">
            <Pencil size={12} />
          </button>
        )}
      </div>

      {editing ? (
        <div className={styles.editBlock}>
          <textarea
            className={styles.purposeInput}
            value={draft}
            rows={3}
            autoFocus
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
          />
          <div className={styles.editActions}>
            <button className={styles.btnSave}       onClick={() => void save()}><Check size={12} /> Save</button>
            <button className={styles.btnCancelEdit} onClick={() => setEditing(false)}><X size={12} /> Cancel</button>
          </div>
        </div>
      ) : (
        <div className={styles.purposeRow}>
          <p className={styles.purposeText}>
            {purpose || <em className={styles.emptyField}>Not set yet.</em>}
          </p>
          {!isHolder && (
            <VoteButtons voteKey="purpose" votes={votes} currentUser={currentUser} onVote={onVote} onClear={onClear} />
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// List section  (Responsibilities / Autonomy / Consent / Boundaries)
// ---------------------------------------------------------------------------
const ListSection: React.FC<{
  label: string;
  items: RoleItem[];
  isHolder: boolean;
  votes: Record<string, Record<string, VoteValue>>;
  currentUser: string;
  onAdd:    (item: RoleItem) => Promise<void>;
  onUpdate: (items: RoleItem[]) => Promise<void>;
  onVote:   (key: string, v: VoteValue) => Promise<void>;
  onClear:  (key: string) => Promise<void>;
}> = ({ label, items, isHolder, votes, currentUser, onAdd, onUpdate, onVote, onClear }) => {
  const [adding,   setAdding]   = useState(false);
  const [newText,  setNewText]  = useState('');
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const submitAdd = async () => {
    if (!newText.trim()) return;
    await onAdd({ id: crypto.randomUUID(), text: newText.trim() });
    setNewText('');
    setAdding(false);
  };

  const submitEdit = async (id: string) => {
    if (!editText.trim()) return;
    await onUpdate(items.map(it => it.id === id ? { ...it, text: editText.trim() } : it));
    setEditId(null);
  };

  const remove = async (id: string) => {
    await onUpdate(items.filter(it => it.id !== id));
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{label}</span>
        {isHolder && (
          <button className={styles.iconBtn} onClick={() => setAdding(true)} title={`Add to ${label}`}>
            <Plus size={12} />
          </button>
        )}
      </div>

      {adding && (
        <div className={styles.addItemRow}>
          <input
            className={styles.itemInput}
            type="text"
            placeholder="New item…"
            value={newText}
            autoFocus
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  void submitAdd();
              if (e.key === 'Escape') { setAdding(false); setNewText(''); }
            }}
          />
          <button className={styles.iconBtnConfirm} onClick={() => void submitAdd()}><Check size={12} /></button>
          <button className={styles.iconBtnCancel}  onClick={() => { setAdding(false); setNewText(''); }}><X size={12} /></button>
        </div>
      )}

      {items.length === 0 && !adding && (
        <p className={styles.emptyField}>No items yet.</p>
      )}

      {items.length > 0 && (
        <ul className={styles.itemList}>
          {items.map(item => (
            <li key={item.id} className={styles.item}>
              {editId === item.id ? (
                <div className={styles.addItemRow}>
                  <input
                    className={styles.itemInput}
                    type="text"
                    value={editText}
                    autoFocus
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  void submitEdit(item.id);
                      if (e.key === 'Escape') setEditId(null);
                    }}
                  />
                  <button className={styles.iconBtnConfirm} onClick={() => void submitEdit(item.id)}><Check size={12} /></button>
                  <button className={styles.iconBtnCancel}  onClick={() => setEditId(null)}><X size={12} /></button>
                </div>
              ) : (
                <>
                  <span className={styles.itemText}>{item.text}</span>
                  {isHolder ? (
                    <div className={styles.itemActions}>
                      <button
                        className={styles.iconBtn}
                        onClick={() => { setEditId(item.id); setEditText(item.text); }}
                        title="Edit"
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnDelete}`}
                        onClick={() => void remove(item.id)}
                        title="Delete"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ) : (
                    <VoteButtons
                      voteKey={`item_${item.id}`}
                      votes={votes}
                      currentUser={currentUser}
                      onVote={onVote}
                      onClear={onClear}
                    />
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Add-role form
// ---------------------------------------------------------------------------
const AddRoleForm: React.FC<{
  onSubmit: (name: string, description: string) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [name,  setName]  = useState('');
  const [desc,  setDesc]  = useState('');
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
const SECTIONS: { key: RoleSection; label: string }[] = [
  { key: 'responsibilities', label: 'Responsibilities' },
  { key: 'autonomy',         label: 'Autonomy'         },
  { key: 'authorities',      label: 'Authorities'      },
  { key: 'boundaries',       label: 'Boundaries'       },
];

const RoleCard: React.FC<{
  role: Role;
  currentUser: string;
  onJoin:       () => Promise<void>;
  onLeave:      () => Promise<void>;
  onDelete:     () => Promise<void>;
  onVote:       (key: string, v: VoteValue) => Promise<void>;
  onClear:      (key: string) => Promise<void>;
  onSetPurpose: (text: string) => Promise<void>;
  onAddItem:    (section: RoleSection, item: RoleItem) => Promise<void>;
  onSetSection: (section: RoleSection, items: RoleItem[]) => Promise<void>;
}> = ({ role, currentUser, onJoin, onLeave, onDelete, onVote, onClear, onSetPurpose, onAddItem, onSetSection }) => {
  const [expanded, setExpanded] = useState(false);
  const assigned = api.isAssigned(role, currentUser);
  const isHolder = assigned;

  return (
    <div className={`${styles.card} ${assigned ? styles.cardAssigned : ''}`}>
      {/* Header row */}
      <div className={styles.cardHeader}>
        <button className={styles.expandBtn} onClick={() => setExpanded(e => !e)} title={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <span className={styles.roleName}>{role.name}</span>
        <div className={styles.cardActions}>
          {assigned ? (
            <button className={`${styles.assignBtn} ${styles.assignBtnLeave}`} onClick={onLeave} title="Leave this role">
              <UserMinus size={13} /> Leave
            </button>
          ) : (
            <button className={`${styles.assignBtn} ${styles.assignBtnJoin}`} onClick={onJoin} title="Join this role">
              <UserPlus size={13} /> Join
            </button>
          )}
          {api.canDelete(role, currentUser) && (
            <button className={styles.deleteBtn} onClick={onDelete} title="Delete role">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      {role.description && <p className={styles.roleDesc}>{role.description}</p>}

      {/* Assignees */}
      <div className={styles.assignees}>
        {role.assignees.length === 0 ? (
          <span className={styles.noAssignees}>No one assigned yet</span>
        ) : (
          role.assignees.map(a => (
            <div key={a} className={styles.holderEntry}>
              <span className={`${styles.chip} ${a === currentUser ? styles.chipMe : ''}`}>
                {a === currentUser ? 'you' : a}
              </span>
              {expanded && !isHolder && (
                <VoteButtons
                  voteKey={`holder_${a}`}
                  votes={role.votes}
                  currentUser={currentUser}
                  onVote={onVote}
                  onClear={onClear}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className={styles.cardBody}>
          <PurposeSection
            purpose={role.purpose}
            isHolder={isHolder}
            votes={role.votes}
            currentUser={currentUser}
            onSave={onSetPurpose}
            onVote={onVote}
            onClear={onClear}
          />
          {SECTIONS.map(({ key, label }) => (
            <ListSection
              key={key}
              label={label}
              items={role[key]}
              isHolder={isHolder}
              votes={role.votes}
              currentUser={currentUser}
              onAdd={item  => onAddItem(key, item)}
              onUpdate={items => onSetSection(key, items)}
              onVote={onVote}
              onClear={onClear}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const RolesFlow: React.FC<FlowProps> = ({ instanceId, flowServer, flowAgent, currentUser }) => {
  const [roles,   setRoles]   = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [adding,  setAdding]  = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.loadRoles(flowServer, flowAgent, instanceId);
      setRoles(data.sort((a, b) => a.createdAt - b.createdAt));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [instanceId, flowServer, flowAgent]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <FlowLoading />;
  if (error)   return <FlowError message={error} onRetry={load} />;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Award size={18} className={styles.headerIcon} />
        <span>{roles.length} role{roles.length !== 1 ? 's' : ''}</span>
      </div>

      {adding ? (
        <AddRoleForm
          onSubmit={async (name, desc) => {
            await api.addRole(flowServer, flowAgent, instanceId, currentUser, name, desc);
            setAdding(false);
            await load();
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
            <RoleCard
              key={r.id}
              role={r}
              currentUser={currentUser}
              onJoin={async ()   => { await api.joinRole(flowServer, flowAgent, instanceId, r, currentUser); await load(); }}
              onLeave={async ()  => { await api.leaveRole(flowServer, flowAgent, instanceId, r.id, currentUser); await load(); }}
              onDelete={async () => { await api.deleteRole(flowServer, flowAgent, instanceId, r.id); await load(); }}
              onVote={async (key, v)  => { await api.voteRole(flowServer, flowAgent, instanceId, r, key, currentUser, v); await load(); }}
              onClear={async key      => { await api.clearVoteRole(flowServer, flowAgent, instanceId, r, key, currentUser); await load(); }}
              onSetPurpose={async text        => { await api.setPurpose(flowServer, flowAgent, instanceId, r.id, text); await load(); }}
              onAddItem={async (section, item) => { await api.setSection(flowServer, flowAgent, instanceId, r.id, section, [...r[section], item]); await load(); }}
              onSetSection={async (section, items) => { await api.setSection(flowServer, flowAgent, instanceId, r.id, section, items); await load(); }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RolesFlow;
