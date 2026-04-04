import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCollaborations, fetchCommunityProperties } from '../../store/slices/communitiesSlice';
import type { Collaboration } from '../../services/contracts/community';
import styles from './InitiativeFeed.module.scss';

interface InitiativeWithCommunity extends Collaboration {
  communityId: string;
  communityName: string;
}

const InitiativeFeed: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { contracts, serverUrl, publicKey } = useAppSelector((s) => s.user);
  const { communityCollaborations, communityProperties } = useAppSelector((s) => s.communities);
  const { hidden } = useAppSelector((s) => s.preferences);

  const communityContracts = useMemo(
    () => contracts.filter((c) => c.contract === 'community_contract.py' && !hidden.includes(c.id)),
    [contracts, hidden],
  );

  // Fetch collaborations and properties for all visible communities
  useEffect(() => {
    if (!serverUrl || !publicKey) return;
    communityContracts.forEach((c) => {
      if (!communityCollaborations[c.id]) {
        dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: c.id }));
      }
      if (!communityProperties[c.id]) {
        dispatch(fetchCommunityProperties({ serverUrl, publicKey, contractId: c.id }));
      }
    });
  }, [serverUrl, publicKey, communityContracts, communityCollaborations, communityProperties, dispatch]);

  const allInitiatives: InitiativeWithCommunity[] = useMemo(() => {
    const result: InitiativeWithCommunity[] = [];
    for (const c of communityContracts) {
      const collabs = communityCollaborations[c.id] ?? [];
      const name = communityProperties[c.id]?.name || c.name || c.id.slice(0, 8);
      for (const collab of collabs) {
        if (collab.type === 'initiative') {
          result.push({ ...collab, communityId: c.id, communityName: name });
        }
      }
    }
    return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [communityContracts, communityCollaborations, communityProperties]);

  const handleClick = (item: InitiativeWithCommunity) => {
    const hostServer = item.hostServer || serverUrl || 'local';
    const hostAgent = item.hostAgent || publicKey || 'local';
    navigate(
      `/initiative/${encodeURIComponent(hostServer)}/${encodeURIComponent(hostAgent)}/${item.communityId}/${item.id}/roadmap`,
    );
  };

  if (!serverUrl || !publicKey) {
    return <div className={styles.empty}>Log in to see initiatives</div>;
  }

  return (
    <div className={styles.feed}>
      {allInitiatives.length === 0 ? (
        <div className={styles.empty}>
          <Zap size={48} className={styles.emptyIcon} />
          <p>No initiatives yet</p>
          <p className={styles.emptyHint}>
            Create or join a community, then start an initiative from the community&apos;s Initiative tab.
          </p>
        </div>
      ) : (
        allInitiatives.map((item) => (
          <button key={item.id} className={styles.card} onClick={() => handleClick(item)}>
            <div className={styles.cardHeader}>
              <Zap size={16} className={styles.cardIcon} />
              <span className={styles.communityName}>{item.communityName}</span>
            </div>
            <div className={styles.cardTitle}>{item.title || 'Untitled Initiative'}</div>
          </button>
        ))
      )}
    </div>
  );
};

export default InitiativeFeed;
