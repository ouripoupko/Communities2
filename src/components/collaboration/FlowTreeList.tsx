import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { getFlow } from './flows/registry';
import type { FlowNode, FlowTree } from './flowTree';
import styles from './FlowList.module.scss';

interface FlowTreeListProps {
  tree: FlowTree;
  onOpen: (flowId: string) => void;
  /** Adds a flow under parent ('' for the top level). */
  onAdd: (parent: string) => void;
}

/** The whole tree, for wide screens: rows fold and unfold, and each has a "+" to add a child. */
const FlowTreeList: React.FC<FlowTreeListProps> = ({ tree, onOpen, onAdd }) => {
  const [folded, setFolded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => setFolded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const renderNode = (node: FlowNode, depth: number) => {
    const { flow } = node;
    const def = getFlow(flow.type);
    const Icon = def?.icon;
    const isFolded = folded.has(flow.id);
    return (
      <li key={flow.id}>
        <div className={styles.row} style={{ paddingLeft: `${depth * 24 + 8}px` }}>
          {node.children.length > 0 ? (
            <button className={styles.fold} onClick={() => toggle(flow.id)}
              aria-label={isFolded ? `Unfold ${flow.title}` : `Fold ${flow.title}`} aria-expanded={!isFolded}>
              {isFolded ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          ) : (
            <span className={styles.foldSpacer} />
          )}
          <button className={styles.rowMain} onClick={() => onOpen(flow.id)}>
            {Icon && <Icon size={18} />}
            <span className={styles.rowTitle}>{flow.title}</span>
            <span className={styles.typeLabel}>{def?.label ?? flow.type}</span>
          </button>
          <button className={styles.rowAdd} onClick={() => onAdd(flow.id)}
            title={`Add a flow under ${flow.title}`} aria-label={`Add a flow under ${flow.title}`}>
            <Plus size={16} />
          </button>
        </div>
        {node.children.length > 0 && !isFolded && (
          <ul className={styles.children}>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <div className={styles.treeHeader}>
        <button className={styles.addRootButton} onClick={() => onAdd('')}>
          <Plus size={16} /> Add flow
        </button>
      </div>
      {tree.roots.length === 0 ? (
        <div className={styles.empty}>No flows yet. Click <strong>Add flow</strong> to add the first one.</div>
      ) : (
        <ul className={styles.tree}>{tree.roots.map((node) => renderNode(node, 0))}</ul>
      )}
    </>
  );
};

export default FlowTreeList;
