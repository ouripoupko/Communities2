import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchIssues, createIssue } from '../../store/slices/issuesSlice';
import type { Issue } from '../../services/api';
import './Issues.scss';

interface IssuesProps {
  communityId: string;
}

const Issues: React.FC<IssuesProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { issues, loading } = useAppSelector((state: any) => state.issues);
  const { currentUser } = useAppSelector((state: any) => state.user);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueDescription, setNewIssueDescription] = useState('');

  useEffect(() => {
    dispatch(fetchIssues(communityId));
  }, [dispatch, communityId]);

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim() || !currentUser) return;

    await dispatch(createIssue({
      communityId,
      title: newIssueTitle,
      description: newIssueDescription,
      createdBy: currentUser.id
    }));

    setNewIssueTitle('');
    setNewIssueDescription('');
    setShowCreateForm(false);
  };

  const handleIssueClick = (issueId: string) => {
    navigate(`/issue/${issueId}`);
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

  if (loading) {
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
              <button onClick={handleCreateIssue} className="save-button">
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
        {issues.map((issue: Issue) => (
          <div
            key={issue.id}
            className="issue-card"
            onClick={() => handleIssueClick(issue.id)}
          >
            <div className="issue-header">
              <div className="issue-title">
                <h3>{issue.title}</h3>
                {getStatusIcon(issue.status)}
              </div>
              <div className="issue-meta">
                <span className="creator">by {issue.creatorName}</span>
                <span className="date">{issue.createdAt}</span>
              </div>
            </div>
            
            <div className="issue-content">
              <p>{issue.description}</p>
            </div>

            <div className="issue-stats">
              <div className="stat">
                <span className="stat-label">Proposals:</span>
                <span className="stat-value">{issue.proposalCount}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Status:</span>
                <span className={`status-badge ${issue.status}`}>
                  {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
                </span>
              </div>
            </div>

            <div className="issue-actions">
              <button className="view-button">
                <span>View Issue</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {issues.length === 0 && !loading && (
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