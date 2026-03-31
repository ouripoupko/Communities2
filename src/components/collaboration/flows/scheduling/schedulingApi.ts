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

/** participantId → slotId → availability */
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
// Seed data
// ---------------------------------------------------------------------------

// Pre-seed some slots and responses so the grid looks alive on first open
let state: EventState = {
  title: null,
  description: '',
  slots: [],
  responses: {},
  confirmedSlotId: null,
  organizerId: CURRENT_USER,
};

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export function getState(): EventState {
  return {
    ...state,
    slots: state.slots.map(s => ({ ...s })),
    responses: JSON.parse(JSON.stringify(state.responses)),
  };
}

export function isOrganizer(): boolean {
  return state.organizerId === CURRENT_USER;
}

export function getParticipants(): string[] {
  return [...ALL_PARTICIPANTS];
}

export function setupEvent(title: string, description: string): void {
  state = { ...state, title: title.trim(), description: description.trim() };
}

export function addSlot(date: string, startTime: string, endTime: string): TimeSlot {
  const slot: TimeSlot = {
    id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    date,
    startTime,
    endTime,
  };
  state = { ...state, slots: [...state.slots, slot] };

  // Auto-fill simulated responses for non-me participants
  const PATTERNS: Availability[][] = [
    ['yes',   'no',    'maybe', 'yes'  ],
    ['maybe', 'yes',   'yes',   'no'   ],
    ['no',    'maybe', 'yes',   'maybe'],
  ];
  const simParticipants = ALL_PARTICIPANTS.filter(p => p !== CURRENT_USER);
  const slotIndex = state.slots.length - 1;

  const newResponses: ResponseMap = JSON.parse(JSON.stringify(state.responses));
  simParticipants.forEach((p, pi) => {
    if (!newResponses[p]) newResponses[p] = {};
    const av = PATTERNS[pi % PATTERNS.length][slotIndex % 4];
    newResponses[p][slot.id] = av;
  });
  state = { ...state, responses: newResponses };

  return { ...slot };
}

export function removeSlot(slotId: string): void {
  state = {
    ...state,
    slots: state.slots.filter(s => s.id !== slotId),
    responses: Object.fromEntries(
      Object.entries(state.responses).map(([p, rs]) => {
        const { [slotId]: _removed, ...rest } = rs;
        return [p, rest];
      })
    ),
  };
}

export function setAvailability(slotId: string, availability: Availability): void {
  const newResponses: ResponseMap = JSON.parse(JSON.stringify(state.responses));
  if (!newResponses[CURRENT_USER]) newResponses[CURRENT_USER] = {};
  newResponses[CURRENT_USER][slotId] = availability;
  state = { ...state, responses: newResponses };
}

export function confirmSlot(slotId: string): void {
  if (!isOrganizer()) return;
  state = { ...state, confirmedSlotId: slotId };
}

export function unconfirm(): void {
  if (!isOrganizer()) return;
  state = { ...state, confirmedSlotId: null };
}

/** Returns yes+maybe count per slot, sorted best-first */
export function slotScores(): { slotId: string; yes: number; maybe: number; total: number }[] {
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
