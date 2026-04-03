import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Star, MoreVertical, EyeOff, Eye, ArrowLeft } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchContracts } from '../../store/slices/userSlice';
import { toggleStar, toggleHide, unhide } from '../../store/slices/preferencesSlice';
import { useEventStream } from '../../hooks/useEventStream';
import CreateCommunityDialog from './communities/CreateCommunityDialog';
import styles from './Communities.module.scss';

interface CommunitiesProps {
  showHidden?: boolean;
}

const Communities: React.FC<CommunitiesProps> = ({ showHidden = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user);
  const { contracts, loading } = useAppSelector((state) => state.user);
  const { starred, hidden } = useAppSelector((state) => state.preferences);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  // Open create dialog if navigated with state
  const [showCreateForm, setShowCreateForm] = useState(
    !!(location.state as { createCommunity?: boolean })?.createCommunity
  );

  const communityContracts = contracts.filter(
    (contract) => contract.contract === 'community_contract.py'
  );

  const handleDeployContract = useCallback(() => {
    if (user.publicKey && user.serverUrl) {
      dispatch(fetchContracts());
    }
  }, [user.publicKey, user.serverUrl, dispatch]);

  useEventStream('deploy_contract', handleDeployContract);

  const handleCloseDialog = useCallback(() => {
    setShowCreateForm(false);
    // Clear the navigation state
    if ((location.state as { createCommunity?: boolean })?.createCommunity) {
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  const handleCommunityClick = (contractId: string) => {
    navigate(`/community/${contractId}`);
  };

  const sortedContracts = useMemo(() => {
    const list = showHidden
      ? communityContracts.filter((c) => hidden.includes(c.id))
      : communityContracts.filter((c) => !hidden.includes(c.id));

    return list.sort((a, b) => {
      const aStarred = starred.includes(a.id);
      const bStarred = starred.includes(b.id);
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [communityContracts, starred, hidden, showHidden]);

  const hiddenCount = communityContracts.filter((c) => hidden.includes(c.id)).length;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p className={styles.text}>Loading communities...</p>
        </div>
      </div>
    );
  }

  if (showHidden) {
    return (
      <div className={styles.container}>
        <div className={styles.hiddenHeader}>
          <button className={styles.hiddenBackBtn} onClick={() => navigate('/identity/communities')}>
            <ArrowLeft size={18} />
          </button>
          <h2 className={styles.hiddenTitle}>Hidden Communities</h2>
        </div>
        {sortedContracts.length === 0 ? (
          <p className={styles.emptyNote}>No hidden communities.</p>
        ) : (
          <div className={styles.grid}>
            {sortedContracts.map((contract) => (
              <div key={contract.id} className={`${styles.card} ${styles.hiddenCard}`}>
                <span className={styles.cardName}>{contract.name || 'Community'}</span>
                <button
                  className={styles.unhideBtn}
                  onClick={() => dispatch(unhide(contract.id))}
                  title="Unhide"
                >
                  <Eye size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <CreateCommunityDialog
        isVisible={showCreateForm}
        onClose={handleCloseDialog}
      />

      <div className={styles.grid}>
        {sortedContracts.map((contract) => {
          const isStarred = starred.includes(contract.id);
          return (
            <div
              key={contract.id}
              className={styles.card}
              onClick={() => handleCommunityClick(contract.id)}
            >
              <span className={styles.cardName}>{contract.name || 'Community'}</span>
              <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                <button
                  className={`${styles.starBtn} ${isStarred ? styles.starBtnActive : ''}`}
                  onClick={() => dispatch(toggleStar(contract.id))}
                  title={isStarred ? 'Unstar' : 'Star'}
                >
                  <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
                </button>
                <div className={styles.contextMenuWrapper}>
                  <button
                    className={styles.moreBtn}
                    onClick={() => setContextMenuId(contextMenuId === contract.id ? null : contract.id)}
                    title="More options"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {contextMenuId === contract.id && (
                    <div className={styles.contextMenu}>
                      <button
                        className={styles.contextMenuItem}
                        onClick={() => {
                          dispatch(toggleHide(contract.id));
                          setContextMenuId(null);
                        }}
                      >
                        <EyeOff size={14} />
                        <span>Hide</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sortedContracts.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <h3 className={styles.title}>No Communities Yet</h3>
          <p className={styles.description}>Open the menu to create or join a community</p>
        </div>
      )}

      {!showHidden && hiddenCount > 0 && (
        <button
          className={styles.hiddenToggle}
          onClick={() => navigate('/identity/hidden')}
        >
          {hiddenCount} hidden communit{hiddenCount === 1 ? 'y' : 'ies'}
        </button>
      )}
    </div>
  );
};

export default Communities;
