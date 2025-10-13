import React, { useMemo, useEffect, useState } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Users, Coins, Share2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import Issues from '../components/community/Issues';
import Members from '../components/community/Members';
import Currency from '../components/community/Currency';
import Share from '../components/community/Share';
import styles from './Container.module.scss';
import { fetchCommunityProperties } from '../store/slices/communitiesSlice';

const CommunityView: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // Get contracts and properties from Redux
  const { contracts } = useAppSelector(state => state.user);
  const { communityProperties = {} } = useAppSelector(state => state.communities);
  const [fetching, setFetching] = useState(false);
  const dispatch = useAppDispatch();

  // Find the contract for this community
  const contract = useMemo(() => contracts.find((c: any) => c.id === communityId), [contracts, communityId]);
  const props = contract ? communityProperties[contract.id] || {} : null;

  useEffect(() => {
    if (!communityId) return;
    
    // Only fetch properties if we don't have them yet
    if (!props || Object.keys(props).length === 0) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.serverUrl && user.publicKey) {
            setFetching(true);
            dispatch(fetchCommunityProperties({ 
              contractId: communityId, 
              serverUrl: user.serverUrl, 
              publicKey: user.publicKey 
            }))
            .finally(() => setFetching(false));
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, [communityId, props, dispatch]);

  const navItems = [
    { path: 'issues', label: 'Issues', icon: MessageSquare },
    { path: 'members', label: 'Members', icon: Users },
    { path: 'currency', label: 'Currency', icon: Coins },
    { path: 'share', label: 'Share', icon: Share2 },
  ];

  if (fetching) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading community...</p>
        </div>
      </div>
    );
  }

  if (!contract || !props || !props.name) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
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
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => navigate('/identity/communities')} className={styles.backButton}>
            <ArrowLeft size={16} />
            Back
          </button>
          <div className={styles.info}>
            <h1>{props.name}</h1>
            <p>{props.description}</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.stat}>
            <Users size={16} />
            {Array.isArray(props.members) ? props.members.length : '-'} members
          </span>
        </div>
      </div>

      <div className={styles.content}>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(`/community/${communityId}/${item.path}`)}
              className={`${styles.navItem} ${location.pathname.includes(`/community/${communityId}/${item.path}`) ? styles.active : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.main}>
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