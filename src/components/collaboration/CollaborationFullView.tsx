import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCollaborations } from '../../store/slices/communitiesSlice';
import { getInitiativeRoles, isAuthorOrCoAuthor, type InitiativeRoles } from '../../services/initiativeRoles';
import ModificationSuggestions from './flows/modifications/ModificationSuggestions';
import MergeProposalsList from './flows/merge/MergeProposalsList';
import PageHeader from '../PageHeader';
import ErrorBoundary from '../shared/ErrorBoundary';
import cs from '../../pages/Container.module.scss';
import styles from './CollaborationFullView.module.scss';

interface CollaborationFullViewProps {
  title: string;
  collaborationId: string;
  communityId: string;
}

type Tab = 'suggestions' | 'merges';

const CollaborationFullView: React.FC<CollaborationFullViewProps> = ({
  title, collaborationId, communityId,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const communityProps = useAppSelector((s) => s.communities.communityProperties[communityId]);
  const communityName = communityProps?.name || communityId.slice(0, 8);
  const collaborations = useAppSelector((s) => s.communities.communityCollaborations[communityId]);
  const collaborationsLoading = useAppSelector((s) => s.communities.collaborationsLoading[communityId]);

  const initialTab = ((location.state as { tab?: Tab })?.tab) || 'suggestions';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [roles, setRoles] = useState<InitiativeRoles | null>(null);
  const [mergeCount, setMergeCount] = useState<number>(0);

  useEffect(() => {
    if (!serverUrl || !publicKey || collaborations || collaborationsLoading) return;
    dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
  }, [serverUrl, publicKey, collaborations, collaborationsLoading, dispatch, communityId]);

  useEffect(() => {
    if (!serverUrl || !publicKey) return;
    let cancelled = false;
    getInitiativeRoles(serverUrl, publicKey, collaborationId).then((r) => {
      if (!cancelled) setRoles(r);
    });
    return () => { cancelled = true; };
  }, [serverUrl, publicKey, collaborationId]);

  const canDecide = roles ? isAuthorOrCoAuthor(roles, publicKey) : false;
  const originalAuthor = roles?.author;
  const coAuthors = roles?.coAuthors ?? [];

  const isMerged = roles?.status === 'merged_into';
  const mergedInto = roles?.mergedInto;

  const handleSuggestionAccepted = () => {
    if (!serverUrl || !publicKey) return;
    getInitiativeRoles(serverUrl, publicKey, collaborationId).then(setRoles);
  };

  const initiativeHostServer = useMemo(() => location.pathname.split('/')[2] ?? '', [location.pathname]);
  const initiativeHostAgent = useMemo(() => location.pathname.split('/')[3] ?? '', [location.pathname]);

  if (isMerged && mergedInto) {
    return (
      <div className={cs.container}>
        <PageHeader showBackButton backButtonText="Back" onBackClick={() => navigate(-1)} title={title} subtitle={communityName} layout="two-row" />
        <div className={cs.content}>
          <div className={cs.main}>
            <div className={styles.mergedBanner}>
              <strong>This initiative merged into another one.</strong>
              <p>Continue the conversation on the surviving initiative.</p>
              <button onClick={() => navigate(`/initiative/${encodeURIComponent(initiativeHostServer)}/${encodeURIComponent(initiativeHostAgent)}/${communityId}/${mergedInto}`)}>
                Go to merged initiative →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cs.container}>
      <PageHeader showBackButton backButtonText="Back" onBackClick={() => navigate(-1)} title={`${title} — Collaboration`} subtitle={communityName} layout="two-row" />
      <div className={cs.content}>
        <div className={cs.main}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'suggestions' ? styles.active : ''}`}
              onClick={() => setTab('suggestions')}
            >
              Edit Suggestions
            </button>
            <button
              className={`${styles.tab} ${tab === 'merges' ? styles.active : ''}`}
              onClick={() => setTab('merges')}
            >
              Merge Proposals · {mergeCount}
            </button>
          </div>

          {tab === 'suggestions' && (
            <ErrorBoundary fallbackMessage="Edit suggestions encountered an error.">
              <ModificationSuggestions
                instanceId={`${collaborationId}_discussion_mods`}
                parentContractId={collaborationId}
                stageKey="discussionModsContractId"
                originalAuthor={originalAuthor}
                coAuthors={coAuthors}
                fieldLabel="initiative"
                targetInitiativeId={collaborationId}
                onAccept={handleSuggestionAccepted}
              />
            </ErrorBoundary>
          )}

          {tab === 'merges' && (
            <ErrorBoundary fallbackMessage="Merge proposals encountered an error.">
              <MergeProposalsList
                targetInitiativeId={collaborationId}
                targetTitle={title}
                targetCommunityId={communityId}
                canDecide={canDecide}
                onCountChange={setMergeCount}
              />
            </ErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollaborationFullView;
