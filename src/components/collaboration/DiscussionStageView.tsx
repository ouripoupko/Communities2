import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCollaborations } from '../../store/slices/communitiesSlice';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import DiscussionFlow from './flows/discussion/DiscussionFlow';
import ModificationSuggestions from './flows/modifications/ModificationSuggestions';
import PageHeader from '../PageHeader';
import ErrorBoundary from '../shared/ErrorBoundary';
import cs from '../../pages/Container.module.scss';
import { getInitiativeRoles, type InitiativeRoles } from '../../services/initiativeRoles';

interface DiscussionStageViewProps {
  title: string;
  collaborationId: string;
  communityId: string;
}

const DiscussionStageView: React.FC<DiscussionStageViewProps> = ({ title, collaborationId, communityId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const communityProps = useAppSelector((s) => s.communities.communityProperties[communityId]);
  const communityName = communityProps?.name || communityId.slice(0, 8);
  const collaborations = useAppSelector((s) => s.communities.communityCollaborations[communityId]);
  const collaborationsLoading = useAppSelector((s) => s.communities.collaborationsLoading[communityId]);

  useEffect(() => {
    if (!serverUrl || !publicKey || collaborations || collaborationsLoading) return;

    dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
  }, [serverUrl, publicKey, collaborations, collaborationsLoading, dispatch, communityId]);

  // Find the initiative author from the collaboration data
  const originalAuthor = useMemo(() => {
    if (!collaborations) return undefined;
    const collab = collaborations.find((c) => c.id === collaborationId);
    return collab?.author;
  }, [collaborations, collaborationId]);

  const [roles, setRoles] = useState<InitiativeRoles | null>(null);
  useEffect(() => {
    if (!serverUrl || !publicKey) return;
    let cancelled = false;
    getInitiativeRoles(serverUrl, publicKey, collaborationId).then((r) => {
      if (!cancelled) setRoles(r);
    });
    return () => { cancelled = true; };
  }, [serverUrl, publicKey, collaborationId]);

  return (
    <div className={cs.container}>
      <PageHeader
        showBackButton
        backButtonText="Back to Dashboard"
        onBackClick={() => navigate(-1)}
        title={`${title} — Discussion`}
        subtitle={communityName}
        layout="two-row"
      />
      <div className={cs.content}>
        <div className={cs.main}>
          <ErrorBoundary fallbackMessage="The discussion section encountered an error.">
            <ModificationSuggestions
              instanceId={`${collaborationId}_discussion_mods`}
              parentContractId={collaborationId}
              stageKey="discussionModsContractId"
              fieldLabel="problem"
              originalAuthor={roles?.author || originalAuthor}
              coAuthors={roles?.coAuthors ?? []}
              targetInitiativeId={collaborationId}
              onAccept={() => {
                if (serverUrl && publicKey) {
                  getInitiativeRoles(serverUrl, publicKey, collaborationId).then(setRoles);
                }
              }}
            />
            <DiscussionFlow
              instanceId={`${collaborationId}_discussion`}
              collaborationId={collaborationId}
              collaborationType="initiative"
              parentContractId={collaborationId}
              stageKey="discussionContractId"
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

export default DiscussionStageView;
