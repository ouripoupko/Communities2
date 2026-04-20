import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, GitMerge, ChevronRight } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { contractRead } from '../../services/api';
import type { IMethod } from '../../services/interfaces';
import { resolveInitiativeStageContract } from '../../services/contracts/initiative';
import styles from './CollaborationPanel.module.scss';

interface CollaborationPanelProps {
  initiativeId: string;
  communityId: string;
  initiativeTitle: string;
  initiativeHostServer: string;
  initiativeHostAgent: string;
  defaultTab?: 'suggestions' | 'merges';
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  initiativeId,
  communityId,
  initiativeTitle,
  initiativeHostServer,
  initiativeHostAgent,
  defaultTab = 'suggestions',
}) => {
  const navigate = useNavigate();
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);

  const [suggestionCount, setSuggestionCount] = useState<number>(0);
  const [mergeCount, setMergeCount] = useState<number>(0);

  useEffect(() => {
    if (!serverUrl || !publicKey) return;
    let cancelled = false;

    (async () => {
      try {
        const discussionMods = await resolveInitiativeStageContract(
          serverUrl, publicKey, initiativeId, 'discussionModsContractId',
        );
        const modsContractId = discussionMods?.contractId;
        if (modsContractId && !cancelled) {
          const list = await contractRead({
            serverUrl, publicKey, contractId: modsContractId,
            method: { name: 'get_suggestions', values: {} } as IMethod,
          });
          if (Array.isArray(list) && !cancelled) setSuggestionCount(list.length);
        }
      } catch { /* non-fatal */ }

      try {
        const mergeStage = await resolveInitiativeStageContract(
          serverUrl, publicKey, initiativeId, 'mergeContractId',
        );
        const mergeContractId = mergeStage?.contractId;
        if (mergeContractId && !cancelled) {
          const list = await contractRead({
            serverUrl, publicKey, contractId: mergeContractId,
            method: { name: 'get_merge_proposals', values: {} } as IMethod,
          });
          if (Array.isArray(list) && !cancelled) setMergeCount(list.length);
        }
      } catch { /* non-fatal */ }
    })();

    return () => { cancelled = true; };
  }, [serverUrl, publicKey, initiativeId]);

  const goToFullView = (tab: 'suggestions' | 'merges') => {
    const path = `/initiative/${encodeURIComponent(initiativeHostServer)}/${encodeURIComponent(initiativeHostAgent)}/${communityId}/${initiativeId}/collaboration`;
    navigate(path, { state: { tab, initiativeTitle } });
  };

  void defaultTab;

  return (
    <div className={styles.panel}>
      <div className={styles.heading}>COLLABORATION</div>
      <button className={styles.row} onClick={() => goToFullView('suggestions')}>
        <Edit size={14} />
        <span className={styles.count}>{suggestionCount}</span>
        <span className={styles.label}>Edit Suggestions</span>
        <ChevronRight size={14} className={styles.chev} />
      </button>
      <button className={styles.row} onClick={() => goToFullView('merges')}>
        <GitMerge size={14} />
        <span className={styles.count}>{mergeCount}</span>
        <span className={styles.label}>Merge Proposals</span>
        <ChevronRight size={14} className={styles.chev} />
      </button>
    </div>
  );
};

export default CollaborationPanel;
