import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Calendar } from 'lucide-react';

import type { FlowProps } from '../types';
import { useEventStream } from '../../../../hooks/useEventStream';
import { FlowLoading, FlowError } from '../FlowShell';
import * as api from './schedulingApi';
import type { RangeConfig, SchedulingState } from './schedulingApi';
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
  onClose: () => void;
  onDone: (config: Omit<RangeConfig, 'organizerId'>) => void;
}> = ({ isOpen, onClose, onDone }) => {
  const today    = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

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
    if (!title.trim())          { setError('Title is required.');                   return; }
    if (startDate > endDate)    { setError('Start date must be before end date.');  return; }
    if (dailyStart >= dailyEnd) { setError('Daily end must be after daily start.'); return; }
    onDone({ title: title.trim(), description: desc.trim(), startDate, endDate, dailyStart, dailyEnd, slotMinutes });
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3 className={styles.dialogTitle}>Set Up Scheduling</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.dialogContent}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Title *</label>
            <input className={styles.input} type="text" value={title} autoFocus
              placeholder="e.g. Sprint planning session"
              onChange={e => { setTitle(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Description <span className={styles.optional}>(optional)</span></label>
            <textarea className={styles.textarea} rows={2} value={desc}
              placeholder="Any context for participants?"
              onChange={e => setDesc(e.target.value)} />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>From date</label>
              <input className={styles.input} type="date" value={startDate} min={today}
                onChange={e => { setStartDate(e.target.value); setError(''); }} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>To date</label>
              <input className={styles.input} type="date" value={endDate} min={startDate}
                onChange={e => { setEndDate(e.target.value); setError(''); }} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Daily from</label>
              <input className={styles.input} type="time" value={dailyStart}
                onChange={e => { setDailyStart(e.target.value); setError(''); }} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Daily to</label>
              <input className={styles.input} type="time" value={dailyEnd}
                onChange={e => { setDailyEnd(e.target.value); setError(''); }} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Resolution</label>
              <select className={styles.input} value={slotMinutes}
                onChange={e => setSlotMinutes(Number(e.target.value) as 30 | 60)}>
                <option value={30}>30 min</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}
        </div>

        <div className={styles.dialogActions}>
          <button className={styles.btnCreate} onClick={submit}>
            <Calendar size={15} /> Create
          </button>
          <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
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
  persistedRef.current = myPersistedSlots;

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
export const SchedulingSetupDialog: React.FC<{
  onDone: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}> = ({ onDone, onCancel }) => (
  <SetupDialog isOpen={true} onClose={onCancel} onDone={onDone} />
);

const SchedulingFlow: React.FC<FlowProps> = ({ instanceId, flowServer, flowAgent, currentUser }) => {
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [state,      setState]      = useState<SchedulingState>({ config: null, selections: [] });
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try   { setState(await api.loadSchedulingState(flowServer, flowAgent, instanceId)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load.'); }
    finally   { setLoading(false); }
  }, [flowServer, flowAgent, instanceId]);

  useEffect(() => { void load(); }, [load]);

  useEventStream('contract_write', useCallback((event) => {
    if (event.contract === instanceId) void load();
  }, [instanceId, load]));

  const handleSetup = useCallback(async (fields: Omit<RangeConfig, 'organizerId'>) => {
    try   { await api.setupRange(flowServer, flowAgent, instanceId, fields, currentUser); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to save.'); }
  }, [flowServer, flowAgent, instanceId, currentUser]);

  const handleSave = useCallback(async (slots: number[]) => {
    setState(prev => {
      const others = prev.selections.filter(s => s.participantId !== currentUser);
      return { ...prev, selections: [...others, { participantId: currentUser, slots }] };
    });
    try   { await api.setMySelection(flowServer, flowAgent, instanceId, currentUser, slots); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to save.'); await load(); }
  }, [flowServer, flowAgent, currentUser, instanceId, load]);

  if (loading) return <FlowLoading />;
  if (error)   return <FlowError message={error} onRetry={load} />;

  const organizer         = api.isOrganizer(state.config, currentUser);
  const mySelection       = state.selections.find(s => s.participantId === currentUser);
  const totalParticipants = state.selections.length;

  if (!state.config) return <FlowLoading />;

  return (
    <div className={styles.container}>
      <div className={styles.eventHeader}>
        <Calendar size={18} className={styles.eventIcon} />
        <div className={styles.eventHeaderText}>
          <h2 className={styles.eventTitle}>{state.config.title}</h2>
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
        onClose={() => setDialogOpen(false)}
        onDone={handleSetup}
      />
    </div>
  );
};

export default SchedulingFlow;
