import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CollaborationPage from './CollaborationPage';
import type { InitiativeData } from '../../types/initiative';

const InitiativeView: React.FC = () => {
  const { communityId, initiativeId } = useParams<{
    initiativeHostServer: string;
    initiativeHostAgent: string;
    communityId: string;
    initiativeId: string;
  }>();
  const location = useLocation();
  const initiative = (location.state as { initiative?: InitiativeData })?.initiative;

  return (
    <CollaborationPage
      type="initiative"
      title={initiative?.title ?? 'Initiative'}
      collaborationId={initiativeId!}
      communityId={communityId!}
    />
  );
};

export default InitiativeView;
