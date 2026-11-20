import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Routes, Route, matchPath, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { getFlow } from '../../components/collaboration/flows/registry';
import {
  addFlow, deployFlow, getCollaborationInfo, getFlows, joinCollaboration, removeFlow, restoreFlow,
  type CollaborationInfo, type FlowRef, type NewFlow,
} from '../../services/contracts/flows';
import { needsAccess } from '../../services/ibc';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCommunityMembers } from '../../store/slices/communitiesSlice';
import { useEventStream } from '../../hooks/useEventStream';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import ContractGate from '../../components/collaboration/ContractGate';
import FlowTreeList from '../../components/collaboration/FlowTreeList';
import FlowDrillDown from '../../components/collaboration/FlowDrillDown';
import AddFlowDialog from '../../components/collaboration/AddFlowDialog';
import { TitleSetupDialog } from '../../components/collaboration/flows/FlowTitle';
import { buildTree } from '../../components/collaboration/flowTree';
import type { CollaborationPageProps } from '../../components/collaboration/kinds';
import FlowPage from './FlowPage';
import cs from '../Container.module.scss';
import styles from './CollaborationPage.module.scss';

/**
 * A collaboration: its flows, as a tree, and a page for each flow. On wide
 * screens the list is the whole tree; on small ones it shows one level at a
 * time (the level is in the URL, so the back button goes up). Its views key
 * it by the collaboration, so another collaboration starts afresh.
 */
const CollaborationPage: React.FC<CollaborationPageProps> = ({
  kind,
  collaborationId,
  hostServer,
  hostAgent,
  listed,
  communityId: communityIdProp,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  // The collaboration's own path: the URL without the part its views match
  // (flow/:flowId). useResolvedPath('') would keep that part, in a /* route.
  const splat = useParams()['*'] ?? '';
  const base = location.pathname.slice(0, location.pathname.length - encodeURI(splat).length).replace(/\/$/, '');
  const [searchParams] = useSearchParams();
  const isPhone = useMediaQuery('(max-width: 640px)');
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);

  const [flows,      setFlows]      = useState<FlowRef[]>([]);
  const [loaded,     setLoaded]     = useState(false);
  const [info,       setInfo]       = useState<CollaborationInfo | null>(null);
  // Where the add dialog adds: under a flow, '' for the top level; null when closed.
  const [addParent,  setAddParent]  = useState<string | null>(null);
  // A new flow of the type the user picked, while its setup form is open.
  const [pendingNew, setPendingNew] = useState<{ flowType: string; parent: string } | null>(null);
  // A flow deployed, but not in the tree yet: adding it needs another approval, from its own click.
  const [unadded,    setUnadded]    = useState<NewFlow | null>(null);
  const [isAdding,   setIsAdding]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const tree = useMemo(() => buildTree(flows), [flows]);
  const communityId = communityIdProp ?? info?.communityId;
  const title = info?.title || listed?.title || kind.label;

  // The flows name their participants by the community's members' profiles:
  // load them, if the community page has not (a link straight to here).
  const dispatch = useAppDispatch();
  const membersLoaded = useAppSelector((state) => !!communityId && communityId in state.communities.communityMembers);
  useEffect(() => {
    if (communityId && !membersLoaded) void dispatch(fetchCommunityMembers({ contractId: communityId }));
  }, [communityId, membersLoaded, dispatch]);
  const subtitle = info ? kind.subtitle?.(info) : undefined;

  const loadFlows = useCallback(() => {
    if (!collaborationId) return;
    getFlows(collaborationId)
      .then((loadedFlows) => { setFlows(loadedFlows); setLoaded(true); })
      .catch((err) => console.error('Failed to load the collaboration\'s flows:', err));
    getCollaborationInfo(collaborationId)
      .then(setInfo)
      .catch(() => {});
  }, [collaborationId]);

  // Stay in sync when another participant adds, moves or removes a flow. Its
  // events reach the user's own stream once they joined the collaboration.
  useEventStream('contract_write', useCallback((event) => {
    if (event.contract === collaborationId) loadFlows();
  }, [collaborationId, loadFlows]));

  // Navigation keeps the state the community page passed (the collaboration and its host).
  const showList = useCallback((level: string) => {
    navigate(level ? `${base}?in=${encodeURIComponent(level)}` : base, { state: location.state });
  }, [navigate, base, location.state]);
  const openFlow = useCallback((flowId: string) => {
    navigate(`${base}/flow/${encodeURIComponent(flowId)}`, { state: location.state });
  }, [navigate, base, location.state]);

  // Deploy the flow on the user's node, and add it to the tree. Both may open
  // the node's approval page: deploying starts from the click that confirmed
  // the flow's setup form; adding it is silent if the user let the app call
  // addFlow, and otherwise waits for the banner's button. The tree lists it
  // by the title its form asked for.
  const addNewFlow = useCallback(async (flowType: string, parent: string, config: { title: string } & Record<string, unknown>) => {
    const flowTitle = config.title;
    const flowDef = getFlow(flowType);
    if (!serverUrl || !flowDef) return;
    setIsAdding(true);
    setError(null);
    try {
      const id = await deployFlow(flowDef, { title: flowTitle, communityId: communityId ?? '' }, config);
      const flow: NewFlow = { id, type: flowType, title: flowTitle, node: serverUrl, parent };
      try {
        await addFlow(collaborationId, flow, { silently: true });
      } catch (err) {
        if (!needsAccess(err)) throw err;
        setUnadded(flow);
      }
    } finally {
      setIsAdding(false);
    }
  }, [serverUrl, collaborationId, communityId]);

  // A type picked in the add dialog: its setup form takes over.
  const handlePick = useCallback((flowType: string) => {
    setPendingNew({ flowType, parent: addParent ?? '' });
    setAddParent(null);
  }, [addParent]);

  const handleRestore = useCallback(async (flowId: string) => {
    await restoreFlow(collaborationId, flowId, addParent ?? '');
    setAddParent(null);
  }, [collaborationId, addParent]);

  const handleAddUnadded = useCallback(async () => {
    if (!unadded) return;
    setIsAdding(true);
    setError(null);
    try {
      await addFlow(collaborationId, unadded);
      setUnadded(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAdding(false);
    }
  }, [unadded, collaborationId]);

  const handleRemove = useCallback((flowId: string) => removeFlow(collaborationId, flowId), [collaborationId]);

  const isCreator = !!publicKey && !!info && info.creator.toLowerCase() === publicKey.toLowerCase();
  const pendingDef = pendingNew ? getFlow(pendingNew.flowType) : undefined;

  const list = isPhone ? (
    <FlowDrillDown
      tree={tree}
      collaborationTitle={title}
      level={searchParams.get('in') ?? ''}
      onLevel={showList}
      onOpen={openFlow}
      onAdd={setAddParent}
    />
  ) : (
    <FlowTreeList tree={tree} onOpen={openFlow} onAdd={setAddParent} />
  );

  // A flow's page has its own header: its title, and back to the
  // collaboration (to the level the flow is listed in). The collaboration's
  // header goes back to the community.
  const openFlowId = matchPath('/flow/:flowId', `/${splat}`)?.params.flowId;
  const openNode = openFlowId ? tree.byId.get(openFlowId) : undefined;
  const header = openFlowId ? (
    <PageHeader
      showBackButton
      backButtonText={`Back to ${kind.label}`}
      onBackClick={() => showList(openNode?.flow.parent ?? '')}
      title={openNode?.flow.title ?? (loaded ? 'Flow not found' : 'Loading…')}
      subtitle={openNode ? `${getFlow(openNode.flow.type)?.label ?? openNode.flow.type} · ${title}` : title}
      layout="two-row"
    />
  ) : (
    <PageHeader
      showBackButton={!!communityId}
      backButtonText="Back to Community"
      onBackClick={() => communityId && navigate(`/community/${communityId}/collaborations`)}
      title={title}
      subtitle={subtitle}
      layout="two-row"
    />
  );

  return (
    <>
    <div className={cs.container}>
      {header}

      <ContractGate
        key={collaborationId}
        contractId={collaborationId}
        what="this collaboration"
        join={() => joinCollaboration(collaborationId, hostServer, hostAgent)}
        onReady={loadFlows}
      >
        <div className={styles.body}>
          {error && <p className={styles.error}>{error}</p>}
          {unadded && (
            <div className={styles.unadded}>
              <span>&ldquo;{unadded.title}&rdquo; is created on your node. Approve adding it to the collaboration.</span>
              <button onClick={() => void handleAddUnadded()} disabled={isAdding} className="edit-button">
                {isAdding ? 'Approve on your node…' : 'Add it'}
              </button>
            </div>
          )}

          <Routes>
            <Route
              path="flow/:flowId"
              element={(
                <FlowPage
                  tree={tree}
                  loaded={loaded}
                  collaborationTitle={title}
                  isCreator={isCreator}
                  currentUser={publicKey ?? ''}
                  onList={showList}
                  onRemove={handleRemove}
                />
              )}
            />
            <Route path="*" element={loaded ? list : <p className={styles.loading}>Loading…</p>} />
          </Routes>
        </div>
      </ContractGate>
    </div>

    {addParent !== null && (
      <AddFlowDialog
        key={addParent}
        tree={tree}
        parent={addParent}
        onClose={() => setAddParent(null)}
        onPick={handlePick}
        onRestore={handleRestore}
      />
    )}

    {pendingNew && pendingDef && (() => {
      const setup = {
        onDone: (config: { title: string } & Record<string, unknown>) => {
          const { flowType, parent } = pendingNew;
          setPendingNew(null);
          addNewFlow(flowType, parent, config)
            .catch((err) => setError(err instanceof Error ? err.message : String(err)));
        },
        onCancel: () => setPendingNew(null),
      };
      const Setup = pendingDef.setupComponent;
      return Setup
        ? <Setup {...setup} />
        : <TitleSetupDialog heading={`New ${pendingDef.label}`} icon={pendingDef.icon} {...setup} />;
    })()}
    </>
  );
};

export default CollaborationPage;
