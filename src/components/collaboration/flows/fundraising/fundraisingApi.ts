// ---------------------------------------------------------------------------
// Fundraising flow — persisted via contract API
// ---------------------------------------------------------------------------

import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export interface Contribution {
  id: string;
  participantId: string;
  amount: number;
  timestamp: number;
}

export interface FundConfig {
  name: string;
  description: string;
  goal: number | null;
}

export interface FundState {
  config: FundConfig | null;
  contributions: Contribution[];
}

export const CURRENCY_SYMBOL = 'credits';

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

function normalizeConfig(c: Record<string, unknown>): FundConfig {
  return {
    name: typeof c.name === 'string' ? c.name : '',
    description: typeof c.description === 'string' ? c.description : '',
    goal: typeof c.goal === 'number' ? c.goal : null,
  };
}

function normalizeContribution(c: Record<string, unknown>): Contribution {
  return {
    id: typeof c.id === 'string' ? c.id : String(c.id ?? ''),
    participantId: typeof c.participantId === 'string' ? c.participantId : '',
    amount: typeof c.amount === 'number' ? c.amount : Number(c.amount ?? 0),
    timestamp: typeof c.timestamp === 'number' ? c.timestamp : Number(c.timestamp ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Async API
// ---------------------------------------------------------------------------

export async function loadFund(server: string, agent: string, contractId: string): Promise<FundState> {
  const [rawConfig, rawContributions] = await Promise.all([
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_config', values: {} } as IMethod }),
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_contributions', values: {} } as IMethod }),
  ]);

  // config is null if the contract returns an empty object {}
  const configIsEmpty = !rawConfig || (typeof rawConfig === 'object' && Object.keys(rawConfig as object).length === 0);
  const config = configIsEmpty ? null : normalizeConfig(rawConfig as Record<string, unknown>);

  const contributionsArray: unknown[] = Array.isArray(rawContributions) ? rawContributions : [];
  const contributions = contributionsArray.map(c => normalizeContribution(c as Record<string, unknown>));

  return { config, contributions };
}

export async function configureFund(
  server: string,
  agent: string,
  contractId: string,
  name: string,
  description: string,
  goal: number | null,
): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_config', values: { config: { name: name.trim(), description: description.trim(), goal } } } as IMethod,
  });
}

export async function contribute(
  server: string,
  agent: string,
  contractId: string,
  currentUser: string,
  amount: number,
): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: {
      name: 'add_contribution',
      values: {
        contribution: {
          id: crypto.randomUUID(),
          participantId: currentUser,
          amount,
          timestamp: Date.now(),
        },
      },
    } as IMethod,
  });
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function totalRaised(contributions: Contribution[]): number {
  return contributions.reduce((sum, c) => sum + c.amount, 0);
}

export function contributionByUser(contributions: Contribution[], participantId: string): number {
  return contributions
    .filter(c => c.participantId === participantId)
    .reduce((sum, c) => sum + c.amount, 0);
}
