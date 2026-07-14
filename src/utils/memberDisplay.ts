import type { IProfile } from '../services/interfaces';

export function getMemberDisplayName(profile: IProfile | null | undefined): string {
  const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '';
  return fullName || 'Unknown Member';
}
