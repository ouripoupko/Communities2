import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import styles from './Proposals.module.scss';
import { addProposal, setAiFeedback } from '../../services/contracts/issue';
import { fetchIssueSummary } from '../../services/openai';
import CreateProposal from './dialogs/CreateProposal';
import AIFeedbackDialog from './dialogs/AIFeedbackDialog';

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
  const issueProposals = useAppSelector((state) => state.issues.issueProposals);
  const issueDetails = useAppSelector((state) => state.issues.issueDetails);
  const issueComments = useAppSelector((state) => state.issues.issueComments);
  const proposals: Proposal[] = Array.isArray(issueProposals[issueId]) ? issueProposals[issueId] : [];
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const user = useAppSelector((state) => state.user);
  const profiles = useAppSelector((state) => state.communities.profiles);

  const currentIssueDetails = issueId ? issueDetails[issueId] : null;
  const comments = Array.isArray(issueComments[issueId]) ? issueComments[issueId] : [];
  const storedAiFeedback =
    currentIssueDetails?.ai_feedback != null && currentIssueDetails.ai_feedback !== ''
      ? String(currentIssueDetails.ai_feedback)
      : null;

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

    const apiKey = user.profile?.openaiApiKey?.trim();
    if (apiKey) {
      try {
        const proposalsWithNew = [...proposals, proposal];
        const summary = await fetchIssueSummary(apiKey, {
          issueName: currentIssueDetails?.name,
          issueDescription: currentIssueDetails?.description,
          comments: comments.map((c: { author?: string; content: string }) => ({
            author: c.author,
            content: c.content ?? '',
          })),
          proposals: proposalsWithNew.map((p) => ({
            title: p.title,
            description: p.description,
            author: p.author,
          })),
          votes: currentIssueDetails?.votes,
        });
        await setAiFeedback(issueHostServer, issueHostAgent, issueId, summary);
        // Do not update store here. New ai_feedback will appear when SSE contract_write triggers a refetch.
      } catch (err) {
        console.error('AI feedback update failed:', err);
      }
    }
  }, [
    issueId,
    issueHostServer,
    issueHostAgent,
    user.publicKey,
    user.profile?.openaiApiKey,
    proposals,
    currentIssueDetails,
    comments,
  ]);

  // Show message when no proposals exist (proposals are already loaded by parent)
  if (proposals.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2>Proposals</h2>
            <p>Review and vote on proposed solutions</p>
          </div>
          <div className={styles.headerActions}>
            <button
              onClick={() => setShowAIFeedback(true)}
              className={styles.aiFeedbackButton}
              type="button"
              title="View AI summary of community opinions"
            >
              <Sparkles size={18} />
              AI feedback
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className={styles.createButton}
            >
              <Plus size={20} />
              Add Proposal
            </button>
          </div>
        </div>
        <div className={styles.noProposals}>
          <p>No proposals have been submitted for this issue yet.</p>
        </div>

        <CreateProposal 
          isVisible={showCreateForm}
          onClose={handleCloseForm}
          onSubmit={handleSubmitProposal}
        />
        <AIFeedbackDialog
          isVisible={showAIFeedback}
          onClose={() => setShowAIFeedback(false)}
          aiFeedback={storedAiFeedback}
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
        <div className={styles.headerActions}>
          <button
            onClick={() => setShowAIFeedback(true)}
            className={styles.aiFeedbackButton}
            type="button"
            title="View AI summary of community opinions"
          >
            <Sparkles size={18} />
            AI feedback
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className={styles.createButton}
          >
            <Plus size={20} />
            Add Proposal
          </button>
        </div>
      </div>
      <CreateProposal 
        isVisible={showCreateForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmitProposal}
      />
      <AIFeedbackDialog
        isVisible={showAIFeedback}
        onClose={() => setShowAIFeedback(false)}
        aiFeedback={storedAiFeedback}
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