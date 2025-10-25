import React, { useState, useEffect, useCallback, memo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getProposals } from '../../store/slices/issuesSlice';
import styles from './Proposals.module.scss';
import { addProposal } from '../../services/contracts/issue';

interface Proposal {
  id: string;
  title: string;
  description: string;
  author: string;
  createdAt: string;
  voteCount: number;
}

interface ProposalsProps {
  issueId: string;
}

interface CreateProposalFormProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string) => Promise<void>;
}

// Separate memoized form component to prevent re-renders
const CreateProposalForm = memo<CreateProposalFormProps>(({ isVisible, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await onSubmit(title, description);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError('Failed to create proposal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, onSubmit]);

  const handleClose = useCallback(() => {
    setTitle('');
    setDescription('');
    setError('');
    onClose();
  }, [onClose]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        handleClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, handleClose]);

  if (!isVisible) return null;

  return (
    <div 
      className={`${styles.createFormOverlay} ${styles.visible}`}
      onClick={handleClose}
    >
      <div 
        className={styles.createForm}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.formHeader}>
          <h3>Add New Proposal</h3>
          <button 
            onClick={handleClose}
            className={styles.closeButton}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>
        <div className="form-group">
          <label htmlFor="proposalTitle">Proposal Title</label>
          <input
            id="proposalTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter proposal title"
            className="input-field"
          />
        </div>
        <div className="form-group">
          <label htmlFor="proposalDescription">Description</label>
          <textarea
            id="proposalDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your proposal..."
            className="input-field"
            rows={4}
          />
        </div>
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}
        <div className="form-actions">
          <button 
            onClick={handleSubmit} 
            className="save-button" 
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Proposal'}
          </button>
          <button 
            onClick={handleClose}
            className="cancel-button"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
});

CreateProposalForm.displayName = 'CreateProposalForm';

const Proposals: React.FC<ProposalsProps> = ({ issueId }) => {
  const { issueHostServer: encodedIssueHostServer, issueHostAgent } = useParams<{ issueHostServer: string; issueHostAgent: string }>();
  const dispatch = useAppDispatch();
  const issueProposals = useAppSelector((state) => state.issues.issueProposals);
  const proposals: Proposal[] = Array.isArray(issueProposals[issueId]) ? issueProposals[issueId] : [];
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Decode the issue host server URL
  const issueHostServer = encodedIssueHostServer ? decodeURIComponent(encodedIssueHostServer) : '';

  const handleCloseForm = useCallback(() => {
    setShowCreateForm(false);
  }, []);

  const handleSubmitProposal = useCallback(async (title: string, description: string) => {
    if (!issueId || !issueHostServer || !issueHostAgent) throw new Error('Missing required parameters');
    
    const proposal: Proposal = {
      id: Date.now().toString(),
      title,
      description,
      author: 'You',
      createdAt: new Date().toISOString(),
      voteCount: 0,
    };
    
    await addProposal(
      issueHostServer,
      issueHostAgent,
      issueId,
      proposal,
    );
    
    // Refresh proposals using the centralized loading mechanism
    await dispatch(getProposals({
      serverUrl: issueHostServer,
      publicKey: issueHostAgent,
      contractId: issueId,
    }));
    
    setShowCreateForm(false);
  }, [issueId, issueHostServer, issueHostAgent, dispatch]);

  // Show message when no proposals exist (proposals are already loaded by parent)
  if (proposals.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2>Proposals</h2>
            <p>Review and vote on proposed solutions</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className={styles.createButton}
          >
            <Plus size={20} />
            Add Proposal
          </button>
        </div>
        <div className={styles.noProposals}>
          <p>No proposals have been submitted for this issue yet.</p>
        </div>
        
        <CreateProposalForm 
          isVisible={showCreateForm}
          onClose={handleCloseForm}
          onSubmit={handleSubmitProposal}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Proposals</h2>
          <p>Review and vote on proposed solutions</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className={styles.createButton}
        >
          <Plus size={20} />
          Add Proposal
        </button>
      </div>
      <CreateProposalForm 
        isVisible={showCreateForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmitProposal}
      />
      <div className={styles.list}>
        {proposals.map((proposal) => (
          <div key={proposal.id} className={styles.proposalCard}>
            <div className={styles.proposalHeader}>
              <div className={styles.proposalTitle}>
                <h3>{proposal.title}</h3>
              </div>
              <div className={styles.proposalMeta}>
                <span className={styles.author}>{proposal.author}</span>
                <span className={styles.date}>{proposal.createdAt}</span>
              </div>
            </div>
            <div className={styles.proposalContent}>
              <p className={styles.proposalDescription}>{proposal.description}</p>
            </div>
            <div className={styles.proposalStats}>
              <span className={styles.proposalVotes}>Votes: {proposal.voteCount}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Proposals; 