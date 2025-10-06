import React, { useMemo, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, FileText, Vote as VoteIcon, BarChart3 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchIssueDetails, getProposals } from '../store/slices/issuesSlice';
import { fetchCommunityProperties } from '../store/slices/communitiesSlice';
import { eventStreamService } from '../services/eventStream';
import Discussion from '../components/issue/Discussion';
import Proposals from '../components/issue/Proposals';
import Vote from '../components/issue/Vote';
import Outcome from '../components/issue/Outcome';
import '../components/layout/Layout.scss';

const IssueView: React.FC = () => {
  const { issueHostServer: encodedIssueHostServer, issueHostAgent: issueHostAgentFromUrl, communityId, issueId } = useParams<{ issueHostServer: string; issueHostAgent: string; communityId: string; issueId: string }>();
  const navigate = useNavigate();
  const { issueDetails = {}, issueProposals, proposalsLoading } = useAppSelector((state) => state.issues);
  const communityProperties = useAppSelector((state) => communityId ? state.communities?.communityProperties?.[communityId] : null);

  const { publicKey, serverUrl, contracts } = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  
  // Decode the issue host credentials from the URL parameters
  const issueHostServer = useMemo(() => {
    return encodedIssueHostServer ? decodeURIComponent(encodedIssueHostServer) : '';
  }, [encodedIssueHostServer]);
  const issueHostAgent = issueHostAgentFromUrl || '';

  // Check if current user has access to the community
  const userCommunityContract = useMemo(() => 
    contracts.find((c: any) => c.id === communityId), 
    [contracts, communityId]
  );

  // Get the current issue details and proposals
  const currentIssue = issueDetails[issueId!];
  const currentProposals = issueProposals[issueId!] || [];
  const isProposalsLoading = proposalsLoading[issueId!] || false;

  // Load community properties when needed
  useEffect(() => {
    if (communityId && publicKey && serverUrl && userCommunityContract && !communityProperties) {
      dispatch(fetchCommunityProperties({
        serverUrl,
        publicKey,
        contractId: communityId,
      }));
    }
  }, [communityId, publicKey, serverUrl, userCommunityContract, communityProperties, dispatch]);

  // Load issue details when needed
  useEffect(() => {
    if (issueId && issueHostServer && issueHostAgent && !currentIssue) {
      dispatch(fetchIssueDetails({
        serverUrl: issueHostServer,
        publicKey: issueHostAgent,
        contractId: issueId,
      }));
    }
  }, [issueId, issueHostServer, issueHostAgent, currentIssue, dispatch]);

  // Load proposals when needed (shared data for multiple components)
  useEffect(() => {
    if (issueId && issueHostServer && issueHostAgent && !isProposalsLoading && currentProposals.length === 0) {
      dispatch(getProposals({
        serverUrl: issueHostServer,
        publicKey: issueHostAgent,
        contractId: issueId,
      }));
    }
  }, [issueId, issueHostServer, issueHostAgent, isProposalsLoading, currentProposals.length, dispatch]);

  // Handle contract_write events
  useEffect(() => {
    const handleContractWrite = (event: any) => {
      if (event.contract === issueId && issueId) {
        console.log('Contract write event detected for issue:', issueId);
        // Refresh both issue details and proposals when contract changes
        dispatch(fetchIssueDetails({
          serverUrl: issueHostServer,
          publicKey: issueHostAgent,
          contractId: issueId,
        }));
        dispatch(getProposals({
          serverUrl: issueHostServer,
          publicKey: issueHostAgent,
          contractId: issueId,
        }));
      }
    };

    eventStreamService.addEventListener('contract_write', handleContractWrite);
    return () => {
      eventStreamService.removeEventListener('contract_write', handleContractWrite);
    };
  }, [issueId, issueHostServer, issueHostAgent, dispatch]);

  const navItems = [
    { path: 'discussion', label: 'Discussion', icon: MessageSquare },
    { path: 'proposals', label: 'Proposals', icon: FileText },
    { path: 'vote', label: 'Vote', icon: VoteIcon },
    { path: 'outcome', label: 'Outcome', icon: BarChart3 },
  ];

  // Show loading state while essential data is being fetched
  if (!currentIssue || isProposalsLoading) {
    return (
      <div className="issue-view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading issue data...</p>
        </div>
      </div>
    );
  }

  // Handle different possible response structures for issue data
  const issueName = typeof currentIssue.name === 'string' ? currentIssue.name : 
                   typeof currentIssue.name === 'object' ? JSON.stringify(currentIssue.name) : 
                   'Unknown Issue';

  return (
    <div className="issue-view-container">
      <div className="issue-page-header">
        <div className="header-left">
          <button onClick={() => navigate(`/community/${communityId}`)} className="back-button">
            <ArrowLeft size={16} />
            Back to Community
          </button>
          <div className="issue-info">
            <h1>{issueName}</h1>
          </div>
        </div>
      </div>

      <div className="issue-page-content">
        <nav className="issue-page-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(`/issue/${encodeURIComponent(issueHostServer)}/${issueHostAgent}/${communityId}/${issueId}/${item.path}`)}
              className={`issue-nav-item ${window.location.pathname.includes(`/issue/${encodeURIComponent(issueHostServer)}/${issueHostAgent}/${communityId}/${issueId}/${item.path}`) ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="issue-page-main">
          <Routes>
            <Route path="discussion" element={<Discussion issueId={issueId!} />} />
            <Route path="proposals" element={<Proposals issueId={issueId!} />} />
            <Route path="vote" element={<Vote issueId={issueId!} />} />
            <Route path="outcome" element={<Outcome issueId={issueId!} />} />
            <Route path="*" element={<Discussion issueId={issueId!} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default IssueView; 