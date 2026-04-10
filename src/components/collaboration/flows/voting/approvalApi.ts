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
