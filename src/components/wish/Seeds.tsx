import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Plus, Zap, ExternalLink } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCollaborations } from '../../store/slices/communitiesSlice';
import { fetchSeeds, addSeedThunk, launchSeedThunk } from '../../store/slices/wishSlice';
import { eventStreamService } from '../../services/eventStream';
import type { BlockchainEvent } from '../../services/eventStream';
import type { WishSeed } from '../../services/contracts/wish';
import AddIdeaDialog from './dialogs/AddIdeaDialog';
import CreateInitiativeConfirmDialog from './dialogs/CreateInitiativeConfirmDialog';
import styles from './Seeds.module.scss';
import wishStyles from './WishTab.module.scss';

interface SeedsProps {
  wishId: string;
  communityId: string;
}

const Seeds: React.FC<SeedsProps> = ({ wishId, communityId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { seeds, seedsLoading } = useAppSelector((state) => state.wish);

  const seedList = seeds[wishId] ?? [];
  const isLoading = seedsLoading[wishId] === true;

  const [showAddIdea, setShowAddIdea] = useState(false);
  const [showConfirm, setShowConfirm] = useState<WishSeed | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [launchSubmitting, setLaunchSubmitting] = useState(false);

  const handleContractWrite = useCallback(
    (event: BlockchainEvent) => {
      if (event.contract === wishId && serverUrl && publicKey) {
        dispatch(
          fetchSeeds({
            serverUrl,
            publicKey,
            wishContractId: wishId,
          }),
        );
      }
    },
    [wishId, serverUrl, publicKey, dispatch],
  );

  useEffect(() => {
    if (!communityId || !serverUrl || !publicKey) return;
    dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
  }, [communityId, serverUrl, publicKey, dispatch]);

  useEffect(() => {
    if (!wishId || !serverUrl || !publicKey) return;
    dispatch(
      fetchSeeds({
        serverUrl,
        publicKey,
        wishContractId: wishId,
      }),
    );
  }, [wishId, serverUrl, publicKey, dispatch]);

  useEffect(() => {
    eventStreamService.addEventListener('contract_write', handleContractWrite);
    return () => eventStreamService.removeEventListener('contract_write', handleContractWrite);
  }, [handleContractWrite]);

  const refetchSeeds = useCallback(() => {
    if (serverUrl && publicKey && wishId) {
      dispatch(fetchSeeds({ serverUrl, publicKey, wishContractId: wishId }));
    }
  }, [serverUrl, publicKey, wishId, dispatch]);

  const handleAddIdea = async (description: string) => {
    if (!serverUrl || !publicKey) return;
    setAddSubmitting(true);
    try {
      await dispatch(
        addSeedThunk({
          serverUrl,
          publicKey,
          wishContractId: wishId,
          description,
        }),
      ).unwrap();
      setShowAddIdea(false);
      refetchSeeds();
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleCreateInitiative = async () => {
    if (!serverUrl || !publicKey || !showConfirm) return;
    setLaunchSubmitting(true);
    try {
      const result = await dispatch(
        launchSeedThunk({
          serverUrl,
          publicKey,
          communityId,
          wishContractId: wishId,
          seedId: showConfirm.id,
          description: showConfirm.description,
        }),
      ).unwrap();
      setShowConfirm(null);
      refetchSeeds();
      const { initiativeId, hostServer, hostAgent } = result;
      const url = `/initiative/${encodeURIComponent(hostServer)}/${encodeURIComponent(hostAgent)}/${communityId}/${initiativeId}/roadmap`;
      navigate(url);
    } finally {
      setLaunchSubmitting(false);
    }
  };

  const handleLaunchedCardClick = (seed: WishSeed) => {
    if (!seed.initiativeId || !seed.hostServer || !seed.hostAgent) return;
    const url = `/initiative/${encodeURIComponent(seed.hostServer)}/${encodeURIComponent(seed.hostAgent)}/${communityId}/${seed.initiativeId}/roadmap`;
    navigate(url);
  };

  return (
    <div className={wishStyles.tabContent}>
      <div className={styles.header}>
        <div>
          <h3 className={wishStyles.tabTitle}>Collaboration Ideas</h3>
          <p className={wishStyles.tabSubtitle}>
            Seeds of possibility — ideas to nurture and grow together
          </p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.addButton} onClick={() => setShowAddIdea(true)}>
            <Plus size={18} />
            Add Idea
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={wishStyles.emptyState}>
          <p>Loading collaboration ideas...</p>
        </div>
      ) : seedList.length === 0 ? (
        <div className={wishStyles.emptyState}>
          <Sparkles size={48} className={wishStyles.emptyIcon} />
          <p>No collaboration ideas yet. Plant the first seed.</p>
        </div>
      ) : (
        <div className={styles.cardList}>
          {seedList.map((seed) => {
            const isLaunched = !!seed.initiativeId;
            return (
              <div
                key={seed.id}
                className={`${styles.card} ${isLaunched ? styles.launched : ''}`}
                role={isLaunched ? 'link' : undefined}
                tabIndex={isLaunched ? 0 : undefined}
                onClick={isLaunched ? () => handleLaunchedCardClick(seed) : undefined}
                onKeyDown={
                  isLaunched
                    ? (e) => e.key === 'Enter' && handleLaunchedCardClick(seed)
                    : undefined
                }
              >
                <div className={styles.cardIcon}>
                  <Sparkles size={20} />
                </div>
                <div className={styles.cardContent}>
                  <p className={styles.cardDesc}>{seed.description}</p>
                  <div className={styles.cardHeader}>
                    {isLaunched ? (
                      <span className={styles.badge}>
                        <ExternalLink size={12} style={{ marginRight: '0.25rem' }} />
                        Linked to Initiative
                      </span>
                    ) : (
                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          className={styles.createBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowConfirm(seed);
                          }}
                          disabled={launchSubmitting}
                        >
                          <Zap size={16} style={{ marginRight: '0.25rem' }} />
                          Create Initiative
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddIdeaDialog
        isVisible={showAddIdea}
        onClose={() => setShowAddIdea(false)}
        onSubmit={handleAddIdea}
        isSubmitting={addSubmitting}
      />

      <CreateInitiativeConfirmDialog
        isVisible={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={handleCreateInitiative}
        seedDescription={showConfirm?.description ?? ''}
        isSubmitting={launchSubmitting}
      />
    </div>
  );
};

export default Seeds;
