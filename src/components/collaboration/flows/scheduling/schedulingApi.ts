import { readSilently, write } from '../../../../services/ibc';

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
// Async API — the contract (SchedulingFlow.sol): its organizer, who deploys
// it, sets the range; each participant (whoever signs) selects slots.
// ---------------------------------------------------------------------------

type RawRange = Omit<RangeConfig, 'organizerId'> & { organizer: string };

/** The deploy's constructor arguments, from the setup dialog. */
export const schedulingConstructor = (config: Record<string, unknown>) => rangeValues(config as Omit<RangeConfig, 'organizerId'>);

const rangeValues = (fields: Omit<RangeConfig, 'organizerId'>) => ({
  title: fields.title,
  description: fields.description,
  startDate: fields.startDate,
  endDate: fields.endDate,
  dailyStart: fields.dailyStart,
  dailyEnd: fields.dailyEnd,
  slotMinutes: fields.slotMinutes,
});

export async function loadSchedulingState(contractId: string): Promise<SchedulingState> {
  const [range, rawSelections] = await Promise.all([
    readSilently(contractId, 'getRange') as Promise<RawRange>,
    readSilently(contractId, 'getSelections') as Promise<{ participant: string; slots: number[] }[]>,
  ]);
  const config: RangeConfig = {
    title: range.title,
    description: range.description,
    organizerId: range.organizer,
    startDate: range.startDate,
    endDate: range.endDate,
    dailyStart: range.dailyStart,
    dailyEnd: range.dailyEnd,
    slotMinutes: Number(range.slotMinutes),
  };
  const selections = rawSelections.map((s) => ({ participantId: s.participant, slots: s.slots.map(Number) }));
  return { config, selections };
}

/** Changes the range: its organizer only. May open the node's approval page: call it from a click. */
export async function setupRange(contractId: string, fields: Omit<RangeConfig, 'organizerId'>): Promise<void> {
  const values = rangeValues(fields);
  await write(contractId, 'setRange', values);
}

/** Saves the user's slots. May open the node's approval page: call it from a click. */
export async function setMySelection(contractId: string, slots: number[]): Promise<void> {
  await write(contractId, 'setMySelection', { slots });
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function isOrganizer(config: RangeConfig | null, currentUser: string): boolean {
  return !!config && config.organizerId.toLowerCase() === currentUser.toLowerCase();
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
