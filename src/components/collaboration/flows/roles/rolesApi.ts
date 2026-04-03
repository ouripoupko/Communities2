import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export interface Role {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: number;
  assignees: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeRole(r: Record<string, unknown>): Role {
  return {
    id:          String(r.id          ?? ''),
    name:        String(r.name        ?? ''),
    description: String(r.description ?? ''),
    createdBy:   String(r.createdBy   ?? ''),
    createdAt:   Number(r.createdAt   ?? 0),
    assignees:   Array.isArray(r.assignees) ? r.assignees.map(String) : [],
  };
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
// Capability checks (pure, no I/O)
// ---------------------------------------------------------------------------

export function isAssigned(role: Role, currentUser: string): boolean {
  return role.assignees.includes(currentUser);
}

export function canDelete(role: Role, currentUser: string): boolean {
  return role.createdBy === currentUser;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function addRole(
  server: string, agent: string, contractId: string,
  currentUser: string, name: string, description: string,
): Promise<Role> {
  const role: Role = {
    id:          crypto.randomUUID(),
    name:        name.trim(),
    description: description.trim(),
    createdBy:   currentUser,
    createdAt:   Date.now(),
    assignees:   [],
  };
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'add_role', values: { role } } as IMethod,
  });
  return role;
}

export async function deleteRole(
  server: string, agent: string, contractId: string,
  roles: Role[], roleId: string,
): Promise<void> {
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'set_roles', values: { roles: roles.filter(r => r.id !== roleId) } } as IMethod,
  });
}

export async function joinRole(
  server: string, agent: string, contractId: string,
  roles: Role[], roleId: string, currentUser: string,
): Promise<void> {
  const updated = roles.map(r =>
    r.id === roleId && !r.assignees.includes(currentUser)
      ? { ...r, assignees: [...r.assignees, currentUser] }
      : r
  );
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'set_roles', values: { roles: updated } } as IMethod,
  });
}

export async function leaveRole(
  server: string, agent: string, contractId: string,
  roles: Role[], roleId: string, currentUser: string,
): Promise<void> {
  const updated = roles.map(r =>
    r.id === roleId
      ? { ...r, assignees: r.assignees.filter(a => a !== currentUser) }
      : r
  );
  await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'set_roles', values: { roles: updated } } as IMethod,
  });
}
