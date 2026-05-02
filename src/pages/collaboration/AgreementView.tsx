import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CollaborationPage from './CollaborationPage';
import type { Collaboration } from '../../services/contracts/community';

const AgreementView: React.FC = () => {
  const { agreementId } = useParams<{ agreementId: string }>();
  const location = useLocation();
  const state = location.state as { agreement?: Collaboration; communityId?: string } | null;
  const agreement = state?.agreement;
  const communityId = state?.communityId;

  const title = agreement?.rule || agreement?.title || 'Agreement';

  return (
    <CollaborationPage
      type="agreement"
      title={title}
      collaborationId={agreementId!}
      communityId={communityId}
      collaborationServer={agreement?.hostServer}
      collaborationAgent={agreement?.hostAgent}
    />
  );
};

export default AgreementView;
