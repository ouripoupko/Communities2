import React, { useState } from 'react';
import { FLOW_GROUPS, FLOW_REGISTRY, getFlow } from './flows/registry';
import { countUnder, type FlowTree } from './flowTree';
import Modal from '../Modal';
import form from '../dialogForm.module.scss';
import styles from './AddFlowDialog.module.scss';

interface AddFlowDialogProps {
  tree: FlowTree;
  /** Where the flow goes: under this flow, or '' for the top level. */
  parent: string;
  onClose: () => void;
  /** A new flow of this type: its setup form takes it from here. */
  onPick: (flowType: string) => void;
  /** A branch from the bin, put back here. */
  onRestore: (flowId: string) => Promise<void>;
}

/**
 * Adds a flow at a place in the tree: a new one, of the type the user
 * clicks (its setup form then asks for its title and the rest), or one from
 * the bin. Shown while open, keyed by the place, so each opening starts afresh.
 */
const AddFlowDialog: React.FC<AddFlowDialogProps> = ({ tree, parent, onClose, onPick, onRestore }) => {
  const [mode, setMode] = useState<'new' | 'bin'>('new');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentTitle = parent ? tree.byId.get(parent)?.flow.title : undefined;
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const groups = [...FLOW_GROUPS, undefined];
  return (
    <Modal
      title="Add a flow"
      onClose={onClose}
      locked={busy}
      actions={<button className={form.secondaryButton} onClick={onClose} disabled={busy}>Cancel</button>}
    >
      <p className={styles.place}>{parentTitle ? <>Under <strong>{parentTitle}</strong></> : 'At the top level'}</p>

      {tree.bin.length > 0 && (
        <div className={styles.modes} role="tablist">
          <button role="tab" aria-selected={mode === 'new'} className={mode === 'new' ? styles.activeMode : ''}
            onClick={() => setMode('new')}>New flow</button>
          <button role="tab" aria-selected={mode === 'bin'} className={mode === 'bin' ? styles.activeMode : ''}
            onClick={() => setMode('bin')}>From the bin ({tree.bin.length})</button>
        </div>
      )}

      {mode === 'new' ? (
        <>
          {groups.map((group) => {
            const flows = FLOW_REGISTRY.filter((f) => f.group === group);
            if (flows.length === 0) return null;
            return (
              <div key={group ?? 'other'} className={styles.group}>
                {group && <p className={styles.place}>{group}</p>}
                <div className={styles.types}>
                  {flows.map((flow) => (
                    <button key={flow.id} type="button" disabled={!flow.source}
                      className={styles.type}
                      onClick={() => onPick(flow.id)}
                      title={!flow.source ? 'Not on the new node yet' : undefined}>
                      <flow.icon size={16} /> {flow.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      ) : (
        <ul className={styles.binList}>
          {tree.bin.map((node) => {
            const def = getFlow(node.flow.type);
            const under = countUnder(node);
            return (
              <li key={node.flow.id} className={styles.binItem}>
                {def && <def.icon size={18} />}
                <span className={styles.binText}>
                  <span>{node.flow.title}</span>
                  <span className={styles.binMeta}>
                    {def?.label ?? node.flow.type}{under > 0 ? ` · ${under} under it` : ''}
                  </span>
                </span>
                <button className={styles.restoreButton} disabled={busy}
                  onClick={() => void run(() => onRestore(node.flow.id))}>
                  Put it here
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && <div className={form.error}>{error}</div>}
    </Modal>
  );
};

export default AddFlowDialog;
