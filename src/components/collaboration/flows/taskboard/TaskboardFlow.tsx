import React, { useState, useCallback } from 'react';
import { Plus, UserCheck, LogOut, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';

import type { FlowProps } from '../types';
import * as api from './taskboardApi';
import type { Task, TaskStatus } from './taskboardApi';
import styles from './TaskboardFlow.module.scss';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ownerLabel = (id: string | null) => {
  if (!id) return null;
  return id === api.CURRENT_USER ? 'You' : id;
};

const COLUMN_COLORS: Record<TaskStatus, string> = {
  todo:        styles.colTodo,
  in_progress: styles.colInProgress,
  done:        styles.colDone,
};

// ---------------------------------------------------------------------------
// Add-task form (inline at top of To Do column)
// ---------------------------------------------------------------------------
const AddTaskForm: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const [open,  setOpen]  = useState(false);
  const [title, setTitle] = useState('');
  const [desc,  setDesc]  = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    api.addTask(title, desc);
    setTitle(''); setDesc(''); setError(''); setOpen(false);
    onAdd();
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
        onChange={e => { setTitle(e.target.value); setError(''); }}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false); }}
      />
      <textarea
        className={styles.addDescInput}
        rows={2}
        placeholder="Description (optional)"
        value={desc}
        onChange={e => setDesc(e.target.value)}
      />
      {error && <p className={styles.errorMsg}>{error}</p>}
      <div className={styles.addFormActions}>
        <button className={styles.btnConfirm} onClick={submit}>Add</button>
        <button className={styles.btnCancel} onClick={() => { setOpen(false); setError(''); }}>Cancel</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Task card
// ---------------------------------------------------------------------------
const TaskCard: React.FC<{ task: Task; onRefresh: () => void }> = ({ task, onRefresh }) => {
  const owner = ownerLabel(task.ownerId);
  const isOwn = task.ownerId === api.CURRENT_USER;

  const act = (fn: () => void) => { fn(); onRefresh(); };

  return (
    <div className={`${styles.card} ${isOwn ? styles.cardOwn : ''} ${task.status === 'done' ? styles.cardDone : ''}`}>
      {/* Title row */}
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{task.title}</span>
        {api.canDelete(task) && (
          <button className={styles.cardDeleteBtn} onClick={() => act(() => api.deleteTask(task.id))}
            title="Delete task">
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
        <span className={styles.creatorLabel}>by {task.createdBy === api.CURRENT_USER ? 'you' : task.createdBy}</span>
      </div>

      {/* Actions */}
      <div className={styles.cardActions}>
        {api.canClaim(task) && (
          <button className={`${styles.actionBtn} ${styles.actionBtnClaim}`}
            onClick={() => act(() => api.claimTask(task.id))}>
            <UserCheck size={12} /> {task.ownerId ? 'Take over' : 'Claim'}
          </button>
        )}
        {api.canRelease(task) && (
          <button className={`${styles.actionBtn} ${styles.actionBtnRelease}`}
            onClick={() => act(() => api.releaseTask(task.id))}>
            <LogOut size={12} /> Release
          </button>
        )}
        {api.canRevert(task) && (
          <button className={`${styles.actionBtn} ${styles.actionBtnRevert}`}
            onClick={() => act(() => api.revertTask(task.id))}>
            <ChevronLeft size={12} /> Back
          </button>
        )}
        {api.canAdvance(task) && (
          <button className={`${styles.actionBtn} ${styles.actionBtnAdvance}`}
            onClick={() => act(() => api.advanceTask(task.id))}>
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
  onRefresh: () => void;
}> = ({ status, tasks, onRefresh }) => (
  <div className={`${styles.column} ${COLUMN_COLORS[status]}`}>
    <div className={styles.colHeader}>
      <span className={styles.colTitle}>{api.STATUS_LABELS[status]}</span>
      <span className={styles.colCount}>{tasks.length}</span>
    </div>

    <div className={styles.cardList}>
      {status === 'todo' && <AddTaskForm onAdd={onRefresh} />}
      {tasks.length === 0 && status !== 'todo' && (
        <p className={styles.emptyCol}>No tasks here</p>
      )}
      {tasks.map(t => (
        <TaskCard key={t.id} task={t} onRefresh={onRefresh} />
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const TaskboardFlow: React.FC<FlowProps> = () => {
  const [tasks, setTasks] = useState<Task[]>(() => api.getTasks());

  const refresh = useCallback(() => setTasks(api.getTasks()), []);

  const byStatus = (s: TaskStatus) =>
    tasks.filter(t => t.status === s).sort((a, b) => a.createdAt - b.createdAt);

  // Summary counts
  const mine = tasks.filter(t => t.ownerId === api.CURRENT_USER);
  const myDone = mine.filter(t => t.status === 'done').length;

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
            onRefresh={refresh}
          />
        ))}
      </div>
    </div>
  );
};

export default TaskboardFlow;
