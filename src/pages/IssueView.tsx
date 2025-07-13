import React from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, FileText, Vote as VoteIcon, BarChart3, Share2 } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { useUrlData } from '../hooks/useUrlData';
import Discussion from '../components/issue/Discussion';
import Proposals from '../components/issue/Proposals';
import Vote from '../components/issue/Vote';
import Outcome from '../components/issue/Outcome';
import Share from '../components/issue/Share';
import '../components/layout/Layout.scss';

const IssueView: React.FC = () => {
  const { issueId } = useParams<{ issueId: string }>();
  const navigate = useNavigate();
  const { currentIssue, loading } = useAppSelector((state: any) => state.issues);
  
  // Use the URL data hook to handle direct links
  useUrlData();

  const navItems = [
    { path: 'discussion', label: 'Discussion', icon: MessageSquare },
    { path: 'proposals', label: 'Proposals', icon: FileText },
    { path: 'vote', label: 'Vote', icon: VoteIcon },
    { path: 'outcome', label: 'Outcome', icon: BarChart3 },
    { path: 'share', label: 'Share', icon: Share2 },
  ];

  if (loading) {
    return (
      <div className="issue-view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading issue...</p>
        </div>
      </div>
    );
  }

  if (!currentIssue) {
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
          <h1>{currentIssue.title}</h1>
          <p>{currentIssue.description}</p>
          <div className="issue-stats">
            <span className="stat">
              Created: {currentIssue.createdAt}
            </span>
            <span className={`status-badge ${currentIssue.status}`}>
              {currentIssue.status.charAt(0).toUpperCase() + currentIssue.status.slice(1)}
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