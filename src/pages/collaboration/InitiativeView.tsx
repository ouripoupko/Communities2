import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CollaborationPage from './CollaborationPage';
import type { InitiativeData } from '../../types/initiative';

const InitiativeView: React.FC = () => {
  const { initiativeId } = useParams<{
    initiativeHostServer: string;
    initiativeHostAgent: string;
    initiativeId: string;
  }>();
  const location = useLocation();
  const state = location.state as { initiative?: InitiativeData; communityId?: string } | null;
  const initiative = state?.initiative;
  const communityId = state?.communityId;

  return (
    <CollaborationPage
      type="initiative"
      title={initiative?.title ?? 'Initiative'}
      collaborationId={initiativeId!}
      communityId={communityId}
      collaborationServer={initiative?.hostServer}
      collaborationAgent={initiative?.hostAgent}
    />
  );
};

export default InitiativeView;
