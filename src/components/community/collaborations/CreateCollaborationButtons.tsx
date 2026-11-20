import React from 'react';
import { COLLABORATION_KINDS, type CollaborationKind } from '../../collaboration/kinds';
import styles from '../Collaborations.module.scss';

interface CreateCollaborationButtonsProps {
  onOpenCreate: (kind: CollaborationKind) => void;
}

const CreateCollaborationButtons: React.FC<CreateCollaborationButtonsProps> = ({ onOpenCreate }) => (
  <div className={styles.gates}>
    {COLLABORATION_KINDS.map((kind) => (
      <button key={kind.type} className={`${styles.gateButton} ${styles[kind.type]}`} onClick={() => onOpenCreate(kind)}>
        <kind.icon size={20} />
        {kind.createLabel}
      </button>
    ))}
  </div>
);

export default CreateCollaborationButtons;
