import { contractRead, contractWrite, deployContract } from '../api';
import type { IMethod } from '../interfaces';
import qvContractCode from '../../assets/contracts/qv_contract.py?raw';

/**
 * Quadratic Voting contract interface
 */

export async function deployQVContract(
  serverUrl: string,
  publicKey: string,
  name: string,
) {
  const response = await deployContract({
    serverUrl,
    publicKey,
    name,
    contract: 'qv_contract.py',
    code: qvContractCode,
  });
  return (response as { id?: string }).id || (response as string);
}

export async function setQVCredits(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  credits: number,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_credits',
      values: { credits },
    } as IMethod,
  });
}

export async function setQVStatus(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  status: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_status',
      values: { status },
    } as IMethod,
  });
}

export async function setQVProposals(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  proposalIds: string[],
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_proposals',
      values: { proposal_ids: proposalIds },
    } as IMethod,
  });
}

export async function getQVConfig(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_config',
      values: {},
    } as IMethod,
  });
}

export async function allocateCredits(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  allocations: Record<string, number>,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'allocate',
      values: { allocations },
    } as IMethod,
  });
}

export async function getQVAllocations(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_allocations',
      values: {},
    } as IMethod,
  });
}

export async function getMyQVAllocation(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_my_allocation',
      values: {},
    } as IMethod,
  });
}

export async function getQVResults(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_results',
      values: {},
    } as IMethod,
  });
}
