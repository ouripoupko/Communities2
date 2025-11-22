import React from 'react';
import styles from './MessageDialog.module.scss';

interface MessageDialogProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  buttonText?: string;
}

const MessageDialog: React.FC<MessageDialogProps> = ({
  isOpen,
  message,
  onClose,
  buttonText = 'OK'
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <div className={styles.content}>
          <div className={styles.messageSection}>
            <p className={styles.message}>{message}</p>
          </div>
          
          <div className={styles.actions}>
            <button 
              className={styles.okButton}
              onClick={onClose}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageDialog;

