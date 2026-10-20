import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import {
  MultiBackend,
  PointerTransition,
  TouchTransition,
  type MultiBackendOptions,
} from 'react-dnd-multi-backend';
import { HTML5Backend, getEmptyImage } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { usePreview } from 'react-dnd-preview';
import { BarChart2, List, Plus } from 'lucide-react';

import type { FlowProps } from '../types';
import { useEventStream } from '../../../../hooks/useEventStream';
import { FlowLoading, FlowError } from '../FlowShell';
import { ACCEPTANCE_BAR_ID } from './types';
import type { Proposal, ParticipantRanking } from './types';
import * as api from './rankingApi';
import type { TopicConfig } from './rankingApi';
import { computeCycleGroups, type CycleSetMode } from './smithSet';
import { TopicSetupDialog, TopicHeader } from './Topic';
import styles from './RankingFlow.module.scss';

/** Pre-create dialog exported for use by CollaborationPage before the tab is deployed. */
export const RankingSetupDialog: React.FC<{
  onDone: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}> = ({ onDone, onCancel }) => (
  <TopicSetupDialog heading="Set Up Ranking Vote" icon={BarChart2} onDone={onDone} onCancel={onCancel} />
);

// ---------------------------------------------------------------------------
// DnD backend config (same pattern as Vote.tsx)
// ---------------------------------------------------------------------------
const HTML5toTouch: MultiBackendOptions = {
  backends: [
    { id: 'html5', backend: HTML5Backend, transition: PointerTransition },
    {
      id: 'touch',
      backend: TouchBackend,
      options: { enableMouseEvents: true },
      preview: true,
      transition: TouchTransition,
    },
  ],
};

const ITEM_TYPE = 'RANKING_ITEM';

type DragItem = { id: string; label: string; index: number };

// ---------------------------------------------------------------------------
// Acceptance Bar visual
// ---------------------------------------------------------------------------
const AcceptanceBar: React.FC = () => (
  <div className={styles.acceptanceBar}>
    <span className={styles.barLine} />
    <span className={styles.barLabel}>Acceptance Bar</span>
    <span className={styles.barLine} />
  </div>
);

// ---------------------------------------------------------------------------
// Stats bar - proposers / rankers counts, shown above both tabs so it's
// visible no matter which one is active.
// ---------------------------------------------------------------------------
interface StatsBarProps {
  proposerCount: number;
  rankerCount: number;
}

const StatsBar: React.FC<StatsBarProps> = ({ proposerCount, rankerCount }) => (
  <div className={styles.statsBar}>
    <span className={styles.statsItem}>
      <strong>{proposerCount}</strong> {proposerCount === 1 ? 'member has' : 'members have'} proposed an option
    </span>
    <span className={styles.statsItem}>
      <strong>{rankerCount}</strong> {rankerCount === 1 ? 'member has' : 'members have'} ranked the options
    </span>
  </div>
);

// ---------------------------------------------------------------------------
// Custom drag preview (shown during touch drag)
// ---------------------------------------------------------------------------
const CustomPreview: React.FC<{ listWidth?: number }> = ({ listWidth }) => {
  const preview = usePreview<DragItem>();
  if (!preview.display) return null;
  const { item, style } = preview;
  if (!item) return null;

  return (
    <div
      style={{
        ...style,
        pointerEvents: 'none',
        position: 'fixed',
        zIndex: 1000,
        opacity: 0.85,
        width: listWidth ? `${listWidth}px` : undefined,
      }}
    >
      {item.id === ACCEPTANCE_BAR_ID ? (
        <AcceptanceBar />
      ) : (
        <div className={`${styles.proposalCard} ${styles.preview}`}>{item.label}</div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sortable list item (proposal card or acceptance bar)
// ---------------------------------------------------------------------------
interface SortableItemProps {
  id: string;
  label: string;
  index: number;
  isBar: boolean;
  rankedCount?: number;
  moveItem: (from: number, to: number) => void;
  onDragStart: () => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, label, index, isBar, rankedCount, moveItem, onDragStart }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const [{ isDragging }, drag, dragPreview] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: ITEM_TYPE,
    // Function form so onDragStart fires exactly once per drag, right as
    // it begins — this is what flips the page into "editing" mode.
    item: () => { onDragStart(); return { id, label, index }; },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreview]);

  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: ITEM_TYPE,
    collect: (monitor) => ({ isOver: monitor.isOver() }),
    hover: (dragged, monitor) => {
      if (dragged.index === index || !ref.current) return;

      // Only swap once the cursor crosses the target's vertical midpoint,
      // in the direction of travel — prevents the two items from repeatedly
      // swapping back and forth while their bounding boxes merely overlap.
      const hoverRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverRect.bottom - hoverRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientY = clientOffset.y - hoverRect.top;

      if (dragged.index < index && hoverClientY < hoverMiddleY) return;
      if (dragged.index > index && hoverClientY > hoverMiddleY) return;

      moveItem(dragged.index, index);
      dragged.index = index;
    },
  });

  // Connect via a callback ref so the DnD connectors run on attach, not during render.
  const setRef = useCallback((node: HTMLDivElement | null) => {
    ref.current = node;
    drag(drop(node));
  }, [drag, drop]);

  if (isBar) {
    return (
      <div ref={setRef} style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}>
        <AcceptanceBar />
      </div>
    );
  }

  return (
    <div
      ref={setRef}
      className={`${styles.proposalCard} ${isDragging ? styles.dragging : ''} ${isOver ? styles.over : ''}`}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}
    >
      <span className={styles.dragHandle}>⠿</span>
      <span className={styles.proposalText}>{label}</span>
      {typeof rankedCount === 'number' && (
        <span className={styles.rankedBadge} title="Members who have ranked this option">
          {rankedCount === 1 ? '1 ranked' : `${rankedCount} ranked`}
        </span>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// My Ranking tab
// ---------------------------------------------------------------------------
interface RankingTabProps {
  proposals: Proposal[];
  order: string[];
  rankedCounts: Map<string, number>;
  onOrderChange: (order: string[]) => void;
  draft: string;
  onDraftChange: (text: string) => void;
  onAddProposal: () => void;
  isAdding: boolean;
  listRef: React.RefCallback<HTMLDivElement>;
  isEditing: boolean;
  onDragStart: () => void;
  pendingUpdateCount: number;
  onSubmit: () => void;
  onRevert: () => void;
}

const RankingTab: React.FC<RankingTabProps> = ({
  proposals,
  order,
  rankedCounts,
  onOrderChange,
  draft,
  onDraftChange,
  onAddProposal,
  isAdding,
  listRef,
  isEditing,
  onDragStart,
  pendingUpdateCount,
  onSubmit,
  onRevert,
}) => {
  const proposalMap = useMemo(
    () => new Map(proposals.map((p) => [p.id, p.text])),
    [proposals],
  );

  const moveItem = useCallback(
    (from: number, to: number) => {
      const next = [...order];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onOrderChange(next);
    },
    [order, onOrderChange],
  );

  return (
    <div className={styles.rankingTab}>
      <div className={styles.addForm}>
        <input
          className={styles.addInput}
          type="text"
          placeholder="Add a new proposal…"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAddProposal();
          }}
        />
        <button className={styles.addBtn} disabled={isAdding} onClick={onAddProposal}>
          <Plus size={16} />
          Add
        </button>
      </div>

      <p className={styles.hint}>
        Drag proposals to reorder. Move the Acceptance Bar to separate accepted from rejected.
      </p>

      <div className={styles.editBar}>
        <button className={`${styles.editBtn} ${styles.submitBtn}`} disabled={!isEditing} onClick={onSubmit}>
          Submit
        </button>
        <button className={styles.editBtn} disabled={!isEditing} onClick={onRevert}>
          Revert
        </button>
        {isEditing && pendingUpdateCount > 0 && (
          <span className={styles.pendingCount}>
            {pendingUpdateCount === 1 ? '1 update' : `${pendingUpdateCount} updates`} arrived — Submit or Revert to refresh
          </span>
        )}
      </div>

      <div className={styles.list} ref={listRef}>
        {order.map((id, index) => {
          const isBar = id === ACCEPTANCE_BAR_ID;
          return (
            <SortableItem
              key={id}
              id={id}
              label={isBar ? '' : (proposalMap.get(id) ?? id)}
              index={index}
              isBar={isBar}
              rankedCount={isBar ? undefined : rankedCounts.get(id) ?? 0}
              moveItem={moveItem}
              onDragStart={onDragStart}
            />
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Aggregated tab
// ---------------------------------------------------------------------------
interface AggregatedTabProps {
  proposals: Proposal[];
  allRankings: ParticipantRanking[];
  rankedCounts: Map<string, number>;
}

const AggregatedTab: React.FC<AggregatedTabProps> = ({ proposals, allRankings, rankedCounts }) => {
  const [mode, setMode] = useState<CycleSetMode>('smith');

  const proposalMap = useMemo(
    () => new Map(proposals.map((p) => [p.id, p.text])),
    [proposals],
  );

  const cycleGroups = useMemo(() => {
    const candidateIds = [...proposals.map((p) => p.id), ACCEPTANCE_BAR_ID];
    const rankingsOnly = allRankings.map((r) => r.order);
    const ballotsByVoter = Object.fromEntries(allRankings.map((r) => [r.participantId, r.order]));
    console.log(`[${mode}] ballots used for set calculation:`, ballotsByVoter);
    return computeCycleGroups(candidateIds, rankingsOnly, mode);
  }, [proposals, allRankings, mode]);

  if (proposals.length === 0) {
    return <p className={styles.noData}>No proposals yet. Add some in the My Ranking tab.</p>;
  }

  return (
    <div className={styles.aggregatedTab}>
      <h3 className={styles.aggregatedTitle}>Aggregated Results</h3>
      <p className={styles.aggregatedSubtitle}>
        Proposals (and the Acceptance Bar) are grouped into Condorcet cycles. Group 1 is the
        collective winner. Within each group, all items are tied or beat each other cyclically —
        proposals sharing a group with the bar are contested; groups above it are accepted,
        groups below it are rejected.
      </p>

      <div className={styles.modeSwitch}>
        <button
          className={`${styles.modeButton} ${mode === 'smith' ? styles.modeButtonActive : ''}`}
          onClick={() => setMode('smith')}
        >
          Smith set
        </button>
        <button
          className={`${styles.modeButton} ${mode === 'schwartz' ? styles.modeButtonActive : ''}`}
          onClick={() => setMode('schwartz')}
        >
          Schwartz set
        </button>
      </div>

      <div className={styles.cycleList}>
        {cycleGroups.map((group) => (
          <div key={group.rank} className={styles.cycleGroup}>
            <div className={styles.cycleGroupHeader}>
              <span className={styles.cycleRank}>Group {group.rank}</span>
              {group.proposalIds.length > 1 && (
                <span className={styles.cycleBadge}>Condorcet cycle</span>
              )}
            </div>
            <div className={styles.cycleGroupItems}>
              {group.proposalIds.map((id) =>
                id === ACCEPTANCE_BAR_ID ? (
                  <div key={id} className={styles.cycleAcceptanceBar}>
                    <AcceptanceBar />
                  </div>
                ) : (
                  <div key={id} className={styles.cycleItem}>
                    <span className={styles.cycleItemText}>{proposalMap.get(id) ?? id}</span>
                    <span className={styles.rankedBadge} title="Members who have ranked this option">
                      {rankedCounts.get(id) === 1 ? '1 ranked' : `${rankedCounts.get(id) ?? 0} ranked`}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root component (wraps its own DndProvider)
// ---------------------------------------------------------------------------
const RankingFlowInner: React.FC<FlowProps> = ({ instanceId, flowServer, flowAgent, currentUser }) => {
  const [activeTab,    setActiveTab]    = useState<'ranking' | 'aggregated'>('ranking');
  const [proposals,    setProposals]    = useState<Proposal[]>([]);
  const [order,        setOrder]        = useState<string[]>([]);
  const [allRankings,  setAllRankings]  = useState<ParticipantRanking[]>([]);
  const [topic,        setTopic]        = useState<TopicConfig | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  // While editing (from the first drag until Submit/Revert), incoming SSE
  // updates must not touch proposals/order/allRankings — reloading them
  // mid-drag remounts the sortable items and breaks the drag in progress.
  const [isEditing,           setIsEditing]           = useState(false);
  const [pendingUpdateCount,  setPendingUpdateCount]  = useState(0);
  // The new-proposal draft lives here rather than in RankingTab so it
  // survives tab switches.
  const [draft,     setDraft]     = useState('');
  const [isAdding,  setIsAdding]  = useState(false);
  // The touch drag preview is sized to the list; track its width in state
  // since reading offsetWidth during render would be stale.
  const [listWidth, setListWidth] = useState<number | undefined>(undefined);
  const listRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver(() => setListWidth(node.offsetWidth));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Only the initial load (and an explicit retry) shows the spinner.
  // Background refreshes triggered by SSE update state in place — swapping
  // in FlowLoading would unmount the tabs and reset scroll position.
  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [loadedProposals, loadedAllRankings, loadedTopic] = await Promise.all([
        api.loadProposals(flowServer, flowAgent, instanceId),
        api.loadAllRankings(flowServer, flowAgent, instanceId),
        api.loadTopic(flowServer, flowAgent, instanceId),
      ]);
      const myOrder = await api.loadMyRanking(flowServer, flowAgent, instanceId, currentUser, loadedProposals);
      setProposals(loadedProposals);
      setAllRankings(loadedAllRankings);
      setTopic(loadedTopic);
      setOrder(myOrder);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load ranking data');
    } finally {
      setLoading(false);
    }
  }, [flowServer, flowAgent, instanceId, currentUser]);

  useEffect(() => { void load(true); }, [load]);

  useEventStream('contract_write', useCallback((event) => {
    if (event.contract !== instanceId) return;
    // While editing, don't reload — just tally the update so the drag in
    // progress (or about to start again) isn't disrupted by a re-render
    // that reshuffles the list.
    if (isEditing) {
      setPendingUpdateCount((n) => n + 1);
    } else {
      void load();
    }
  }, [instanceId, load, isEditing]), flowServer, flowAgent);

  const handleOrderChange = useCallback((newOrder: string[]) => {
    setOrder(newOrder);
  }, []);

  const handleDragStart = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      await api.saveMyRanking(flowServer, flowAgent, instanceId, currentUser, order);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save ranking.');
      return; // stay in editing mode so the local order isn't lost; let the user retry
    }
    setPendingUpdateCount(0);
    setIsEditing(false);
    void load();
  }, [flowServer, flowAgent, currentUser, instanceId, order, load]);

  const handleRevert = useCallback(() => {
    setPendingUpdateCount(0);
    setIsEditing(false);
    void load();
  }, [load]);

  const handleAddProposal = useCallback(async () => {
    const text = draft.trim();
    if (!text || isAdding) return;
    setIsAdding(true);
    try {
      await api.addProposal(flowServer, flowAgent, instanceId, text, currentUser);
      // Clear only on success, and only if the user hasn't kept typing meanwhile.
      setDraft((d) => (d.trim() === text ? '' : d));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add proposal.');
    } finally {
      setIsAdding(false);
    }
  }, [flowServer, flowAgent, instanceId, currentUser, draft, isAdding]);

  const proposerCount = useMemo(
    () => new Set(proposals.map((p) => p.author).filter((a): a is string => !!a)).size,
    [proposals],
  );

  const rankedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const ranking of allRankings) {
      for (const id of ranking.order) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return counts;
  }, [allRankings]);

  if (loading) return <FlowLoading />;
  if (error)   return <FlowError message={error} onRetry={() => void load(true)} />;

  return (
    <div className={styles.container}>
      {topic && <TopicHeader icon={BarChart2} topic={topic.topic} description={topic.description} />}

      <StatsBar proposerCount={proposerCount} rankerCount={allRankings.length} />

      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'ranking' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('ranking')}
        >
          <List size={16} />
          My Ranking
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'aggregated' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('aggregated')}
        >
          <BarChart2 size={16} />
          Aggregated
        </button>
      </div>

      {activeTab === 'ranking' && (
        <RankingTab
          proposals={proposals}
          order={order}
          rankedCounts={rankedCounts}
          onOrderChange={handleOrderChange}
          draft={draft}
          onDraftChange={setDraft}
          onAddProposal={() => { void handleAddProposal(); }}
          isAdding={isAdding}
          listRef={listRef}
          isEditing={isEditing}
          onDragStart={handleDragStart}
          pendingUpdateCount={pendingUpdateCount}
          onSubmit={() => { void handleSubmit(); }}
          onRevert={handleRevert}
        />
      )}

      {activeTab === 'aggregated' && (
        <AggregatedTab proposals={proposals} allRankings={allRankings} rankedCounts={rankedCounts} />
      )}

      <CustomPreview listWidth={listWidth} />
    </div>
  );
};

const RankingFlow: React.FC<FlowProps> = (props) => (
  <DndProvider backend={MultiBackend} options={HTML5toTouch}>
    <RankingFlowInner {...props} />
  </DndProvider>
);

export default RankingFlow;
