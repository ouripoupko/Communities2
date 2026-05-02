import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import CollaborationPage from './CollaborationPage';
import type { Collaboration } from '../../services/contracts/community';

const WishView: React.FC = () => {
  const { wishId } = useParams<{ wishId: string }>();
  const location = useLocation();
  const state = location.state as { wish?: Collaboration; communityId?: string } | null;
  const wish = state?.wish;
  const communityId = state?.communityId;

  const authorKey = wish?.author;
  const subtitle = authorKey
    ? `Author: ${authorKey.length > 20 ? `${authorKey.slice(0, 10)}...${authorKey.slice(-8)}` : authorKey}`
    : undefined;

  return (
    <CollaborationPage
      type="wish"
      title={wish?.title ?? 'Wish'}
      subtitle={subtitle}
      collaborationId={wishId!}
      communityId={communityId}
      collaborationServer={wish?.hostServer}
      collaborationAgent={wish?.hostAgent}
    />
  );
};

export default WishView;
