import React, { useEffect, useState } from 'react';
import AccountPicker from '../AccountPicker';
import type { IPolicySide, PolicyMode } from '../../../services/contracts/community';
import styles from './CreatePolicyDialog.module.scss';

export interface CreatePolicyFormData {
  source: IPolicySide;
  destinationKind: 'void' | 'account' | 'everyPersonal' | 'everyAccount';
  destinationAccountId?: string;
  newAccountName?: string;
  mode: PolicyMode;
  name: string;
  description: string;
}

type SourceKind = 'void' | 'account' | 'everyPersonal' | 'everyAccount';
type DestinationKind = 'void' | 'account' | 'newAccount' | 'everyPersonal' | 'everyAccount';

interface CreatePolicyDialogProps {
  isVisible: boolean;
  communityId: string;
  onClose: () => void;
  onSubmit: (data: CreatePolicyFormData) => void | Promise<void>;
}

const CreatePolicyDialog: React.FC<CreatePolicyDialogProps> = ({ isVisible, communityId, onClose, onSubmit }) => {
  const [sourceKind, setSourceKind] = useState<SourceKind>('void');
  const [sourceAccount, setSourceAccount] = useState('');
  const [mode, setMode] = useState<PolicyMode>('units');
  const [destinationKind, setDestinationKind] = useState<DestinationKind>('everyPersonal');
  const [destinationAccount, setDestinationAccount] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      setSourceKind('void');
      setSourceAccount('');
      setMode('units');
      setDestinationKind('everyPersonal');
      setDestinationAccount('');
      setNewAccountName('');
      setName('');
      setDescription('');
      setError(null);
    }
  }, [isVisible]);

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
    if (sourceKind === 'account' && !sourceAccount) {
      setError('Please choose a source account');
      return;
    }
    if (destinationKind === 'account' && !destinationAccount) {
      setError('Please choose a destination account');
      return;
    }
    if (destinationKind === 'newAccount' && !newAccountName.trim()) {
      setError('Please name the new account');
      return;
    }

    const data: CreatePolicyFormData = {
      source: sourceKind === 'account' ? { kind: 'account', account: sourceAccount } : { kind: sourceKind },
      destinationKind: destinationKind === 'newAccount' ? 'account' : destinationKind,
      destinationAccountId: destinationKind === 'account' ? destinationAccount : undefined,
      newAccountName: destinationKind === 'newAccount' ? newAccountName.trim() : undefined,
      mode,
      name: name.trim(),
      description: description.trim(),
    };

    setIsSubmitting(true);
    try {
      await Promise.resolve(onSubmit(data));
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
          <h3 className={styles.title}>Create Policy</h3>
          <button className={styles.closeButton} onClick={handleClose}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Source</label>
            <select
              className={styles.inputField}
              value={sourceKind}
              onChange={(e) => setSourceKind(e.target.value as SourceKind)}
              disabled={isSubmitting}
            >
              <option value="void">Mint (create new currency)</option>
              <option value="account">A specific account</option>
              <option value="everyPersonal">Every member's personal account</option>
              <option value="everyAccount">Every account in the community</option>
            </select>
            {sourceKind === 'account' && (
              <div className={styles.pickerWrap}>
                <AccountPicker communityId={communityId} value={sourceAccount} onChange={setSourceAccount} disabled={isSubmitting} />
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Mode</label>
            <select
              className={styles.inputField}
              value={mode}
              onChange={(e) => setMode(e.target.value as PolicyMode)}
              disabled={isSubmitting}
            >
              <option value="units">Units per tick (fixed amount)</option>
              <option value="percent">Percent per tick (share of source balance)</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Destination</label>
            <select
              className={styles.inputField}
              value={destinationKind}
              onChange={(e) => setDestinationKind(e.target.value as DestinationKind)}
              disabled={isSubmitting}
            >
              <option value="void">Burn (destroy currency)</option>
              <option value="newAccount">Create a new named account</option>
              <option value="account">A specific account</option>
              <option value="everyPersonal">Every member's personal account</option>
              <option value="everyAccount">Every account in the community</option>
            </select>
            {destinationKind === 'account' && (
              <div className={styles.pickerWrap}>
                <AccountPicker communityId={communityId} value={destinationAccount} onChange={setDestinationAccount} disabled={isSubmitting} />
              </div>
            )}
            {destinationKind === 'newAccount' && (
              <input
                type="text"
                className={`${styles.inputField} ${styles.pickerWrap}`}
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="New account name"
                disabled={isSubmitting}
              />
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="policyName" className={styles.label}>Name *</label>
            <input
              id="policyName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should this policy be called?"
              className={styles.inputField}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="policyDescription" className={styles.label}>Description</label>
            <textarea
              id="policyDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this policy is for..."
              className={`${styles.inputField} ${styles.textarea}`}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>

        <div className={styles.actions}>
          <button onClick={() => void validateAndSubmit()} className={styles.createButton} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Policy'}
          </button>
          <button onClick={handleClose} className={styles.cancelButton} disabled={isSubmitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePolicyDialog;
