import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, ArrowRight, Settings } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCommunities, createCommunity } from '../../store/slices/communitiesSlice';
import './Communities.scss';

const Communities: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { communities, loading } = useAppSelector(state => state.communities);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');

  useEffect(() => {
    dispatch(fetchCommunities());
  }, [dispatch]);

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim()) return;

    await dispatch(createCommunity({
      name: newCommunityName,
      description: newCommunityDescription
    }));

    setNewCommunityName('');
    setNewCommunityDescription('');
    setShowCreateForm(false);
  };

  const handleCommunityClick = (communityId: string) => {
    navigate(`/community/${communityId}`);
  };

  if (loading) {
    return (
      <div className="communities-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading communities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="communities-container">
      <div className="communities-header">
        <div>
          <h1>Communities</h1>
          <p>Manage your communities and collaborations</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="create-button"
        >
          <Plus size={20} />
          Create Community
        </button>
      </div>

      {showCreateForm && (
        <div className="create-form-overlay">
          <div className="create-form">
            <h3>Create New Community</h3>
            <div className="form-group">
              <label htmlFor="communityName">Community Name</label>
              <input
                id="communityName"
                type="text"
                value={newCommunityName}
                onChange={(e) => setNewCommunityName(e.target.value)}
                placeholder="Enter community name"
                className="input-field"
              />
            </div>
            <div className="form-group">
              <label htmlFor="communityDescription">Description</label>
              <textarea
                id="communityDescription"
                value={newCommunityDescription}
                onChange={(e) => setNewCommunityDescription(e.target.value)}
                placeholder="Describe your community"
                className="input-field"
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button onClick={handleCreateCommunity} className="save-button">
                Create Community
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

      <div className="communities-grid">
        {communities.map((community) => (
          <div
            key={community.id}
            className="community-card"
            onClick={() => handleCommunityClick(community.id)}
          >
            <div className="community-header">
              <div className="community-icon">
                <Users size={24} />
              </div>
              <div className="community-info">
                <h3>{community.name}</h3>
                <p>{community.description}</p>
              </div>
              {community.isOwner && (
                <div className="owner-badge">
                  <Settings size={16} />
                  Owner
                </div>
              )}
            </div>
            
            <div className="community-stats">
              <div className="stat">
                <span className="stat-label">Members:</span>
                <span className="stat-value">{community.memberCount}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Created:</span>
                <span className="stat-value">{community.createdAt}</span>
              </div>
            </div>

            <div className="community-actions">
              <button className="view-button">
                <span>View Community</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {communities.length === 0 && !loading && (
        <div className="empty-state">
          <Users size={48} />
          <h3>No Communities Yet</h3>
          <p>Create your first community to start collaborating</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="create-button"
          >
            <Plus size={20} />
            Create Community
          </button>
        </div>
      )}
    </div>
  );
};

export default Communities; 