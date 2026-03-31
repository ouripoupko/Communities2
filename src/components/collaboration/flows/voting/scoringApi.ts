// ---------------------------------------------------------------------------
// Scoring flow — local in-memory store, no persistence yet
// ---------------------------------------------------------------------------

export interface ScoringOption {
  id: string;
  text: string;
}

/** One participant's scores: optionId → numeric score */
export interface ParticipantScores {
  participantId: string;
  scores: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const options: ScoringOption[] = [
  { id: 's1', text: 'Build a community garden' },
  { id: 's2', text: 'Organise monthly meetups' },
  { id: 's3', text: 'Create an online forum' },
  { id: 's4', text: 'Launch a newsletter' },
];

// Simulated scores from other participants
const otherScores: ParticipantScores[] = [
  { participantId: 'alice', scores: { s1: 8, s2: 6, s3: 4, s4: 7 } },
  { participantId: 'bob',   scores: { s1: 5, s2: 9, s3: 7, s4: 3 } },
  { participantId: 'carol', scores: { s1: 7, s2: 5, s3: 9, s4: 6 } },
];

let myScores: ParticipantScores = {
  participantId: 'me',
  scores: {},
};

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export function getOptions(): ScoringOption[] {
  return [...options];
}

export function addOption(text: string): ScoringOption {
  const opt: ScoringOption = { id: `s${Date.now()}`, text };
  options.push(opt);
  return opt;
}

export function getMyScores(): ParticipantScores {
  return { ...myScores, scores: { ...myScores.scores } };
}

export function setScore(optionId: string, score: number): void {
  myScores = {
    ...myScores,
    scores: { ...myScores.scores, [optionId]: score },
  };
}

/** Returns scores from all participants including the current user */
export function getAllScores(): ParticipantScores[] {
  return [myScores, ...otherScores];
}
