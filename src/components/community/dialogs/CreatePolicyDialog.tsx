import React, { useState } from 'react';
import AccountPicker from '../AccountPicker';
import type { IPolicySide, PolicyMode } from '../../../services/contracts/community';
import Modal from '../../Modal';
import form from '../../dialogForm.module.scss';
import styles from './CreatePolicyDialog.module.scss';

export interface CreatePolicyFormData {
  source: IPolicySide;
  destinationKind: 'void' | 'account' | 'everyPersonal' | 'everyAccount';
  destinationAccountId?: string;
  mode: PolicyMode;
  name: string;
  description: string;
}

type SourceKind = 'void' | 'account' | 'everyPersonal' | 'everyAccount';
type DestinationKind = 'void' | 'account' | 'everyPersonal' | 'everyAccount';

interface CreatePolicyDialogProps {
  isVisible: boolean;
  communityId: string;
  onClose: () => void;
  onSubmit: (data: CreatePolicyFormData) => void | Promise<void>;
}

const CreatePolicyDialogForm: React.FC<Omit<CreatePolicyDialogProps, 'isVisible'>> = ({ communityId, onClose, onSubmit }) => {
  const [sourceKind, setSourceKind] = useState<SourceKind>('void');
  const [sourceAccount, setSourceAccount] = useState('');
  const [mode, setMode] = useState<PolicyMode>('units');
  const [destinationKind, setDestinationKind] = useState<DestinationKind>('everyPersonal');
  const [destinationAccount, setDestinationAccount] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
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
    if (sourceKind === 'account' && !sourceAccount) {
      setError('Please choose a source account');
      return;
    }
    if (destinationKind === 'account' && !destinationAccount) {
      setError('Please choose a destination account');
      return;
    }
    if (sourceKind === 'void' && destinationKind === 'void') {
      setError('A policy cannot both mint and burn');
      return;
    }

    const data: CreatePolicyFormData = {
      source: sourceKind === 'account' ? { kind: 'account', account: sourceAccount } : { kind: sourceKind },
      destinationKind,
      destinationAccountId: destinationKind === 'account' ? destinationAccount : undefined,
      mode: sourceKind === 'void' ? 'units' : mode, // minting is in units
      name: name.trim(),
      description: description.trim(),
    };

    setIsSubmitting(true);
    try {
      await Promise.resolve(onSubmit(data));
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="Create Policy"
      onClose={onClose}
      locked={isSubmitting}
      actions={(
        <>
          <button onClick={handleClose} className={form.secondaryButton} disabled={isSubmitting}>
            Cancel
          </button>
          <button onClick={() => void validateAndSubmit()} className={form.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Policy'}
          </button>
        </>
      )}
    >
      <div className={form.field}>
        <label className={form.label}>Source</label>
        <select
          className={form.input}
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

      <div className={form.field}>
        <label className={form.label}>Mode</label>
        <div className={form.radioGroup}>
          <label className={form.radioOption}>
            <input
              type="radio"
              name="policyMode"
              value="units"
              checked={mode === 'units' || sourceKind === 'void'}
              onChange={() => setMode('units')}
              disabled={isSubmitting}
            />
            Units per day (fixed amount)
          </label>
          <label className={form.radioOption}>
            <input
              type="radio"
              name="policyMode"
              value="percent"
              checked={mode === 'percent' && sourceKind !== 'void'}
              onChange={() => setMode('percent')}
              disabled={isSubmitting || sourceKind === 'void'}
            />
            Percent per day (share of source balance; not for minting)
          </label>
        </div>
      </div>

      <div className={form.field}>
        <label className={form.label}>Destination</label>
        <select
          className={form.input}
          value={destinationKind}
          onChange={(e) => setDestinationKind(e.target.value as DestinationKind)}
          disabled={isSubmitting}
        >
          <option value="void">Burn (destroy currency)</option>
          <option value="account">A specific account</option>
          <option value="everyPersonal">Every member's personal account</option>
          <option value="everyAccount">Every account in the community</option>
        </select>
        {destinationKind === 'account' && (
          <div className={styles.pickerWrap}>
            <AccountPicker communityId={communityId} value={destinationAccount} onChange={setDestinationAccount} disabled={isSubmitting} />
          </div>
        )}
      </div>

      <div className={form.field}>
        <label htmlFor="policyName" className={form.label}>Name *</label>
        <input
          id="policyName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What should this policy be called?"
          className={form.input}
          disabled={isSubmitting}
        />
      </div>

      <div className={form.field}>
        <label htmlFor="policyDescription" className={form.label}>Description</label>
        <textarea
          id="policyDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this policy is for..."
          className={form.input}
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      {error && <div className={form.error}>{error}</div>}
    </Modal>
  );
};

// The form mounts each time the dialog opens, so it always starts empty.
const CreatePolicyDialog: React.FC<CreatePolicyDialogProps> = ({ isVisible, ...props }) =>
  isVisible ? <CreatePolicyDialogForm {...props} /> : null;

export default CreatePolicyDialog;
