import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { ArrowUpDown, CheckCircle } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { MultiBackend, PointerTransition, TouchTransition, type MultiBackendOptions } from 'react-dnd-multi-backend';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { usePreview } from 'react-dnd-preview';
import { getEmptyImage } from 'react-dnd-html5-backend';
import styles from './Vote.module.scss';
import { contractWrite } from '../../services/api';

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
        className={`${styles.proposalCard} ${styles.preview}`}
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
      className={`${styles.proposalCard} ${isDragging ? styles.dragging : ''} ${isOver ? styles.over : ''}`}
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
  const { issueHostServer: encodedIssueHostServer, issueHostAgent } = useParams<{ issueHostServer: string; issueHostAgent: string }>();

  const proposals = useAppSelector((state) => state.issues.issueProposals[issueId] || []);
  const issueDetails = useAppSelector((state) => state.issues.issueDetails[issueId] || {});
  
  // Add acceptance bar to the order state
  const [currentOrder, setCurrentOrder] = useState<string[]>([ACCEPTANCE_BAR_ID]);
  const [originalOrder, setOriginalOrder] = useState<string[]>([ACCEPTANCE_BAR_ID]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const firstCardRef = React.useRef<HTMLDivElement>(null);

  // Decode the issue host server URL
  const issueHostServer = encodedIssueHostServer ? decodeURIComponent(encodedIssueHostServer) : '';



  // Initialize order from user's vote or default
  useEffect(() => {
    if (proposals.length === 0) {
      return;
    }

    let userOrder: string[] | undefined;
    if (issueDetails.votes && issueHostAgent && issueDetails.votes[issueHostAgent]) {
      userOrder = issueDetails.votes[issueHostAgent].order;
    }
    
    if (userOrder && Array.isArray(userOrder) && userOrder.length > 0) {
      setOriginalOrder(userOrder);
      setCurrentOrder(userOrder);
      setHasVoted(true);
    } else {
      const order = [ACCEPTANCE_BAR_ID, ...proposals.map((p: { id: string }) => p.id)];
      setOriginalOrder(order);
      setCurrentOrder(order);
      setHasVoted(false);
    }
  }, [proposals, issueDetails.votes, issueHostAgent]);

  const moveCard = useCallback((fromIndex: number, toIndex: number) => {
    setCurrentOrder(prevOrder => {
      const newOrder = [...prevOrder];
      const [movedItem] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, movedItem);
      return newOrder;
    });
  }, []);

  const handleSubmitVote = async () => {
    if (!issueHostServer || !issueHostAgent) return;
    
    setIsSubmitting(true);
    try {
      const vote = { order: currentOrder };
      await contractWrite({
        serverUrl: issueHostServer,
        publicKey: issueHostAgent,
        contractId: issueId,
        method: 'add_vote',
        args: { voter: issueHostAgent, vote }
      });
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

  // Show message when no proposals exist (proposals are already loaded by parent)
  if (proposals.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.noProposals}>
          <p>No proposals have been submitted for this issue yet.</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={MultiBackend} options={HTML5toTouch}>
      <div className={styles.container} style={{ maxWidth: 480, margin: '0 auto', padding: '10px' }}>
        <div className={styles.header}>
          <h2>Vote on Proposals</h2>
        </div>
        <div className={styles.instructions}>
          <div className={styles.instructionCard}>
            <ArrowUpDown size={20} />
            <div>
              <h3>How to Vote</h3>
              <p style={{ marginBottom: 0 }}>
                Rank proposals (drag them up and down). Drag the acceptance bar between accepted and rejected proposals.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.proposalsList}>
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

        <div className={styles.voteActions}>
          {!hasVoted ? (
            <button
              className={styles.submitVoteBtn}
              onClick={handleSubmitVote}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Vote'}
            </button>
          ) : (
            <div className={styles.voteSubmitted}>
              <CheckCircle size={20} />
              <span>Vote submitted successfully!</span>
              <button className={styles.resetVoteBtn} onClick={handleResetVote}>
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