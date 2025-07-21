import React, { useMemo, useEffect, useState } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Users, Coins, Share2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import Issues from '../components/community/Issues';
import Members from '../components/community/Members';
import Currency from '../components/community/Currency';
import Share from '../components/community/Share';
import '../components/layout/Layout.scss';
import { readCommunityProperties, getCommunityMembers } from '../store/slices/contractsSlice';

const CommunityView: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  // Get contracts and properties from Redux
  const { contracts, communityProperties = {} } = useAppSelector(state => state.contracts as any);
  const [fetching, setFetching] = useState(false);
  const dispatch = useAppDispatch();

  // Find the contract for this community
  const contract = useMemo(() => contracts.find((c: any) => c.id === communityId), [contracts, communityId]);
  const props = contract ? communityProperties[contract.id] || {} : null;

  useEffect(() => {
    // If contract is missing, fetch contracts and then properties (existing logic)
    if (!contract && communityId) {
      // Try to fetch contracts if credentials are in localStorage
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.serverUrl && user.publicKey && typeof dispatch === 'function') {
            setFetching(true);
            dispatch(readCommunityProperties({ contractId: communityId, serverUrl: user.serverUrl, publicKey: user.publicKey }))
              .then(() => {
                // After contracts are fetched, fetch properties for this community
                dispatch(readCommunityProperties({ contractId: communityId, serverUrl: user.serverUrl, publicKey: user.publicKey }))
                  .then((result: any) => {
                  })
                  .catch((err: any) => {
                  });
                
                // Also fetch community members
                dispatch(getCommunityMembers({ contractId: communityId, serverUrl: user.serverUrl, publicKey: user.publicKey }))
                  .then((result: any) => {
                  })
                  .catch((err: any) => {
                  })
                  .finally(() => setFetching(false));
              })
              .catch(() => setFetching(false));
          }
        } catch (e) {
          // ignore
        }
      }
    }
    // If contract exists but properties are missing, fetch properties
    else if (contract && (!props || Object.keys(props).length === 0) && !fetching) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.serverUrl && user.publicKey && typeof dispatch === 'function') {
            setFetching(true);
            dispatch(readCommunityProperties({ contractId: contract.id, serverUrl: user.serverUrl, publicKey: user.publicKey }))
              .then((result: any) => {
              })
              .catch((err: any) => {
              });
            
            // Also fetch community members
            dispatch(getCommunityMembers({ contractId: contract.id, serverUrl: user.serverUrl, publicKey: user.publicKey }))
              .then((result: any) => {
              })
              .catch((err: any) => {
              })
              .finally(() => setFetching(false));
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, [contract, communityId, dispatch]);

  const navItems = [
    { path: 'issues', label: 'Issues', icon: MessageSquare },
    { path: 'members', label: 'Members', icon: Users },
    { path: 'currency', label: 'Currency', icon: Coins },
    { path: 'share', label: 'Share', icon: Share2 },
  ];

  if (fetching) {
    return (
      <div className="community-view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading community...</p>
        </div>
      </div>
    );
  }

  if (!contract || !props || !props.name) {
    // Debug log before showing Not Found
    // console.log('[CommunityView] Not Found condition:', { contract, props });
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
            <h1>{props.name}</h1>
            <p>{props.description}</p>
          </div>
        </div>
        <div className="header-right">
          <span className="stat">
            <Users size={16} />
            {Array.isArray(props.members) ? props.members.length : '-'} members
          </span>
          {/* Optionally, show owner badge if available */}
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