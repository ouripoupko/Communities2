import { readSilently, write } from '../../../../services/ibc';

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
// Capability checks (pure, no I/O)
// ---------------------------------------------------------------------------

export function isAssigned(role: Role, currentUser: string): boolean {
  return role.assignees.includes(currentUser);
}

export function canDelete(role: Role, currentUser: string): boolean {
  return role.createdBy === currentUser;
}

// ---------------------------------------------------------------------------
// The contract (RolesFlow.sol). Whoever signs is the participant: the
// contract takes them from msg.sender.
// ---------------------------------------------------------------------------

const SECTIONS: RoleSection[] = ['responsibilities', 'autonomy', 'authorities', 'boundaries'];
const VOTES: (VoteValue | null)[] = [null, 'approve', 'disapprove'];

export async function loadRoles(contractId: string): Promise<Role[]> {
  const result = await readSilently(contractId, 'getRoles') as {
    id: string; name: string; description: string; createdBy: string; createdAt: number; purpose: string;
    assignees: string[]; responsibilities: RoleItem[]; autonomy: RoleItem[]; authorities: RoleItem[]; boundaries: RoleItem[];
    votes: { key: string; voter: string; value: number }[];
  }[];
  return result.map((r) => {
    const votes: Role['votes'] = {};
    for (const v of r.votes) {
      const value = VOTES[Number(v.value)];
      if (value) (votes[v.key] ??= {})[v.voter] = value;
    }
    const items = (list: RoleItem[]) => list.map((i) => ({ id: i.id, text: i.text }));
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      createdBy: r.createdBy,
      createdAt: Number(r.createdAt) * 1000,
      assignees: r.assignees,
      purpose: r.purpose,
      responsibilities: items(r.responsibilities),
      autonomy: items(r.autonomy),
      authorities: items(r.authorities),
      boundaries: items(r.boundaries),
      votes,
    };
  });
}

// Each may open the node's approval page: call them from a click.

export async function addRole(contractId: string, name: string, description: string): Promise<void> {
  await write(contractId, 'addRole', { name: name.trim(), description: description.trim() });
}

export async function joinRole(contractId: string, roleId: string): Promise<void> {
  await write(contractId, 'joinRole', { roleId });
}

export async function leaveRole(contractId: string, roleId: string): Promise<void> {
  await write(contractId, 'leaveRole', { roleId });
}

export async function deleteRole(contractId: string, roleId: string): Promise<void> {
  await write(contractId, 'deleteRole', { roleId });
}

export async function setPurpose(contractId: string, roleId: string, text: string): Promise<void> {
  await write(contractId, 'setPurpose', { roleId, text });
}

export async function setSection(contractId: string, roleId: string, section: RoleSection, items: RoleItem[]): Promise<void> {
  await write(contractId, 'setSection', {
    roleId, section: SECTIONS.indexOf(section), ids: items.map((i) => i.id), texts: items.map((i) => i.text),
  });
}

export async function voteRole(contractId: string, roleId: string, voteKey: string, value: VoteValue): Promise<void> {
  await write(contractId, 'vote', { roleId, key: voteKey, value: VOTES.indexOf(value) });
}

export async function clearVoteRole(contractId: string, roleId: string, voteKey: string): Promise<void> {
  await write(contractId, 'vote', { roleId, key: voteKey, value: 0 });
}
