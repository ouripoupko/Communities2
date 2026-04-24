import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

function throwIfContractError(response: unknown) {
  if (
    response &&
    typeof response === 'object' &&
    'error' in response &&
    typeof (response as { error?: unknown }).error === 'string'
  ) {
    throw new Error((response as { error: string }).error);
  }
  return response;
}

export async function addProposal(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  text: string,
) {
  return throwIfContractError(await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'add_proposal', values: { text } } as IMethod,
  }));
}

export async function approve(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  proposalId: string,
) {
  return throwIfContractError(await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'approve', values: { proposal_id: proposalId } } as IMethod,
  }));
}

export async function withdrawApproval(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  proposalId: string,
) {
  return throwIfContractError(await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'withdraw_approval', values: { proposal_id: proposalId } } as IMethod,
  }));
}

export async function getProposals(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_proposals', values: {} } as IMethod,
  });
}

export async function getApprovals(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_approvals', values: {} } as IMethod,
  });
}

export async function getApprovalCounts(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_approval_counts', values: {} } as IMethod,
  });
}

export async function getMyApprovals(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: { name: 'get_my_approvals', values: {} } as IMethod,
  });
}

export interface ApprovedProposal {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  approvals: number;
}

/**
 * Read approval proposals + counts, merge, sort by approval count desc,
 * return up to `limit` entries. Intended for carry-over from proposals
 * stage into the QV vote stage.
 */
export async function getTopApprovedProposals(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  limit: number,
): Promise<ApprovedProposal[]> {
  const [proposalsRaw, countsRaw] = await Promise.all([
    getProposals(serverUrl, publicKey, contractId),
    getApprovalCounts(serverUrl, publicKey, contractId),
  ]);
  const proposals = (proposalsRaw && typeof proposalsRaw === 'object' ? proposalsRaw : {}) as Record<string, { id?: string; text?: string; author?: string; timestamp?: string }>;
  const counts = (countsRaw && typeof countsRaw === 'object' ? countsRaw : {}) as Record<string, number>;
  return Object.entries(proposals)
    .map(([pid, p]): ApprovedProposal => ({
      id: String(p.id ?? pid),
      text: String(p.text ?? ''),
      author: String(p.author ?? ''),
      timestamp: String(p.timestamp ?? ''),
      approvals: Number(counts[pid] ?? 0),
    }))
    .filter((p) => p.text && p.approvals > 0)
    .sort((a, b) => b.approvals - a.approvals)
    .slice(0, limit);
}
