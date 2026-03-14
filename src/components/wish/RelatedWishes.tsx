import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, Plus, Sparkles } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCollaborations } from '../../store/slices/communitiesSlice';
import { fetchRelatedWishIds } from '../../store/slices/wishSlice';
import { addRelatedWish } from '../../services/contracts/wish';
import { fetchRelatedWishMatches } from '../../services/openai';
import { eventStreamService } from '../../services/eventStream';
import type { BlockchainEvent } from '../../services/eventStream';
import type { Collaboration } from '../../services/contracts/community';
import AddRelatedWishDialog from './dialogs/AddRelatedWishDialog';
import AIMatchesDialog from './dialogs/AIMatchesDialog';
import styles from './RelatedWishes.module.scss';
import wishStyles from './WishTab.module.scss';

interface RelatedWishesProps {
  wishId: string;
  communityId: string;
}

const RelatedWishes: React.FC<RelatedWishesProps> = ({ wishId, communityId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { publicKey, serverUrl, profile } = useAppSelector((state) => state.user);
  const { communityCollaborations } = useAppSelector((state) => state.communities);
  const { relatedWishIds, relatedWishesLoading } = useAppSelector((state) => state.wish);

  const collaborations = communityCollaborations[communityId] ?? [];
  const relatedIds = relatedWishIds[wishId] ?? [];
  const isLoading = relatedWishesLoading[wishId] === true;

  const currentWish = useMemo(() => {
    const fromState = (location.state as { wish?: Collaboration })?.wish;
    if (fromState && fromState.id === wishId) return fromState;
    return collaborations.find((c) => c.id === wishId && c.type === 'wish') ?? null;
  }, [location.state, wishId, collaborations]);

  const relatedWishes = useMemo(
    () =>
      relatedIds
        .map((id) => collaborations.find((c) => c.id === id))
        .filter((c): c is Collaboration => c != null),
    [relatedIds, collaborations],
  );

  const myWishes = useMemo(
    () =>
      collaborations.filter(
        (c) =>
          c.type === 'wish' &&
          c.author === publicKey &&
          c.id !== wishId &&
          !relatedIds.includes(c.id),
      ),
    [collaborations, publicKey, wishId, relatedIds],
  );

  const handleContractWrite = useCallback(
    (event: BlockchainEvent) => {
      if (event.contract === wishId && serverUrl && publicKey) {
        dispatch(
          fetchRelatedWishIds({
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
    if (collaborations.length === 0) {
      dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
    }
  }, [communityId, serverUrl, publicKey, collaborations.length, dispatch]);

  useEffect(() => {
    if (!wishId || !serverUrl || !publicKey) return;
    dispatch(
      fetchRelatedWishIds({
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

  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showAIMatches, setShowAIMatches] = useState(false);
  const [aiMatches, setAiMatches] = useState<Collaboration[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const handleAddRelated = async (relatedWish: Collaboration) => {
    if (!serverUrl || !publicKey) return;
    await addRelatedWish(serverUrl, publicKey, wishId, relatedWish.id);
    setShowManualAdd(false);
  };

  const handleFindCollaborations = async () => {
    const apiKey = profile?.openaiApiKey;
    if (!apiKey?.trim()) {
      alert('Please add your OpenAI API key in your profile to use AI matching.');
      return;
    }
    const communityWishesList = collaborations.filter(
      (c) => c.type === 'wish',
    ) as Array<Collaboration & { dreamNeed?: string }>;
    if (communityWishesList.length <= 1) {
      setAiMatches([]);
      setShowAIMatches(true);
      return;
    }
    setAiLoading(true);
    setShowAIMatches(false);
    try {
      const ids = await fetchRelatedWishMatches(apiKey, {
        currentWish: {
          id: wishId,
          title: currentWish?.title ?? '',
          dreamNeed: currentWish?.dreamNeed,
        },
        communityWishes: communityWishesList.map((w) => ({
          id: w.id,
          title: w.title,
          dreamNeed: w.dreamNeed,
          author: w.author,
        })),
      });
      const matches = ids
        .map((id) => communityWishesList.find((w) => w.id === id))
        .filter((c): c is Collaboration => c != null);
      setAiMatches(matches);
      setShowAIMatches(true);
    } catch (err) {
      console.error(err);
      alert('AI matching failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddFromAI = async (wish: Collaboration) => {
    if (!serverUrl || !publicKey) return;
    await addRelatedWish(serverUrl, publicKey, wishId, wish.id);
    setShowAIMatches(false);
  };

  const handleWishClick = (item: Collaboration) => {
    navigate(`/wish/${communityId}/${item.id}/related`, {
      state: { wish: item },
    });
  };

  return (
    <div className={wishStyles.tabContent}>
      <div className={styles.header}>
        <div>
          <h3 className={wishStyles.tabTitle}>Related Wishes</h3>
          <p className={wishStyles.tabSubtitle}>
            Other wishes in this community that resonate with this dream
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.aiButton}
            onClick={handleFindCollaborations}
            disabled={aiLoading || collaborations.filter((c) => c.type === 'wish').length <= 1}
          >
            <Sparkles size={18} />
            {aiLoading ? 'Finding...' : 'Find Potential Collaborations'}
          </button>
          <button type="button" className={styles.addButton} onClick={() => setShowManualAdd(true)}>
            <Plus size={18} />
            Add
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={wishStyles.emptyState}>
          <p>Loading related wishes...</p>
        </div>
      ) : relatedWishes.length === 0 ? (
        <div className={wishStyles.emptyState}>
          <Heart size={48} className={wishStyles.emptyIcon} />
          <p>No related wishes yet. Add from your wishes or find potential collaborations with AI.</p>
        </div>
      ) : (
        <div className={styles.cardList}>
          {relatedWishes.map((item) => (
            <div
              key={item.id}
              className={styles.card}
              onClick={() => handleWishClick(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleWishClick(item)}
            >
              <div className={styles.cardIcon}>
                <Heart size={20} />
              </div>
              <div className={styles.cardContent}>
                <h4 className={styles.cardTitle}>{item.title}</h4>
                {item.dreamNeed && (
                  <p className={styles.cardDesc}>{item.dreamNeed}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddRelatedWishDialog
        isVisible={showManualAdd}
        onClose={() => setShowManualAdd(false)}
        myWishes={myWishes}
        onSelect={handleAddRelated}
      />

      <AIMatchesDialog
        isVisible={showAIMatches}
        onClose={() => setShowAIMatches(false)}
        matches={aiMatches}
        currentUserKey={publicKey}
        onAddOwn={handleAddFromAI}
      />
    </div>
  );
};

export default RelatedWishes;
