import { contractRead, contractWrite } from '../api';
import type { IMethod } from '../interfaces';

/**
 * Agreement contract interface
 * Handles all agreement-specific contract calls
 */

export async function getAgreement(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_agreement',
      values: {},
    } as IMethod,
  });
}

export async function setRule(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  rule: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_rule',
      values: { rule },
    } as IMethod,
  });
}

export async function setProtection(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  protection: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_protection',
      values: { protection },
    } as IMethod,
  });
}

export async function setConsensusStatus(
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
      name: 'set_consensus_status',
      values: { status },
    } as IMethod,
  });
}

export async function setCreatedAt(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  createdAt: number,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_created_at',
      values: { created_at: createdAt },
    } as IMethod,
  });
}

export async function addVote(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  voter: string,
  vote: unknown,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'add_vote',
      values: { voter, vote },
    } as IMethod,
  });
}

export async function getVotes(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_votes',
      values: {},
    } as IMethod,
  });
}
