import React from 'react';
import { Zap, Heart, Shield } from 'lucide-react';
import type { CollaborationType } from '../dialogs/CreateFlowDialog';
import styles from '../Collaborations.module.scss';

interface CreateCollaborationButtonsProps {
  onOpenCreate: (type: CollaborationType) => void;
}

const CreateCollaborationButtons: React.FC<CreateCollaborationButtonsProps> = ({ onOpenCreate }) => (
  <div className={styles.gates}>
    <button className={`${styles.gateButton} ${styles.initiative}`} onClick={() => onOpenCreate('initiative')}>
      <Zap size={20} />
      Start Initiative
    </button>
    <button className={`${styles.gateButton} ${styles.wish}`} onClick={() => onOpenCreate('wish')}>
      <Heart size={20} />
      Make a Wish
    </button>
    <button className={`${styles.gateButton} ${styles.agreement}`} onClick={() => onOpenCreate('agreement')}>
      <Shield size={20} />
      Propose Agreement
    </button>
  </div>
);

export default CreateCollaborationButtons;
