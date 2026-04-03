import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CollaborationPage from './CollaborationPage';
import { useAppSelector } from '../../store/hooks';
import { contractRead } from '../../services/api';
import type { IMethod } from '../../services/interfaces';
import type { Collaboration } from '../../services/contracts/community';

const WishView: React.FC = () => {
  const { communityId, wishId } = useParams<{
    communityId: string;
    wishId: string;
  }>();
  const location = useLocation();
  const wish = (location.state as { wish?: Collaboration })?.wish;
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);

  const [title, setTitle] = useState(wish?.title ?? 'Wish');

  useEffect(() => {
    if (wish?.title || !serverUrl || !publicKey || !wishId) return;
    contractRead({
      serverUrl,
      publicKey,
      contractId: wishId,
      method: { name: 'get_details', values: {} } as IMethod,
    })
      .then((details: Record<string, unknown>) => {
        if (details?.title) setTitle(details.title as string);
      })
      .catch(() => {});
  }, [wish?.title, serverUrl, publicKey, wishId]);

  const authorKey = wish?.author;
  const subtitle = authorKey
    ? `Author: ${authorKey.length > 20 ? `${authorKey.slice(0, 10)}...${authorKey.slice(-8)}` : authorKey}`
    : undefined;

  return (
    <CollaborationPage
      type="wish"
      title={title}
      subtitle={subtitle}
      collaborationId={wishId!}
      communityId={communityId!}
    />
  );
};

export default WishView;
