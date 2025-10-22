import { contractRead } from '../api';

/**
 * Community contract interface
 * Handles all community-specific contract calls
 */

export interface CommunityContractArgs {
  serverUrl: string;
  publicKey: string;
  contractId: string;
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
