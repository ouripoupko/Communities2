import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ChevronRight } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCollaborations } from '../../store/slices/communitiesSlice';
import { createInitiative, type Collaboration } from '../../services/contracts/community';
import CreateInitiativeDialog, { type InitiativeFormData } from './dialogs/CreateInitiativeDialog';
import styles from './InitiativeList.module.scss';

interface InitiativeListProps {
  communityId: string;
}

const InitiativeList: React.FC<InitiativeListProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { communityMembers, membersLoading, communityCollaborations } = useAppSelector(
    (state) => state.communities,
  );
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);

  const [showDialog, setShowDialog] = useState(false);

  const allMembers: string[] = Array.isArray(communityMembers[communityId])
    ? communityMembers[communityId]
    : [];
  const isMember = publicKey && allMembers.includes(publicKey);

  const initiatives: Collaboration[] = useMemo(() => {
    const items = communityCollaborations[communityId] ?? [];
    return items.filter((item) => item.type === 'initiative');
  }, [communityCollaborations, communityId]);

  useEffect(() => {
    if (!communityId || !serverUrl || !publicKey) return;
    dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
  }, [communityId, serverUrl, publicKey, dispatch]);

  const handleCreate = async (data: InitiativeFormData) => {
    if (!serverUrl || !publicKey) throw new Error('Not logged in');
    await createInitiative(serverUrl, publicKey, communityId, {
      title: data.title,
      description: data.description,
    });
    dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
  };

  const handleClick = (item: Collaboration) => {
    const hostServer = item.hostServer || serverUrl || 'local';
    const hostAgent = item.hostAgent || publicKey || 'local';
    navigate(
      `/initiative/${encodeURIComponent(hostServer)}/${encodeURIComponent(hostAgent)}/${communityId}/${item.id}/roadmap`,
    );
  };

  if (membersLoading[communityId] === true) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Initiatives</h2>
          <p>You are not yet a member of this community.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><Zap size={20} /></div>
        <div>
          <h2>Initiatives</h2>
          <p>Solve problems that transcend borders — together</p>
        </div>
      </div>

      {initiatives.length === 0 ? (
        <p className={styles.empty}>No initiatives yet. Start one to tackle a global problem.</p>
      ) : (
        <div className={styles.list}>
          {initiatives.map((item) => (
            <button
              key={item.id}
              className={styles.item}
              onClick={() => handleClick(item)}
            >
              <span className={styles.itemTitle}>{item.title}</span>
              <ChevronRight size={16} className={styles.itemChevron} />
            </button>
          ))}
        </div>
      )}

      <button className={styles.createBtn} onClick={() => setShowDialog(true)}>
        Start Initiative
      </button>

      <CreateInitiativeDialog
        isVisible={showDialog}
        onClose={() => setShowDialog(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
};

export default InitiativeList;
