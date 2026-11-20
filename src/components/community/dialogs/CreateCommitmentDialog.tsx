import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { personalAccountId } from '../../../services/contracts/community';
import type { PolicyMode } from '../../../services/contracts/community';
import AccountPicker from '../AccountPicker';
import Modal from '../../Modal';
import form from '../../dialogForm.module.scss';

export interface CreateCommitmentFormData {
  fromAccountId: string;
  toAccountId: string;
  mode: PolicyMode;
  rate: number;
  name: string;
}

interface CreateCommitmentDialogProps {
  isVisible: boolean;
  communityId: string;
  onClose: () => void;
  onSubmit: (data: CreateCommitmentFormData) => void | Promise<void>;
}

const CreateCommitmentDialogForm: React.FC<Omit<CreateCommitmentDialogProps, 'isVisible'>> = ({
  communityId,
  onClose,
  onSubmit,
}) => {
  const { publicKey } = useAppSelector((state) => state.user);
  // A commitment pays from the user's own account.
  const fromAccountId = publicKey ? personalAccountId(publicKey) : '';
  const [toAccountId, setToAccountId] = useState('');
  const [mode, setMode] = useState<PolicyMode>('units');
  const [rate, setRate] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };


  const validateAndSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    if (!toAccountId) {
      setError('Please choose a destination account');
      return;
    }
    const rateValue = parseFloat(rate);
    if (isNaN(rateValue) || rateValue < 0) {
      setError('Please enter a valid rate');
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.resolve(
        onSubmit({ fromAccountId, toAccountId, mode, rate: rateValue, name: name.trim() }),
      );
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="Create Commitment"
      onClose={onClose}
      locked={isSubmitting}
      actions={(
        <>
          <button onClick={handleClose} className={form.secondaryButton} disabled={isSubmitting}>
            Cancel
          </button>
          <button onClick={() => void validateAndSubmit()} className={form.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Commitment'}
          </button>
        </>
      )}
    >
      <div className={form.field}>
        <label className={form.label}>From</label>
        <input type="text" className={form.input} value="My personal account" disabled readOnly />
      </div>

      <div className={form.field}>
        <label className={form.label}>To</label>
        <AccountPicker
          communityId={communityId}
          value={toAccountId}
          onChange={setToAccountId}
          excludeAccountIds={fromAccountId ? [fromAccountId] : []}
          disabled={isSubmitting}
        />
      </div>

      <div className={form.field}>
        <label className={form.label}>Mode</label>
        <div className={form.radioGroup}>
          <label className={form.radioOption}>
            <input
              type="radio"
              name="commitmentMode"
              value="units"
              checked={mode === 'units'}
              onChange={() => setMode('units')}
              disabled={isSubmitting}
            />
            Units per day (fixed amount)
          </label>
          <label className={form.radioOption}>
            <input
              type="radio"
              name="commitmentMode"
              value="percent"
              checked={mode === 'percent'}
              onChange={() => setMode('percent')}
              disabled={isSubmitting}
            />
            Percent per day (share of your balance)
          </label>
        </div>
      </div>

      <div className={form.field}>
        <label htmlFor="commitmentRate" className={form.label}>Rate *</label>
        <input
          id="commitmentRate"
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder={mode === 'percent' ? 'e.g. 5 (%)' : 'e.g. 10'}
          className={form.input}
          disabled={isSubmitting}
          step="any"
        />
      </div>

      <div className={form.field}>
        <label htmlFor="commitmentName" className={form.label}>Name *</label>
        <input
          id="commitmentName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What should this commitment be called?"
          className={form.input}
          disabled={isSubmitting}
        />
      </div>

      {error && <div className={form.error}>{error}</div>}
    </Modal>
  );
};

// The form mounts each time the dialog opens, so it always starts empty.
const CreateCommitmentDialog: React.FC<CreateCommitmentDialogProps> = ({ isVisible, ...props }) =>
  isVisible ? <CreateCommitmentDialogForm {...props} /> : null;

export default CreateCommitmentDialog;
