// ---------------------------------------------------------------------------
// Event scheduling flow — local in-memory store, no persistence yet
// ---------------------------------------------------------------------------

export type Availability = 'yes' | 'maybe' | 'no';

export interface TimeSlot {
  id: string;
  date: string;       // ISO date, e.g. "2025-09-15"
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
}

/** participantId -> slotId -> availability */
export type ResponseMap = Record<string, Record<string, Availability>>;

export interface EventState {
  title: string | null;
  description: string;
  slots: TimeSlot[];
  responses: ResponseMap;
  confirmedSlotId: string | null;
  organizerId: string;
}

export const CURRENT_USER = 'me';
const ALL_PARTICIPANTS = ['me', 'alice', 'bob', 'carol'];

// ---------------------------------------------------------------------------
// Per-instance store (keyed by instanceId)
// ---------------------------------------------------------------------------
const stateByInstance = new Map<string, EventState>();

function getStore(instanceId: string): EventState {
  if (!stateByInstance.has(instanceId)) {
    stateByInstance.set(instanceId, {
      title: null,
      description: '',
      slots: [],
      responses: {},
      confirmedSlotId: null,
      organizerId: CURRENT_USER,
    });
  }
  return stateByInstance.get(instanceId)!;
}

function setStore(instanceId: string, s: EventState): void {
  stateByInstance.set(instanceId, s);
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export function getState(instanceId: string): EventState {
  const state = getStore(instanceId);
  return {
    ...state,
    slots: state.slots.map(s => ({ ...s })),
    responses: JSON.parse(JSON.stringify(state.responses)),
  };
}

export function isOrganizer(instanceId: string): boolean {
  return getStore(instanceId).organizerId === CURRENT_USER;
}

export function getParticipants(): string[] {
  return [...ALL_PARTICIPANTS];
}

export function setupEvent(instanceId: string, title: string, description: string): void {
  const state = getStore(instanceId);
  setStore(instanceId, { ...state, title: title.trim(), description: description.trim() });
}

export function addSlot(instanceId: string, date: string, startTime: string, endTime: string): TimeSlot {
  const state = getStore(instanceId);
  const slot: TimeSlot = {
    id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    date,
    startTime,
    endTime,
  };
  const newState = { ...state, slots: [...state.slots, slot] };

  // Auto-fill simulated responses for non-me participants
  const PATTERNS: Availability[][] = [
    ['yes',   'no',    'maybe', 'yes'  ],
    ['maybe', 'yes',   'yes',   'no'   ],
    ['no',    'maybe', 'yes',   'maybe'],
  ];
  const simParticipants = ALL_PARTICIPANTS.filter(p => p !== CURRENT_USER);
  const slotIndex = newState.slots.length - 1;

  const newResponses: ResponseMap = JSON.parse(JSON.stringify(newState.responses));
  simParticipants.forEach((p, pi) => {
    if (!newResponses[p]) newResponses[p] = {};
    const av = PATTERNS[pi % PATTERNS.length][slotIndex % 4];
    newResponses[p][slot.id] = av;
  });
  setStore(instanceId, { ...newState, responses: newResponses });

  return { ...slot };
}

export function removeSlot(instanceId: string, slotId: string): void {
  const state = getStore(instanceId);
  setStore(instanceId, {
    ...state,
    slots: state.slots.filter(s => s.id !== slotId),
    responses: Object.fromEntries(
      Object.entries(state.responses).map(([p, rs]) => {
        const { [slotId]: _removed, ...rest } = rs;
        return [p, rest];
      })
    ),
  });
}

export function setAvailability(instanceId: string, slotId: string, availability: Availability): void {
  const state = getStore(instanceId);
  const newResponses: ResponseMap = JSON.parse(JSON.stringify(state.responses));
  if (!newResponses[CURRENT_USER]) newResponses[CURRENT_USER] = {};
  newResponses[CURRENT_USER][slotId] = availability;
  setStore(instanceId, { ...state, responses: newResponses });
}

export function confirmSlot(instanceId: string, slotId: string): void {
  if (!isOrganizer(instanceId)) return;
  const state = getStore(instanceId);
  setStore(instanceId, { ...state, confirmedSlotId: slotId });
}

export function unconfirm(instanceId: string): void {
  if (!isOrganizer(instanceId)) return;
  const state = getStore(instanceId);
  setStore(instanceId, { ...state, confirmedSlotId: null });
}

/** Returns yes+maybe count per slot, sorted best-first */
export function slotScores(instanceId: string): { slotId: string; yes: number; maybe: number; total: number }[] {
  const state = getStore(instanceId);
  return state.slots.map(s => {
    let yes = 0, maybe = 0;
    for (const p of ALL_PARTICIPANTS) {
      const av = state.responses[p]?.[s.id];
      if (av === 'yes')   yes++;
      if (av === 'maybe') maybe++;
    }
    return { slotId: s.id, yes, maybe, total: yes * 2 + maybe };
  }).sort((a, b) => b.total - a.total);
}
