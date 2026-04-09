import React, { useState, useEffect, useCallback } from 'react';
import { Plus, UserCheck, LogOut, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';

import type { FlowProps } from '../types';
import * as api from './taskboardApi';
import type { Task, TaskStatus } from './taskboardApi';
import { FlowLoading, FlowError } from '../FlowShell';
import styles from './TaskboardFlow.module.scss';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ownerLabel = (id: string | null, currentUser: string) => {
  if (!id) return null;
  return id === currentUser ? 'You' : id;
};

const COLUMN_COLORS: Record<TaskStatus, string> = {
  todo:        styles.colTodo,
  in_progress: styles.colInProgress,
  done:        styles.colDone,
};

// ---------------------------------------------------------------------------
// Add-task form (inline at top of To Do column)
// ---------------------------------------------------------------------------
const AddTaskForm: React.FC<{ onAdd: (title: string, desc: string) => Promise<void> }> = ({ onAdd }) => {
  const [open,    setOpen]    = useState(false);
  const [title,   setTitle]   = useState('');
  const [desc,    setDesc]    = useState('');
  const [error,   setError]   = useState('');
  const [saving,  setSaving]  = useState(false);

  const submit = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    try {
      await onAdd(title, desc);
      setTitle(''); setDesc(''); setError(''); setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button className={styles.addTaskBtn} onClick={() => setOpen(true)}>
        <Plus size={14} /> Add task
      </button>
    );
  }

  return (
    <div className={styles.addTaskForm}>
      <input
        className={styles.addTitleInput}
        type="text"
        placeholder="Task title *"
        value={title}
        autoFocus
        disabled={saving}
        onChange={e => { setTitle(e.target.value); setError(''); }}
        onKeyDown={e => { if (e.key === 'Enter') void submit(); if (e.key === 'Escape') setOpen(false); }}
      />
      <textarea
        className={styles.addDescInput}
        rows={2}
        placeholder="Description (optional)"
        value={desc}
        disabled={saving}
        onChange={e => setDesc(e.target.value)}
      />
      {error && <p className={styles.errorMsg}>{error}</p>}
      <div className={styles.addFormActions}>
        <button className={styles.btnConfirm} onClick={() => void submit()} disabled={saving}>Add</button>
        <button className={styles.btnCancel} onClick={() => { setOpen(false); setError(''); }} disabled={saving}>Cancel</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Task card
// ---------------------------------------------------------------------------
const TaskCard: React.FC<{
  task: Task;
  currentUser: string;
  onClaim:   () => Promise<void>;
  onRelease: () => Promise<void>;
  onAdvance: () => Promise<void>;
  onRevert:  () => Promise<void>;
  onDelete:  () => Promise<void>;
}> = ({ task, currentUser, onClaim, onRelease, onAdvance, onRevert, onDelete }) => {
  const owner = ownerLabel(task.ownerId, currentUser);
  const isOwn = task.ownerId === currentUser;

  return (
    <div className={`${styles.card} ${isOwn ? styles.cardOwn : ''} ${task.status === 'done' ? styles.cardDone : ''}`}>
      {/* Title row */}
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{task.title}</span>
        {api.canDelete(task, currentUser) && (
          <button className={styles.cardDeleteBtn} onClick={() => void onDelete()} title="Delete task">
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className={styles.cardDesc}>{task.description}</p>
      )}

      {/* Owner chip */}
      <div className={styles.cardMeta}>
        {owner ? (
          <span className={`${styles.ownerChip} ${isOwn ? styles.ownerChipMe : ''}`}>
            <UserCheck size={11} /> {owner}
          </span>
        ) : (
          <span className={styles.unclaimedChip}>Unassigned</span>
        )}
        <span className={styles.creatorLabel}>by {task.createdBy === currentUser ? 'you' : task.createdBy}</span>
      </div>

      {/* Actions */}
      <div className={styles.cardActions}>
        {api.canClaim(task, currentUser) && (
          <button className={`${styles.actionBtn} ${styles.actionBtnClaim}`} onClick={() => void onClaim()}>
            <UserCheck size={12} /> {task.ownerId ? 'Take over' : 'Claim'}
          </button>
        )}
        {api.canRelease(task, currentUser) && (
          <button className={`${styles.actionBtn} ${styles.actionBtnRelease}`} onClick={() => void onRelease()}>
            <LogOut size={12} /> Release
          </button>
        )}
        {api.canRevert(task, currentUser) && (
          <button className={`${styles.actionBtn} ${styles.actionBtnRevert}`} onClick={() => void onRevert()}>
            <ChevronLeft size={12} /> Back
          </button>
        )}
        {api.canAdvance(task, currentUser) && (
          <button className={`${styles.actionBtn} ${styles.actionBtnAdvance}`} onClick={() => void onAdvance()}>
            {task.status === 'in_progress' ? 'Mark done' : 'Start'}
            <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------
const Column: React.FC<{
  status: TaskStatus;
  tasks: Task[];
  currentUser: string;
  onAddTask: (title: string, desc: string) => Promise<void>;
  onAction:  (fn: () => Promise<void>) => void;
  server: string;
  agent: string;
  contractId: string;
}> = ({ status, tasks, currentUser, onAddTask, onAction, server, agent, contractId }) => (
  <div className={`${styles.column} ${COLUMN_COLORS[status]}`}>
    <div className={styles.colHeader}>
      <span className={styles.colTitle}>{api.STATUS_LABELS[status]}</span>
      <span className={styles.colCount}>{tasks.length}</span>
    </div>

    <div className={styles.cardList}>
      {status === 'todo' && <AddTaskForm onAdd={onAddTask} />}
      {tasks.length === 0 && status !== 'todo' && (
        <p className={styles.emptyCol}>No tasks here</p>
      )}
      {tasks.map(t => (
        <TaskCard
          key={t.id}
          task={t}
          currentUser={currentUser}
          onClaim={async ()   => { await api.claimTask(server, agent, contractId, t.id, currentUser); onAction(async () => {}); }}
          onRelease={async () => { await api.releaseTask(server, agent, contractId, t.id);            onAction(async () => {}); }}
          onAdvance={async () => { await api.advanceTask(server, agent, contractId, t);               onAction(async () => {}); }}
          onRevert={async ()  => { await api.revertTask(server, agent, contractId, t);                onAction(async () => {}); }}
          onDelete={async ()  => { await api.deleteTask(server, agent, contractId, t.id);             onAction(async () => {}); }}
        />
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const TaskboardFlow: React.FC<FlowProps> = ({ instanceId, flowServer, flowAgent, currentUser }) => {
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.loadTasks(flowServer, flowAgent, instanceId);
      setTasks(data.sort((a, b) => a.createdAt - b.createdAt));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [instanceId, flowServer, flowAgent]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <FlowLoading />;
  if (error)   return <FlowError message={error} onRetry={load} />;

  const byStatus = (s: TaskStatus) =>
    tasks.filter(t => t.status === s).sort((a, b) => a.createdAt - b.createdAt);

  const mine   = tasks.filter(t => t.ownerId === currentUser);
  const myDone = mine.filter(t => t.status === 'done').length;

  const handleAddTask = async (title: string, desc: string) => {
    await api.addTask(flowServer, flowAgent, instanceId, currentUser, title, desc);
    await load();
  };

  // After any mutation, reload from server
  const handleAction = (_fn: () => Promise<void>) => { void load(); };

  return (
    <div className={styles.container}>
      {/* Summary bar */}
      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{tasks.length}</span>
          <span className={styles.summaryLabel}>total tasks</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{mine.length}</span>
          <span className={styles.summaryLabel}>assigned to me</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{myDone}</span>
          <span className={styles.summaryLabel}>completed by me</span>
        </div>
      </div>

      {/* Board */}
      <div className={styles.board}>
        {api.STATUS_ORDER.map(status => (
          <Column
            key={status}
            status={status}
            tasks={byStatus(status)}
            currentUser={currentUser}
            onAddTask={handleAddTask}
            onAction={handleAction}
            server={flowServer}
            agent={flowAgent}
            contractId={instanceId}
          />
        ))}
      </div>
    </div>
  );
};

export default TaskboardFlow;
