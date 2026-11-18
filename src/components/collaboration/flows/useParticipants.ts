import { useMemo } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { memberName } from '../../../utils/memberDisplay';

export interface Participants {
  /** Is this agent the user? Addresses compare whatever their case. */
  isMe: (agent: string | null | undefined) => boolean;
  /** "You", the member's profile name, or their short address. */
  nameOf: (agent: string) => string;
  /** "by you", or "by" and their name. */
  byline: (agent: string) => string;
}

/**
 * How a flow names its participants: the community's members, by the
 * profiles the community page (or the collaboration page) loaded.
 */
export function useParticipants(currentUser: string): Participants {
  const profiles = useAppSelector((state) => state.communities.profiles);
  return useMemo(() => {
    const byAgent = new Map(Object.entries(profiles).map(([agent, profile]) => [agent.toLowerCase(), profile]));
    const me = currentUser.toLowerCase();
    const isMe = (agent: string | null | undefined) => !!agent && agent.toLowerCase() === me;
    const nameOf = (agent: string) => (isMe(agent) ? 'You' : memberName(agent, byAgent.get(agent.toLowerCase())));
    const byline = (agent: string) => (isMe(agent) ? 'by you' : `by ${nameOf(agent)}`);
    return { isMe, nameOf, byline };
  }, [profiles, currentUser]);
}
