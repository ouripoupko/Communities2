// ---------------------------------------------------------------------------
// Task board flow — local in-memory store, no persistence yet
// ---------------------------------------------------------------------------

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  ownerId: string | null;
  status: TaskStatus;
  createdAt: number;
}

export const CURRENT_USER = 'me';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  done:        'Done',
};

export const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done'];

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
let tasks: Task[] = [
  {
    id: 't1', title: 'Draft community newsletter',
    description: 'Write the monthly update for all members.',
    createdBy: 'alice', ownerId: 'alice', status: 'in_progress',
    createdAt: Date.now() - 3_600_000 * 10,
  },
  {
    id: 't2', title: 'Book the meeting room',
    description: '',
    createdBy: 'bob', ownerId: null, status: 'todo',
    createdAt: Date.now() - 3_600_000 * 8,
  },
  {
    id: 't3', title: 'Update website homepage',
    description: 'Refresh the hero image and event dates.',
    createdBy: 'me', ownerId: 'me', status: 'todo',
    createdAt: Date.now() - 3_600_000 * 6,
  },
  {
    id: 't4', title: 'Print event banners',
    description: '',
    createdBy: 'carol', ownerId: 'carol', status: 'done',
    createdAt: Date.now() - 3_600_000 * 24,
  },
  {
    id: 't5', title: 'Send invitations',
    description: 'Email all 120 registered members.',
    createdBy: 'alice', ownerId: 'bob', status: 'in_progress',
    createdAt: Date.now() - 3_600_000 * 5,
  },
];

// ---------------------------------------------------------------------------
// Capability checks
// ---------------------------------------------------------------------------
export function canClaim(task: Task): boolean {
  return task.ownerId !== CURRENT_USER;
}

export function canRelease(task: Task): boolean {
  return task.ownerId === CURRENT_USER && task.status !== 'done';
}

export function canAdvance(task: Task): boolean {
  return task.ownerId === CURRENT_USER && task.status !== 'done';
}

export function canRevert(task: Task): boolean {
  return task.ownerId === CURRENT_USER && task.status !== 'todo';
}

export function canDelete(task: Task): boolean {
  return task.createdBy === CURRENT_USER && task.status !== 'done';
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export function getTasks(): Task[] {
  return tasks.map(t => ({ ...t }));
}

export function addTask(title: string, description: string): Task {
  const task: Task = {
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    title: title.trim(),
    description: description.trim(),
    createdBy: CURRENT_USER,
    ownerId: null,
    status: 'todo',
    createdAt: Date.now(),
  };
  tasks = [...tasks, task];
  return { ...task };
}

export function claimTask(id: string): void {
  tasks = tasks.map(t => t.id === id ? { ...t, ownerId: CURRENT_USER } : t);
}

export function releaseTask(id: string): void {
  tasks = tasks.map(t =>
    t.id === id && t.ownerId === CURRENT_USER ? { ...t, ownerId: null } : t
  );
}

export function advanceTask(id: string): void {
  tasks = tasks.map(t => {
    if (t.id !== id || t.ownerId !== CURRENT_USER) return t;
    const next = STATUS_ORDER[STATUS_ORDER.indexOf(t.status) + 1];
    return next ? { ...t, status: next } : t;
  });
}

export function revertTask(id: string): void {
  tasks = tasks.map(t => {
    if (t.id !== id || t.ownerId !== CURRENT_USER) return t;
    const prev = STATUS_ORDER[STATUS_ORDER.indexOf(t.status) - 1];
    return prev ? { ...t, status: prev } : t;
  });
}

export function deleteTask(id: string): void {
  tasks = tasks.filter(t => !(t.id === id && canDelete(t)));
}
