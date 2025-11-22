import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import styles from './Proposals.module.scss';
import { addProposal } from '../../services/contracts/issue';
import CreateProposal from './dialogs/CreateProposal';

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
  const user = useAppSelector((state) => state.user);
  const profiles = useAppSelector((state) => state.communities.profiles);

  // Decode the issue host server URL
  const issueHostServer = encodedIssueHostServer ? decodeURIComponent(encodedIssueHostServer) : '';
  
  // Helper function to get display name for a proposal author
  const getAuthorDisplayName = (authorPublicKey: string): string => {
    // If it's the current user, show "You"
    if (user.publicKey && authorPublicKey === user.publicKey) {
      return 'You';
    }
    
    // If we have a profile for this author, show their full name
    const profile = profiles[authorPublicKey];
    if (profile) {
      const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      if (fullName) {
        return fullName;
      }
    }
    
    // Otherwise, show truncated public key with ellipsis
    if (authorPublicKey.length > 20) {
      return `${authorPublicKey.substring(0, 20)}...`;
    }
    return authorPublicKey;
  };

  const handleCloseForm = useCallback(() => {
    setShowCreateForm(false);
  }, []);

  const handleSubmitProposal = useCallback(async (title: string, description: string) => {
    if (!issueId || !issueHostServer || !issueHostAgent) throw new Error('Missing required parameters');
    
    const proposal: Proposal = {
      id: Date.now().toString(),
      title,
      description,
      author: user.publicKey || 'Unknown',
      createdAt: new Date().toISOString(),
      voteCount: 0,
    };
    
    await addProposal(
      issueHostServer,
      issueHostAgent,
      issueId,
      proposal,
    );
    
    setShowCreateForm(false);
  }, [issueId, issueHostServer, issueHostAgent, dispatch, user.publicKey]);

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
        
        <CreateProposal 
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
      <CreateProposal 
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
                <span className={styles.author}>{getAuthorDisplayName(proposal.author)}</span>
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