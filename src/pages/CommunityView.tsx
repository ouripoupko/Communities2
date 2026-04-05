import React, { useMemo, useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Home, Menu, X, Users2, MessageSquare, Users, Coins, Share2, UserPlus, LogOut, AlertCircle, MessageCircle, Lightbulb, Vote, ScrollText } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import { fetchCommunityProperties, fetchCommunityMembers, fetchCollaborations } from '../store/slices/communitiesSlice';
import { contractRead } from '../services/api';
import type { IMethod } from '../services/interfaces';
import type { Collaboration } from '../services/contracts/community';
import { eventStreamService } from '../services/eventStream';
import type { BlockchainEvent } from '../services/eventStream';
import styles from './CommunityView.module.scss';

const CollabList = lazy(() => import('../components/community/CollabList'));
const Members = lazy(() => import('../components/community/Members'));
const Currency = lazy(() => import('../components/community/Currency'));
const ChatTopicList = lazy(() => import('../components/community/chat/ChatTopicList'));
const ChatTopic = lazy(() => import('../components/community/chat/ChatTopic'));
const CollaborationPage = lazy(() => import('./collaboration/CollaborationPage'));

// ─── Stage metadata ──────────────────────────
const STAGE_META: Record<string, { icon: React.ComponentType<{ size?: number }>; color: string; label: string }> = {
  problem:    { icon: AlertCircle,   color: '#ef4444', label: 'Problem' },
  discussion: { icon: MessageCircle, color: '#f59e0b', label: 'Discussion' },
  proposals:  { icon: Lightbulb,     color: '#8b5cf6', label: 'Proposals' },
  vote:       { icon: Vote,          color: '#3b82f6', label: 'Vote' },
  mandate:    { icon: ScrollText,    color: '#10b981', label: 'Mandate' },
};

// Sample data for empty communities
const SAMPLE_FEED = [
  { id: 's1', title: 'Access to Clean Drinking Water', description: 'Over 2 billion people lack safe drinking water globally.', stage: 'problem', authorName: 'Maria S.', createdAt: Date.now() - 3600000 },
  { id: 's2', title: 'Ocean Plastic Pollution', description: '8 million tons of plastic enter our oceans annually.', stage: 'discussion', authorName: 'Lin W.', createdAt: Date.now() - 7200000 },
  { id: 's3', title: 'Antibiotic Resistance', description: 'Drug-resistant infections threaten global health security.', stage: 'proposals', authorName: 'Dr. Chen L.', createdAt: Date.now() - 86400000 },
  { id: 's4', title: 'Digital Privacy Standards', description: 'Personal data harvested at unprecedented scale.', stage: 'vote', authorName: 'Sam R.', createdAt: Date.now() - 172800000 },
  { id: 's5', title: 'Universal Climate Fund', description: 'Decentralized climate adaptation resources for communities.', stage: 'mandate', authorName: 'Elena V.', createdAt: Date.now() - 259200000 },
];

function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return '';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Collab page wrapper ────────────────────
const CollabPage: React.FC<{ communityId: string }> = ({ communityId }) => {
  const { collabId } = useParams<{ collabId: string }>();
  const { communityCollaborations } = useAppSelector((s) => s.communities);

  const collabs = communityCollaborations[communityId] ?? [];
  const collab = collabs.find((c) => c.id === collabId);
  const title = collab?.title || 'Collab';

  if (!collabId) return <div>Collab not found.</div>;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CollaborationPage
        type="initiative"
        title={title}
        collaborationId={collabId}
        communityId={communityId}
      />
    </Suspense>
  );
};

// ─── Community activity feed ─────────────────
const CommunityFeed: React.FC<{ communityId: string }> = ({ communityId }) => {
  const navigate = useNavigate();
  const { serverUrl, publicKey } = useAppSelector((s) => s.user);
  const { communityCollaborations } = useAppSelector((s) => s.communities);
  const profiles = useAppSelector((s) => s.communities.profiles);
  const dispatch = useAppDispatch();

  const [stages, setStages] = useState<Record<string, string>>({});

  // Fetch collaborations if needed
  useEffect(() => {
    if (!serverUrl || !publicKey || communityCollaborations[communityId]) return;
    dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
  }, [serverUrl, publicKey, communityId, communityCollaborations, dispatch]);

  const initiatives = useMemo(() => {
    const collabs = communityCollaborations[communityId] ?? [];
    return collabs
      .filter((c) => c.type === 'initiative')
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [communityCollaborations, communityId]);

  // Fetch stages for all initiatives
  useEffect(() => {
    if (!serverUrl || !publicKey || initiatives.length === 0) return;
    initiatives.forEach((item) => {
      if (stages[item.id]) return;
      contractRead({
        serverUrl,
        publicKey,
        contractId: item.id,
        method: { name: 'get_stage', values: {} } as IMethod,
      })
        .then((result: unknown) => {
          if (typeof result === 'string') {
            setStages((prev) => ({ ...prev, [item.id]: result }));
          } else {
            setStages((prev) => ({ ...prev, [item.id]: 'problem' }));
          }
        })
        .catch(() => {
          setStages((prev) => ({ ...prev, [item.id]: 'problem' }));
        });
    });
  }, [serverUrl, publicKey, initiatives]);

  const handleCardClick = (item: Collaboration) => {
    const hostServer = item.hostServer || serverUrl || 'local';
    const hostAgent = item.hostAgent || publicKey || 'local';
    navigate(
      `/initiative/${encodeURIComponent(hostServer)}/${encodeURIComponent(hostAgent)}/${communityId}/${item.id}/roadmap`,
    );
  };

  const usingSampleData = initiatives.length === 0;

  return (
    <div className={styles.feed}>
      {/* Real initiatives */}
      {initiatives.map((item) => {
        const itemStage = stages[item.id] || 'problem';
        const meta = STAGE_META[itemStage] || STAGE_META.problem;
        const StageIcon = meta.icon;
        const authorProfile = item.author && profiles ? profiles[item.author] : undefined;
        const authorName = authorProfile
          ? `${authorProfile.firstName} ${authorProfile.lastName}`.trim()
          : item.author ? item.author.slice(0, 8) + '...' : '';

        return (
          <div key={item.id} className={styles.feedCard} onClick={() => handleCardClick(item)}>
            <div className={styles.cardHeader}>
              <span
                className={styles.stageBadge}
                style={{ background: `${meta.color}20`, color: meta.color }}
              >
                <StageIcon size={12} />
                {meta.label}
              </span>
              {item.createdAt > 0 && <span className={styles.time}>{formatTimeAgo(item.createdAt)}</span>}
            </div>
            <h3 className={styles.cardTitle}>{item.title || 'Untitled Initiative'}</h3>
            {item.description && <p className={styles.cardDesc}>{item.description}</p>}
            {authorName && <span className={styles.author}>{authorName}</span>}
          </div>
        );
      })}

      {/* Sample data when empty */}
      {usingSampleData && (
        <>
          <div className={styles.sampleBanner}>Example initiatives — start an initiative to participate</div>
          {SAMPLE_FEED.map((sample) => {
            const meta = STAGE_META[sample.stage] || STAGE_META.problem;
            const StageIcon = meta.icon;
            return (
              <div key={sample.id} className={`${styles.feedCard} ${styles.sampleCard}`}>
                <div className={styles.cardHeader}>
                  <span
                    className={styles.stageBadge}
                    style={{ background: `${meta.color}20`, color: meta.color }}
                  >
                    <StageIcon size={12} />
                    {meta.label}
                  </span>
                  <span className={styles.time}>{formatTimeAgo(sample.createdAt)}</span>
                </div>
                <h3 className={styles.cardTitle}>{sample.title}</h3>
                <p className={styles.cardDesc}>{sample.description}</p>
                <span className={styles.author}>{sample.authorName}</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

// ─── Main community view ─────────────────────
const CommunityView: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { contracts, publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { communityProperties = {}, communityMembers = {} } = useAppSelector((state) => state.communities);
  const [fetching, setFetching] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const dispatch = useAppDispatch();

  if (!communityId) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <h2>Invalid Community</h2>
          <p>No community ID provided.</p>
          <button onClick={() => navigate('/identity/communities')}>Back to Communities</button>
        </div>
      </div>
    );
  }

  const contract = useMemo(() => contracts.find((c) => c.id === communityId), [contracts, communityId]);
  const props = contract ? communityProperties[contract.id] || {} : null;

  const handleContractWrite = useCallback(
    (event: BlockchainEvent) => {
      if (event.contract === communityId && publicKey && serverUrl) {
        dispatch(fetchCommunityMembers({ serverUrl, publicKey, contractId: communityId }));
        dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
      }
    },
    [communityId, publicKey, serverUrl, dispatch],
  );

  useEffect(() => {
    if (!communityId) return;

    if (!props || Object.keys(props).length === 0) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.serverUrl && user.publicKey) {
            setFetching(true);
            dispatch(
              fetchCommunityProperties({
                contractId: communityId,
                serverUrl: user.serverUrl,
                publicKey: user.publicKey,
              }),
            ).finally(() => setFetching(false));
          }
        } catch {
          // skip
        }
      }
    }

    if (publicKey && serverUrl && communityId && !communityMembers[communityId]) {
      dispatch(fetchCommunityMembers({ serverUrl, publicKey, contractId: communityId }));
    }

    eventStreamService.addEventListener('contract_write', handleContractWrite);
    return () => {
      eventStreamService.removeEventListener('contract_write', handleContractWrite);
    };
  }, [communityId, props, dispatch, publicKey, serverUrl, communityMembers, handleContractWrite]);

  // Determine active footer tab
  const footerTabs = ['collab', 'chat', 'currency', 'members'];
  const activeTab = footerTabs.find((t) => location.pathname.includes(`/community/${communityId}/${t}`)) || null;

  if (fetching) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <p>Loading community...</p>
        </div>
      </div>
    );
  }

  if (!contract || !props || !props.name) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <h2>Community Not Found</h2>
          <p>The community doesn&apos;t exist or hasn&apos;t loaded yet.</p>
          <button onClick={() => navigate('/identity/communities')}>Back to Communities</button>
        </div>
      </div>
    );
  }

  const memberCount = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId].length : 0;

  return (
    <div className={styles.page}>
      {/* Dark header */}
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <button className={styles.menuButton} onClick={() => setShowMenu(true)}>
            <Menu size={18} />
          </button>
          <h1 className={styles.communityName}>{props.name}</h1>
        </div>
        {props.description && <p className={styles.communityDesc}>{props.description}</p>}
        <span className={styles.memberCount}>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Slide-out community menu */}
      {showMenu && (
        <div className={styles.menuOverlay} onClick={() => setShowMenu(false)}>
          <div className={styles.menuPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.menuHeader}>
              <span className={styles.menuTitle}>{props.name}</span>
              <button className={styles.menuClose} onClick={() => setShowMenu(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.menuList}>
              <button className={styles.menuItem} onClick={() => { navigate('/stage/problem'); setShowMenu(false); }}>
                <Home size={20} />
                <span>Home</span>
              </button>

              <div className={styles.menuDivider} />

              <button className={styles.menuItem} onClick={() => { navigate(`/community/${communityId}/collab`); setShowMenu(false); }}>
                <Users2 size={20} />
                <span>Collab</span>
              </button>
              <button className={styles.menuItem} onClick={() => { navigate(`/community/${communityId}/chat`); setShowMenu(false); }}>
                <MessageSquare size={20} />
                <span>Chat</span>
              </button>
              <button className={styles.menuItem} onClick={() => { navigate(`/community/${communityId}/currency`); setShowMenu(false); }}>
                <Coins size={20} />
                <span>Currency</span>
              </button>
              <button className={styles.menuItem} onClick={() => { navigate(`/community/${communityId}/members`); setShowMenu(false); }}>
                <Users size={20} />
                <span>Members</span>
              </button>

              <div className={styles.menuDivider} />

              <button className={styles.menuItem} onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setShowMenu(false);
              }}>
                <Share2 size={20} />
                <span>Share Community Link</span>
              </button>
              <button className={styles.menuItem} onClick={() => { navigate(`/community/${communityId}/members`); setShowMenu(false); }}>
                <UserPlus size={20} />
                <span>Invite Members</span>
              </button>
              <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={() => { navigate('/identity/communities'); setShowMenu(false); }}>
                <LogOut size={20} />
                <span>Leave Community</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline nav tabs */}
      <nav className={styles.inlineNav}>
        <button
          className={`${styles.navTab} ${activeTab === 'collab' ? styles.navTabActive : ''}`}
          onClick={() => navigate(`/community/${communityId}/collab`)}
        >
          <Users2 size={16} />
          <span>Collab</span>
        </button>
        <button
          className={`${styles.navTab} ${activeTab === 'chat' ? styles.navTabActive : ''}`}
          onClick={() => navigate(`/community/${communityId}/chat`)}
        >
          <MessageSquare size={16} />
          <span>Chat</span>
        </button>
        <button
          className={`${styles.navTab} ${activeTab === 'currency' ? styles.navTabActive : ''}`}
          onClick={() => navigate(`/community/${communityId}/currency`)}
        >
          <Coins size={16} />
          <span>Currency</span>
        </button>
        <button
          className={`${styles.navTab} ${activeTab === 'members' ? styles.navTabActive : ''}`}
          onClick={() => navigate(`/community/${communityId}/members`)}
        >
          <Users size={16} />
          <span>Members</span>
        </button>
      </nav>

      {/* Main content */}
      <div className={styles.body}>
        <Suspense fallback={<div className={styles.loadingState}>Loading...</div>}>
          <ErrorBoundary fallbackMessage="This section encountered an error.">
            <Routes>
              <Route path="activity" element={<Navigate to={`/community/${communityId}`} replace />} />
              <Route path="initiative" element={<Navigate to={`/community/${communityId}`} replace />} />
              <Route path="issues" element={<Navigate to={`/community/${communityId}`} replace />} />
              <Route path="collaborations" element={<Navigate to={`/community/${communityId}`} replace />} />
              <Route path="share" element={<Navigate to={`/community/${communityId}/members`} replace />} />
              <Route path="collab" element={<CollabList communityId={communityId!} />} />
              <Route path="collab/:collabId" element={<CollabPage communityId={communityId!} />} />
              <Route path="chat" element={<ChatTopicList communityId={communityId!} />} />
              <Route path="chat/:topicId" element={<ChatTopic />} />
              <Route path="members" element={<Members communityId={communityId!} />} />
              <Route path="currency" element={<Currency communityId={communityId!} />} />
              <Route path="*" element={<CommunityFeed communityId={communityId!} />} />
            </Routes>
          </ErrorBoundary>
        </Suspense>
      </div>

    </div>
  );
};

export default CommunityView;
