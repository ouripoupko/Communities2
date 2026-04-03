import React, { useMemo, useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Zap, Users2, MessageSquare, Users, Coins } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import PageHeader from '../components/PageHeader';
import { useSwipeRef } from '../hooks/useSwipeNavigation';

const InitiativeList = lazy(() => import('../components/community/InitiativeList'));
const CollabList = lazy(() => import('../components/community/CollabList'));
const Members = lazy(() => import('../components/community/Members'));
const Currency = lazy(() => import('../components/community/Currency'));
const ChatTopicList = lazy(() => import('../components/community/chat/ChatTopicList'));
const ChatTopic = lazy(() => import('../components/community/chat/ChatTopic'));
import styles from './Container.module.scss';
import { fetchCommunityProperties, fetchCommunityMembers, fetchCollaborations } from '../store/slices/communitiesSlice';
import { eventStreamService } from '../services/eventStream';
import type { BlockchainEvent } from '../services/eventStream';

const CommunityView: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { contracts, publicKey, serverUrl } = useAppSelector(state => state.user);
  const { communityProperties = {}, communityMembers = {} } = useAppSelector(state => state.communities);
  const [fetching, setFetching] = useState(false);
  const dispatch = useAppDispatch();

  if (!communityId) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <h2>Invalid Community</h2>
          <p>No community ID provided in the URL.</p>
          <button onClick={() => navigate('/identity/communities')} className="back-button">
            Back to Communities
          </button>
        </div>
      </div>
    );
  }

  const contract = useMemo(() => contracts.find((c) => c.id === communityId), [contracts, communityId]);
  const props = contract ? communityProperties[contract.id] || {} : null;

  const handleContractWrite = useCallback((event: BlockchainEvent) => {
    if (event.contract === communityId && publicKey && serverUrl && communityId) {
      dispatch(fetchCommunityMembers({
        serverUrl: serverUrl,
        publicKey: publicKey,
        contractId: communityId,
      }));
      dispatch(fetchCollaborations({
        serverUrl: serverUrl,
        publicKey: publicKey,
        contractId: communityId,
      }));
    }
  }, [communityId, publicKey, serverUrl, dispatch]);

  useEffect(() => {
    if (!communityId) return;

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
        } catch {
          // skip
        }
      }
    }

    if (publicKey && serverUrl && communityId && !communityMembers[communityId]) {
      dispatch(fetchCommunityMembers({
        serverUrl: serverUrl,
        publicKey: publicKey,
        contractId: communityId,
      }));
    }

    eventStreamService.addEventListener('contract_write', handleContractWrite);

    return () => {
      eventStreamService.removeEventListener('contract_write', handleContractWrite);
    };
  }, [communityId, props, dispatch, publicKey, serverUrl, communityMembers, handleContractWrite]);

  const tabPaths = ['initiative', 'collab', 'chat', 'currency', 'members'];

  const navItems = [
    { path: 'initiative', label: 'Initiative', icon: Zap },
    { path: 'collab', label: 'Collab', icon: Users2 },
    { path: 'chat', label: 'Chat', icon: MessageSquare },
    { path: 'currency', label: 'Currency', icon: Coins },
    { path: 'members', label: 'Members', icon: Users },
  ];

  const currentTabIndex = tabPaths.findIndex((p) => location.pathname.includes(`/community/${communityId}/${p}`));

  const swipeRef = useSwipeRef<HTMLDivElement>({
    onSwipeLeft: () => {
      if (currentTabIndex >= 0 && currentTabIndex < tabPaths.length - 1) {
        navigate(`/community/${communityId}/${tabPaths[currentTabIndex + 1]}`);
      }
    },
    onSwipeRight: () => {
      if (currentTabIndex > 0) {
        navigate(`/community/${communityId}/${tabPaths[currentTabIndex - 1]}`);
      }
    },
  });

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

  const rightLabel = (
    <span className={styles.stat}>
      <Users size={16} />
      {Array.isArray(communityMembers[communityId]) ? communityMembers[communityId].length : '-'} members
    </span>
  );

  return (
    <div className={styles.container}>
      <PageHeader
        showBackButton={true}
        backButtonVariant="compact"
        onBackClick={() => navigate('/identity/communities')}
        title={props.name}
        subtitle={props.description}
        rightLabel={rightLabel}
        layout="two-row"
      />

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

        <div className={styles.main} ref={swipeRef}>
          <Suspense fallback={<div className={styles.loadingState}>Loading...</div>}>
            <Routes>
              <Route path="activity" element={<Navigate to={`/community/${communityId}/initiative`} replace />} />
              <Route path="issues" element={<Navigate to={`/community/${communityId}/initiative`} replace />} />
              <Route path="collaborations" element={<Navigate to={`/community/${communityId}/initiative`} replace />} />
              <Route path="share" element={<Navigate to={`/community/${communityId}/members`} replace />} />
              <Route path="initiative" element={<InitiativeList communityId={communityId!} />} />
              <Route path="collab" element={<CollabList communityId={communityId!} />} />
              <Route path="chat" element={<ChatTopicList communityId={communityId!} />} />
              <Route path="chat/:topicId" element={<ChatTopic />} />
              <Route path="members" element={<Members communityId={communityId!} />} />
              <Route path="currency" element={<Currency communityId={communityId!} />} />
              <Route path="*" element={<InitiativeList communityId={communityId!} />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default CommunityView;
