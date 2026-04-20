// Seed data for the 5 demo initiatives — one per stage so the user can review
// every flow's UI populated end-to-end.

import type { Persona } from './personas';

export interface SeedInitiative {
  title: string;
  description: string;
  stage: 'problem' | 'discussion' | 'proposals' | 'vote' | 'mandate';
  countries: string[];
  evidence: string[];
  proposals: string[]; // proposal texts (used for both approval + QV stages)
  conviction: {
    // fraction of personas that stake, and max amount per persona
    participationRate: number;
    maxAmount: number;
  };
}

export const DEMO_INITIATIVES: SeedInitiative[] = [
  {
    title: 'Global Water Access Crisis',
    description: 'Over 2 billion people worldwide lack access to safely managed drinking water. This affects health, education, and economic development across multiple countries and requires coordinated global action.',
    stage: 'problem',
    countries: ['KE', 'NG', 'IN', 'BD', 'PH'],
    evidence: ['https://www.who.int/news-room/fact-sheets/detail/drinking-water'],
    proposals: [
      'Fund decentralised community wells in the 10 most water-stressed districts by Q3.',
      'Create a global rainwater harvesting standard that low-resource builders can apply locally.',
      'Subsidise household ceramic filter production in partnership with existing potters.',
      'Launch a water-quality citizen-reporting network tied to a public dashboard.',
      'Invest in desalination research for coastal communities facing saltwater intrusion.',
    ],
    conviction: { participationRate: 0.6, maxAmount: 50 },
  },
  {
    title: 'Misinformation & Democratic Integrity',
    description: 'AI-generated misinformation is undermining democratic processes globally. Voters are being manipulated and public trust in institutions is declining rapidly across borders.',
    stage: 'discussion',
    countries: ['US', 'BR', 'PH', 'NG', 'DE', 'FR'],
    evidence: [],
    proposals: [
      'Require provenance metadata on all political ads served through major platforms.',
      'Fund multilingual fact-checking newsrooms in countries with upcoming elections.',
      'Create a citizen panel that audits recommendation algorithms twice a year.',
      'Mandate clear labels for any AI-generated imagery in public communication.',
    ],
    conviction: { participationRate: 0.7, maxAmount: 60 },
  },
  {
    title: 'Youth Employment & Education',
    description: 'Youth unemployment rates exceed 30% in many countries. Millions of young people face economic exclusion, leading to social instability and brain drain from developing nations.',
    stage: 'proposals',
    countries: ['KE', 'ZA', 'ES', 'GR', 'EG', 'GH'],
    evidence: [],
    proposals: [
      'Public apprenticeship guarantee for under-25s who have been unemployed for 12+ months.',
      'Community-run learning hubs co-designed with local employers, funded per graduate placed.',
      'Remote-work readiness grants including laptops, broadband, and language tutoring.',
      'Cooperative formation grants: seed capital for youth-led worker cooperatives.',
      'Regional mentorship matching — diaspora professionals paired with home-country youth.',
    ],
    conviction: { participationRate: 0.55, maxAmount: 40 },
  },
  {
    title: 'Digital Privacy Standards',
    description: 'Personal data is harvested at an unprecedented scale with minimal regulation in most countries. A global framework for digital rights is urgently needed to protect citizens worldwide.',
    stage: 'vote',
    countries: ['DE', 'FR', 'US', 'JP', 'BR', 'IN'],
    evidence: [],
    proposals: [
      'Baseline right to data portability and deletion across all consumer services.',
      'Mandatory end-to-end encryption for messaging services above a user threshold.',
      'Ban on sale of location data from mobile operators without explicit opt-in.',
      'Independent privacy audits published for services holding biometric data.',
      'Default opt-out for personalised advertising across ad exchanges.',
    ],
    conviction: { participationRate: 0.8, maxAmount: 75 },
  },
  {
    title: 'Universal Climate Adaptation Fund',
    description: 'Communities worldwide need a decentralised climate adaptation fund. Local communities can apply directly for resilience infrastructure and disaster preparedness resources.',
    stage: 'mandate',
    countries: ['MW', 'BD', 'PH', 'MX', 'KE', 'FJ', 'CL'],
    evidence: [],
    proposals: [
      'Direct-to-community adaptation grants under $50k with simplified applications.',
      'Shared satellite early-warning feeds for flood, drought, and cyclone-prone regions.',
      'Seed capital for community-owned microgrids in storm-affected zones.',
      'Climate training-of-trainers programme building local resilience educators.',
    ],
    conviction: { participationRate: 0.9, maxAmount: 100 },
  },
];

// Deterministic helpers so demo state reproduces across reloads.

export function votePattern(personas: Persona[], seed: number): Record<string, 'up' | 'down'> {
  const votes: Record<string, 'up' | 'down'> = {};
  let s = seed || 1;
  for (const p of personas) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    votes[p.publicKey] = (s % 100) < 78 ? 'up' : 'down'; // ~78% approval baseline
  }
  return votes;
}

export function approvalPattern(
  personas: Persona[],
  proposalIds: string[],
  seed: number,
): Record<string, string[]> {
  const approvals: Record<string, string[]> = {};
  let s = seed || 1;
  for (const p of personas) {
    const approved: string[] = [];
    for (const pid of proposalIds) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      if ((s % 100) < 55) approved.push(pid);
    }
    if (approved.length > 0) approvals[p.publicKey] = approved;
  }
  return approvals;
}

export function qvAllocationPattern(
  personas: Persona[],
  proposalIds: string[],
  creditsPerVoter: number,
  seed: number,
): Record<string, Record<string, number>> {
  const alloc: Record<string, Record<string, number>> = {};
  let s = seed || 1;
  for (const p of personas) {
    const perVoter: Record<string, number> = {};
    let remaining = creditsPerVoter;
    const count = proposalIds.length;
    for (let i = 0; i < count; i += 1) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      if (i === count - 1) {
        perVoter[proposalIds[i]] = remaining;
      } else {
        const maxHere = Math.floor(remaining / (count - i));
        const amount = s % (maxHere + 1);
        perVoter[proposalIds[i]] = amount;
        remaining -= amount;
      }
    }
    // drop zeros to mirror the mock's behaviour
    const cleaned: Record<string, number> = {};
    for (const [pid, credits] of Object.entries(perVoter)) {
      if (credits > 0) cleaned[pid] = credits;
    }
    alloc[p.publicKey] = cleaned;
  }
  return alloc;
}

const DURATIONS: Array<'1w' | '1m' | '3m' | '6m' | '1y'> = ['1w', '1m', '3m', '6m', '1y'];

export function convictionPattern(
  personas: Persona[],
  participationRate: number,
  maxAmount: number,
  seed: number,
): Array<{ voter: string; amount: number; duration: '1w' | '1m' | '3m' | '6m' | '1y'; country: string; timestamp: number }> {
  const stakes: Array<{ voter: string; amount: number; duration: '1w' | '1m' | '3m' | '6m' | '1y'; country: string; timestamp: number }> = [];
  let s = seed || 1;
  const now = Date.now();
  for (const p of personas) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    if ((s % 100) / 100 >= participationRate) continue;
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const amount = Math.max(1, Math.floor(((s % 100) / 100) * maxAmount));
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const duration = DURATIONS[s % DURATIONS.length];
    stakes.push({
      voter: p.publicKey,
      amount,
      duration,
      country: p.country,
      timestamp: now - (s % (7 * 24 * 3600 * 1000)),
    });
  }
  return stakes;
}
