import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CollaborationPage from './CollaborationPage';
import { useAppSelector } from '../../store/hooks';
import { contractRead } from '../../services/api';
import type { IMethod } from '../../services/interfaces';
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
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);

  const [title, setTitle] = useState(initiative?.title ?? 'Initiative');

  useEffect(() => {
    if (initiative?.title || !serverUrl || !publicKey || !initiativeId) return;
    contractRead({
      serverUrl,
      publicKey,
      contractId: initiativeId,
      method: { name: 'get_details', values: {} } as IMethod,
    })
      .then((details: Record<string, unknown>) => {
        if (details?.title) setTitle(details.title as string);
      })
      .catch(() => {});
  }, [initiative?.title, serverUrl, publicKey, initiativeId]);

  return (
    <CollaborationPage
      type="initiative"
      title={title}
      collaborationId={initiativeId!}
      communityId={communityId!}
    />
  );
};

export default InitiativeView;
