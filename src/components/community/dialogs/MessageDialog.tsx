import React from 'react';
import Modal from '../../Modal';
import form from '../../dialogForm.module.scss';
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

  return (
    <Modal
      onClose={onClose}
      size="small"
      actions={<button className={form.primaryButton} onClick={onClose}>{buttonText}</button>}
    >
      <p className={styles.message}>{message}</p>
    </Modal>
  );
};

export default MessageDialog;

