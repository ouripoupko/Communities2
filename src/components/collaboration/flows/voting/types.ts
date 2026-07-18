export interface Proposal {
  id: string;
  text: string;
  author?: string;
}

export const ACCEPTANCE_BAR_ID = '__ACCEPTANCE_BAR__';

export interface ParticipantRanking {
  participantId: string;
  /** Ordered proposal IDs (most preferred first), with ACCEPTANCE_BAR_ID inserted as a separator */
  order: string[];
}
