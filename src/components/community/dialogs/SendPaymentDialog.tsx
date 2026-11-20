import React, { useState } from 'react';
import { pay } from '../../../services/contracts/community';
import AccountPicker from '../AccountPicker';
import Modal from '../../Modal';
import form from '../../dialogForm.module.scss';

interface SendPaymentDialogProps {
  isVisible: boolean;
  communityId: string;
  fromAccountId: string; // the user's personal account: payments are from it
  fromAccountLabel: string;
  onClose: () => void;
}

const SendPaymentDialogForm: React.FC<Omit<SendPaymentDialogProps, 'isVisible'>> = ({
  communityId,
  fromAccountId,
  fromAccountLabel,
  onClose,
}) => {
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleClose = () => {
    onClose();
  };


  // Paying may open the node's approval page, so it must start from this click.
  const handleSend = async () => {
    setError(null);
    if (!toAccountId) {
      setError('Please choose who to pay');
      return;
    }
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Balances update on their own, through the page's contract_write listener.
    try {
      setIsSending(true);
      await pay(communityId, toAccountId, value);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send the payment.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      title="Send Payment"
      onClose={onClose}
      locked={isSending}
      actions={(
        <>
          <button onClick={handleClose} className={form.secondaryButton} disabled={isSending}>
            Cancel
          </button>
          <button onClick={handleSend} className={form.primaryButton} disabled={isSending}>
            {isSending ? 'Approve on your node…' : 'Send Payment'}
          </button>
        </>
      )}
    >
      <div className={form.field}>
        <label className={form.label}>From</label>
        <input type="text" className={form.input} value={fromAccountLabel} disabled readOnly />
      </div>

      <div className={form.field}>
        <label className={form.label}>To</label>
        <AccountPicker
          communityId={communityId}
          value={toAccountId}
          onChange={setToAccountId}
          excludeAccountIds={[fromAccountId]}
        />
      </div>

      <div className={form.field}>
        <label htmlFor="paymentAmount" className={form.label}>Amount *</label>
        <input
          id="paymentAmount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className={form.input}
          min="0"
          step="any"
        />
      </div>

      {error && <div className={form.error}>{error}</div>}
    </Modal>
  );
};

// The form mounts each time the dialog opens, so it always starts empty.
const SendPaymentDialog: React.FC<SendPaymentDialogProps> = ({ isVisible, ...props }) =>
  isVisible ? <SendPaymentDialogForm key={props.fromAccountId} {...props} /> : null;

export default SendPaymentDialog;
