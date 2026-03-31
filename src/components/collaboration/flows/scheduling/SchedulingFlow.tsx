import React, { useState, useCallback } from 'react';
import { Calendar, Check, Plus, Trash2, CheckCircle } from 'lucide-react';

import type { FlowProps } from '../types';
import * as api from './schedulingApi';
import type { Availability, EventState, TimeSlot } from './schedulingApi';
import styles from './SchedulingFlow.module.scss';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const AVAILABILITY_CYCLE: Availability[] = ['yes', 'maybe', 'no'];
const AVAIL_LABEL: Record<Availability, string> = { yes: '✓', maybe: '?', no: '✗' };
const authorLabel = (id: string) => id === api.CURRENT_USER ? 'You' : id;

function formatSlotHeader(slot: TimeSlot): { date: string; time: string } {
  const d = new Date(`${slot.date}T00:00:00`);
  return {
    date: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    time: `${slot.startTime} – ${slot.endTime}`,
  };
}

function nextAvailability(current: Availability | undefined): Availability {
  const idx = current ? AVAILABILITY_CYCLE.indexOf(current) : -1;
  return AVAILABILITY_CYCLE[(idx + 1) % AVAILABILITY_CYCLE.length];
}

// ---------------------------------------------------------------------------
// Setup screen
// ---------------------------------------------------------------------------
const SetupScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const [title, setTitle]       = useState('');
  const [desc,  setDesc]        = useState('');
  const [error, setError]       = useState('');

  const submit = () => {
    if (!title.trim()) { setError('Please give the event a title.'); return; }
    api.setupEvent(title, desc);
    onDone();
  };

  return (
    <div className={styles.setup}>
      <div className={styles.setupIcon}><Calendar size={40} /></div>
      <h2 className={styles.setupTitle}>Create Event</h2>
      <p className={styles.setupSubtitle}>
        Name the event, then add candidate time slots for participants to respond to.
      </p>

      <div className={styles.formGroup}>
        <label className={styles.label}>Event title *</label>
        <input
          className={styles.input}
          type="text"
          placeholder="e.g. Quarterly planning meeting"
          value={title}
          onChange={e => { setTitle(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          autoFocus
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Description <span className={styles.optional}>(optional)</span></label>
        <textarea
          className={styles.textarea}
          rows={3}
          placeholder="What is this event for?"
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}
      <button className={styles.btnPrimary} onClick={submit}>
        <Calendar size={16} /> Continue
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Add-slot form
// ---------------------------------------------------------------------------
const AddSlotForm: React.FC<{ onAdd: (date: string, start: string, end: string) => void }> = ({ onAdd }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [date,  setDate]  = useState(today);
  const [start, setStart] = useState('10:00');
  const [end,   setEnd]   = useState('11:00');
  const [error, setError] = useState('');

  const submit = () => {
    if (!date)  { setError('Pick a date.'); return; }
    if (start >= end) { setError('End time must be after start.'); return; }
    onAdd(date, start, end);
    setError('');
  };

  return (
    <div className={styles.addSlotForm}>
      <div className={styles.addSlotFields}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Date</label>
          <input className={styles.input} type="date" value={date} min={today}
            onChange={e => { setDate(e.target.value); setError(''); }} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Start</label>
          <input className={styles.input} type="time" value={start}
            onChange={e => { setStart(e.target.value); setError(''); }} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>End</label>
          <input className={styles.input} type="time" value={end}
            onChange={e => { setEnd(e.target.value); setError(''); }} />
        </div>
        <button className={styles.btnAdd} onClick={submit}>
          <Plus size={16} /> Add slot
        </button>
      </div>
      {error && <p className={styles.errorMsg}>{error}</p>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Availability grid
// ---------------------------------------------------------------------------
const AvailabilityGrid: React.FC<{
  eventState: EventState;
  participants: string[];
  scores: ReturnType<typeof api.slotScores>;
  onToggle: (slotId: string) => void;
  onConfirm: (slotId: string) => void;
  onRemoveSlot: (slotId: string) => void;
}> = ({ eventState, participants, scores, onToggle, onConfirm, onRemoveSlot }) => {
  const { slots, responses, confirmedSlotId } = eventState;
  const bestTotal = scores[0]?.total ?? 0;
  const scoreMap  = new Map(scores.map(s => [s.slotId, s]));

  return (
    <div className={styles.gridWrapper}>
      <table className={styles.grid}>
        <thead>
          <tr>
            <th className={styles.cornerCell} />
            {slots.map(slot => {
              const { date, time } = formatSlotHeader(slot);
              const score   = scoreMap.get(slot.id);
              const isBest  = bestTotal > 0 && score?.total === bestTotal;
              return (
                <th
                  key={slot.id}
                  className={`${styles.slotHeader} ${isBest ? styles.bestSlot : ''} ${slot.id === confirmedSlotId ? styles.confirmedSlot : ''}`}
                >
                  <div className={styles.slotDate}>{date}</div>
                  <div className={styles.slotTime}>{time}</div>
                  {isBest && <span className={styles.bestBadge}>Best</span>}
                  {slot.id === confirmedSlotId && <span className={styles.confirmedBadge}><CheckCircle size={12} /> Confirmed</span>}
                  {api.isOrganizer() && !confirmedSlotId && (
                    <div className={styles.slotActions}>
                      <button className={styles.btnConfirmSlot} onClick={() => onConfirm(slot.id)}
                        title="Confirm this slot">
                        <Check size={12} /> Confirm
                      </button>
                      <button className={styles.btnRemoveSlot} onClick={() => onRemoveSlot(slot.id)}
                        title="Remove slot">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {participants.map(p => {
            const isMe = p === api.CURRENT_USER;
            return (
              <tr key={p} className={isMe ? styles.myRow : ''}>
                <td className={styles.participantCell}>
                  <span className={`${styles.avatar} ${isMe ? styles.avatarMe : ''}`}>
                    {authorLabel(p)[0].toUpperCase()}
                  </span>
                  <span className={styles.participantName}>{authorLabel(p)}</span>
                </td>
                {slots.map(slot => {
                  const av = responses[p]?.[slot.id];
                  const isConfirmed = slot.id === confirmedSlotId;
                  return (
                    <td key={slot.id}
                      className={`${styles.cell} ${av ? styles[`av_${av}`] : styles.av_none} ${isConfirmed ? styles.cellConfirmed : ''}`}
                      onClick={isMe && !isConfirmed ? () => onToggle(slot.id) : undefined}
                      title={isMe && !isConfirmed ? 'Click to toggle availability' : undefined}
                    >
                      <span className={styles.avIcon}>
                        {av ? AVAIL_LABEL[av] : (isMe ? '–' : '·')}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* Summary row */}
          <tr className={styles.summaryRow}>
            <td className={styles.participantCell}>
              <span className={styles.summaryLabel}>Totals</span>
            </td>
            {slots.map(slot => {
              const s = scoreMap.get(slot.id);
              return (
                <td key={slot.id} className={`${styles.cell} ${styles.summaryCell} ${slot.id === confirmedSlotId ? styles.cellConfirmed : ''}`}>
                  <span className={styles.summaryYes}>{s?.yes ?? 0}✓</span>
                  <span className={styles.summaryMaybe}>{s?.maybe ?? 0}?</span>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Confirmed banner
// ---------------------------------------------------------------------------
const ConfirmedBanner: React.FC<{
  slot: TimeSlot;
  participants: string[];
  responses: EventState['responses'];
  onUnconfirm: () => void;
}> = ({ slot, participants, responses, onUnconfirm }) => {
  const { date, time } = formatSlotHeader(slot);
  const attending = participants.filter(p => responses[p]?.[slot.id] === 'yes');
  const maybe     = participants.filter(p => responses[p]?.[slot.id] === 'maybe');

  return (
    <div className={styles.confirmedBanner}>
      <div className={styles.confirmedIcon}><CheckCircle size={36} /></div>
      <h2 className={styles.confirmedTitle}>Event Confirmed</h2>
      <div className={styles.confirmedDetails}>
        <div className={styles.confirmedDate}>{date}</div>
        <div className={styles.confirmedTime}>{time}</div>
      </div>

      <div className={styles.attendeeSections}>
        {attending.length > 0 && (
          <div className={styles.attendeeGroup}>
            <span className={styles.attendeeGroupLabel}>Attending ({attending.length})</span>
            <div className={styles.attendeeList}>
              {attending.map(p => (
                <span key={p} className={`${styles.attendeeChip} ${styles.chipYes}`}>
                  {authorLabel(p)}
                </span>
              ))}
            </div>
          </div>
        )}
        {maybe.length > 0 && (
          <div className={styles.attendeeGroup}>
            <span className={styles.attendeeGroupLabel}>Maybe ({maybe.length})</span>
            <div className={styles.attendeeList}>
              {maybe.map(p => (
                <span key={p} className={`${styles.attendeeChip} ${styles.chipMaybe}`}>
                  {authorLabel(p)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {api.isOrganizer() && (
        <button className={styles.btnSecondary} onClick={onUnconfirm}>
          Reopen scheduling
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const SchedulingFlow: React.FC<FlowProps> = () => {
  const [eventState,  setEventState]  = useState<EventState>(() => api.getState());
  const [configured,  setConfigured]  = useState(() => api.getState().title !== null);
  const participants = api.getParticipants();

  const refresh = useCallback(() => setEventState(api.getState()), []);

  const handleToggle = useCallback((slotId: string) => {
    const current = eventState.responses[api.CURRENT_USER]?.[slotId];
    api.setAvailability(slotId, nextAvailability(current));
    refresh();
  }, [eventState.responses, refresh]);

  const handleAddSlot = useCallback((date: string, start: string, end: string) => {
    api.addSlot(date, start, end);
    refresh();
  }, [refresh]);

  const handleRemoveSlot = useCallback((slotId: string) => {
    api.removeSlot(slotId);
    refresh();
  }, [refresh]);

  const handleConfirm = useCallback((slotId: string) => {
    api.confirmSlot(slotId);
    refresh();
  }, [refresh]);

  const handleUnconfirm = useCallback(() => {
    api.unconfirm();
    refresh();
  }, [refresh]);

  if (!configured) {
    return <SetupScreen onDone={() => { setConfigured(true); refresh(); }} />;
  }

  const scores         = api.slotScores();
  const confirmedSlot  = eventState.confirmedSlotId
    ? eventState.slots.find(s => s.id === eventState.confirmedSlotId)
    : null;

  return (
    <div className={styles.container}>
      {/* Event title + description */}
      <div className={styles.eventHeader}>
        <Calendar size={18} className={styles.eventIcon} />
        <div>
          <h2 className={styles.eventTitle}>{eventState.title}</h2>
          {eventState.description && (
            <p className={styles.eventDesc}>{eventState.description}</p>
          )}
        </div>
      </div>

      {confirmedSlot ? (
        <ConfirmedBanner
          slot={confirmedSlot}
          participants={participants}
          responses={eventState.responses}
          onUnconfirm={handleUnconfirm}
        />
      ) : (
        <>
          {/* Add slot (organizer only) */}
          {api.isOrganizer() && (
            <AddSlotForm onAdd={handleAddSlot} />
          )}

          {eventState.slots.length === 0 ? (
            <p className={styles.noSlots}>No time slots yet. Add one above to get started.</p>
          ) : (
            <>
              <p className={styles.hint}>
                Click your row cells to cycle through: <strong>✓ Yes</strong> · <strong>? Maybe</strong> · <strong>✗ No</strong>
              </p>
              <AvailabilityGrid
                eventState={eventState}
                participants={participants}
                scores={scores}
                onToggle={handleToggle}
                onConfirm={handleConfirm}
                onRemoveSlot={handleRemoveSlot}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default SchedulingFlow;
