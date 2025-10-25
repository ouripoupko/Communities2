import React, { useMemo, useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Users, Coins, Share2, IdCard, QrCode } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';

// Lazy load components to reduce initial bundle size
const Issues = lazy(() => import('../components/community/Issues'));
const Members = lazy(() => import('../components/community/Members'));
const Currency = lazy(() => import('../components/community/Currency'));
const Share = lazy(() => import('../components/community/Share'));
const IdentityCardDialog = lazy(() => import('../components/community/dialogs/IdentityCardDialog'));
const QRScannerDialog = lazy(() => import('../components/community/dialogs/QRScannerDialog'));
import styles from './Container.module.scss';
import { fetchCommunityProperties, fetchCommunityMembers } from '../store/slices/communitiesSlice';
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
  const contract = useMemo(() => contracts.find((c: any) => c.id === communityId), [contracts, communityId]);
  const props = contract ? communityProperties[contract.id] || {} : null;

  // Memoize the event handler for members
  const handleContractWrite = useCallback((event: BlockchainEvent) => {
    if (event.contract === communityId && publicKey && serverUrl && communityId) {
      dispatch(fetchCommunityMembers({
        serverUrl: serverUrl,
        publicKey: publicKey,
        contractId: communityId,
      }));
    }
  }, [communityId, publicKey, serverUrl, dispatch]);

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

    // Initialize members data and event listener
    if (publicKey && serverUrl && communityId && !communityMembers[communityId]) {
      dispatch(fetchCommunityMembers({
        serverUrl: serverUrl,
        publicKey: publicKey,
        contractId: communityId,
      }));
    }

    // Register event listener for contract_write events
    eventStreamService.addEventListener('contract_write', handleContractWrite);

    return () => {
      eventStreamService.removeEventListener('contract_write', handleContractWrite);
    };
  }, [communityId, props, dispatch, publicKey, serverUrl, communityMembers, handleContractWrite]);

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
        <div className={styles.headerTop}>
          <button onClick={() => navigate('/identity/communities')} className={styles.backButton}>
            <ArrowLeft size={16} />
            Back
          </button>
          <div className={styles.headerActions}>
            <button 
              className={styles.actionButton}
              onClick={() => setShowIdentityCard(true)}
              title="Show Identity Card"
            >
              <IdCard size={18} />
              <span>ID Card</span>
            </button>
            <button 
              className={styles.actionButton}
              onClick={() => setShowQRScanner(true)}
              title="Scan QR Code"
            >
              <QrCode size={18} />
              <span>Scan</span>
            </button>
          </div>
        </div>
        <div className={styles.headerBottom}>
          <div className={styles.info}>
            <div className={styles.titleRow}>
              <h1>{props.name}</h1>
              <span className={styles.stat}>
                <Users size={16} />
                {Array.isArray(communityMembers[communityId]) ? communityMembers[communityId].length : '-'} members
              </span>
            </div>
            <p>{props.description}</p>
          </div>
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
          <Suspense fallback={<div className={styles.loadingState}>Loading...</div>}>
            <Routes>
              <Route path="issues" element={<Issues communityId={communityId!} />} />
              <Route path="members" element={<Members communityId={communityId!} />} />
              <Route path="currency" element={<Currency communityId={communityId!} />} />
              <Route path="share" element={<Share communityId={communityId!} />} />
              <Route path="*" element={<Issues communityId={communityId!} />} />
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