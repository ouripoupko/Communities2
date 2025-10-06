import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';

import { fetchCommunityIssues, fetchIssueDetails } from '../../store/slices/issuesSlice';
import CreateIssueDialog from './issues/CreateIssueDialog';
import styles from './Issues.module.scss';
import { eventStreamService } from '../../services/eventStream';

interface IssuesProps {
  communityId: string;
}

interface CommunityIssue {
  id?: string;
  title?: string;
  description?: string;
  server: string;
  agent: string;
  contract: string;
}

const Issues: React.FC<IssuesProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const communityIssues = useAppSelector((state) => state.issues.communityIssues);
  const user = useAppSelector((state) => state.user);
  const issues: CommunityIssue[] = Array.isArray(communityIssues[communityId]) ? communityIssues[communityId] : [];
  const issueDetails = useAppSelector((state) => state.issues.issueDetails);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoadingIssues, setIsLoadingIssues] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  // Memoize the event handler so its reference is stable
  const handleContractWrite = useCallback((event: { contract?: string }) => {
    if (event.contract === communityId && user?.serverUrl && user?.publicKey) {
      dispatch(fetchCommunityIssues({
        serverUrl: user.serverUrl,
        publicKey: user.publicKey,
        contractId: communityId,
      }));
    }
  }, [communityId, user?.serverUrl, user?.publicKey, dispatch]);

  const listenerRegistered = useRef(false);

  useEffect(() => {
    if (!user?.serverUrl || !user?.publicKey || !communityId) return;
    setIsLoadingIssues(true);
    dispatch(fetchCommunityIssues({
      serverUrl: user.serverUrl,
      publicKey: user.publicKey,
      contractId: communityId,
    })).finally(() => {
      setIsLoadingIssues(false);
    });
    if (!listenerRegistered.current) {
      eventStreamService.addEventListener('contract_write', handleContractWrite);
      listenerRegistered.current = true;
    }
    return () => {
      if (listenerRegistered.current) {
        eventStreamService.removeEventListener('contract_write', handleContractWrite);
        listenerRegistered.current = false;
      }
    };
  }, [communityId, user?.serverUrl, user?.publicKey, dispatch, handleContractWrite]);

  // Fetch issue details in parallel after issues list is loaded
  useEffect(() => {
    if (isLoadingIssues || issues.length === 0 || !user?.serverUrl || !user?.publicKey) {
      return;
    }

    // Get issues that don't have details yet and aren't currently loading
    const issuesToLoad = issues.filter(issue => {
      const contractId = issue.contract;
      return !issueDetails[contractId] && !loadingDetails.has(contractId);
    });

    if (issuesToLoad.length === 0) {
      return;
    }

    // Mark these issues as loading
    setLoadingDetails(prev => {
      const newSet = new Set(prev);
      issuesToLoad.forEach(issue => newSet.add(issue.contract));
      return newSet;
    });

    // Fetch details for all issues in parallel
    const loadPromises = issuesToLoad.map(issue => {
      return dispatch(fetchIssueDetails({
        serverUrl: issue.server,
        publicKey: issue.agent,
        contractId: issue.contract,
      })).finally(() => {
        // Remove from loading set when done
        setLoadingDetails(prev => {
          const newSet = new Set(prev);
          newSet.delete(issue.contract);
          return newSet;
        });
      });
    });

    // Wait for all to complete (but don't block UI updates)
    Promise.all(loadPromises).catch(error => {
      console.error('Error loading issue details:', error);
    });

  }, [issues, issueDetails, loadingDetails, isLoadingIssues, user?.serverUrl, user?.publicKey, dispatch]);

  // Helper function to get display title for an issue
  const getIssueDisplayTitle = (issue: CommunityIssue): string => {
    const contractId = issue.contract;
    const details = issueDetails[contractId];
    
    // If we have details and a name, use it
    if (details && details.name) {
      return details.name;
    }
    
    // If we're currently loading details, show loading
    if (loadingDetails.has(contractId)) {
      return 'Loading...';
    }
    
    // Fallback to issue title if available
    if (issue.title) {
      return issue.title;
    }
    
    // Last resort fallback
    return 'Untitled Issue';
  };

  const handleIssueClick = (issue: { server: string; agent: string; contract: string }) => {
    const encodedIssueHostServer = encodeURIComponent(issue.server);
    const issueUrl = `/issue/${encodedIssueHostServer}/${issue.agent}/${communityId}/${issue.contract}`;
    navigate(issueUrl);
  };

  if (isLoadingIssues) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p className={styles.text}>Loading issues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Issues</h2>
          <p className={styles.subtitle}>Raise any issue you want to discuss with the community</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className={styles.createButton}
        >
          <Plus size={20} />
          Create Issue
        </button>
      </div>
      <CreateIssueDialog 
        isVisible={showCreateForm} 
        onClose={() => setShowCreateForm(false)}
        communityId={communityId}
      />
      <div className={styles.list}>
        {issues.map((issue: CommunityIssue) => (
          <div key={issue.contract} className={styles.card} onClick={() => handleIssueClick(issue)}>
            <div className={styles.cardHeader}>
              <div className={styles.titleSection}>
                <h3 className={styles.title}>{getIssueDisplayTitle(issue)}</h3>
              </div>
            </div>
            <div className={styles.content}>
              <p className={styles.description}>
                {issueDetails[issue.contract]?.description || issue.description || ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Issues; 