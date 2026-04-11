import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export type VoteValue = 'approve' | 'disapprove';
export type RoleSection = 'responsibilities' | 'autonomy' | 'authorities' | 'boundaries';

export interface RoleItem {
  id: string;
  text: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: number;
  assignees: string[];
  purpose: string;
  responsibilities: RoleItem[];
  autonomy: RoleItem[];
  authorities: RoleItem[];
  boundaries: RoleItem[];
  votes: Record<string, Record<string, VoteValue>>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeItem(x: unknown): RoleItem {
  const r = x as Record<string, unknown>;
  return { id: String(r.id ?? ''), text: String(r.text ?? '') };
}

function normalizeRole(r: Record<string, unknown>): Role {
  return {
    id:               String(r.id          ?? ''),
    name:             String(r.name        ?? ''),
    description:      String(r.description ?? ''),
    createdBy:        String(r.createdBy   ?? ''),
    createdAt:        Number(r.createdAt   ?? 0),
    assignees:        Array.isArray(r.assignees)        ? r.assignees.map(String)        : [],
    purpose:          String(r.purpose                  ?? ''),
    responsibilities: Array.isArray(r.responsibilities) ? r.responsibilities.map(normalizeItem) : [],
    autonomy:         Array.isArray(r.autonomy)         ? r.autonomy.map(normalizeItem)  : [],
    authorities:          Array.isArray(r.authorities)          ? r.authorities.map(normalizeItem)   : [],
    boundaries:       Array.isArray(r.boundaries)       ? r.boundaries.map(normalizeItem): [],
    votes:            (r.votes as Record<string, Record<string, VoteValue>>) ?? {},
  };
}

// ---------------------------------------------------------------------------
// Capability checks (pure, no I/O)
// ---------------------------------------------------------------------------

export function isAssigned(role: Role, currentUser: string): boolean {
  return role.assignees.includes(currentUser);
}

export function canDelete(role: Role, currentUser: string): boolean {
  return role.createdBy === currentUser;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function loadRoles(server: string, agent: string, contractId: string): Promise<Role[]> {
  const result = await contractRead({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'get_roles', values: {} } as IMethod,
  });
  return (Array.isArray(result) ? result : []).map(r => normalizeRole(r as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function addRole(
  server: string, agent: string, contractId: string,
  currentUser: string, name: string, description: string,
): Promise<Role> {
  const role: Role = {
    id:               crypto.randomUUID(),
    name:             name.trim(),
    description:      description.trim(),
    createdBy:        currentUser,
    createdAt:        Date.now(),
    assignees:        [],
    purpose:          '',
    responsibilities: [],
    autonomy:         [],
    authorities:          [],
    boundaries:       [],
    votes:            {},
  };
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'add_role', values: { role } } as IMethod,
  });
  return role;
}

export async function joinRole(
  server: string, agent: string, contractId: string,
  role: Role, currentUser: string,
): Promise<void> {
  const assignees = [...role.assignees, currentUser];
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'join_role', values: { role_id: role.id, assignees } } as IMethod,
  });
}

export async function leaveRole(
  _server: string, _agent: string, _contractId: string,
  _roleId: string, _currentUser: string,
): Promise<void> {
  // TODO
}

export async function deleteRole(
  _server: string, _agent: string, _contractId: string,
  _roleId: string,
): Promise<void> {
  // TODO
}

export async function setPurpose(
  server: string, agent: string, contractId: string,
  roleId: string, text: string,
): Promise<void> {
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'set_role_purpose', values: { role_id: roleId, text } } as IMethod,
  });
}

export async function addItem(
  server: string, agent: string, contractId: string,
  roleId: string, section: RoleSection, item: RoleItem,
): Promise<void> {
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'add_role_item', values: { role_id: roleId, section, item } } as IMethod,
  });
}

export async function setSection(
  server: string, agent: string, contractId: string,
  roleId: string, section: RoleSection, items: RoleItem[],
): Promise<void> {
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'set_role_section', values: { role_id: roleId, section, items } } as IMethod,
  });
}

export async function voteRole(
  server: string, agent: string, contractId: string,
  role: Role, voteKey: string, currentUser: string, value: VoteValue,
): Promise<void> {
  const newVotes = {
    ...role.votes,
    [voteKey]: { ...(role.votes[voteKey] ?? {}), [currentUser]: value },
  };
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'set_role_votes', values: { role_id: role.id, votes: newVotes } } as IMethod,
  });
}

export async function clearVoteRole(
  server: string, agent: string, contractId: string,
  role: Role, voteKey: string, currentUser: string,
): Promise<void> {
  const keyVotes = { ...(role.votes[voteKey] ?? {}) };
  delete keyVotes[currentUser];
  const newVotes = { ...role.votes, [voteKey]: keyVotes };
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'set_role_votes', values: { role_id: role.id, votes: newVotes } } as IMethod,
  });
}
