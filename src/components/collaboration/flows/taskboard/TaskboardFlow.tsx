import React, { useState } from 'react';
import { Plus, UserCheck, LogOut, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';

import type { FlowProps } from '../types';
import { useFlowData } from '../useFlowData';
import { useParticipants } from '../useParticipants';
import * as api from './taskboardApi';
import type { Task, TaskStatus } from './taskboardApi';
import { FlowLoading, FlowError } from '../FlowShell';
import styles from './TaskboardFlow.module.scss';

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
  const { isMe, nameOf, byline } = useParticipants(currentUser);
  const owner = task.ownerId ? nameOf(task.ownerId) : null;
  const isOwn = isMe(task.ownerId);

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
        <span className={styles.creatorLabel}>{byline(task.createdBy)}</span>
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
  contractId: string;
}> = ({ status, tasks, currentUser, onAddTask, contractId }) => (
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
          onClaim={async ()   => { await api.claimTask(contractId, t.id); }}
          onRelease={async () => { await api.releaseTask(contractId, t.id); }}
          onAdvance={async () => { await api.advanceTask(contractId, t.id); }}
          onRevert={async ()  => { await api.revertTask(contractId, t.id); }}
          onDelete={async ()  => { await api.deleteTask(contractId, t.id); }}
        />
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const TaskboardFlow: React.FC<FlowProps> = ({ instanceId, currentUser }) => {
  const { data, loading, error, retry } = useFlowData(instanceId, api.loadTasks);

  if (loading) return <FlowLoading />;
  if (error)   return <FlowError message={error} onRetry={retry} />;

  const tasks = data ?? [];

  const byStatus = (s: TaskStatus) =>
    tasks.filter(t => t.status === s).sort((a, b) => a.createdAt - b.createdAt);

  const mine   = tasks.filter(t => t.ownerId === currentUser);
  const myDone = mine.filter(t => t.status === 'done').length;

  const handleAddTask = async (title: string, desc: string) => {
    await api.addTask(instanceId, title, desc);
  };

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
            contractId={instanceId}
          />
        ))}
      </div>
    </div>
  );
};

export default TaskboardFlow;
