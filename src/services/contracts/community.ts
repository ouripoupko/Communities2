import { contractRead, contractWrite } from '../api';

/**
 * Community contract interface
 * Handles all community-specific contract calls
 */

export interface CommunityContractArgs {
  serverUrl: string;
  publicKey: string;
  contractId: string;
}

export interface CommunityContractWriteArgs extends CommunityContractArgs {
  method: string;
  args: Record<string, any>;
}

/**
 * Get partners from the community contract
 */
export async function getPartners({
  serverUrl,
  publicKey,
  contractId,
}: CommunityContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_partners'
  });
}

/**
 * Get members from the community contract
 */
export async function getMembers({
  serverUrl,
  publicKey,
  contractId,
}: CommunityContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_members'
  });
}

/**
 * Get all people from the community contract (tasks, members, nominates)
 */
export async function getAllPeople({
  serverUrl,
  publicKey,
  contractId,
}: CommunityContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_all_people'
  });
}

/**
 * Get community properties
 */
export async function getProperties({
  serverUrl,
  publicKey,
  contractId,
}: CommunityContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_properties'
  });
}

/**
 * Get community issues
 */
export async function getIssues({
  serverUrl,
  publicKey,
  contractId,
}: CommunityContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_issues'
  });
}

/**
 * Get community accounts
 */
export async function getAccounts({
  serverUrl,
  publicKey,
  contractId,
}: CommunityContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_accounts'
  });
}

/**
 * Approve an agent for community membership
 */
export async function approveAgent({
  serverUrl,
  publicKey,
  contractId,
  agentPublicKey,
}: CommunityContractArgs & { agentPublicKey: string }) {
  console.log('Approving agent:', agentPublicKey);
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: 'approve',
    args: { approved: agentPublicKey }
  });
}

/**
 * Disapprove an agent for community membership
 */
export async function disapproveAgent({
  serverUrl,
  publicKey,
  contractId,
  agentPublicKey,
}: CommunityContractArgs & { agentPublicKey: string }) {
  return await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: 'disapprove',
    args: { disapproved: agentPublicKey }
  });
}
