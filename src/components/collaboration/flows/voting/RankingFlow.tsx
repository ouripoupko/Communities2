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
import { ACCEPTANCE_BAR_ID } from './types';
import * as api from './rankingApi';
import { computeCycleGroups } from './smithSet';
import styles from './RankingFlow.module.scss';

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
  moveItem: (from: number, to: number) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, label, index, isBar, moveItem }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, dragPreview] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: ITEM_TYPE,
    item: { id, label, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreview]);

  const [{ isOver }, drop] = useDrop<DragItem, void, { isOver: boolean }>({
    accept: ITEM_TYPE,
    collect: (monitor) => ({ isOver: monitor.isOver() }),
    hover: (dragged) => {
      if (dragged.index !== index) {
        moveItem(dragged.index, index);
        dragged.index = index;
      }
    },
  });

  drag(drop(ref));

  if (isBar) {
    return (
      <div ref={ref} style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}>
        <AcceptanceBar />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`${styles.proposalCard} ${isDragging ? styles.dragging : ''} ${isOver ? styles.over : ''}`}
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}
    >
      <span className={styles.dragHandle}>⠿</span>
      <span className={styles.proposalText}>{label}</span>
    </div>
  );
};

// ---------------------------------------------------------------------------
// My Ranking tab
// ---------------------------------------------------------------------------
interface RankingTabProps {
  proposals: ReturnType<typeof api.getProposals>;
  order: string[];
  onOrderChange: (order: string[]) => void;
  onAddProposal: (text: string) => void;
  listRef: React.RefObject<HTMLDivElement | null>;
}

const RankingTab: React.FC<RankingTabProps> = ({
  proposals,
  order,
  onOrderChange,
  onAddProposal,
  listRef,
}) => {
  const [inputText, setInputText] = useState('');
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

  const handleAdd = () => {
    const text = inputText.trim();
    if (!text) return;
    onAddProposal(text);
    setInputText('');
  };

  return (
    <div className={styles.rankingTab}>
      <div className={styles.addForm}>
        <input
          className={styles.addInput}
          type="text"
          placeholder="Add a new proposal…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button className={styles.addBtn} onClick={handleAdd}>
          <Plus size={16} />
          Add
        </button>
      </div>

      <p className={styles.hint}>
        Drag proposals to reorder. Move the Acceptance Bar to separate accepted from rejected.
      </p>

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
              moveItem={moveItem}
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
  proposals: ReturnType<typeof api.getProposals>;
}

const AggregatedTab: React.FC<AggregatedTabProps> = ({ proposals }) => {
  const proposalMap = useMemo(
    () => new Map(proposals.map((p) => [p.id, p.text])),
    [proposals],
  );

  const cycleGroups = useMemo(() => {
    const allRankings = api.getAllRankings();
    const rankingsOnly = allRankings.map((r) =>
      r.order.filter((id) => id !== ACCEPTANCE_BAR_ID),
    );
    const candidateIds = proposals.map((p) => p.id);
    return computeCycleGroups(candidateIds, rankingsOnly);
  }, [proposals]);

  if (proposals.length === 0) {
    return <p className={styles.noData}>No proposals yet. Add some in the My Ranking tab.</p>;
  }

  return (
    <div className={styles.aggregatedTab}>
      <h3 className={styles.aggregatedTitle}>Aggregated Results</h3>
      <p className={styles.aggregatedSubtitle}>
        Proposals are grouped into Condorcet cycles (Smith sets). Group 1 is the collective
        winner. Within each group all proposals beat each other cyclically.
      </p>

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
              {group.proposalIds.map((id) => (
                <div key={id} className={styles.cycleItem}>
                  {proposalMap.get(id) ?? id}
                </div>
              ))}
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
const RankingFlowInner: React.FC<FlowProps> = () => {
  const [activeTab, setActiveTab] = useState<'ranking' | 'aggregated'>('ranking');
  const [proposals, setProposals] = useState(() => api.getProposals());
  const [order, setOrder] = useState<string[]>(() => api.getMyRanking().order);
  const listRef = useRef<HTMLDivElement>(null);

  const handleOrderChange = useCallback((newOrder: string[]) => {
    api.saveMyRanking(newOrder);
    setOrder(newOrder);
  }, []);

  const handleAddProposal = useCallback((text: string) => {
    api.addProposal(text);
    setProposals(api.getProposals());
    setOrder(api.getMyRanking().order);
  }, []);

  return (
    <div className={styles.container}>
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
          onOrderChange={handleOrderChange}
          onAddProposal={handleAddProposal}
          listRef={listRef}
        />
      )}

      {activeTab === 'aggregated' && <AggregatedTab proposals={proposals} />}

      <CustomPreview listWidth={listRef.current?.offsetWidth} />
    </div>
  );
};

const RankingFlow: React.FC<FlowProps> = (props) => (
  <DndProvider backend={MultiBackend} options={HTML5toTouch}>
    <RankingFlowInner {...props} />
  </DndProvider>
);

export default RankingFlow;
