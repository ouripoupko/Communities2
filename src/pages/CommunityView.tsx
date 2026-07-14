import React, { useMemo, useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Handshake, Users, Scale, Coins, Share2, IdCard, QrCode } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import PageHeader from '../components/PageHeader';

// Lazy load components to reduce initial bundle size
const Collaborations = lazy(() => import('../components/community/Collaborations'));
const Members = lazy(() => import('../components/community/Members'));
const Policies = lazy(() => import('../components/community/Policies'));
const Wallet = lazy(() => import('../components/community/Wallet'));
const Share = lazy(() => import('../components/community/Share'));
const IdentityCardDialog = lazy(() => import('../components/community/dialogs/IdentityCardDialog'));
const QRScannerDialog = lazy(() => import('../components/community/dialogs/QRScannerDialog'));
import styles from './Container.module.scss';
import { fetchCommunityProperties, fetchCommunityMembers, fetchCollaborations } from '../store/slices/communitiesSlice';
import { eventStreamService } from '../services/eventStream';
import type { BlockchainEvent } from '../services/eventStream';

const CommunityView: React.FC = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // Get contracts and properties from Redux
  const { contracts, publicKey, serverUrl } = useAppSelector(state => state.user);
  const { communityProperties = {}, communityMembers = {} } = useAppSelector(state => state.communities);
  const [fetching, setFetching] = useState(false);
  const [showIdentityCard, setShowIdentityCard] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const dispatch = useAppDispatch();

  // Early return if communityId is missing
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

  // Find the contract for this community
  const contract = useMemo(() => contracts.find((c) => c.id === communityId), [contracts, communityId]);
  // useMemo avoids creating a new {} on every render when properties haven't loaded yet,
  // which would otherwise cause the fetch useEffect to re-run infinitely on server errors.
  const props = useMemo(
    () => (contract ? (communityProperties[contract.id] ?? null) : null),
    [contract, communityProperties],
  );

  // Check if current user is a member of the community
  const isCurrentUserMember = useMemo(() => {
    if (!publicKey || !communityMembers[communityId]) return false;
    const members = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];
    return members.includes(publicKey);
  }, [publicKey, communityId, communityMembers]);

  // Memoize the event handler - store updates only from SSE (decentralized: reacts to other devices)
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

  // Fetch community data once when community/user credentials change.
  // props and communityMembers are intentionally excluded from deps — including them
  // caused an infinite fetch loop when the server returned an error.
  useEffect(() => {
    if (!communityId || !publicKey || !serverUrl) return;
    setFetching(true);
    dispatch(fetchCommunityProperties({ contractId: communityId, serverUrl, publicKey }))
      .finally(() => setFetching(false));
    dispatch(fetchCommunityMembers({ serverUrl, publicKey, contractId: communityId }));
  }, [communityId, publicKey, serverUrl, dispatch]); // eslint-disable-line react-hooks/exhaustive-deps

  // SSE listener for real-time updates — separate effect so it doesn't couple to data fetching.
  useEffect(() => {
    eventStreamService.addEventListener('contract_write', handleContractWrite);
    return () => eventStreamService.removeEventListener('contract_write', handleContractWrite);
  }, [handleContractWrite]);

  const navItems = [
    { path: 'collaborations', label: 'Collaborations', icon: Handshake },
    { path: 'members', label: 'Members', icon: Users },
    { path: 'policies', label: 'Policies', icon: Scale },
    { path: 'wallet', label: 'Wallet', icon: Coins },
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

  const actionButtons = isCurrentUserMember ? [
    {
      icon: IdCard,
      label: 'ID Card',
      onClick: () => setShowIdentityCard(true),
      title: 'Show Identity Card'
    },
    {
      icon: QrCode,
      label: 'Scan',
      onClick: () => setShowQRScanner(true),
      title: 'Scan QR Code'
    }
  ] : [];

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
        backButtonText="Back"
        onBackClick={() => navigate('/identity/communities')}
        actionButtons={actionButtons}
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
              className={`${styles.navItem} ${
                location.pathname.includes(`/community/${communityId}/${item.path}`) ||
                (item.path === 'collaborations' && !navItems.slice(1).some(n => location.pathname.includes(`/community/${communityId}/${n.path}`)))
                  ? styles.active : ''
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.main}>
          <Suspense fallback={<div className={styles.loadingState}>Loading...</div>}>
            <Routes>
              <Route path="issues" element={<Navigate to={`/community/${communityId}/collaborations`} replace />} />
              <Route path="collaborations" element={<Collaborations communityId={communityId!} />} />
              <Route path="members" element={<Members communityId={communityId!} />} />
              <Route path="policies" element={<Policies communityId={communityId!} />} />
              <Route path="wallet" element={<Wallet communityId={communityId!} />} />
              <Route path="share" element={<Share communityId={communityId!} />} />
              <Route path="*" element={<Collaborations communityId={communityId!} />} />
            </Routes>
          </Suspense>
        </div>
      </div>

      {/* Dialogs */}
      <Suspense fallback={null}>
        <IdentityCardDialog
          isOpen={showIdentityCard}
          onClose={() => setShowIdentityCard(false)}
          communityName={props.name || 'Community'}
        />
        
        <QRScannerDialog
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          communityId={communityId!}
        />
      </Suspense>
    </div>
  );
};

export default CommunityView; 