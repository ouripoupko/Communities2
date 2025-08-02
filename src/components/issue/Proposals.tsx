import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getProposals, addProposal } from '../../store/slices/issuesSlice';
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
  const issueProposals = useAppSelector((state) => state.issues.issueProposals);
  const proposals: Proposal[] = Array.isArray(issueProposals[issueId]) ? issueProposals[issueId] : [];
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProposalTitle, setNewProposalTitle] = useState('');
  const [newProposalDescription, setNewProposalDescription] = useState('');

  useEffect(() => {
    const loadProposals = async () => {
      if (!issueId) return;
      try {
        setIsLoading(true);
        const pathParts = window.location.pathname.split('/');
        const encodedServer = pathParts[2];
        const agent = pathParts[3];
        const server = decodeURIComponent(encodedServer);
        await dispatch(getProposals({
          serverUrl: server,
          publicKey: agent,
          contractId: issueId,
        })).unwrap();
      } catch {
        // Error handling omitted for brevity
      } finally {
        setIsLoading(false);
      }
    };
    loadProposals();
  }, [issueId, dispatch]);

  const handleCreateProposal = async () => {
    if (!newProposalTitle.trim() || !issueId) return;
    setShowCreateForm(false);
    try {
      const pathParts = window.location.pathname.split('/');
      const encodedServer = pathParts[2];
      const agent = pathParts[3];
      const server = decodeURIComponent(encodedServer);
      const proposal: Proposal = {
        id: Date.now().toString(),
        title: newProposalTitle,
        description: newProposalDescription,
        author: 'You',
        createdAt: new Date().toISOString(),
        voteCount: 0,
      };
      await dispatch(addProposal({
        serverUrl: server,
        publicKey: agent,
        contractId: issueId,
        proposal: proposal,
      })).unwrap();
      await dispatch(getProposals({
        serverUrl: server,
        publicKey: agent,
        contractId: issueId,
      }));
      setNewProposalTitle('');
      setNewProposalDescription('');
    } catch {
      setShowCreateForm(true);
    }
  };

  if (isLoading) {
    return (
      <div className="proposals-container">
        <div className="loading-spinner"></div>
        <p>Loading proposals...</p>
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
              <button onClick={handleCreateProposal} className="save-button" disabled={!newProposalTitle.trim()}>
                Add Proposal
              </button>
              <button onClick={() => setShowCreateForm(false)} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="proposals-list">
        {proposals.map((proposal) => (
          <div key={proposal.id} className="proposal-card">
            <div className="proposal-header">
              <div className="proposal-title">
                <h3>{proposal.title}</h3>
              </div>
              <div className="proposal-meta">
                <span className="proposal-author">{proposal.author}</span>
                <span className="proposal-date">{proposal.createdAt}</span>
              </div>
            </div>
            <div className="proposal-description">{proposal.description}</div>
            <div className="proposal-votes">Votes: {proposal.voteCount}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Proposals; 