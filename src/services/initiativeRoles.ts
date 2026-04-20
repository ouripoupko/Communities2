import { contractRead, contractWrite } from './api';
import type { IMethod } from './interfaces';

export interface InitiativeRoles {
  author: string;
  coAuthors: string[];
  experts: string[];
  endorsementCounts: Record<string, number>;
  status: 'active' | 'merged_into' | 'archived';
  mergedInto: string | null;
}

const EMPTY_ROLES: InitiativeRoles = {
  author: '',
  coAuthors: [],
  experts: [],
  endorsementCounts: {},
  status: 'active',
  mergedInto: null,
};

export async function getInitiativeRoles(
  serverUrl: string, publicKey: string, initiativeId: string,
): Promise<InitiativeRoles> {
  try {
    const result = await contractRead({
      serverUrl, publicKey, contractId: initiativeId,
      method: { name: 'get_roles', values: {} } as IMethod,
    });
    if (!result || typeof result !== 'object') return EMPTY_ROLES;
    const r = result as Partial<InitiativeRoles>;
    return {
      author: typeof r.author === 'string' ? r.author : '',
      coAuthors: Array.isArray(r.coAuthors) ? r.coAuthors : [],
      experts: Array.isArray(r.experts) ? r.experts : [],
      endorsementCounts: (r.endorsementCounts && typeof r.endorsementCounts === 'object') ? r.endorsementCounts as Record<string, number> : {},
      status: r.status === 'merged_into' || r.status === 'archived' ? r.status : 'active',
      mergedInto: typeof r.mergedInto === 'string' ? r.mergedInto : null,
    };
  } catch {
    return EMPTY_ROLES;
  }
}

export async function endorseExpert(
  serverUrl: string, publicKey: string, initiativeId: string, target: string,
) {
  return await contractWrite({
    serverUrl, publicKey, contractId: initiativeId,
    method: { name: 'endorse_expert', values: { public_key: target } } as IMethod,
  });
}

export async function unendorseExpert(
  serverUrl: string, publicKey: string, initiativeId: string, target: string,
) {
  return await contractWrite({
    serverUrl, publicKey, contractId: initiativeId,
    method: { name: 'unendorse_expert', values: { public_key: target } } as IMethod,
  });
}

export async function addCoAuthor(
  serverUrl: string, publicKey: string, initiativeId: string, target: string,
) {
  return await contractWrite({
    serverUrl, publicKey, contractId: initiativeId,
    method: { name: 'add_co_author', values: { public_key: target } } as IMethod,
  });
}

export async function markMergedInto(
  serverUrl: string, publicKey: string, initiativeId: string, targetInitiativeId: string,
) {
  return await contractWrite({
    serverUrl, publicKey, contractId: initiativeId,
    method: { name: 'mark_merged_into', values: { target_initiative_id: targetInitiativeId } } as IMethod,
  });
}

export function isAuthorOrCoAuthor(roles: InitiativeRoles, publicKey: string | null): boolean {
  if (!publicKey) return false;
  if (roles.author === publicKey) return true;
  return roles.coAuthors.includes(publicKey);
}
