import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

/** Logs every call this file makes to the scheduling flow contract, and the
 * raw reply, so a stuck/broken flow can be diagnosed from the console. */
function logSchedulingCall(tsFunction: string, contractMethod: string, params: unknown): void {
  console.log(`[schedulingApi.ts] ${tsFunction} -> SchedulingFlow.${contractMethod}`, params);
}
function logSchedulingResult(tsFunction: string, contractMethod: string, result: unknown): void {
  console.log(`[schedulingApi.ts] ${tsFunction} <- SchedulingFlow.${contractMethod}`, result);
}

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export interface RangeConfig {
  title: string;
  description: string;
  organizerId: string;
  startDate: string;    // "YYYY-MM-DD"
  endDate: string;      // "YYYY-MM-DD"
  dailyStart: string;   // "HH:MM"
  dailyEnd: string;     // "HH:MM"
  slotMinutes: number;  // 30 or 60
}

export interface ParticipantSelection {
  participantId: string;
  slots: number[];      // sorted global slot indices
}

export interface SchedulingState {
  config: RangeConfig | null;
  selections: ParticipantSelection[];
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

function normalizeConfig(r: Record<string, unknown>): RangeConfig {
  return {
    title:        String(r['title']        ?? ''),
    description:  String(r['description']  ?? ''),
    organizerId:  String(r['organizerId']  ?? ''),
    startDate:    String(r['startDate']    ?? ''),
    endDate:      String(r['endDate']      ?? ''),
    dailyStart:   String(r['dailyStart']   ?? '09:00'),
    dailyEnd:     String(r['dailyEnd']     ?? '18:00'),
    slotMinutes:  Number(r['slotMinutes']  ?? 30),
  };
}

function normalizeSelection(r: Record<string, unknown>): ParticipantSelection {
  const rawSlots = r['slots'];
  return {
    participantId: String(r['participantId'] ?? ''),
    slots: Array.isArray(rawSlots) ? rawSlots.map(Number) : [],
  };
}

// ---------------------------------------------------------------------------
// Async API
// ---------------------------------------------------------------------------

export async function loadSchedulingState(
  server: string,
  agent: string,
  contractId: string,
): Promise<SchedulingState> {
  logSchedulingCall('loadSchedulingState', 'get_config', {});
  logSchedulingCall('loadSchedulingState', 'get_all_selections', {});
  const [rawConfig, rawSelections] = await Promise.all([
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_config',         values: {} } as IMethod }),
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_all_selections', values: {} } as IMethod }),
  ]);
  logSchedulingResult('loadSchedulingState', 'get_config', rawConfig);
  logSchedulingResult('loadSchedulingState', 'get_all_selections', rawSelections);

  let config: RangeConfig | null = null;
  if (rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig)) {
    const c = rawConfig as Record<string, unknown>;
    if (c['title']) config = normalizeConfig(c);
  }

  const selections: ParticipantSelection[] = Array.isArray(rawSelections)
    ? (rawSelections as Record<string, unknown>[])
        .map(normalizeSelection)
        .filter(s => s.participantId !== '')
    : [];

  console.log('[schedulingApi.ts] loadSchedulingState normalized ->', { config, selections });
  return { config, selections };
}

export async function setupRange(
  server: string,
  agent: string,
  contractId: string,
  fields: Omit<RangeConfig, 'organizerId'>,
  currentUser: string,
): Promise<void> {
  const values = { config: { ...fields, organizerId: currentUser } };
  logSchedulingCall('setupRange', 'set_config', values);
  const result = await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'set_config', values } as IMethod,
  });
  logSchedulingResult('setupRange', 'set_config', result);
}

export async function setMySelection(
  server: string,
  agent: string,
  contractId: string,
  currentUser: string,
  slots: number[],
): Promise<void> {
  const values = { participant_id: currentUser, slots };
  logSchedulingCall('setMySelection', 'set_my_selection', values);
  const result = await contractWrite({
    serverUrl: server, publicKey: agent, contractId,
    method: { name: 'set_my_selection', values } as IMethod,
  });
  logSchedulingResult('setMySelection', 'set_my_selection', result);
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function isOrganizer(config: RangeConfig | null, currentUser: string): boolean {
  return config?.organizerId === currentUser;
}

export function computeSlotsPerDay(config: RangeConfig): number {
  const [sh, sm] = config.dailyStart.split(':').map(Number);
  const [eh, em] = config.dailyEnd.split(':').map(Number);
  return Math.max(0, Math.floor(((eh * 60 + em) - (sh * 60 + sm)) / config.slotMinutes));
}

export function computeDays(config: RangeConfig): Date[] {
  const days: Date[] = [];
  const cur = new Date(config.startDate + 'T00:00:00');
  const end = new Date(config.endDate   + 'T00:00:00');
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** "HH:MM" label for the i-th slot within a day */
export function slotTimeLabel(slotWithinDay: number, config: RangeConfig): string {
  const [sh, sm] = config.dailyStart.split(':').map(Number);
  const mins = sh * 60 + sm + slotWithinDay * config.slotMinutes;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function globalIndex(dayIdx: number, slotWithinDay: number, slotsPerDay: number): number {
  return dayIdx * slotsPerDay + slotWithinDay;
}

/** slot-index → count of participants who selected it */
export function buildCountMap(selections: ParticipantSelection[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const sel of selections)
    for (const idx of sel.slots)
      map.set(idx, (map.get(idx) ?? 0) + 1);
  return map;
}
