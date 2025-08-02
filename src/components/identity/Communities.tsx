import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { fetchContracts } from '../../store/slices/userSlice';
import { deployCommunityContract, updateCommunityProperty, fetchCommunityProperties, fetchCommunityMembers } from '../../store/slices/communitiesSlice';
import './Communities.scss';
import { eventStreamService } from '../../services/eventStream';

const Communities: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { contracts, loading } = useAppSelector((state) => state.user);
  const { communityProperties, communityMembers } = useAppSelector(state => state.communities);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [editCommunityId, setEditCommunityId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const eventListenerRegistered = useRef(false);

  // Filter contracts for community contracts
  const communityContracts = contracts.filter(
    (contract) => contract.contract === 'community_contract.py'
  );

  // Register event listeners only once on mount
  useEffect(() => {
    if (!user || eventListenerRegistered.current) return;
    eventListenerRegistered.current = true;
    const handleNewContract = () => {
      dispatch(fetchContracts({ serverUrl: user.serverUrl, publicKey: user.publicKey }));
    };
    const handleContractWrite = (event: { contract?: string }) => {
      const communityIds = contracts.filter((c) => c.contract === 'community_contract.py').map(c => c.id);
      if (event.contract && communityIds.includes(event.contract)) {
        dispatch(fetchCommunityProperties({
          serverUrl: user.serverUrl,
          publicKey: user.publicKey,
          contractId: event.contract,
        }));
      }
    };
    eventStreamService.addEventListener('deploy_contract', handleNewContract);
    eventStreamService.addEventListener('contract_write', handleContractWrite);
    return () => {
      eventStreamService.removeEventListener('deploy_contract', handleNewContract);
      eventStreamService.removeEventListener('contract_write', handleContractWrite);
    };
  }, [user, contracts, dispatch]);

  // Fetch properties for each community contract
  useEffect(() => {
    if (!user) return;
    communityContracts.forEach(async (contract) => {
      if (!communityProperties[contract.id]) {
        try {
          await dispatch(fetchCommunityProperties({
            serverUrl: user.serverUrl,
            publicKey: user.publicKey,
            contractId: contract.id,
          })).unwrap();
        } catch (error) {
          // Ignore errors for now
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityContracts, user]);

  // Fetch members for each community contract
  useEffect(() => {
    if (!user) return;
    communityContracts.forEach(async (contract) => {
      if (!communityMembers[contract.id]) {
        try {
          await dispatch(fetchCommunityMembers({
            serverUrl: user.serverUrl,
            publicKey: user.publicKey,
            contractId: contract.id,
          })).unwrap();
        } catch (error) {
          // Ignore errors for now
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityContracts, user]);

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim() || !user) return;
    try {
      // Deploy the community contract
      const contractId = await dispatch(deployCommunityContract({
        serverUrl: user.serverUrl,
        publicKey: user.publicKey,
      })).unwrap();
      // Set properties: name, description, createdAt
      if (typeof contractId === 'string') {
        await dispatch(updateCommunityProperty({
          serverUrl: user.serverUrl,
          publicKey: user.publicKey,
          contractId,
          key: 'name',
          value: newCommunityName,
        })).unwrap();
        await dispatch(updateCommunityProperty({
          serverUrl: user.serverUrl,
          publicKey: user.publicKey,
          contractId,
          key: 'description',
          value: newCommunityDescription,
        })).unwrap();
        await dispatch(updateCommunityProperty({
          serverUrl: user.serverUrl,
          publicKey: user.publicKey,
          contractId,
          key: 'createdAt',
          value: new Date().toISOString(),
        })).unwrap();
      }
      dispatch(fetchContracts({ serverUrl: user.serverUrl, publicKey: user.publicKey }));
      setShowCreateForm(false);
      setNewCommunityName('');
      setNewCommunityDescription('');
    } finally {
      // No error handling for brevity
    }
  };

  const handleCommunityClick = (contractId: string) => {
    navigate(`/community/${contractId}`);
  };

  // Open edit modal and pre-fill values
  const openEditModal = (contractId: string) => {
    const props = communityProperties[contractId] || {};
    setEditCommunityId(contractId);
    setEditName(props.name || '');
    setEditDescription(props.description || '');
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditCommunityId(null);
    setEditName('');
    setEditDescription('');
  };

  // Save edited properties
  const handleEditSave = async () => {
    if (!user || !editCommunityId || typeof editCommunityId !== 'string') return;
    setEditLoading(true);
    try {
      await dispatch(updateCommunityProperty({
        serverUrl: user.serverUrl,
        publicKey: user.publicKey,
        contractId: editCommunityId,
        key: 'name',
        value: editName,
      })).unwrap();
      await dispatch(updateCommunityProperty({
        serverUrl: user.serverUrl,
        publicKey: user.publicKey,
        contractId: editCommunityId,
        key: 'description',
        value: editDescription,
      })).unwrap();
      // Do NOT update local state or fetch properties here. UI will update via event listener.
      closeEditModal();
    } catch (error) {
      // Handle error (show notification, etc.)
      setEditLoading(false);
    }
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
          const props = communityProperties[contract.id] || {};
          const memberCount = Array.isArray(communityMembers[contract.id]) ? communityMembers[contract.id].length : '-';
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
                  <h3>{props.name || 'Unnamed Community'}</h3>
                  <p>{props.description || ''}</p>
                </div>
                <button
                  className="edit-button"
                  onClick={e => { e.stopPropagation(); openEditModal(contract.id); }}
                  style={{ marginLeft: 'auto' }}
                >
                  Edit
                </button>
              </div>
              <div className="community-stats">
                <div className="stat">
                  <span className="stat-label">Members:</span>
                  <span className="stat-value">{memberCount}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Created:</span>
                  <span className="stat-value">{props.createdAt ? new Date(props.createdAt).toLocaleDateString() : '-'}</span>
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

      {/* Edit Community Modal */}
      {editCommunityId && (
        <div className="create-form-overlay">
          <div className="create-form">
            <h3>Edit Community</h3>
            <div className="form-group">
              <label htmlFor="editName">Name</label>
              <input
                id="editName"
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="input-field"
              />
            </div>
            <div className="form-group">
              <label htmlFor="editDescription">Description</label>
              <textarea
                id="editDescription"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                className="input-field"
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button onClick={handleEditSave} className="save-button" disabled={editLoading}>
                {editLoading ? 'Saving...' : 'Save'}
              </button>
              <button onClick={closeEditModal} className="cancel-button" disabled={editLoading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Communities; 