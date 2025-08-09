import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchContracts } from '../../store/slices/userSlice';
import { deployContract, contractWrite } from '../../services/api';
import { useEventStream } from '../../hooks/useEventStream';
import communityContractCode from '../../assets/contracts/community_contract.py?raw';
import './Communities.scss';

const Communities: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);
  const { contracts, loading } = useAppSelector((state) => state.user);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');


  // Filter contracts for community contracts
  const communityContracts = contracts.filter(
    (contract) => contract.contract === 'community_contract.py'
  );

  // Listen for contract deployment events
  useEventStream('deploy_contract', () => {
    if (user.publicKey && user.serverUrl) {
      dispatch(fetchContracts());
    }
  });

  // Note: Community details will be fetched when navigating to specific community pages

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim() || !user.publicKey || !user.serverUrl) return;
    try {
      // Deploy the community contract
      const contractId = await deployContract({
        serverUrl: user.serverUrl,
        publicKey: user.publicKey,
        name: 'unique-gloki-communities-community-contract',
        contract: 'community_contract.py',
        code: communityContractCode
      });
      
      // Set properties: name, description, createdAt
      if (contractId) {
        await contractWrite({
          serverUrl: user.serverUrl,
          publicKey: user.publicKey,
          contractId: contractId,
          method: 'set_property',
          args: { key: 'name', value: newCommunityName }
        });
        
        await contractWrite({
          serverUrl: user.serverUrl,
          publicKey: user.publicKey,
          contractId: contractId,
          method: 'set_property',
          args: { key: 'description', value: newCommunityDescription }
        });
        
        await contractWrite({
          serverUrl: user.serverUrl,
          publicKey: user.publicKey,
          contractId: contractId,
          method: 'set_property',
          args: { key: 'createdAt', value: new Date().toISOString() }
        });
      }
      
      setShowCreateForm(false);
      setNewCommunityName('');
      setNewCommunityDescription('');
    } catch (error) {
      console.error('Failed to create community:', error);
      // TODO: Show error to user
    }
  };

  const handleCommunityClick = (contractId: string) => {
    navigate(`/community/${contractId}`);
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
              <button onClick={handleCreateCommunity} className="save-button" disabled={false}>
                Create Community
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="cancel-button"
                disabled={false}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="communities-grid">
              {communityContracts.map((contract) => {
        return (
          <div
            key={contract.id}
            className="community-card"
            onClick={() => handleCommunityClick(contract.id)}
          >
            <div className="community-header">
              <div className="community-icon">
                <Users size={24} />
              </div>
              <div className="community-info">
                <h3>{contract.name || 'Community'}</h3>
                <p>Community details will load when you enter</p>
              </div>
            </div>
            <div className="community-stats">
              <div className="stat">
                <span className="stat-label">Contract ID:</span>
                <span className="stat-value">{contract.id.slice(0, 8)}...</span>
              </div>
              <div className="stat">
                <span className="stat-label">Type:</span>
                <span className="stat-value">Community</span>
              </div>
            </div>
            <div className="community-actions">
              <button className="view-button">
                <span>View Community</span>
                {/* <ArrowRight size={16} /> */}
              </button>
            </div>
          </div>
        );
      })}
      </div>

      {communityContracts.length === 0 && !loading && (
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