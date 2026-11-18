import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import type { CollaborationKind } from '../../components/collaboration/kinds';
import type { Collaboration } from '../../services/contracts/community';
import CollaborationPage from './CollaborationPage';

/**
 * A collaboration's route: its host and id are in the path, so a link to it
 * works on its own. The community's list passes what it knows, to show at once.
 * Each kind may have its own page; otherwise it has the generic one.
 */
const CollaborationView: React.FC<{ kind: CollaborationKind }> = ({ kind }) => {
  const { hostServer = '', hostAgent = '', collaborationId = '' } = useParams();
  const state = useLocation().state as { listed?: Collaboration; communityId?: string } | null;
  const Page = kind.Page ?? CollaborationPage;

  return (
    <Page
      key={collaborationId}
      kind={kind}
      collaborationId={collaborationId}
      hostServer={hostServer}
      hostAgent={hostAgent}
      listed={state?.listed}
      communityId={state?.communityId}
    />
  );
};

export default CollaborationView;
