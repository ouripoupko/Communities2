import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

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

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  done:        'Done',
};

export const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'done'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeTask(t: Record<string, unknown>): Task {
  return {
    id:          String(t.id          ?? ''),
    title:       String(t.title       ?? ''),
    description: String(t.description ?? ''),
    createdBy:   String(t.createdBy   ?? ''),
    ownerId:     t.ownerId != null ? String(t.ownerId) : null,
    status:      (t.status as TaskStatus) ?? 'todo',
    createdAt:   Number(t.createdAt   ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Capability checks (pure)
// ---------------------------------------------------------------------------

export function canClaim(task: Task, currentUser: string): boolean   { return task.ownerId !== currentUser; }
export function canRelease(task: Task, currentUser: string): boolean { return task.ownerId === currentUser && task.status !== 'done'; }
export function canAdvance(task: Task, currentUser: string): boolean { return task.ownerId === currentUser && task.status !== 'done'; }
export function canRevert(task: Task, currentUser: string): boolean  { return task.ownerId === currentUser && task.status !== 'todo'; }
export function canDelete(task: Task, currentUser: string): boolean  { return task.createdBy === currentUser && task.status !== 'done'; }

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function loadTasks(server: string, agent: string, contractId: string): Promise<Task[]> {
  const result = await contractRead({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'get_tasks', values: {} } as IMethod,
  });
  return (Array.isArray(result) ? result : []).map(t => normalizeTask(t as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function addTask(
  server: string, agent: string, contractId: string,
  currentUser: string, title: string, description: string,
): Promise<void> {
  const task: Task = {
    id: crypto.randomUUID(),
    title: title.trim(),
    description: description.trim(),
    createdBy: currentUser,
    ownerId: null,
    status: 'todo',
    createdAt: Date.now(),
  };
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'add_task', values: { task } } as IMethod,
  });
}

export async function claimTask(server: string, agent: string, contractId: string, id: string, currentUser: string): Promise<void> {
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'set_task_owner', values: { task_id: id, owner_id: currentUser } } as IMethod,
  });
}

export async function releaseTask(server: string, agent: string, contractId: string, id: string): Promise<void> {
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'set_task_owner', values: { task_id: id, owner_id: null } } as IMethod,
  });
}

export async function advanceTask(server: string, agent: string, contractId: string, task: Task): Promise<void> {
  const next = STATUS_ORDER[STATUS_ORDER.indexOf(task.status) + 1];
  if (!next) return;
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'set_task_status', values: { task_id: task.id, status: next } } as IMethod,
  });
}

export async function revertTask(server: string, agent: string, contractId: string, task: Task): Promise<void> {
  const prev = STATUS_ORDER[STATUS_ORDER.indexOf(task.status) - 1];
  if (!prev) return;
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'set_task_status', values: { task_id: task.id, status: prev } } as IMethod,
  });
}

export async function deleteTask(server: string, agent: string, contractId: string, id: string): Promise<void> {
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'delete_task', values: { task_id: id } } as IMethod,
  });
}
