import React, { useState, useEffect } from 'react';
import { FileText, Plus, ArrowRight } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { addProposal, getProposals } from '../../store/slices/contractsSlice';
import './Proposals.scss';

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

const Proposals: React.FC<ProposalsProps> = ({ issueId }) => {
  const dispatch = useAppDispatch();
  const { issueProposals } = useAppSelector((state: any) => state.contracts);
  const proposals = Array.isArray(issueProposals[issueId]) ? issueProposals[issueId] : [];
  
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProposalTitle, setNewProposalTitle] = useState('');
  const [newProposalDescription, setNewProposalDescription] = useState('');

  // Load proposals from the contract
  useEffect(() => {
    const loadProposals = async () => {
      if (!issueId) return;

      try {
        setIsLoading(true);
        // Get the issue owner's credentials from the URL
        const pathParts = window.location.pathname.split('/');
        const encodedServer = pathParts[2];
        const agent = pathParts[3];
        const server = decodeURIComponent(encodedServer);

        await dispatch(getProposals({
          serverUrl: server,
          publicKey: agent,
          contractId: issueId,
        })).unwrap();
      } catch (error) {
        console.error('Failed to load proposals:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProposals();
  }, [issueId, dispatch]);

  const handleCreateProposal = async () => {
    if (!newProposalTitle.trim() || !issueId) return;

    // Close dialog immediately to prevent double-clicks
    setShowCreateForm(false);

    try {
      // Get the issue owner's credentials from the URL
      const pathParts = window.location.pathname.split('/');
      const encodedServer = pathParts[2];
      const agent = pathParts[3];
      const server = decodeURIComponent(encodedServer);

      // Create proposal object
      const proposal = {
        id: Date.now().toString(),
        title: newProposalTitle,
        description: newProposalDescription,
        author: 'You', // This could be enhanced to get real user info
        createdAt: new Date().toISOString(),
        voteCount: 0,
      };

      await dispatch(addProposal({
        serverUrl: server,
        publicKey: agent,
        contractId: issueId,
        proposal: proposal,
      })).unwrap();

      // Reload proposals to get the updated list
      await dispatch(getProposals({
        serverUrl: server,
        publicKey: agent,
        contractId: issueId,
      }));

      setNewProposalTitle('');
      setNewProposalDescription('');
    } catch (error) {
      console.error('Failed to add proposal:', error);
      // Reopen dialog if there was an error
      setShowCreateForm(true);
    }
  };

  if (isLoading) {
    return (
      <div className="proposals-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading proposals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="proposals-container">
      <div className="proposals-header">
        <div>
          <h2>Proposals</h2>
          <p>Review and vote on proposed solutions</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="create-button"
        >
          <Plus size={20} />
          Add Proposal
        </button>
      </div>

      {showCreateForm && (
        <div className="create-form-overlay">
          <div className="create-form">
            <h3>Add New Proposal</h3>
            <div className="form-group">
              <label htmlFor="proposalTitle">Proposal Title</label>
              <input
                id="proposalTitle"
                type="text"
                value={newProposalTitle}
                onChange={(e) => setNewProposalTitle(e.target.value)}
                placeholder="Enter proposal title"
                className="input-field"
              />
            </div>
            <div className="form-group">
              <label htmlFor="proposalDescription">Description</label>
              <textarea
                id="proposalDescription"
                value={newProposalDescription}
                onChange={(e) => setNewProposalDescription(e.target.value)}
                placeholder="Describe your proposal..."
                className="input-field"
                rows={4}
              />
            </div>
            <div className="form-actions">
              <button 
                onClick={handleCreateProposal} 
                className="save-button"
                disabled={!newProposalTitle.trim()}
              >
                Add Proposal
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="proposals-list">
        {proposals.map((proposal: any) => {
          // Ensure we have string values for display
          const proposalTitle = typeof proposal.title === 'string' ? proposal.title : 
                               typeof proposal.title === 'object' ? JSON.stringify(proposal.title) : 
                               'Unknown Proposal';
          const proposalDescription = typeof proposal.description === 'string' ? proposal.description : 
                                    typeof proposal.description === 'object' ? JSON.stringify(proposal.description) : 
                                    '';
          const proposalAuthor = typeof proposal.author === 'string' ? proposal.author : 
                                typeof proposal.author === 'object' ? JSON.stringify(proposal.author) : 
                                'Unknown Author';
          const proposalCreatedAt = typeof proposal.createdAt === 'string' ? proposal.createdAt : 
                                   typeof proposal.createdAt === 'object' ? JSON.stringify(proposal.createdAt) : 
                                   '';
          const proposalVoteCount = typeof proposal.voteCount === 'number' ? proposal.voteCount : 0;
          
          return (
            <div key={proposal.id} className="proposal-card">
              <div className="proposal-header">
                <div className="proposal-title">
                  <h3>{proposalTitle}</h3>
                </div>
                <div className="proposal-meta">
                  <span className="author">by {proposalAuthor}</span>
                  <span className="date">{new Date(proposalCreatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              {proposalDescription && (
                <div className="proposal-content">
                  <p>{proposalDescription}</p>
                </div>
              )}

              <div className="proposal-stats">
                <div className="stat">
                  <span className="stat-label">Votes:</span>
                  <span className="stat-value">{proposalVoteCount}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {proposals.length === 0 && !isLoading && (
        <div className="empty-state">
          <FileText size={48} />
          <h3>No Proposals Yet</h3>
          <p>Add the first proposal to start the voting process</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="create-button"
          >
            <Plus size={20} />
            Add Proposal
          </button>
        </div>
      )}
    </div>
  );
};

export default Proposals; 