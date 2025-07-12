import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, FileText, Vote as VoteIcon, BarChart3, Share2 } from 'lucide-react';
import Discussion from '../components/issue/Discussion';
import Proposals from '../components/issue/Proposals';
import Vote from '../components/issue/Vote';
import Outcome from '../components/issue/Outcome';
import Share from '../components/issue/Share';
import '../components/layout/Layout.scss';

interface Issue {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  createdAt: string;
  status: 'open' | 'voting' | 'closed';
}

const IssueView: React.FC = () => {
  const { issueId } = useParams<{ issueId: string }>();
  const navigate = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock API call to fetch issue data
    const fetchIssue = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Mock issue data
      const mockIssue: Issue = {
        id: issueId || '1',
        title: 'Implement new authentication system',
        description: 'We need to implement a more secure authentication system that supports OAuth2 and JWT tokens.',
        creatorId: 'user-123',
        createdAt: '2024-03-15',
        status: 'open'
      };
      
      setIssue(mockIssue);
      setIsLoading(false);
    };

    fetchIssue();
  }, [issueId]);

  const navItems = [
    { path: 'discussion', label: 'Discussion', icon: MessageSquare },
    { path: 'proposals', label: 'Proposals', icon: FileText },
    { path: 'vote', label: 'Vote', icon: VoteIcon },
    { path: 'outcome', label: 'Outcome', icon: BarChart3 },
    { path: 'share', label: 'Share', icon: Share2 },
  ];

  if (isLoading) {
    return (
      <div className="issue-view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading issue...</p>
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="issue-view-container">
        <div className="error-state">
          <h2>Issue Not Found</h2>
          <p>The issue you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/community/1')} className="back-button">
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="issue-view-container">
      <div className="issue-header">
        <button onClick={() => navigate('/community/1')} className="back-button">
          <ArrowLeft size={20} />
          Back to Community
        </button>
        <div className="issue-info">
          <h1>{issue.title}</h1>
          <p>{issue.description}</p>
          <div className="issue-stats">
            <span className="stat">
              Created: {issue.createdAt}
            </span>
            <span className={`status-badge ${issue.status}`}>
              {issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="issue-content">
        <nav className="issue-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(`/issue/${issueId}/${item.path}`)}
              className={`nav-item ${window.location.pathname.includes(`/issue/${issueId}/${item.path}`) ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="issue-main">
          <Routes>
            <Route path="discussion" element={<Discussion issueId={issueId!} />} />
            <Route path="proposals" element={<Proposals issueId={issueId!} />} />
            <Route path="vote" element={<Vote issueId={issueId!} />} />
            <Route path="outcome" element={<Outcome issueId={issueId!} />} />
            <Route path="share" element={<Share issueId={issueId!} />} />
            <Route path="*" element={<Discussion issueId={issueId!} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default IssueView; 