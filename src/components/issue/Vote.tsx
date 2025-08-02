import React, { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { ArrowUpDown, CheckCircle } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { MultiBackend, PointerTransition, TouchTransition, type MultiBackendOptions } from 'react-dnd-multi-backend';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { usePreview } from 'react-dnd-preview';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { submitVote } from '../../store/slices/issuesSlice';
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

// Add a constant for the acceptance bar ID
const ACCEPTANCE_BAR_ID = '__ACCEPTANCE_BAR__';

interface VoteProps {
  issueId: string;
}

interface ProposalCardProps {
  proposal: { id: string; title: string };
  index: number;
  moveCard: (fromIndex: number, toIndex: number) => void;
  cardRef?: React.RefObject<HTMLDivElement | null>;
  isAcceptanceBar?: boolean;
}

type ProposalDragItem = { id: string; title: string; index: number };

// Custom preview component that looks identical to the dragged item
const CustomPreview = ({ width }: { width?: number }) => {
  const preview = usePreview<ProposalDragItem>();
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

// AcceptanceBar component with concise text
const AcceptanceBar: React.FC = () => (
  <div
    className="acceptance-bar"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 14px',
      marginBottom: '8px',
      borderRadius: '8px',
      background: 'linear-gradient(90deg, #fbbf24 0%, #f59e42 100%)', // original orange gradient
      border: '2px solid #f59e42',
      fontWeight: 700,
      fontSize: '1rem',
      minHeight: '36px',
      boxShadow: '0 4px 12px rgba(251,191,36,0.10)',
      color: '#7c4700',
      position: 'relative',
      cursor: 'grab',
      userSelect: 'none',
      width: '100%',
    }}
  >
    <span style={{ flex: 1, height: 3, background: '#e67c00', borderRadius: 2, marginRight: 12, minWidth: 16 }} />
    <span style={{ fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', letterSpacing: 1, color: '#fff' }}>Acceptance Bar</span>
    <span style={{ flex: 1, height: 3, background: '#e67c00', borderRadius: 2, marginLeft: 12, minWidth: 16 }} />
  </div>
);

// Individual draggable proposal card component
const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, index, moveCard, cardRef, isAcceptanceBar }) => {
  const localRef = React.useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag, dragPreview] = useDrag<ProposalDragItem, void, { isDragging: boolean }>(
    {
      type: ItemType,
      item: { ...proposal, index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }
  );

  React.useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, [dragPreview]);

  const [{ isOver }, drop] = useDrop({
    accept: ItemType,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
    hover: (draggedItem: unknown) => {
      if (draggedItem && (draggedItem as ProposalDragItem).index !== index) {
        moveCard((draggedItem as ProposalDragItem).index, index);
        (draggedItem as ProposalDragItem).index = index;
      }
    },
  });

  const ref = (node: HTMLDivElement) => {
    drag(drop(node));
    if (cardRef && typeof cardRef !== 'function') {
      cardRef.current = node;
    } else {
      localRef.current = node;
    }
  };

  if (isAcceptanceBar) {
    return (
      <div ref={ref} style={{ width: '100%' }}>
        <AcceptanceBar />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`proposal-card one-line ${isDragging ? 'dragging' : ''} ${isOver ? 'over' : ''}`}
      style={{
        opacity: isDragging ? 0.5 : 1,
        touchAction: 'none',
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
  const dispatch = useAppDispatch();
  const proposals = useAppSelector((state: { issues: { issueProposals: Record<string, { id: string; title: string }[]> } }) => state.issues.issueProposals[issueId] || []);
  const issueDetails = useAppSelector((state: { issues: { issueDetails: Record<string, any> } }) => state.issues.issueDetails[issueId] || {});
  // Add acceptance bar to the order state
  const [currentOrder, setCurrentOrder] = useState<string[]>([ACCEPTANCE_BAR_ID]);
  const [originalOrder, setOriginalOrder] = useState<string[]>([ACCEPTANCE_BAR_ID]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const firstCardRef = React.useRef<HTMLDivElement>(null);

  // Extract server and agent from URL
  const pathParts = window.location.pathname.split('/');
  const encodedServer = pathParts[2];
  const agent = pathParts[3];
  const server = decodeURIComponent(encodedServer);

  // Initialize order from user's vote or default
  useEffect(() => {
    let userOrder: string[] | undefined;
    if (issueDetails.votes && agent && issueDetails.votes[agent]) {
      userOrder = issueDetails.votes[agent].order;
    }
    if (userOrder && Array.isArray(userOrder) && userOrder.length > 0) {
      setOriginalOrder(userOrder);
      setCurrentOrder(userOrder);
      setHasVoted(true);
      setIsLoading(false);
    } else if (proposals.length > 0) {
      const order = [ACCEPTANCE_BAR_ID, ...proposals.map((p: { id: string }) => p.id)];
      setOriginalOrder(order);
      setCurrentOrder(order);
      setHasVoted(false);
      setIsLoading(false);
    } else if (proposals.length === 0 && !isLoading) {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, issueDetails.votes, agent, isLoading]);

  // Listen for contract_write events and re-initialize
  useEffect(() => {
    const handleContractWrite = (event: any) => {
      if (event.contract === issueId) {
        // Re-fetch issue details or trigger a reload as needed
        // (Assume parent or redux handles this, so just rely on updated props)
      }
    };
    window.addEventListener('contract_write', handleContractWrite);
    return () => window.removeEventListener('contract_write', handleContractWrite);
  }, [issueId]);

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
      const vote = { order: currentOrder };
      await dispatch(submitVote({
        serverUrl: server,
        publicKey: agent,
        contractId: issueId,
        vote
      })).unwrap();
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
      <div className="vote-container" style={{ maxWidth: 480, margin: '0 auto', padding: '10px' }}>
        <div className="vote-header">
          <h2>Vote on Proposals</h2>
        </div>
        <div className="vote-instructions">
          <div className="instruction-card">
            <ArrowUpDown size={20} />
            <div>
              <h3>How to Vote</h3>
              <p style={{ marginBottom: 0 }}>
                Rank proposals (drag them up and down). Drag the acceptance bar between accepted and rejected proposals.
              </p>
            </div>
          </div>
        </div>

        <div className="proposals-list">
          {currentOrder.map((id, index) => {
            if (id === ACCEPTANCE_BAR_ID) {
              return (
                <ProposalCard
                  key={ACCEPTANCE_BAR_ID}
                  proposal={{ id: '', title: '' }}
                  index={index}
                  moveCard={moveCard}
                  cardRef={index === 0 ? firstCardRef : undefined}
                  isAcceptanceBar
                />
              );
            }
            const proposal = proposals.find((p: { id: string }) => p.id === id);
            if (!proposal) return null;
            const refProp = index === 0 ? firstCardRef : undefined;
            return (
              <ProposalCard
                key={id}
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