import { contractRead } from '../api';

/**
 * Gloki contract interface
 * Handles all gloki/profile-specific contract calls
 */

export interface GlokiContractArgs {
  serverUrl: string;
  publicKey: string;
  contractId: string;
}

/**
 * Get member profile from their gloki contract
 */
export async function getMemberProfile({
  memberServerUrl,
  memberPublicKey,
  memberContractId,
}: {
  memberServerUrl: string;
  memberPublicKey: string;
  memberContractId: string;
}) {
  return await contractRead({
    serverUrl: memberServerUrl,
    publicKey: memberPublicKey,
    contractId: memberContractId,
    method: 'get_profile'
  });
}

/**
 * Get profile from gloki contract
 */
export async function getProfile({
  serverUrl,
  publicKey,
  contractId,
}: GlokiContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_profile'
  });
}

/**
 * Get contacts from gloki contract
 */
export async function getContacts({
  serverUrl,
  publicKey,
  contractId,
}: GlokiContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_contacts'
  });
}

/**
 * Get issues from gloki contract
 */
export async function getIssues({
  serverUrl,
  publicKey,
  contractId,
}: GlokiContractArgs) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: 'get_issues'
  });
}
