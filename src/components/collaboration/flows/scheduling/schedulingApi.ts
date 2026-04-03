// ---------------------------------------------------------------------------
// Event scheduling flow — persisted via contract API
// ---------------------------------------------------------------------------

import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

export type Availability = 'yes' | 'maybe' | 'no';

export interface TimeSlot {
  id: string;
  date: string;       // ISO date, e.g. "2025-09-15"
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
}

/** participantId → slotId → availability */
export type ResponseMap = Record<string, Record<string, Availability>>;

export interface EventConfig {
  title: string;
  description: string;
  organizerId: string;
}

export interface EventState {
  config: EventConfig | null;
  slots: TimeSlot[];
  responses: ResponseMap;
  confirmedSlotId: string | null;
}

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

function normalizeTimeSlot(s: Record<string, unknown>): TimeSlot {
  return {
    id: String(s['id'] ?? ''),
    date: String(s['date'] ?? ''),
    startTime: String(s['startTime'] ?? ''),
    endTime: String(s['endTime'] ?? ''),
  };
}

function normalizeConfig(c: Record<string, unknown>): EventConfig {
  return {
    title: String(c['title'] ?? ''),
    description: String(c['description'] ?? ''),
    organizerId: String(c['organizerId'] ?? ''),
  };
}

function normalizeAvailabilityRecord(r: Record<string, unknown>): { participantId: string; responses: Record<string, Availability> } {
  let responses: Record<string, Availability>;
  const raw = r['responses'];
  if (typeof raw === 'string') {
    try {
      responses = JSON.parse(raw) as Record<string, Availability>;
    } catch {
      responses = {};
    }
  } else if (raw && typeof raw === 'object') {
    responses = raw as Record<string, Availability>;
  } else {
    responses = {};
  }
  return {
    participantId: String(r['participantId'] ?? ''),
    responses,
  };
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export async function loadEventState(
  server: string,
  agent: string,
  contractId: string,
): Promise<EventState> {
  const [rawConfig, rawSlots, rawAvailability, rawConfirmed] = await Promise.all([
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_config', values: {} } as IMethod }),
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_slots', values: {} } as IMethod }),
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_all_availability', values: {} } as IMethod }),
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_confirmed_slot', values: {} } as IMethod }),
  ]);

  // Config: null if empty dict or missing title
  let config: EventConfig | null = null;
  if (rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig)) {
    const c = rawConfig as Record<string, unknown>;
    if (c['title']) {
      config = normalizeConfig(c);
    }
  }

  // Slots
  const slots: TimeSlot[] = Array.isArray(rawSlots)
    ? (rawSlots as Record<string, unknown>[]).map(normalizeTimeSlot)
    : [];

  // Responses: flatten [{participantId, responses}] → ResponseMap
  const responses: ResponseMap = {};
  if (Array.isArray(rawAvailability)) {
    for (const entry of rawAvailability as Record<string, unknown>[]) {
      const { participantId, responses: pResponses } = normalizeAvailabilityRecord(entry);
      if (participantId) {
        responses[participantId] = pResponses;
      }
    }
  }

  // Confirmed slot
  let confirmedSlotId: string | null = null;
  if (typeof rawConfirmed === 'string' && rawConfirmed.trim() !== '') {
    confirmedSlotId = rawConfirmed;
  }

  return { config, slots, responses, confirmedSlotId };
}

export async function setupEvent(
  server: string,
  agent: string,
  contractId: string,
  title: string,
  description: string,
  currentUser: string,
): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: {
      name: 'set_config',
      values: { config: { title: title.trim(), description: description.trim(), organizerId: currentUser } },
    } as IMethod,
  });
}

export async function addSlot(
  server: string,
  agent: string,
  contractId: string,
  date: string,
  startTime: string,
  endTime: string,
): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: {
      name: 'add_slot',
      values: { slot: { id: crypto.randomUUID(), date, startTime, endTime } },
    } as IMethod,
  });
}

export async function removeSlot(
  server: string,
  agent: string,
  contractId: string,
  slots: TimeSlot[],
  slotId: string,
): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: {
      name: 'set_slots',
      values: { slots: slots.filter(s => s.id !== slotId) },
    } as IMethod,
  });
}

export async function setMyAvailability(
  server: string,
  agent: string,
  contractId: string,
  currentResponses: Record<string, Availability>,
  slotId: string,
  availability: Availability,
): Promise<void> {
  const newResponses = { ...currentResponses, [slotId]: availability };
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: {
      name: 'set_my_availability',
      values: { responses: newResponses },
    } as IMethod,
  });
}

export async function confirmSlot(
  server: string,
  agent: string,
  contractId: string,
  slotId: string,
): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_confirmed_slot', values: { slot_id: slotId } } as IMethod,
  });
}

export async function unconfirmSlot(
  server: string,
  agent: string,
  contractId: string,
): Promise<void> {
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_confirmed_slot', values: { slot_id: '' } } as IMethod,
  });
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function isOrganizer(config: EventConfig | null, currentUser: string): boolean {
  return config?.organizerId === currentUser;
}

export function slotScores(
  slots: TimeSlot[],
  responses: ResponseMap,
): { slotId: string; yes: number; maybe: number; total: number }[] {
  return slots.map(s => {
    let yes = 0, maybe = 0;
    for (const pResponses of Object.values(responses)) {
      const av = pResponses[s.id];
      if (av === 'yes')   yes++;
      if (av === 'maybe') maybe++;
    }
    return { slotId: s.id, yes, maybe, total: yes * 2 + maybe };
  }).sort((a, b) => b.total - a.total);
}
