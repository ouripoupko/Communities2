import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { deployIssueContract, updateIssueProperties, addIssueToCommunity, fetchCommunityIssues } from '../../store/slices/issuesSlice';
import './Issues.scss';
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
  const { user } = useAuth();
  const issues: CommunityIssue[] = Array.isArray(communityIssues[communityId]) ? communityIssues[communityId] : [];
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [isLoadingIssues, setIsLoadingIssues] = useState(true);

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

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim() || !user || !user.serverUrl || !user.publicKey) {
      return;
    }
    setShowCreateForm(false);
    try {
      // 1. Deploy the issue contract
      const contractId = await dispatch(deployIssueContract({
        serverUrl: user.serverUrl,
        publicKey: user.publicKey,
      })).unwrap();
      // 2. Set the issue properties (name and description)
      await dispatch(updateIssueProperties({
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
      await dispatch(fetchCommunityIssues({
        serverUrl: user.serverUrl,
        publicKey: user.publicKey,
        contractId: communityId,
      }));
      setNewIssueTitle('');
      setNewIssueDescription('');
    } catch {
      alert('Failed to create issue.');
    }
  };

  const handleIssueClick = (issue: { server: string; agent: string; contract: string }) => {
    const encodedServer = encodeURIComponent(issue.server);
    const issueUrl = `/issue/${encodedServer}/${issue.agent}/${communityId}/${issue.contract}`;
    navigate(issueUrl);
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
              />
            </div>
            <div className="form-actions">
              <button onClick={handleCreateIssue} className="save-button" disabled={!newIssueTitle.trim()}>
                Create
              </button>
              <button onClick={() => setShowCreateForm(false)} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="issues-list">
        {issues.map((issue: CommunityIssue) => (
          <div key={issue.contract} className="issue-card" onClick={() => handleIssueClick(issue)}>
            <div className="issue-title">{issue.title || 'Untitled Issue'}</div>
            <div className="issue-description">{issue.description || ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Issues; 