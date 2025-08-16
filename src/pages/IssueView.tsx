import React, { useMemo, useEffect, useState } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, FileText, Vote as VoteIcon, BarChart3 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchIssueDetails } from '../store/slices/issuesSlice';
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
  const { issueDetails = {} } = useAppSelector((state) => state.issues);
  const communityProperties = useAppSelector((state) => communityId ? state.communities?.communityProperties?.[communityId] : null);

  const { publicKey, serverUrl, contracts } = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const [fetchingIssue, setFetchingIssue] = useState(false);
  const [fetchingCommunity, setFetchingCommunity] = useState(false);
  
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

  // Get the current issue details
  const currentIssue = issueDetails[issueId!];

  // Validate community access and load data
  useEffect(() => {
    if (!communityId || !publicKey || !serverUrl) {
      return;
    }

    if(!issueId || !issueHostServer || !issueHostAgent) {
      return;
    }

    // Check if user has the community contract
    if (!contracts || !userCommunityContract) {
      return;
    }

    // Load community properties using user credentials
    console.log('communityProperties', communityProperties, communityId, fetchingCommunity);
    if (!communityProperties && !fetchingCommunity) {
      setFetchingCommunity(true);
      dispatch(fetchCommunityProperties({
        serverUrl,
        publicKey,
        contractId: communityId,
      }));
      return
    }

    // Load issue details using issue host credentials
    console.log('issueDetails', issueDetails, issueId, fetchingIssue);
    if (issueId && !issueDetails?.name && !fetchingIssue) {
      setFetchingIssue(true);
      dispatch(fetchIssueDetails({
        serverUrl: issueHostServer,
        publicKey: issueHostAgent,
        contractId: issueId,
      }));
    }

    const handleContractWrite = (event: any) => {
      if (event.contract === issueId && issueId) {
        // Reload issue details
        dispatch(fetchIssueDetails({
          serverUrl: issueHostServer,
          publicKey: issueHostAgent,
          contractId: issueId,
        }));
      }
    };

    // Add event listener for contract_write events
    eventStreamService.addEventListener('contract_write', handleContractWrite);

    // Cleanup event listener on unmount
    return () => {
      eventStreamService.removeEventListener('contract_write', handleContractWrite);
    };
  }, [serverUrl, publicKey, communityId, issueId, issueHostServer, issueHostAgent, contracts, userCommunityContract, communityProperties, dispatch]);



  const navItems = [
    { path: 'discussion', label: 'Discussion', icon: MessageSquare },
    { path: 'proposals', label: 'Proposals', icon: FileText },
    { path: 'vote', label: 'Vote', icon: VoteIcon },
    { path: 'outcome', label: 'Outcome', icon: BarChart3 },
  ];

  console.log('issueDetails before return', issueDetails);
  if (!issueId || !(issueId in issueDetails)) {
    return (
      <div className="issue-view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>{'Loading issue...'}</p>
        </div>
      </div>
    );
  }

  // if (!userCommunityContract) {
  //   return (
  //     <div className="issue-view-container">
  //       <div className="error-state">
  //         <h2>Access Denied</h2>
  //         <p>You don't have access to this community.</p>
  //         <button onClick={() => navigate('/identity/communities')} className="back-button">
  //           Back to Communities
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  // if (!currentIssue) {
  //   return (
  //     <div className="issue-view-container">
  //       <div className="error-state">
  //         <h2>Issue Not Found</h2>
  //         <p>The issue you're looking for doesn't exist.</p>
  //         <button onClick={() => navigate(`/community/${communityId}`)} className="back-button">
  //           Back to Community
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

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