import { readSilently, write } from '../../../../services/ibc';

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
// Capability checks (pure)
// ---------------------------------------------------------------------------

export function canClaim(task: Task, currentUser: string): boolean   { return task.ownerId !== currentUser; }
export function canRelease(task: Task, currentUser: string): boolean { return task.ownerId === currentUser && task.status !== 'done'; }
export function canAdvance(task: Task, currentUser: string): boolean { return task.ownerId === currentUser && task.status !== 'done'; }
export function canRevert(task: Task, currentUser: string): boolean  { return task.ownerId === currentUser && task.status !== 'todo'; }
export function canDelete(task: Task, currentUser: string): boolean  { return task.createdBy === currentUser && task.status !== 'done'; }

// ---------------------------------------------------------------------------
// The contract (TaskBoardFlow.sol) enforces the same rules: the checks above
// only decide which buttons to show. Whoever signs is the participant.
// ---------------------------------------------------------------------------

const ZERO = '0x0000000000000000000000000000000000000000';

export async function loadTasks(contractId: string): Promise<Task[]> {
  const result = await readSilently(contractId, 'getTasks') as {
    id: string; title: string; description: string; createdBy: string; owner: string; status: number; createdAt: number;
  }[];
  return result.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    createdBy: t.createdBy,
    ownerId: t.owner === ZERO ? null : t.owner,
    status: STATUS_ORDER[Number(t.status)],
    createdAt: Number(t.createdAt) * 1000,
  }));
}

// Each may open the node's approval page: call them from a click.

export async function addTask(contractId: string, title: string, description: string): Promise<void> {
  await write(contractId, 'addTask', { title: title.trim(), description: description.trim() });
}

export async function claimTask(contractId: string, id: string): Promise<void> {
  await write(contractId, 'claimTask', { id });
}

export async function releaseTask(contractId: string, id: string): Promise<void> {
  await write(contractId, 'releaseTask', { id });
}

export async function advanceTask(contractId: string, id: string): Promise<void> {
  await write(contractId, 'advanceTask', { id });
}

export async function revertTask(contractId: string, id: string): Promise<void> {
  await write(contractId, 'revertTask', { id });
}

export async function deleteTask(contractId: string, id: string): Promise<void> {
  await write(contractId, 'deleteTask', { id });
}
