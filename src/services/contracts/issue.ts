import { contractRead, contractWrite } from '../api';
import type { IMethod } from '../interfaces';

/**
 * Issue contract interface
 * Handles all issue-specific contract calls
 */

/**
 * Get issue details
 */
export async function getIssue(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_issue',
      values: {},
    } as IMethod,
  });
}

export async function setDescriptionToServer(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  description: string,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_description',
      values: { text: description },
    } as IMethod,
  });
}

/**
 * Get issue comments
 */
export async function getCommentsFromServer(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_comments',
      values: {},
    } as IMethod,
  });
}

export async function addComment(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  comment: any,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'add_comment',
      values: { comment, },
    } as IMethod,
  });
}

/**
 * Get issue proposals
 */
export async function getProposalsFromServer(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_proposals',
      values: {}
    } as IMethod,
  });
}

export async function addProposal(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  proposal: any,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'add_proposal',
      values: {proposal,}
    } as IMethod,
  });
}

export async function addVote(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  voter: string,
  vote: any,
) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'add_vote',
      values: {voter, vote},
    } as IMethod,
  });
}
