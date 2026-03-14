import React from 'react';
import { X, Zap } from 'lucide-react';
import styles from './AddHelpDialog.module.scss';

interface CreateInitiativeConfirmDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  seedDescription: string;
  isSubmitting?: boolean;
}

const CreateInitiativeConfirmDialog: React.FC<CreateInitiativeConfirmDialogProps> = ({
  isVisible,
  onClose,
  onConfirm,
  seedDescription,
  isSubmitting = false,
}) => {
  if (!isVisible) return null;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    try {
      await onConfirm();
      onClose();
    } catch {
      // Parent handles error
    }
  };

  return (
    <div className={styles.overlay} onClick={() => !isSubmitting && onClose()}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Create Initiative</h3>
          <button type="button" onClick={onClose} className={styles.closeBtn} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.content}>
          <p className={styles.prompt}>
            You&apos;re about to create a new initiative from this idea. You will become the owner.
          </p>
          <div className={styles.previewBox}>
            {seedDescription}
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              <Zap size={18} />
              {isSubmitting ? 'Creating...' : 'Create Initiative'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateInitiativeConfirmDialog;
