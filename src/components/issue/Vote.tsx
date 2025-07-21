import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';
import { ArrowUpDown, CheckCircle } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { MultiBackend, PointerTransition, TouchTransition, type MultiBackendOptions } from 'react-dnd-multi-backend';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { usePreview } from 'react-dnd-preview';
import { getEmptyImage } from 'react-dnd-html5-backend';
import './Vote.scss';

// Backend configuration - same as TestDND
export const HTML5toTouch: MultiBackendOptions = {
  backends: [
    {
      id: 'html5',
      backend: HTML5Backend,
      transition: PointerTransition,
    },
    {
      id: 'touch',
      backend: TouchBackend,
      options: { enableMouseEvents: true },
      preview: true,
      transition: TouchTransition,
    },
  ],
};

// Item type constant
const ItemType = 'PROPOSAL_CARD';

interface VoteProps {
  issueId: string;
}

interface ProposalCardProps {
  proposal: any;
  index: number;
  moveCard: (fromIndex: number, toIndex: number) => void;
  cardRef?: React.RefObject<HTMLDivElement | null>;
}

// Custom preview component that looks identical to the dragged item
const CustomPreview = ({ width }: { width?: number }) => {
  const preview = usePreview<any>();
  if (!preview.display) {
    return null;
  }

  const { item, style } = preview;
  if (!item) {
    return null;
  }

  return (
    <div style={{
      ...style,
      pointerEvents: 'none',
      position: 'fixed',
      zIndex: 1000,
      opacity: 0.8,
      width: width ? `${width}px` : undefined,
      maxWidth: width ? `${width}px` : undefined,
      display: 'flex',
      alignItems: 'center',
    }}>
      <div
        className="proposal-card one-line preview"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '12px 20px',
          borderRadius: '8px',
          background: 'white',
          border: '1.5px solid #667eea',
          fontWeight: 500,
          fontSize: '1.05rem',
          minHeight: '40px',
          boxShadow: '0 4px 12px rgba(102,126,234,0.15)',
          width: '100%',
        }}
      >
        {item.title}
      </div>
    </div>
  );
};

// Individual draggable proposal card component
const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, index, moveCard, cardRef }) => {
  const localRef = React.useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag, dragPreview] = useDrag<{ isDragging: boolean }, void, { isDragging: boolean }>(
    {
      type: ItemType,
      item: { ...proposal, index }, // Pass full proposal object with index
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }
  );

  // Suppress the native drag preview
  React.useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreview]);

  const [{ isOver }, drop] = useDrop({
    accept: ItemType,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
    hover: (draggedItem: any) => {
      if (draggedItem.index !== index) {
        moveCard(draggedItem.index, index);
        draggedItem.index = index; // This is still needed to keep the dragged item's index in sync
      }
    },
  });

  // Use the passed ref for the first card, otherwise use a local ref
  const ref = (node: HTMLDivElement) => {
    drag(drop(node));
    if (cardRef && typeof cardRef !== 'function') {
      cardRef.current = node;
    } else {
      localRef.current = node;
    }
  };

  return (
    <div
      ref={ref}
      className={`proposal-card one-line ${isDragging ? 'dragging' : ''} ${isOver ? 'over' : ''}`}
      style={{
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none', // Important for mobile drag
        display: 'flex',
        alignItems: 'center',
        padding: '12px 20px',
        marginBottom: '10px',
        borderRadius: '8px',
        background: 'white',
        border: '1.5px solid #e1e5e9',
        fontWeight: 500,
        fontSize: '1.05rem',
        cursor: 'grab',
        minHeight: '40px',
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.10)' : '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      {proposal.title}
    </div>
  );
};

const Vote: React.FC<VoteProps> = ({ issueId }) => {
  const proposals = useSelector((state: any) => state.contracts.issueProposals[issueId] || []);
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // No need for cardWidth state; use ref directly
  const firstCardRef = React.useRef<HTMLDivElement>(null);

  // Update order when proposals change
  useEffect(() => {
    if (proposals.length > 0) {
      const order = proposals.map((p: any) => p.id);
      setOriginalOrder(order);
      setCurrentOrder(order);
      setIsLoading(false);
    } else if (proposals.length === 0 && !isLoading) {
      setIsLoading(false);
    }
  }, [proposals, isLoading]);

  const moveCard = useCallback((fromIndex: number, toIndex: number) => {
    setCurrentOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const [movedItem] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, movedItem);
      return newOrder;
    });
  }, []);

  const handleSubmitVote = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Implement vote submission logic
      console.log('Submitting vote with order:', currentOrder);
      setHasVoted(true);
    } catch (error) {
      console.error('Error submitting vote:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetVote = () => {
    setCurrentOrder([...originalOrder]);
    setHasVoted(false);
  };

  if (isLoading) {
    return (
      <div className="vote-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading proposals...</p>
        </div>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="vote-container">
        <div className="no-proposals">
          <p>No proposals available for voting.</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={MultiBackend} options={HTML5toTouch}>
      <div className="vote-container">
        <div className="vote-header">
          <h2>Vote on Proposals</h2>
        </div>

        <div className="vote-instructions">
          <div className="instruction-card">
            <ArrowUpDown size={20} />
            <div>
              <h3>How to Vote</h3>
              <p>Drag proposals to reorder them. The top proposal is your first choice.</p>
            </div>
          </div>
        </div>

        <div className="proposals-list">
          {currentOrder.map((proposalId, index) => {
            const proposal = proposals.find((p: any) => p.id === proposalId);
            if (!proposal) return null;

            // Attach ref to the first card only
            // When passing refProp, ensure it is React.RefObject<HTMLDivElement> or undefined
            const refProp = index === 0 ? firstCardRef : undefined;

            return (
              <ProposalCard
                key={proposalId}
                proposal={proposal}
                index={index}
                moveCard={moveCard}
                cardRef={refProp}
              />
            );
          })}
        </div>

        <div className="vote-actions">
          {!hasVoted ? (
            <button
              className="submit-vote-btn"
              onClick={handleSubmitVote}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Vote'}
            </button>
          ) : (
            <div className="vote-submitted">
              <CheckCircle size={20} />
              <span>Vote submitted successfully!</span>
              <button className="reset-vote-btn" onClick={handleResetVote}>
                Change Vote
              </button>
            </div>
          )}
        </div>
      </div>
      
      <CustomPreview width={firstCardRef.current?.offsetWidth} />
    </DndProvider>
  );
};

export default Vote; 