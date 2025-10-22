import { contractRead } from '../api';

/**
 * Issue contract interface
 * Handles all issue-specific contract calls
 */

export interface IssueContractArgs {
  serverUrl: string;
  publicKey: string;
  contractId: string;
}

/**
 * Get issue details
 */
export async function getIssue({
  serverUrl,
  publicKey,
  contractId,
}: IssueContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_issue'
  });
}

/**
 * Get issue name
 */
export async function getName({
  serverUrl,
  publicKey,
  contractId,
}: IssueContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_name'
  });
}

/**
 * Get issue description
 */
export async function getDescription({
  serverUrl,
  publicKey,
  contractId,
}: IssueContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_description'
  });
}

/**
 * Get issue comments
 */
export async function getComments({
  serverUrl,
  publicKey,
  contractId,
}: IssueContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_comments'
  });
}

/**
 * Get issue proposals
 */
export async function getProposals({
  serverUrl,
  publicKey,
  contractId,
}: IssueContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_proposals'
  });
}

/**
 * Get issue votes
 */
export async function getVotes({
  serverUrl,
  publicKey,
  contractId,
}: IssueContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_votes'
  });
}
