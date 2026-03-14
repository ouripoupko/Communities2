import React from 'react';
import { X } from 'lucide-react';
import styles from './AddHelpDialog.module.scss';

interface AiHelpSearchDialogProps {
  isVisible: boolean;
  onClose: () => void;
}

const AiHelpSearchDialog: React.FC<AiHelpSearchDialogProps> = ({
  isVisible,
  onClose,
}) => {
  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Search for Helpers</h3>
          <button type="button" onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.content}>
          <p className={styles.prompt}>
            Community members haven&apos;t published their skills yet. This feature is coming soon!
          </p>
        </div>
      </div>
    </div>
  );
};

export default AiHelpSearchDialog;
