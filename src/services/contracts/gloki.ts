import { contractRead, contractWrite } from '../api';
import type { IMethod } from '../interfaces';

/**
 * Gloki contract interface
 * Handles all gloki/profile-specific contract calls
 */

/**
 * Get profile from gloki contract
 */
export async function getProfile(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  return await contractRead({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'get_profile',
      values: {},
    } as IMethod,
  });
}

export async function setValues(
  serverUrl: string,
  publicKey: string,
  contractId: string,
  firstName: string,
  lastName: string,
  imageData: string | null,
) {
  await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_values',
      values: {
        items: {
          firstName,
          lastName,
          userPhoto: imageData
        }
      }
    } as IMethod
  });
}