import React, { useEffect, useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import { getAccountDetails } from '../../../services/contracts/community';
import type { PolicyMode } from '../../../services/contracts/community';
import AccountPicker from '../AccountPicker';
import styles from './CreatePolicyDialog.module.scss';

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

const CreateCommitmentDialog: React.FC<CreateCommitmentDialogProps> = ({
  isVisible,
  communityId,
  onClose,
  onSubmit,
}) => {
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const [myPublicAccounts, setMyPublicAccounts] = useState<{ id: string; name: string }[]>([]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [mode, setMode] = useState<PolicyMode>('units');
  const [rate, setRate] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isVisible || !publicKey || !serverUrl || !communityId) return;
    setFromAccountId(publicKey);
    setToAccountId('');
    setMode('units');
    setRate('');
    setName('');
    setError(null);
    void getAccountDetails(serverUrl, publicKey, communityId).then((details) => {
      const mine = Object.entries(details)
        .filter(([, info]) => info.type === 'public' && (info.signers ?? []).includes(publicKey))
        .map(([id, info]) => ({ id, name: info.name || id }));
      setMyPublicAccounts(mine);
    });
  }, [isVisible, publicKey, serverUrl, communityId]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
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
    if (isNaN(rateValue)) {
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
          <h3 className={styles.title}>Create Commitment</h3>
          <button className={styles.closeButton} onClick={handleClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.formGroup}>
            <label className={styles.label}>From</label>
            <select
              className={styles.inputField}
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              disabled={isSubmitting}
            >
              {publicKey && <option value={publicKey}>My personal account</option>}
              {myPublicAccounts.map((acct) => (
                <option key={acct.id} value={acct.id}>{acct.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>To</label>
            <AccountPicker
              communityId={communityId}
              value={toAccountId}
              onChange={setToAccountId}
              excludeAccountIds={fromAccountId ? [fromAccountId] : []}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Mode</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="commitmentMode"
                  value="units"
                  checked={mode === 'units'}
                  onChange={() => setMode('units')}
                  disabled={isSubmitting}
                />
                Units per tick (fixed amount)
              </label>
              <label className={styles.radioOption}>
                <input
                  type="radio"
                  name="commitmentMode"
                  value="percent"
                  checked={mode === 'percent'}
                  onChange={() => setMode('percent')}
                  disabled={isSubmitting}
                />
                Percent per tick (share of source balance)
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="commitmentRate" className={styles.label}>Rate *</label>
            <input
              id="commitmentRate"
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder={mode === 'percent' ? 'e.g. 5 (%)' : 'e.g. 10'}
              className={styles.inputField}
              disabled={isSubmitting}
              step="any"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="commitmentName" className={styles.label}>Name *</label>
            <input
              id="commitmentName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should this commitment be called?"
              className={styles.inputField}
              disabled={isSubmitting}
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>

        <div className={styles.actions}>
          <button onClick={() => void validateAndSubmit()} className={styles.createButton} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Commitment'}
          </button>
          <button onClick={handleClose} className={styles.cancelButton} disabled={isSubmitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCommitmentDialog;
