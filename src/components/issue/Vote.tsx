import React, { useState, useEffect } from 'react';
import { Vote as VoteIcon, ArrowUpDown, CheckCircle } from 'lucide-react';
import './Vote.scss';

interface Proposal {
  id: string;
  title: string;
  description: string;
  author: string;
}

interface VoteProps {
  issueId: string;
}

const Vote: React.FC<VoteProps> = ({ issueId }) => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const fetchProposals = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockProposals: Proposal[] = [
        {
          id: '1',
          title: 'Use Auth0 for authentication',
          description: 'Implement Auth0 as the primary authentication provider with OAuth2 and JWT support.',
          author: 'John Doe'
        },
        {
          id: '2',
          title: 'Build custom auth solution',
          description: 'Create a custom authentication system using Node.js and Passport.js.',
          author: 'Jane Smith'
        },
        {
          id: '3',
          title: 'Use Firebase Authentication',
          description: 'Leverage Firebase Authentication for easy integration and management.',
          author: 'Mike Johnson'
        }
      ];
      
      setProposals(mockProposals);
      const order = mockProposals.map(p => p.id);
      setOriginalOrder(order);
      setCurrentOrder(order);
    };

    fetchProposals();
  }, [issueId]);

  const handleDragStart = (e: React.DragEvent, proposalId: string) => {
    setDraggedItem(proposalId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const newOrder = [...currentOrder];
    const draggedIndex = newOrder.indexOf(draggedItem);
    const targetIndex = newOrder.indexOf(targetId);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    setCurrentOrder(newOrder);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const hasOrderChanged = () => {
    return JSON.stringify(originalOrder) !== JSON.stringify(currentOrder);
  };

  const handleSubmitVote = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setHasVoted(true);
    setIsSubmitting(false);
  };

  const getProposalById = (id: string) => {
    return proposals.find(p => p.id === id);
  };

  if (hasVoted) {
    return (
      <div className="vote-container">
        <div className="vote-success">
          <CheckCircle size={48} />
          <h2>Vote Submitted!</h2>
          <p>Your vote has been recorded. Thank you for participating.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vote-container">
      <div className="vote-header">
        <h2>Vote on Proposals</h2>
        <p>Drag and drop proposals to rank them in order of preference</p>
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

      <div className="proposals-ranking">
        {currentOrder.map((proposalId, index) => {
          const proposal = getProposalById(proposalId);
          if (!proposal) return null;

          return (
            <div
              key={proposalId}
              className={`proposal-rank-item ${draggedItem === proposalId ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, proposalId)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, proposalId)}
              onDragEnd={handleDragEnd}
            >
              <div className="rank-number">{index + 1}</div>
              <div className="proposal-content">
                <h3>{proposal.title}</h3>
                <p>{proposal.description}</p>
                <span className="author">by {proposal.author}</span>
              </div>
              <div className="drag-handle">
                <ArrowUpDown size={16} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="vote-actions">
        <button
          onClick={handleSubmitVote}
          disabled={!hasOrderChanged() || isSubmitting}
          className="submit-vote-button"
        >
          {isSubmitting ? (
            <>
              <div className="loading-spinner-small"></div>
              Submitting...
            </>
          ) : (
            <>
              <VoteIcon size={20} />
              Submit Vote
            </>
          )}
        </button>
      </div>

      {!hasOrderChanged() && currentOrder.length > 0 && (
        <div className="vote-note">
          <p>Drag proposals to change their order before submitting your vote.</p>
        </div>
      )}
    </div>
  );
};

export default Vote; 