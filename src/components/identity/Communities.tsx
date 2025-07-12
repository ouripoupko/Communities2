import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, ArrowRight, Settings } from 'lucide-react';
import './Communities.scss';

interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isOwner: boolean;
  createdAt: string;
}

const Communities: React.FC = () => {
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');

  useEffect(() => {
    // Mock API call to fetch communities
    const fetchCommunities = async () => {
      setIsLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockCommunities: Community[] = [
        {
          id: '1',
          name: 'Open Source Contributors',
          description: 'A community for open source developers and contributors',
          memberCount: 156,
          isOwner: true,
          createdAt: '2024-01-15'
        },
        {
          id: '2',
          name: 'Design System Team',
          description: 'Collaborative design system development and maintenance',
          memberCount: 23,
          isOwner: false,
          createdAt: '2024-02-20'
        },
        {
          id: '3',
          name: 'Product Strategy',
          description: 'Product strategy discussions and decision making',
          memberCount: 8,
          isOwner: true,
          createdAt: '2024-03-10'
        }
      ];
      
      setCommunities(mockCommunities);
      setIsLoading(false);
    };

    fetchCommunities();
  }, []);

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim()) return;

    const newCommunity: Community = {
      id: Date.now().toString(),
      name: newCommunityName,
      description: newCommunityDescription,
      memberCount: 1,
      isOwner: true,
      createdAt: new Date().toISOString().split('T')[0]
    };

    setCommunities([newCommunity, ...communities]);
    setNewCommunityName('');
    setNewCommunityDescription('');
    setShowCreateForm(false);
  };

  const handleCommunityClick = (communityId: string) => {
    navigate(`/community/${communityId}`);
  };

  if (isLoading) {
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

      {communities.length === 0 && !isLoading && (
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