import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CollaborationPage from './CollaborationPage';
import type { Collaboration } from '../../services/contracts/community';

const AgreementView: React.FC = () => {
  const { communityId, agreementId } = useParams<{
    communityId: string;
    agreementId: string;
  }>();
  const location = useLocation();
  const agreement = (location.state as { agreement?: Collaboration })?.agreement;

  const title = agreement?.rule || agreement?.title || 'Agreement';

  return (
    <CollaborationPage
      type="agreement"
      title={title}
      collaborationId={agreementId!}
      communityId={communityId!}
    />
  );
};

export default AgreementView;
