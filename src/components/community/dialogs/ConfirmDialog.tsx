import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
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
    <div className={styles.overlay} onClick={() => !isSubmitting && onClose()}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button type="button" onClick={onClose} className={styles.closeButton} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.prompt}>
            <AlertTriangle size={20} className={styles.icon} />
            <p>{message}</p>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={onClose} className={styles.cancelButton} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="button" onClick={() => void handleConfirm()} className={styles.confirmButton} disabled={isSubmitting}>
              {isSubmitting ? 'Working...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
