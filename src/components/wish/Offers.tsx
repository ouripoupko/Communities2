import React, { useState, useEffect, useCallback } from 'react';
import { HandHeart, Plus, Search } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCollaborations } from '../../store/slices/communitiesSlice';
import { fetchOffers, addOfferThunk, acceptOfferThunk, compensateOfferThunk } from '../../store/slices/wishSlice';
import { fetchUserBalance } from '../../store/slices/currencySlice';
import { eventStreamService } from '../../services/eventStream';
import type { BlockchainEvent } from '../../services/eventStream';
import type { WishOffer } from '../../services/contracts/wish';
import AddHelpDialog from './dialogs/AddHelpDialog';
import CompensateDialog from './dialogs/CompensateDialog';
import AiHelpSearchDialog from './dialogs/AiHelpSearchDialog';
import styles from './Offers.module.scss';
import wishStyles from './WishTab.module.scss';

interface OffersProps {
  wishId: string;
  communityId: string;
}

function shortKey(key: string): string {
  if (!key || key.length < 12) return key;
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

const Offers: React.FC<OffersProps> = ({ wishId, communityId }) => {
  const dispatch = useAppDispatch();
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { communityCollaborations } = useAppSelector((state) => state.communities);
  const { offers, offersLoading } = useAppSelector((state) => state.wish);
  const { userBalance, loading: balanceLoading } = useAppSelector((state) => state.currency);

  const collaborations = communityCollaborations[communityId] ?? [];
  const offerList = offers[wishId] ?? [];
  const isLoading = offersLoading[wishId] === true;

  const [showAddHelp, setShowAddHelp] = useState(false);
  const [showAiSearch, setShowAiSearch] = useState(false);
  const [showCompensate, setShowCompensate] = useState<WishOffer | null>(null);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [compensateSubmitting, setCompensateSubmitting] = useState(false);

  const handleContractWrite = useCallback(
    (event: BlockchainEvent) => {
      if (event.contract === wishId && serverUrl && publicKey) {
        dispatch(
          fetchOffers({
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
      fetchOffers({
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

  const refetchOffers = useCallback(() => {
    if (serverUrl && publicKey && wishId) {
      dispatch(fetchOffers({ serverUrl, publicKey, wishContractId: wishId }));
    }
  }, [serverUrl, publicKey, wishId, dispatch]);

  const handleAddHelp = async (description: string) => {
    if (!serverUrl || !publicKey) return;
    setAddSubmitting(true);
    try {
      await dispatch(
        addOfferThunk({
          serverUrl,
          publicKey,
          wishContractId: wishId,
          description,
        }),
      ).unwrap();
      setShowAddHelp(false);
      refetchOffers();
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleAccept = async (offer: WishOffer) => {
    if (!serverUrl || !publicKey) return;
    await dispatch(
      acceptOfferThunk({
        serverUrl,
        publicKey,
        wishContractId: wishId,
        offerId: offer.id,
      }),
    ).unwrap();
    refetchOffers();
  };

  const handleCompensateClick = (offer: WishOffer) => {
    setShowCompensate(offer);
  };

  const handleCompensateSubmit = async (amount: number) => {
    if (!serverUrl || !publicKey || !showCompensate) return;
    setCompensateSubmitting(true);
    try {
      await dispatch(
        compensateOfferThunk({
          serverUrl,
          publicKey,
          wishContractId: wishId,
          offerId: showCompensate.id,
          amount,
          helperPublicKey: showCompensate.author,
          communityId,
        }),
      ).unwrap();
      setShowCompensate(null);
      refetchOffers();
      handleFetchBalance();
    } finally {
      setCompensateSubmitting(false);
    }
  };

  const handleFetchBalance = useCallback(() => {
    if (serverUrl && publicKey && communityId) {
      dispatch(
        fetchUserBalance({
          serverUrl,
          publicKey,
          contractId: communityId,
        }),
      );
    }
  }, [serverUrl, publicKey, communityId, dispatch]);

  return (
    <div className={wishStyles.tabContent}>
      <div className={styles.header}>
        <div>
          <h3 className={wishStyles.tabTitle}>Help Proposals</h3>
          <p className={wishStyles.tabSubtitle}>
            Offers from community members who want to help make this wish come true
          </p>
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.aiButton}
            onClick={() => setShowAiSearch(true)}
          >
            <Search size={18} />
            Search for Helpers
          </button>
          <button type="button" className={styles.addButton} onClick={() => setShowAddHelp(true)}>
            <Plus size={18} />
            Add Help
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className={wishStyles.emptyState}>
          <p>Loading help proposals...</p>
        </div>
      ) : offerList.length === 0 ? (
        <div className={wishStyles.emptyState}>
          <HandHeart size={48} className={wishStyles.emptyIcon} />
          <p>No help proposals yet. Be the first to offer support.</p>
        </div>
      ) : (
        <div className={styles.cardList}>
          {offerList.map((offer) => (
            <div
              key={offer.id}
              className={`${styles.card} ${offer.acceptedBy ? styles.accepted : ''}`}
            >
              <div className={styles.cardIcon}>
                <HandHeart size={20} />
              </div>
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>
                    From {shortKey(offer.author)}
                  </span>
                  {publicKey !== offer.author && (
                    <div className={styles.cardActions}>
                      {!offer.acceptedBy && (
                        <button
                          type="button"
                          className={styles.acceptBtn}
                          onClick={() => handleAccept(offer)}
                        >
                          Accept
                        </button>
                      )}
                      {offer.acceptedBy && !offer.compensated && (
                        <button
                          type="button"
                          className={styles.compensateBtn}
                          onClick={() => handleCompensateClick(offer)}
                        >
                          Compensate
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className={styles.cardDesc}>{offer.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AiHelpSearchDialog
        isVisible={showAiSearch}
        onClose={() => setShowAiSearch(false)}
      />

      <AddHelpDialog
        isVisible={showAddHelp}
        onClose={() => setShowAddHelp(false)}
        onSubmit={handleAddHelp}
        isSubmitting={addSubmitting}
      />

      <CompensateDialog
        isVisible={!!showCompensate}
        onClose={() => setShowCompensate(null)}
        onSubmit={handleCompensateSubmit}
        helperDisplayName={showCompensate ? shortKey(showCompensate.author) : ''}
        balance={userBalance}
        isLoadingBalance={balanceLoading}
        onFetchBalance={handleFetchBalance}
        isSubmitting={compensateSubmitting}
      />
    </div>
  );
};

export default Offers;
