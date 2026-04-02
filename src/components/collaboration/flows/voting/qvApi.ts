import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export async function addProposal(serverUrl: string, publicKey: string, contractId: string, text: string) {
  return await contractWrite({ serverUrl, publicKey, contractId, method: { name: 'add_proposal', values: { text } } as IMethod });
}

export async function setCredits(serverUrl: string, publicKey: string, contractId: string, credits: number) {
  return await contractWrite({ serverUrl, publicKey, contractId, method: { name: 'set_credits', values: { credits } } as IMethod });
}

export async function setStatus(serverUrl: string, publicKey: string, contractId: string, status: string) {
  return await contractWrite({ serverUrl, publicKey, contractId, method: { name: 'set_status', values: { status } } as IMethod });
}

export async function getConfig(serverUrl: string, publicKey: string, contractId: string) {
  return await contractRead({ serverUrl, publicKey, contractId, method: { name: 'get_config', values: {} } as IMethod });
}

export async function getProposals(serverUrl: string, publicKey: string, contractId: string) {
  return await contractRead({ serverUrl, publicKey, contractId, method: { name: 'get_proposals', values: {} } as IMethod });
}

export async function allocate(serverUrl: string, publicKey: string, contractId: string, allocations: Record<string, number>) {
  return await contractWrite({ serverUrl, publicKey, contractId, method: { name: 'allocate', values: { allocations } } as IMethod });
}

export async function getAllocations(serverUrl: string, publicKey: string, contractId: string) {
  return await contractRead({ serverUrl, publicKey, contractId, method: { name: 'get_allocations', values: {} } as IMethod });
}

export async function getMyAllocation(serverUrl: string, publicKey: string, contractId: string) {
  return await contractRead({ serverUrl, publicKey, contractId, method: { name: 'get_my_allocation', values: {} } as IMethod });
}

export async function getResults(serverUrl: string, publicKey: string, contractId: string) {
  return await contractRead({ serverUrl, publicKey, contractId, method: { name: 'get_results', values: {} } as IMethod });
}
