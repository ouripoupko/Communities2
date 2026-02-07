import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, FileText, Vote as VoteIcon, BarChart3 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchIssueDetails, getProposals } from '../store/slices/issuesSlice';
import { fetchCommunityProperties } from '../store/slices/communitiesSlice';
import { eventStreamService } from '../services/eventStream';
import Discussion from '../components/issue/Discussion';
import Proposals from '../components/issue/Proposals';
import Vote from '../components/issue/Vote';
import Outcome from '../components/issue/Outcome';
import PageHeader from '../components/PageHeader';
import styles from './Container.module.scss';

const IssueView: React.FC = () => {
  const { issueHostServer: encodedIssueHostServer, issueHostAgent: issueHostAgentFromUrl, communityId, issueId } = useParams<{ issueHostServer: string; issueHostAgent: string; communityId: string; issueId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { issueDetails = {}, issueProposals, proposalsLoading } = useAppSelector((state) => state.issues);
  const communityProperties = useAppSelector((state) => communityId ? state.communities?.communityProperties?.[communityId] : null);

  const { publicKey, serverUrl, contracts } = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  
  // Refs to track loading states and prevent duplicate requests
  const isLoadingIssueDetails = useRef(false);
  const isLoadingProposals = useRef(false);
  const lastContractWriteTime = useRef(0);
  
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
    if (issueId && issueHostServer && issueHostAgent && !currentIssue && !isLoadingIssueDetails.current) {
      isLoadingIssueDetails.current = true;
      dispatch(fetchIssueDetails({
        serverUrl: issueHostServer,
        publicKey: issueHostAgent,
        contractId: issueId,
      })).finally(() => {
        isLoadingIssueDetails.current = false;
      });
    }
  }, [issueId, issueHostServer, issueHostAgent, currentIssue, dispatch]);

  // Load proposals when needed (shared data for multiple components)
  useEffect(() => {
    if (issueId && issueHostServer && issueHostAgent && !isProposalsLoading && currentProposals.length === 0 && !isLoadingProposals.current) {
      isLoadingProposals.current = true;
      dispatch(getProposals({
        serverUrl: issueHostServer,
        publicKey: issueHostAgent,
        contractId: issueId,
      })).finally(() => {
        isLoadingProposals.current = false;
      });
    }
  }, [issueId, issueHostServer, issueHostAgent, isProposalsLoading, currentProposals.length, dispatch]);

  // Handle contract_write events with debouncing and duplicate prevention
  const handleContractWrite = useCallback((event: any) => {
    if (event.contract === issueId && issueId) {
      const now = Date.now();
      // Debounce: only process if at least 2 seconds have passed since last contract write
      if (now - lastContractWriteTime.current < 2000) {
        return;
      }
      lastContractWriteTime.current = now;
      
      // Only refresh if not already loading
      if (!isLoadingIssueDetails.current) {
        isLoadingIssueDetails.current = true;
        dispatch(fetchIssueDetails({
          serverUrl: issueHostServer,
          publicKey: issueHostAgent,
          contractId: issueId,
        })).finally(() => {
          isLoadingIssueDetails.current = false;
        });
      }
      
      if (!isLoadingProposals.current) {
        isLoadingProposals.current = true;
        dispatch(getProposals({
          serverUrl: issueHostServer,
          publicKey: issueHostAgent,
          contractId: issueId,
        })).finally(() => {
          isLoadingProposals.current = false;
        });
      }
    }
  }, [issueId, issueHostServer, issueHostAgent, dispatch]);

  useEffect(() => {
    eventStreamService.addEventListener('contract_write', handleContractWrite);
    return () => {
      eventStreamService.removeEventListener('contract_write', handleContractWrite);
    };
  }, [handleContractWrite]);

  const navItems = [
    { path: 'discussion', label: 'Discussion', icon: MessageSquare },
    { path: 'proposals', label: 'Proposals', icon: FileText },
    { path: 'vote', label: 'Vote', icon: VoteIcon },
    { path: 'outcome', label: 'Outcome', icon: BarChart3 },
  ];

  // Show full-page loading only on initial load, not when refetching (e.g. after SSE).
  // This keeps the dialog open and avoids flicker when proposals or issue details update.
  const isInitialProposalsLoad = isProposalsLoading && currentProposals.length === 0;
  if (!currentIssue || isInitialProposalsLoad) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
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
    <div className={styles.container}>
      <PageHeader
        showBackButton={true}
        backButtonText="Back to Community"
        onBackClick={() => navigate(`/community/${communityId}`)}
        title={issueName}
        layout="two-row"
      />

      <div className={styles.content}>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(`/issue/${encodeURIComponent(issueHostServer)}/${issueHostAgent}/${communityId}/${issueId}/${item.path}`)}
              className={`${styles.navItem} ${location.pathname.includes(`/issue/${encodeURIComponent(issueHostServer)}/${issueHostAgent}/${communityId}/${issueId}/${item.path}`) ? styles.active : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.main}>
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