import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, Trash2 } from 'lucide-react';
import { getFlow } from '../../components/collaboration/flows/registry';
import { ancestorsOf, countUnder, type FlowTree } from '../../components/collaboration/flowTree';
import ContractGate from '../../components/collaboration/ContractGate';
import ConfirmDialog from '../../components/community/dialogs/ConfirmDialog';
import { joinFlow } from '../../services/contracts/flows';
import styles from './FlowPage.module.scss';

interface FlowPageProps {
  tree: FlowTree;
  loaded: boolean;
  collaborationTitle: string;
  /** May the user move any flow to the bin (the collaboration's creator)? */
  isCreator: boolean;
  currentUser: string;
  /** Shows the list, at a level of the tree ('' for the top). */
  onList: (level: string) => void;
  onRemove: (flowId: string) => Promise<void>;
}

/**
 * One flow of a collaboration: where it is in the tree, and the flow itself.
 * Its title and kind are in the page's header (CollaborationPage's, on a flow).
 */
const FlowPage: React.FC<FlowPageProps> = ({
  tree, loaded, collaborationTitle, isCreator, currentUser, onList, onRemove,
}) => {
  const { flowId = '' } = useParams<{ flowId: string }>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const node = tree.byId.get(flowId);
  if (!node) {
    return <div className={styles.notice}>{loaded ? 'This flow is not in the collaboration.' : 'Loading…'}</div>;
  }
  const { flow } = node;
  const ancestors = ancestorsOf(tree, flowId);
  const inBin = flow.binned || ancestors.some((a) => a.binned);
  const def = getFlow(flow.type);
  const Component = def?.component;
  const canRemove = !inBin && (isCreator || flow.agent.toLowerCase() === currentUser.toLowerCase());
  const under = countUnder(node);

  // Removing may open the node's approval page: it starts from the dialog's button.
  const handleRemove = async () => {
    setError(null);
    try {
      await onRemove(flowId);
      onList(flow.parent);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err; // keep the dialog open
    }
  };

  return (
    <>
      <nav className={styles.breadcrumb} aria-label="Where this flow is">
        <button onClick={() => onList('')}>{collaborationTitle}</button>
        {ancestors.map((a) => (
          <React.Fragment key={a.id}>
            <ChevronRight size={14} />
            <button onClick={() => onList(a.id)}>{a.title}</button>
          </React.Fragment>
        ))}
      </nav>

      {canRemove && (
        <div className={styles.header}>
          <button className={styles.binButton} onClick={() => setConfirmOpen(true)}>
            <Trash2 size={14} /> Move to bin
          </button>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {inBin ? (
        <div className={styles.notice}>This flow is in the bin. Add a flow anywhere to put it back.</div>
      ) : Component && def ? (
        <ContractGate
          key={flowId}
          contractId={flowId}
          what="this flow"
          join={def.source ? () => joinFlow(flow, def.source!) : undefined}
        >
          <Component
            instanceId={flowId}
            flowAgent={flow.agent}
            currentUser={currentUser}
          />
        </ContractGate>
      ) : (
        <div className={styles.notice}>This kind of flow is not available.</div>
      )}

      <ConfirmDialog
        isVisible={confirmOpen}
        title="Move to bin"
        message={under > 0
          ? `Move "${flow.title}" and the ${under === 1 ? 'flow' : `${under} flows`} under it to the bin? You can put them back from the bin when adding a flow.`
          : `Move "${flow.title}" to the bin? You can put it back from the bin when adding a flow.`}
        confirmLabel="Move to bin"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleRemove}
      />
    </>
  );
};

export default FlowPage;
