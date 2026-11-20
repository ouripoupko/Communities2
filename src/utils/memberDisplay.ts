import type { IProfile } from '../services/interfaces';

export function getMemberDisplayName(profile: IProfile | null | undefined): string {
  return fullName(profile) || 'Unknown Member';
}

/** An agent's address, shortened for display: 0x1234…abcd. */
export const shortAgent = (agent: string): string =>
  agent.length > 14 ? `${agent.slice(0, 6)}…${agent.slice(-4)}` : agent;

/** A member's name from their profile, or else their short address. */
export function memberName(agent: string, profile: IProfile | null | undefined): string {
  return fullName(profile) || shortAgent(agent);
}

const fullName = (profile: IProfile | null | undefined): string =>
  profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '';
