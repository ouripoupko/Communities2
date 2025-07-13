import React from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Users, Coins, Share2 } from 'lucide-react';
import { useAppSelector } from '../store/hooks';
import { useUrlData } from '../hooks/useUrlData';
import Issues from '../components/community/Issues';
import Members from '../components/community/Members';
import Currency from '../components/community/Currency';
import Share from '../components/community/Share';
import '../components/layout/Layout.scss';

const CommunityView: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const { currentCommunity, loading } = useAppSelector(state => state.communities);
  
  // Use the URL data hook to handle direct links
  useUrlData();

  const navItems = [
    { path: 'issues', label: 'Issues', icon: MessageSquare },
    { path: 'members', label: 'Members', icon: Users },
    { path: 'currency', label: 'Currency', icon: Coins },
    { path: 'share', label: 'Share', icon: Share2 },
  ];

  if (loading) {
    return (
      <div className="community-view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading community...</p>
        </div>
      </div>
    );
  }

  if (!currentCommunity) {
    return (
      <div className="community-view-container">
        <div className="error-state">
          <h2>Community Not Found</h2>
          <p>The community you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/identity/communities')} className="back-button">
            Back to Communities
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="community-view-container">
      <div className="community-header">
        <div className="header-left">
          <button onClick={() => navigate('/identity/communities')} className="back-button">
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="community-info">
            <h1>{currentCommunity.name}</h1>
            <p>{currentCommunity.description}</p>
          </div>
        </div>
        <div className="header-right">
          <span className="stat">
            <Users size={16} />
            {currentCommunity.memberCount} members
          </span>
          {currentCommunity.isOwner && (
            <span className="owner-badge">Owner</span>
          )}
        </div>
      </div>

      <div className="community-content">
        <nav className="community-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(`/community/${communityId}/${item.path}`)}
              className={`nav-item ${window.location.pathname.includes(`/community/${communityId}/${item.path}`) ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="community-main">
          <Routes>
            <Route path="issues" element={<Issues communityId={communityId!} />} />
            <Route path="members" element={<Members communityId={communityId!} />} />
            <Route path="currency" element={<Currency communityId={communityId!} />} />
            <Route path="share" element={<Share communityId={communityId!} />} />
            <Route path="*" element={<Issues communityId={communityId!} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default CommunityView; 