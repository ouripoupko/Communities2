import { Ibc } from '@ouripoupko/ibc';
import { getApp, readSilently } from '../ibc';
import type { IProfile } from '../interfaces';
import profileSource from '../../assets/contracts/Profile.sol?raw';

/** The label the profile contract is deployed with, by which it is found again. */
export const PROFILE_CONTRACT_NAME = 'communities-profile';

/**
 * Deploys the user's profile contract, proposing to make it public so that
 * others can read it. The user approves (and decides) on their node.
 */
export async function deployProfile(): Promise<string> {
  return await getApp().deploy({ source: profileSource, name: PROFILE_CONTRACT_NAME, public: true });
}

/** Asks the user to let anyone read their profile. Opens the node's approval page. */
export async function makeProfilePublic(contractId: string): Promise<void> {
  await getApp().permit(contractId, { public: true });
}

export async function getProfile(contractId: string): Promise<IProfile> {
  return await readSilently(contractId, 'getProfile') as IProfile;
}

/** Reads another agent's profile on their node, if they made it public. No sign-in needed. */
export async function getPublicProfile(node: string, agent: string, contractId: string): Promise<IProfile> {
  return await Ibc.publicRead(node, agent, contractId, 'getProfile') as IProfile;
}

export async function setProfile(contractId: string, profile: IProfile): Promise<void> {
  await getApp().write(contractId, 'setProfile', { ...profile });
}
