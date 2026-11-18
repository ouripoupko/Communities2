import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import CreateCollaborationDialog from './dialogs/CreateCollaborationDialog';
import CollaborationCard from './collaborations/CollaborationCard';
import CollaborationFilterBar, { type FilterType } from './collaborations/CollaborationFilterBar';
import CreateCollaborationButtons from './collaborations/CreateCollaborationButtons';
import styles from './Collaborations.module.scss';
import { fetchCollaborations } from '../../store/slices/communitiesSlice';
import {
  deployCollaboration,
  listCollaboration,
  type Collaboration,
  type CollaborationFields,
  type CollaborationType,
} from '../../services/contracts/community';
import { needsAccess } from '../../services/ibc';
import { collaborationPath, type CollaborationKind } from '../collaboration/kinds';

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
  // The kind being created, while its dialog is open.
  const [creating, setCreating] = useState<CollaborationKind | null>(null);
  // A collaboration deployed, but not listed in the community yet: listing
  // it needs another approval, from its own click.
  const [unlisted, setUnlisted] = useState<{ id: string; type: CollaborationType; fields: CollaborationFields } | null>(null);
  const [isListing, setIsListing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    if (!communityId || !serverUrl || !publicKey) return;
    dispatch(fetchCollaborations({ contractId: communityId }));
  }, [communityId, serverUrl, publicKey, dispatch]);

  // Deploying opens the node's approval page: it starts from the dialog's
  // button. Listing it in the community is silent if the user let the app
  // call addCollaboration; otherwise it waits for the banner's button.
  const handleSubmit = async (fields: CollaborationFields) => {
    if (!serverUrl || !creating) throw new Error('Not logged in or missing data');
    const { type } = creating;
    const id = await deployCollaboration(communityId, type, fields.title);
    try {
      await listCollaboration(communityId, id, type, fields, serverUrl, { silently: true });
    } catch (err) {
      if (!needsAccess(err)) throw err;
      setUnlisted({ id, type, fields });
    }
  };

  const handleList = async () => {
    if (!unlisted || !serverUrl) return;
    try {
      setIsListing(true);
      setListError(null);
      await listCollaboration(communityId, unlisted.id, unlisted.type, unlisted.fields, serverUrl);
      setUnlisted(null);
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsListing(false);
    }
  };

  const filteredItems = useMemo(
    () => [...(filter === 'all' ? items : items.filter((i) => i.type === filter))]
      .sort((a, b) => b.createdAt - a.createdAt),
    [items, filter],
  );

  const handleOpen = (item: Collaboration) => {
    navigate(collaborationPath(item), { state: { listed: item, communityId } });
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

      <CreateCollaborationButtons onOpenCreate={setCreating} />

      {unlisted && (
        <div className={styles.unlisted}>
          <span>
            &ldquo;{unlisted.fields.title}&rdquo; is created on your node. Approve listing it in the
            community, so others see it.
          </span>
          <button onClick={() => void handleList()} disabled={isListing} className="edit-button">
            {isListing ? 'Approve on your node…' : 'List it in the community'}
          </button>
          {listError && <span className={styles.unlistedError}>{listError}</span>}
        </div>
      )}

      <CollaborationFilterBar filter={filter} onFilterChange={setFilter} />

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
            <CollaborationCard key={item.id} item={item} onOpen={handleOpen} />
          ))
        )}
      </div>

      <CreateCollaborationDialog
        kind={creating}
        onClose={() => setCreating(null)}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default Collaborations;
