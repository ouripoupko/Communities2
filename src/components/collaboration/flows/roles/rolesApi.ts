// ---------------------------------------------------------------------------
// Role Nomination flow — local in-memory store, no persistence yet
// ---------------------------------------------------------------------------

export interface Role {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: number;
  assignees: string[]; // participantIds
}

export const CURRENT_USER = 'me';

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------
let roles: Role[] = [
  {
    id: 'r1',
    name: 'Facilitator',
    description: 'Guides meetings and keeps discussions on track.',
    createdBy: 'alice',
    createdAt: Date.now() - 3_600_000 * 48,
    assignees: ['alice'],
  },
  {
    id: 'r2',
    name: 'Treasurer',
    description: 'Manages the community fund and financial records.',
    createdBy: 'bob',
    createdAt: Date.now() - 3_600_000 * 36,
    assignees: [],
  },
  {
    id: 'r3',
    name: 'Note Taker',
    description: 'Documents decisions and action items during meetings.',
    createdBy: 'carol',
    createdAt: Date.now() - 3_600_000 * 12,
    assignees: ['carol', 'me'],
  },
];

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function getRoles(): Role[] {
  return [...roles].sort((a, b) => a.createdAt - b.createdAt);
}

// ---------------------------------------------------------------------------
// Capability checks
// ---------------------------------------------------------------------------

export function isAssigned(role: Role): boolean {
  return role.assignees.includes(CURRENT_USER);
}

export function canDelete(role: Role): boolean {
  return role.createdBy === CURRENT_USER;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function uid(): string {
  return `r_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

export function addRole(name: string, description: string): Role {
  const r: Role = {
    id: uid(),
    name: name.trim(),
    description: description.trim(),
    createdBy: CURRENT_USER,
    createdAt: Date.now(),
    assignees: [],
  };
  roles = [...roles, r];
  return r;
}

export function deleteRole(roleId: string): void {
  roles = roles.filter(r => r.id !== roleId);
}

export function joinRole(roleId: string): void {
  roles = roles.map(r =>
    r.id === roleId && !r.assignees.includes(CURRENT_USER)
      ? { ...r, assignees: [...r.assignees, CURRENT_USER] }
      : r
  );
}

export function leaveRole(roleId: string): void {
  roles = roles.map(r =>
    r.id === roleId
      ? { ...r, assignees: r.assignees.filter(a => a !== CURRENT_USER) }
      : r
  );
}
