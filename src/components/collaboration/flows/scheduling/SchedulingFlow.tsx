import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Calendar } from 'lucide-react';

import type { FlowProps, SetupProps } from '../types';
import { TitleField } from '../FlowTitle';
import { useFlowData } from '../useFlowData';
import { FlowLoading, FlowError } from '../FlowShell';
import * as api from './schedulingApi';
import type { RangeConfig, SchedulingState } from './schedulingApi';
import Modal from '../../../Modal';
import form from '../../../dialogForm.module.scss';
import styles from './SchedulingFlow.module.scss';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatHourLabel(time: string): string {
  const h = parseInt(time.split(':')[0], 10);
  if (h === 0)  return '12am';
  if (h < 12)   return `${h}am`;
  if (h === 12) return '12pm';
  return `${h - 12}pm`;
}

function heatStyle(count: number, total: number): string {
  if (count === 0 || total === 0) return '';
  const alpha = 0.12 + (count / total) * 0.73;
  return `rgba(16, 185, 129, ${alpha.toFixed(2)})`;
}

// ---------------------------------------------------------------------------
// Setup dialog
// ---------------------------------------------------------------------------

const SetupDialog: React.FC<{
  isOpen: boolean;
  heading: string;
  onClose: () => void;
  onDone: (config: Omit<RangeConfig, 'organizerId'>) => void;
}> = ({ isOpen, heading, onClose, onDone }) => {
  const [today]    = useState(() => new Date().toISOString().slice(0, 10));
  const [nextWeek] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));

  const [title,       setTitle]       = useState('');
  const [desc,        setDesc]        = useState('');
  const [startDate,   setStartDate]   = useState(today);
  const [endDate,     setEndDate]     = useState(nextWeek);
  const [dailyStart,  setDailyStart]  = useState('09:00');
  const [dailyEnd,    setDailyEnd]    = useState('18:00');
  const [slotMinutes, setSlotMinutes] = useState<30 | 60>(30);
  const [error,       setError]       = useState('');

  if (!isOpen) return null;

  const submit = () => {
    if (!title.trim())          { setError('Please give the flow a title.');        return; }
    if (startDate > endDate)    { setError('Start date must be before end date.');  return; }
    if (dailyStart >= dailyEnd) { setError('Daily end must be after daily start.'); return; }
    onDone({ title: title.trim(), description: desc.trim(), startDate, endDate, dailyStart, dailyEnd, slotMinutes });
    onClose();
  };

  return (
    <Modal
      title={heading}
      onClose={onClose}
      actions={(
        <>
          <button className={form.secondaryButton} onClick={onClose}>Cancel</button>
          <button className={form.primaryButton} onClick={submit}>
            <Calendar size={15} /> Create
          </button>
        </>
      )}
    >
      <TitleField value={title} placeholder="e.g. Sprint planning session"
        onChange={v => { setTitle(v); setError(''); }} onEnter={submit} />

      <div className={form.field}>
        <label className={form.label}>Description <span className={styles.optional}>(optional)</span></label>
        <textarea className={form.input} rows={2} value={desc}
          placeholder="Any context for participants?"
          onChange={e => setDesc(e.target.value)} />
      </div>

      <div className={styles.formRow}>
        <div className={form.field}>
          <label className={form.label}>From date</label>
          <input className={form.input} type="date" value={startDate} min={today}
            onChange={e => { setStartDate(e.target.value); setError(''); }} />
        </div>
        <div className={form.field}>
          <label className={form.label}>To date</label>
          <input className={form.input} type="date" value={endDate} min={startDate}
            onChange={e => { setEndDate(e.target.value); setError(''); }} />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={form.field}>
          <label className={form.label}>Daily from</label>
          <input className={form.input} type="time" value={dailyStart}
            onChange={e => { setDailyStart(e.target.value); setError(''); }} />
        </div>
        <div className={form.field}>
          <label className={form.label}>Daily to</label>
          <input className={form.input} type="time" value={dailyEnd}
            onChange={e => { setDailyEnd(e.target.value); setError(''); }} />
        </div>
        <div className={form.field}>
          <label className={form.label}>Resolution</label>
          <select className={form.input} value={slotMinutes}
            onChange={e => setSlotMinutes(Number(e.target.value) as 30 | 60)}>
            <option value={30}>30 min</option>
            <option value={60}>1 hour</option>
          </select>
        </div>
      </div>

      {error && <div className={form.error}>{error}</div>}
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Timeline grid with drag-to-select and live heatmap
// ---------------------------------------------------------------------------

const TimelineGrid: React.FC<{
  config: RangeConfig;
  state: SchedulingState;
  currentUser: string;
  onSave: (slots: number[]) => Promise<void>;
}> = ({ config, state, currentUser, onSave }) => {
  const slotsPerDay = api.computeSlotsPerDay(config);
  const days        = useMemo(() => api.computeDays(config),           [config]);
  const countMap    = useMemo(() => api.buildCountMap(state.selections), [state.selections]);
  const slotTimes   = useMemo(
    () => Array.from({ length: slotsPerDay }, (_, i) => api.slotTimeLabel(i, config)),
    [slotsPerDay, config],
  );

  const myPersistedSlots = useMemo(() => {
    const mine = state.selections.find(s => s.participantId === currentUser);
    return new Set<number>(mine?.slots ?? []);
  }, [state.selections, currentUser]);

  // Drag state
  const [dragMode,   setDragMode]   = useState<'add' | 'remove' | null>(null);
  const [draggedSet, setDraggedSet] = useState<Set<number>>(new Set());
  const dragModeRef    = useRef<'add' | 'remove' | null>(null);
  const draggedRef     = useRef<Set<number>>(new Set());
  const persistedRef   = useRef<Set<number>>(myPersistedSlots);
  useEffect(() => { persistedRef.current = myPersistedSlots; }, [myPersistedSlots]);

  // Visual selection = persisted + current drag overlay
  const effectiveSlots = useMemo(() => {
    if (!dragMode) return myPersistedSlots;
    const result = new Set(myPersistedSlots);
    if (dragMode === 'add') draggedSet.forEach(i => result.add(i));
    else                    draggedSet.forEach(i => result.delete(i));
    return result;
  }, [myPersistedSlots, dragMode, draggedSet]);

  const startDrag = (gIdx: number, e: React.MouseEvent) => {
    e.preventDefault();
    const mode = myPersistedSlots.has(gIdx) ? 'remove' : 'add';
    dragModeRef.current = mode;
    draggedRef.current  = new Set([gIdx]);
    setDragMode(mode);
    setDraggedSet(new Set([gIdx]));
  };

  const enterCell = (gIdx: number) => {
    if (!dragModeRef.current) return;
    draggedRef.current.add(gIdx);
    setDraggedSet(new Set(draggedRef.current));
  };

  useEffect(() => {
    const handleMouseUp = async () => {
      if (!dragModeRef.current) return;
      const mode    = dragModeRef.current;
      const dragged = new Set(draggedRef.current);
      dragModeRef.current  = null;
      draggedRef.current   = new Set();
      setDragMode(null);
      setDraggedSet(new Set());

      const result = new Set(persistedRef.current);
      if (mode === 'add') dragged.forEach(i => result.add(i));
      else                dragged.forEach(i => result.delete(i));
      await onSave(Array.from(result).sort((a, b) => a - b));
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [onSave]);

  const slotsPerHour = 60 / config.slotMinutes;
  const totalParticipants = state.selections.length;

  return (
    <div className={styles.gridWrapper}>
      <table className={styles.grid}>
        <thead>
          <tr>
            <th className={styles.cornerCell} />
            {slotTimes.map((time, i) => (
              <th key={i} className={styles.timeHeader}>
                {i % slotsPerHour === 0 ? formatHourLabel(time) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((day, dayIdx) => (
            <tr key={dayIdx}>
              <td className={styles.dayLabel}>{formatDayLabel(day)}</td>
              {slotTimes.map((_, slotIdx) => {
                const gIdx  = api.globalIndex(dayIdx, slotIdx, slotsPerDay);
                const count = countMap.get(gIdx) ?? 0;
                const mine  = effectiveSlots.has(gIdx);
                return (
                  <td
                    key={slotIdx}
                    className={`${styles.slot} ${mine ? styles.slotMine : ''}`}
                    style={{ background: mine ? undefined : heatStyle(count, totalParticipants) }}
                    onMouseDown={e => startDrag(gIdx, e)}
                    onMouseEnter={() => enterCell(gIdx)}
                    title={`${slotTimes[slotIdx]} — ${count} of ${totalParticipants} available`}
                  >
                    {count > 0 && !mine && (
                      <span className={styles.slotCount}>{count}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

/** Pre-create dialog exported for use by CollaborationPage before the tab is deployed. */
export const SchedulingSetupDialog: React.FC<SetupProps> = ({ onDone, onCancel }) => (
  <SetupDialog isOpen={true} heading="New Scheduling" onClose={onCancel} onDone={onDone} />
);

const SchedulingFlow: React.FC<FlowProps> = ({ instanceId, currentUser }) => {
  const { data, loading, error, retry } = useFlowData(instanceId, api.loadSchedulingState);
  const [dialogOpen, setDialogOpen] = useState(false);
  // A write that failed: the contract is as it was.
  const [writeError, setWriteError] = useState<string | null>(null);
  // My selection as I last saved it, shown until the contract's next state arrives.
  const [mySaved, setMySaved] = useState<{ base: SchedulingState; slots: number[] } | null>(null);

  const handleSetup = useCallback(async (fields: Omit<RangeConfig, 'organizerId'>) => {
    try   { await api.setupRange(instanceId, fields); }
    catch (e) { setWriteError(e instanceof Error ? e.message : 'Failed to save.'); }
  }, [instanceId]);

  const handleSave = useCallback(async (slots: number[]) => {
    if (data) setMySaved({ base: data, slots });
    try   { await api.setMySelection(instanceId, slots); }
    catch (e) { setMySaved(null); setWriteError(e instanceof Error ? e.message : 'Failed to save.'); }
  }, [data, instanceId]);

  if (loading) return <FlowLoading />;
  const failure = error ?? writeError;
  if (failure) return <FlowError message={failure} onRetry={() => { setWriteError(null); retry(); }} />;

  const state = data && mySaved?.base === data
    ? { ...data, selections: [...data.selections.filter(s => s.participantId !== currentUser), { participantId: currentUser, slots: mySaved.slots }] }
    : data;
  if (!state?.config) return <FlowLoading />;

  const organizer         = api.isOrganizer(state.config, currentUser);
  const mySelection       = state.selections.find(s => s.participantId === currentUser);
  const totalParticipants = state.selections.length;

  return (
    <div className={styles.container}>
      {/* Its title is the flow's, in the page's header */}
      <div className={styles.eventHeader}>
        <div className={styles.eventHeaderText}>
          {state.config.description && (
            <p className={styles.eventDesc}>{state.config.description}</p>
          )}
        </div>
        {organizer && (
          <button className={styles.btnSecondary} onClick={() => setDialogOpen(true)}>
            Edit
          </button>
        )}
      </div>

      <p className={styles.hint}>
        Drag to mark your available times (blue). Green intensity shows overlap across{' '}
        {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}.
        {mySelection && mySelection.slots.length > 0 && (
          <> You marked {mySelection.slots.length} slot{mySelection.slots.length !== 1 ? 's' : ''}.</>
        )}
      </p>

      <TimelineGrid
        config={state.config}
        state={state}
        currentUser={currentUser}
        onSave={handleSave}
      />

      <SetupDialog
        isOpen={dialogOpen}
        heading="Edit Scheduling"
        onClose={() => setDialogOpen(false)}
        onDone={handleSetup}
      />
    </div>
  );
};

export default SchedulingFlow;
