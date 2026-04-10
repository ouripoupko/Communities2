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
  _openaiApiKey?: string | null,
  country?: string | null,
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
          userPhoto: imageData,
          // AI keys are stored locally in the browser, not in the shared profile contract.
          openaiApiKey: '',
          ...(country != null && country !== ''
            ? { country }
            : {}),
        },
      },
    } as IMethod
  });
}

export async function clearRemoteOpenAIApiKey(
  serverUrl: string,
  publicKey: string,
  contractId: string,
) {
  await contractWrite({
    serverUrl,
    publicKey,
    contractId,
    method: {
      name: 'set_values',
      values: {
        items: {
          openaiApiKey: '',
        },
      },
    } as IMethod,
  });
}
