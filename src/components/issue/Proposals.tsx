import React, { useState, useEffect } from 'react';
import { FileText, Plus, ArrowRight } from 'lucide-react';
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
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProposalTitle, setNewProposalTitle] = useState('');
  const [newProposalDescription, setNewProposalDescription] = useState('');

  useEffect(() => {
    const fetchProposals = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const mockProposals: Proposal[] = [
        {
          id: '1',
          title: 'Use Auth0 for authentication',
          description: 'Implement Auth0 as the primary authentication provider with OAuth2 and JWT support.',
          author: 'John Doe',
          createdAt: '2024-03-15',
          voteCount: 8
        },
        {
          id: '2',
          title: 'Build custom auth solution',
          description: 'Create a custom authentication system using Node.js and Passport.js.',
          author: 'Jane Smith',
          createdAt: '2024-03-14',
          voteCount: 5
        },
        {
          id: '3',
          title: 'Use Firebase Authentication',
          description: 'Leverage Firebase Authentication for easy integration and management.',
          author: 'Mike Johnson',
          createdAt: '2024-03-13',
          voteCount: 3
        }
      ];
      
      setProposals(mockProposals);
      setIsLoading(false);
    };

    fetchProposals();
  }, [issueId]);

  const handleCreateProposal = async () => {
    if (!newProposalTitle.trim()) return;

    const newProposal: Proposal = {
      id: Date.now().toString(),
      title: newProposalTitle,
      description: newProposalDescription,
      author: 'You',
      createdAt: new Date().toISOString().split('T')[0],
      voteCount: 0
    };

    setProposals([newProposal, ...proposals]);
    setNewProposalTitle('');
    setNewProposalDescription('');
    setShowCreateForm(false);
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
              <button onClick={handleCreateProposal} className="save-button">
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
        {proposals.map((proposal) => (
          <div key={proposal.id} className="proposal-card">
            <div className="proposal-header">
              <div className="proposal-title">
                <h3>{proposal.title}</h3>
              </div>
              <div className="proposal-meta">
                <span className="author">by {proposal.author}</span>
                <span className="date">{proposal.createdAt}</span>
              </div>
            </div>
            
            <div className="proposal-content">
              <p>{proposal.description}</p>
            </div>

            <div className="proposal-stats">
              <div className="stat">
                <span className="stat-label">Votes:</span>
                <span className="stat-value">{proposal.voteCount}</span>
              </div>
            </div>

            <div className="proposal-actions">
              <button className="view-button">
                <span>View Details</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
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