import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import type { InitiativeData } from '../../types/initiative';
import CreateFlowDialog, { type CollaborationType } from './dialogs/CreateFlowDialog';
import CollaborationCard from './collaborations/CollaborationCard';
import CollaborationFilterBar, { type FilterType, type SortType } from './collaborations/CollaborationFilterBar';
import CreateCollaborationButtons from './collaborations/CreateCollaborationButtons';
import styles from './Collaborations.module.scss';
import { fetchCollaborations } from '../../store/slices/communitiesSlice';
import {
  addCollaboration,
  createInitiative,
  type Collaboration,
} from '../../services/contracts/community';

export type { CollaborationItemType } from './collaborations/CollaborationCard';

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
    dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
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
  };

  const filteredItems = useMemo(() => {
    let list = filter === 'all' ? items : items.filter((i) => i.type === filter);
    if (sort === 'newest') {
      list = [...list].sort((a, b) => b.createdAt - a.createdAt);
    } else {
      list = [...list].sort((a, b) => (b.activityCount ?? 0) - (a.activityCount ?? 0));
    }
    return list;
  }, [items, filter, sort]);

  const handleWishClick = (item: Collaboration) => {
    navigate(`/wish/${communityId}/${item.id}/related`, { state: { wish: item } });
  };

  const handleInitiativeClick = (item: Collaboration) => {
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
    navigate(
      `/initiative/${encodeURIComponent(hostServer)}/${encodeURIComponent(hostAgent)}/${communityId}/${item.id}/roadmap`,
      { state: { initiative: initiativeData } },
    );
  };

  if (membersLoading[communityId] === true) {
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

      <CreateCollaborationButtons onOpenCreate={handleOpenCreate} />

      <CollaborationFilterBar
        filter={filter}
        sort={sort}
        onFilterChange={setFilter}
        onSortChange={setSort}
      />

      <div className={styles.list}>
        {collaborationsLoading[communityId] === true ? (
          <div className="empty-state">
            <p>Loading collaborations...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>No collaborations yet. Start an initiative, make a wish, or propose an agreement.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <CollaborationCard
              key={item.id}
              item={item}
              onInitiativeClick={handleInitiativeClick}
              onWishClick={handleWishClick}
            />
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
