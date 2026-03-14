import React, { useState, useEffect } from 'react';
import { X, Coins } from 'lucide-react';
import styles from './CompensateDialog.module.scss';

interface CompensateDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (amount: number) => void | Promise<void>;
  helperDisplayName: string;
  balance: number | null;
  isLoadingBalance?: boolean;
  onFetchBalance: () => void;
  isSubmitting?: boolean;
}

const CompensateDialog: React.FC<CompensateDialogProps> = ({
  isVisible,
  onClose,
  onSubmit,
  helperDisplayName,
  balance,
  isLoadingBalance = false,
  onFetchBalance,
  isSubmitting = false,
}) => {
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (isVisible) {
      onFetchBalance();
      setAmount('');
    }
  }, [isVisible, onFetchBalance]);

  if (!isVisible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || (balance !== null && num > balance) || isSubmitting) return;
    await onSubmit(num);
    setAmount('');
    onClose();
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setAmount('');
      onClose();
    }
  };

  const numAmount = parseFloat(amount);
  const isValid = !isNaN(numAmount) && numAmount > 0;
  const isOverBalance = balance !== null && isValid && numAmount > balance;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Compensate Helper</h3>
          <button type="button" onClick={handleClose} className={styles.closeBtn} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>
        <form className={styles.content} onSubmit={handleSubmit}>
          <p className={styles.helperLabel}>Pay {helperDisplayName} with community currency</p>
          <div className={styles.balanceCard}>
            <Coins size={20} />
            <span>Your balance:</span>
            <strong>
              {isLoadingBalance ? '...' : balance !== null ? `${balance} credits` : '—'}
            </strong>
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="compensate-amount">Amount (credits)</label>
            <input
              id="compensate-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="0"
              step="0.01"
              disabled={isSubmitting}
            />
            {isOverBalance && (
              <p className={styles.error}>Insufficient balance</p>
            )}
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={handleClose} className={styles.cancelBtn} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!isValid || isOverBalance || isSubmitting}
            >
              <Coins size={18} />
              {isSubmitting ? 'Paying...' : 'Pay'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompensateDialog;
