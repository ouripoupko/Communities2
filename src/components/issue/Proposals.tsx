import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getProposals } from '../../store/slices/issuesSlice';
import { contractWrite } from '../../services/api';
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
  const { issueHostServer: encodedIssueHostServer, issueHostAgent } = useParams<{ issueHostServer: string; issueHostAgent: string }>();
  const dispatch = useAppDispatch();
  const issueProposals = useAppSelector((state) => state.issues.issueProposals);
  const proposals: Proposal[] = Array.isArray(issueProposals[issueId]) ? issueProposals[issueId] : [];
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProposalTitle, setNewProposalTitle] = useState('');
  const [newProposalDescription, setNewProposalDescription] = useState('');

  // Decode the issue host server URL
  const issueHostServer = encodedIssueHostServer ? decodeURIComponent(encodedIssueHostServer) : '';

  const handleCreateProposal = async () => {
    if (!newProposalTitle.trim() || !issueId || !issueHostServer || !issueHostAgent) return;
    setShowCreateForm(false);
    try {
      const proposal: Proposal = {
        id: Date.now().toString(),
        title: newProposalTitle,
        description: newProposalDescription,
        author: 'You',
        createdAt: new Date().toISOString(),
        voteCount: 0,
      };
      await contractWrite({
        serverUrl: issueHostServer,
        publicKey: issueHostAgent,
        contractId: issueId,
        method: 'add_proposal',
        args: { proposal: proposal },
      });
      // Refresh proposals using the centralized loading mechanism
      await dispatch(getProposals({
        serverUrl: issueHostServer,
        publicKey: issueHostAgent,
        contractId: issueId,
      }));
      setNewProposalTitle('');
      setNewProposalDescription('');
    } catch {
      setShowCreateForm(true);
    }
  };

  // Show message when no proposals exist (proposals are already loaded by parent)
  if (proposals.length === 0) {
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
        <div className="no-proposals">
          <p>No proposals have been submitted for this issue yet.</p>
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