import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import './Issues.scss';

interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'voting' | 'closed';
  createdAt: string;
  creatorName: string;
  proposalCount: number;
}

interface IssuesProps {
  communityId: string;
}

const Issues: React.FC<IssuesProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueDescription, setNewIssueDescription] = useState('');

  useEffect(() => {
    // Mock API call to fetch issues
    const fetchIssues = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock data
      const mockIssues: Issue[] = [
        {
          id: '1',
          title: 'Implement new authentication system',
          description: 'We need to implement a more secure authentication system that supports OAuth2 and JWT tokens.',
          status: 'open',
          createdAt: '2024-03-15',
          creatorName: 'John Doe',
          proposalCount: 3
        },
        {
          id: '2',
          title: 'Redesign user interface',
          description: 'The current UI needs a complete redesign to improve user experience and accessibility.',
          status: 'voting',
          createdAt: '2024-03-10',
          creatorName: 'Jane Smith',
          proposalCount: 5
        },
        {
          id: '3',
          title: 'Add dark mode support',
          description: 'Users have requested dark mode support for better accessibility and user preference.',
          status: 'closed',
          createdAt: '2024-03-05',
          creatorName: 'Mike Johnson',
          proposalCount: 2
        }
      ];
      
      setIssues(mockIssues);
      setIsLoading(false);
    };

    fetchIssues();
  }, [communityId]);

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim()) return;

    const newIssue: Issue = {
      id: Date.now().toString(),
      title: newIssueTitle,
      description: newIssueDescription,
      status: 'open',
      createdAt: new Date().toISOString().split('T')[0],
      creatorName: 'You',
      proposalCount: 0
    };

    setIssues([newIssue, ...issues]);
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

  if (isLoading) {
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
          <p>Discuss and vote on community decisions</p>
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
        {issues.map((issue) => (
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

      {issues.length === 0 && !isLoading && (
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