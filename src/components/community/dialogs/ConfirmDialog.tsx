import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../../Modal';
import form from '../../dialogForm.module.scss';
import styles from './ConfirmDialog.module.scss';

interface ConfirmDialogProps {
  isVisible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isVisible,
  title,
  message,
  confirmLabel,
  onClose,
  onConfirm,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isVisible) return null;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      locked={isSubmitting}
      size="small"
      actions={(
        <>
          <button type="button" onClick={onClose} className={form.secondaryButton} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="button" onClick={() => void handleConfirm()} className={form.dangerButton} disabled={isSubmitting}>
            {isSubmitting ? 'Working...' : confirmLabel}
          </button>
        </>
      )}
    >
      <div className={styles.prompt}>
        <AlertTriangle size={20} className={styles.icon} />
        <p>{message}</p>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
