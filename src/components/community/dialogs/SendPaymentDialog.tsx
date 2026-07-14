import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { sendPayment, type IPayment } from '../../../services/contracts/community';
import AccountPicker from '../AccountPicker';
import styles from './CreatePolicyDialog.module.scss';
import paymentStyles from './SendPaymentDialog.module.scss';

interface SendPaymentDialogProps {
  isVisible: boolean;
  communityId: string;
  fromAccountId: string;
  fromAccountLabel: string;
  onClose: () => void;
  onSent: () => void;
}

const SendPaymentDialog: React.FC<SendPaymentDialogProps> = ({
  isVisible,
  communityId,
  fromAccountId,
  fromAccountLabel,
  onClose,
  onSent,
}) => {
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IPayment | null>(null);

  useEffect(() => {
    if (isVisible) {
      setToAccountId('');
      setAmount('');
      setError(null);
      setResult(null);
    }
  }, [isVisible, fromAccountId]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  const handleSend = async () => {
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

    setIsSubmitting(true);
    try {
      const payment = await sendPayment(serverUrl, publicKey, communityId, fromAccountId, toAccountId, value);
      setResult(payment);
      if (payment.status !== 'failed') {
        onSent();
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
          {result ? (
            <div>
              {result.status === 'completed' && (
                <div className={paymentStyles.success}>Payment completed.</div>
              )}
              {result.status === 'pending' && (
                <div className={paymentStyles.pending}>
                  Awaiting approval — {result.approvals?.length ?? 1} of {result.threshold ?? 1} signers have
                  approved so far. The payment will complete once enough signers approve.
                </div>
              )}
              {result.status === 'failed' && (
                <div className={styles.errorMessage}>
                  Payment failed{result.reason ? `: ${result.reason}` : '.'}
                </div>
              )}
            </div>
          ) : (
            <>
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  min="0"
                  step="any"
                />
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}
            </>
          )}
        </div>

        <div className={styles.actions}>
          {result ? (
            <button onClick={handleClose} className={styles.createButton}>
              Close
            </button>
          ) : (
            <>
              <button onClick={() => void handleSend()} className={styles.createButton} disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Payment'}
              </button>
              <button onClick={handleClose} className={styles.cancelButton} disabled={isSubmitting}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SendPaymentDialog;
