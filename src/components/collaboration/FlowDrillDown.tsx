import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { getFlow } from './flows/registry';
import { ancestorsOf, type FlowTree } from './flowTree';
import styles from './FlowList.module.scss';

interface FlowDrillDownProps {
  tree: FlowTree;
  collaborationTitle: string;
  /** The flow whose children are shown, or '' for the top level. */
  level: string;
  onLevel: (flowId: string) => void;
  onOpen: (flowId: string) => void;
  /** Adds a flow under parent ('' for the top level). */
  onAdd: (parent: string) => void;
}

/**
 * The tree for small screens, one level at a time: a row opens its flow,
 * its chevron shows its children, and the breadcrumb leads back up. The
 * floating button adds a flow at the level shown.
 */
const FlowDrillDown: React.FC<FlowDrillDownProps> = ({ tree, collaborationTitle, level, onLevel, onOpen, onAdd }) => {
  const current = level ? tree.byId.get(level) : undefined;
  // A level that left the tree (removed meanwhile) shows the top level.
  const shown = current && !current.flow.binned ? current : undefined;
  const nodes = shown ? shown.children : tree.roots;
  const ancestors = shown ? ancestorsOf(tree, shown.flow.id) : [];
  const currentDef = shown ? getFlow(shown.flow.type) : undefined;
  const CurrentIcon = currentDef?.icon;

  return (
    <div className={styles.drill}>
      {shown && (
        <nav className={styles.breadcrumb} aria-label="Where you are">
          <button onClick={() => onLevel('')}>{collaborationTitle}</button>
          {ancestors.map((flow) => (
            <React.Fragment key={flow.id}>
              <ChevronRight size={14} />
              <button onClick={() => onLevel(flow.id)}>{flow.title}</button>
            </React.Fragment>
          ))}
          <ChevronRight size={14} />
          <span className={styles.current}>{shown.flow.title}</span>
        </nav>
      )}

      {shown && (
        <button className={styles.levelFlow} onClick={() => onOpen(shown.flow.id)}>
          {CurrentIcon && <CurrentIcon size={20} />}
          <span className={styles.itemText}>
            <span>{shown.flow.title}</span>
            <span className={styles.typeLabel}>{currentDef?.label ?? shown.flow.type}</span>
          </span>
          <span className={styles.openLabel}>Open</span>
        </button>
      )}

      {nodes.length === 0 ? (
        <div className={styles.empty}>
          {shown ? 'Nothing under this flow yet.' : 'No flows yet.'} Tap <strong>+</strong> to add one.
        </div>
      ) : (
        <ul className={styles.list}>
          {nodes.map((node) => {
            const def = getFlow(node.flow.type);
            const Icon = def?.icon;
            return (
              <li key={node.flow.id} className={styles.item}>
                <button className={styles.itemMain} onClick={() => onOpen(node.flow.id)}>
                  {Icon && <Icon size={20} />}
                  <span className={styles.itemText}>
                    <span>{node.flow.title}</span>
                    <span className={styles.typeLabel}>{def?.label ?? node.flow.type}</span>
                  </span>
                </button>
                <button className={styles.itemEnter} onClick={() => onLevel(node.flow.id)}
                  aria-label={`What is under ${node.flow.title}`}>
                  {node.children.length > 0 && node.children.length}
                  <ChevronRight size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button className={styles.fab} onClick={() => onAdd(level && shown ? level : '')}
        aria-label={shown ? `Add a flow under ${shown.flow.title}` : 'Add a flow'}>
        <Plus size={24} />
      </button>
    </div>
  );
};

export default FlowDrillDown;
