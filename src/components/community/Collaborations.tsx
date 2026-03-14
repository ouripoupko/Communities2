import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Heart, Shield } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import type { InitiativeData } from '../../types/initiative';
import CreateFlowDialog, { type CollaborationType } from './dialogs/CreateFlowDialog';
import styles from './Collaborations.module.scss';
import { fetchCollaborations } from '../../store/slices/communitiesSlice';
import {
  addCollaboration,
  createInitiative,
  type Collaboration,
} from '../../services/contracts/community';

export type CollaborationItemType = 'initiative' | 'wish' | 'agreement';

type FilterType = 'all' | CollaborationItemType;
type SortType = 'newest' | 'mostActive';

interface CollaborationsProps {
  communityId: string;
}

const Collaborations: React.FC<CollaborationsProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { communityMembers, membersLoading, communityCollaborations, collaborationsLoading } =
    useAppSelector((state) => state.communities);
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);

  const allMembers: string[] = Array.isArray(communityMembers[communityId])
    ? communityMembers[communityId]
    : [];
  const isMember = publicKey && allMembers.includes(publicKey);

  const items: Collaboration[] = useMemo(
    () => communityCollaborations[communityId] ?? [],
    [communityCollaborations, communityId],
  );

  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<CollaborationType | null>(null);

  useEffect(() => {
    if (!communityId || !serverUrl || !publicKey) return;
    dispatch(
      fetchCollaborations({
        serverUrl,
        publicKey,
        contractId: communityId,
      }),
    );
  }, [communityId, serverUrl, publicKey, dispatch]);

  const handleOpenCreate = (type: CollaborationType) => {
    setCreateType(type);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCreateType(null);
  };

  const handleSubmit = async (data: Record<string, string>) => {
    if (!serverUrl || !publicKey || !createType) {
      throw new Error('Not logged in or missing data');
    }

    const newItem: Collaboration = {
      id: crypto.randomUUID(),
      type: createType as Collaboration['type'],
      title: data.title || data.rule || 'Untitled',
      createdAt: Date.now(),
      activityCount: 0,
    };

    if (createType === 'initiative') {
      await createInitiative(serverUrl, publicKey, communityId, {
        title: data.title || 'Untitled',
        description: data.description,
      });
      return;
    } else if (createType === 'wish') {
      newItem.dreamNeed = data.dreamNeed;
      newItem.author = publicKey;
    } else if (createType === 'agreement') {
      newItem.rule = data.rule;
      newItem.protection = data.protection;
      newItem.consensusStatus = 'Pending';
    }

    await addCollaboration(serverUrl, publicKey, communityId, newItem);
    // Store updates via SSE contract_write -> fetchCollaborations
  };

  const filteredItems = useMemo(() => {
    let list = filter === 'all' ? items : items.filter((i) => i.type === filter);
    if (sort === 'newest') {
      list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    } else {
      list = [...list].sort(
        (a, b) => (b.activityCount ?? 0) - (a.activityCount ?? 0)
      );
    }
    return list;
  }, [items, filter, sort]);

  const getTypeIcon = (type: CollaborationItemType) => {
    switch (type) {
      case 'initiative':
        return <Zap size={20} />;
      case 'wish':
        return <Heart size={20} />;
      case 'agreement':
        return <Shield size={20} />;
    }
  };

  const getDisplayTitle = (item: Collaboration) => {
    if (item.type === 'agreement') return item.rule || item.title;
    return item.title;
  };

  const getDisplayDescription = (item: Collaboration) => {
    if (item.type === 'wish') return item.dreamNeed;
    if (item.type === 'agreement') return item.protection;
    return item.description;
  };

  const handleWishClick = (item: Collaboration) => {
    if (item.type !== 'wish') return;
    navigate(`/wish/${communityId}/${item.id}/related`, {
      state: { wish: item },
    });
  };

  const handleInitiativeClick = (item: Collaboration) => {
    if (item.type !== 'initiative') return;
    const hostServer = item.hostServer || serverUrl || 'local';
    const hostAgent = item.hostAgent || publicKey || 'local';
    const initiativeData: InitiativeData = {
      id: item.id,
      title: item.title,
      description: item.description,
      currencyGathered: item.currencyGathered,
      currencyGoal: item.currencyGoal,
      createdAt: item.createdAt,
      activityCount: item.activityCount,
      hostServer,
      hostAgent,
    };
    const url = `/initiative/${encodeURIComponent(hostServer)}/${encodeURIComponent(hostAgent)}/${communityId}/${item.id}/roadmap`;
    navigate(url, { state: { initiative: initiativeData } });
  };

  const isMembersLoading = membersLoading[communityId] === true;
  const isCollaborationsLoading = collaborationsLoading[communityId] === true;
  if (isMembersLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading community members...</p>
        </div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Collaborations</h2>
          <p>You are not yet a member of this community.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Collaborations</h2>
        <p>Initiatives, wishes, and agreements that shape community life</p>
      </div>

      <div className={styles.gates}>
        <button
          className={`${styles.gateButton} ${styles.initiative}`}
          onClick={() => handleOpenCreate('initiative')}
        >
          <Zap size={20} />
          Start Initiative
        </button>
        <button
          className={`${styles.gateButton} ${styles.wish}`}
          onClick={() => handleOpenCreate('wish')}
        >
          <Heart size={20} />
          Make a Wish
        </button>
        <button
          className={`${styles.gateButton} ${styles.agreement}`}
          onClick={() => handleOpenCreate('agreement')}
        >
          <Shield size={20} />
          Propose Agreement
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.filterTabs}>
          {(['all', 'initiative', 'wish', 'agreement'] as const).map((f) => (
            <button
              key={f}
              className={`${styles.filterTab} ${filter === f ? styles.active : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <select
          className={styles.sortSelect}
          value={sort}
          onChange={(e) => setSort(e.target.value as SortType)}
        >
          <option value="newest">Newest</option>
          <option value="mostActive">Most Active</option>
        </select>
      </div>

      <div className={styles.list}>
        {isCollaborationsLoading ? (
          <div className="empty-state">
            <p>Loading collaborations...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>No collaborations yet. Start an initiative, make a wish, or propose an agreement.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`${styles.card} ${(item.type === 'initiative' || item.type === 'wish') ? styles.clickable : ''}`}
              onClick={
                item.type === 'initiative'
                  ? () => handleInitiativeClick(item)
                  : item.type === 'wish'
                    ? () => handleWishClick(item)
                    : undefined
              }
              role={(item.type === 'initiative' || item.type === 'wish') ? 'button' : undefined}
            >
              <div className={styles.cardTop}>
                <div className={`${styles.typeIcon} ${styles[item.type]}`}>
                  {getTypeIcon(item.type)}
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{getDisplayTitle(item)}</h3>
                  {getDisplayDescription(item) && (
                    <p className={styles.cardDescription}>{getDisplayDescription(item)}</p>
                  )}
                </div>
              </div>
              {item.type === 'initiative' && item.currencyGoal !== undefined && (
                <div className={styles.progressBar}>
                  <div className={styles.progressLabel}>
                    <span>Gathered</span>
                    <span>
                      {item.currencyGathered ?? 0} / {item.currencyGoal} credits
                    </span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${Math.min(
                          100,
                          ((item.currencyGathered ?? 0) / item.currencyGoal) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {item.type === 'agreement' && item.consensusStatus && (
                <div className={styles.consensusStatus}>
                  Consensus: {item.consensusStatus}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <CreateFlowDialog
        isVisible={dialogOpen}
        onClose={handleCloseDialog}
        collaborationType={createType}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default Collaborations;
