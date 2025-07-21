import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { deployIssueContract, addIssueToCommunity, getCommunityIssues, setIssueProperties } from '../../store/slices/contractsSlice';
import type { Issue } from '../../services/api';
import './Issues.scss';
import { eventStreamService } from '../../services/eventStream';

interface IssuesProps {
  communityId: string;
}

const Issues: React.FC<IssuesProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { communityIssues } = useAppSelector((state: any) => state.contracts);
  const { loading } = useAppSelector((state: any) => state.issues);
  // Use AuthContext for user credentials
  const { user } = useAuth();
  const issues = Array.isArray(communityIssues[communityId]) ? communityIssues[communityId] : [];
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [isLoadingIssues, setIsLoadingIssues] = useState(true);

  // Memoize the event handler so its reference is stable
  const handleContractWrite = useCallback((event: any) => {
    if (event.contract === communityId && user?.serverUrl && user?.publicKey) {
      dispatch(getCommunityIssues({
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
    dispatch(getCommunityIssues({
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

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim() || !user || !user.serverUrl || !user.publicKey) {
      return;
    }
    
    // Close dialog immediately
    setShowCreateForm(false);
    
    try {
      // 1. Deploy the issue contract
      const contractId = await dispatch(deployIssueContract({
        serverUrl: user.serverUrl,
        publicKey: user.publicKey,
      })).unwrap();

      // 2. Set the issue properties (name and description)
      await dispatch(setIssueProperties({
        serverUrl: user.serverUrl,
        publicKey: user.publicKey,
        contractId: contractId,
        name: newIssueTitle,
        text: newIssueDescription,
      })).unwrap();

      // 3. Add the issue to the community contract
      await dispatch(addIssueToCommunity({
        serverUrl: user.serverUrl,
        publicKey: user.publicKey,
        contractId: communityId,
        issue: {
          server: user.serverUrl,
          agent: user.publicKey,
          contract: contractId,
        },
      })).unwrap();

      // 4. Fetch the updated issues list
      await dispatch(getCommunityIssues({
        serverUrl: user.serverUrl,
        publicKey: user.publicKey,
        contractId: communityId,
      }));

      setNewIssueTitle('');
      setNewIssueDescription('');
    } catch (error) {
      alert('Failed to create issue.');
    }
  };

  const handleIssueClick = (issue: any) => {
    // Generate URL with server, agent, community ID, and issue id - encode the server URL
    const encodedServer = encodeURIComponent(issue.server);
    const issueUrl = `/issue/${encodedServer}/${issue.agent}/${communityId}/${issue.contract}`;
    navigate(issueUrl);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle size={16} className="status-icon open" />;
      case 'voting':
        return <CheckCircle size={16} className="status-icon voting" />;
      case 'closed':
        return <CheckCircle size={16} className="status-icon closed" />;
      default:
        return null;
    }
  };

  if (isLoadingIssues) {
    return (
      <div className="issues-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading issues...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="issues-container">
      <div className="issues-header">
        <div>
          <h2>Issues</h2>
          <p>Raise any issue you want to discuss with the community</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="create-button"
        >
          <Plus size={20} />
          Create Issue
        </button>
      </div>

      {showCreateForm && (
        <div className="create-form-overlay">
          <div className="create-form">
            <h3>Create New Issue</h3>
            <div className="form-group">
              <label htmlFor="issueTitle">Issue Title</label>
              <input
                id="issueTitle"
                type="text"
                value={newIssueTitle}
                onChange={(e) => setNewIssueTitle(e.target.value)}
                placeholder="Enter issue title"
                className="input-field"
              />
            </div>
            <div className="form-group">
              <label htmlFor="issueDescription">Description</label>
              <textarea
                id="issueDescription"
                value={newIssueDescription}
                onChange={(e) => setNewIssueDescription(e.target.value)}
                placeholder="Describe the issue..."
                className="input-field"
                rows={4}
              />
            </div>
            <div className="form-actions">
              <button
                onClick={handleCreateIssue}
                className="save-button"
                disabled={!newIssueTitle.trim() || !user || !user.serverUrl || !user.publicKey}
              >
                Create Issue
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

      <div className="issues-list">
        {issues.map((issue: any, idx: number) => {
          // Ensure we have string values for display
          const issueName = typeof issue.name === 'string' ? issue.name : 
                           typeof issue.name === 'object' ? JSON.stringify(issue.name) : 
                           'Unknown Issue';
          const issueDescription = typeof issue.description === 'string' ? issue.description : 
                                 typeof issue.description === 'object' ? JSON.stringify(issue.description) : 
                                 '';
          
          return (
            <div
              key={issue.contract || idx}
              className="issue-card"
              onClick={() => handleIssueClick(issue)}
            >
              <div className="issue-header">
                <div className="issue-title">
                  <h3>{issueName}</h3>
                </div>
              </div>
              {issueDescription && (
                <div className="issue-description">
                  <p>{issueDescription}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {issues.length === 0 && !isLoadingIssues && (
        <div className="empty-state">
          <MessageSquare size={48} />
          <h3>No Issues Yet</h3>
          <p>Create the first issue to start discussions</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="create-button"
          >
            <Plus size={20} />
            Create Issue
          </button>
        </div>
      )}
    </div>
  );
};

export default Issues; 