import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { sendPayment } from '../../../services/contracts/community';
import AccountPicker from '../AccountPicker';
import styles from './CreatePolicyDialog.module.scss';

interface SendPaymentDialogProps {
  isVisible: boolean;
  communityId: string;
  fromAccountId: string;
  fromAccountLabel: string;
  onClose: () => void;
}

const SendPaymentDialog: React.FC<SendPaymentDialogProps> = ({
  isVisible,
  communityId,
  fromAccountId,
  fromAccountLabel,
  onClose,
}) => {
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      setToAccountId('');
      setAmount('');
      setError(null);
    }
  }, [isVisible, fromAccountId]);

  const handleClose = () => {
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleSend = () => {
    setError(null);
    if (!serverUrl || !publicKey) return;
    if (!toAccountId) {
      setError('Please choose who to pay');
      return;
    }
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Close right away - the payment continues in the background. Balances
    // and any pending-approval state update on their own via the
    // contract_write SSE listener once the server confirms it; we don't
    // wait for or display the write's result here.
    onClose();

    void (async () => {
      try {
        await sendPayment(serverUrl, publicKey, communityId, fromAccountId, toAccountId, value);
      } catch (err) {
        console.error('Failed to send payment:', err);
      }
    })();
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3 className={styles.title}>Send Payment</h3>
          <button className={styles.closeButton} onClick={handleClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.formGroup}>
            <label className={styles.label}>From</label>
            <input type="text" className={styles.inputField} value={fromAccountLabel} disabled readOnly />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>To</label>
            <AccountPicker
              communityId={communityId}
              value={toAccountId}
              onChange={setToAccountId}
              excludeAccountIds={[fromAccountId]}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="paymentAmount" className={styles.label}>Amount *</label>
            <input
              id="paymentAmount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className={styles.inputField}
              min="0"
              step="any"
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>

        <div className={styles.actions}>
          <button onClick={handleSend} className={styles.createButton}>
            Send Payment
          </button>
          <button onClick={handleClose} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendPaymentDialog;
