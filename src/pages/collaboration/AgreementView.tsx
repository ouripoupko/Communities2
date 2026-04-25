import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CollaborationPage from './CollaborationPage';
import { useAppSelector } from '../../store/hooks';
import { contractRead } from '../../services/api';
import type { IMethod } from '../../services/interfaces';
import type { Collaboration } from '../../services/contracts/community';

const AgreementView: React.FC = () => {
  const { communityId, agreementId } = useParams<{
    communityId: string;
    agreementId: string;
  }>();
  const location = useLocation();
  const agreement = (location.state as { agreement?: Collaboration })?.agreement;
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);

  const [title, setTitle] = useState(agreement?.rule || agreement?.title || 'Agreement');

  useEffect(() => {
    if (agreement?.rule || agreement?.title || !serverUrl || !publicKey || !agreementId) return;
    contractRead({
      serverUrl,
      publicKey,
      contractId: agreementId,
      method: { name: 'get_details', values: {} } as IMethod,
    })
      .then((details: Record<string, unknown>) => {
        const fetched = (details?.rule as string) || (details?.title as string);
        if (fetched) setTitle(fetched);
      })
      .catch(() => {});
  }, [agreement?.rule, agreement?.title, serverUrl, publicKey, agreementId]);

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
