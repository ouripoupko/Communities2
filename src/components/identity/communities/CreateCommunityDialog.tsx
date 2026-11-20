import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import Modal from '../../Modal';
import form from '../../dialogForm.module.scss';
import { createCommunity } from '../../../services/contracts/community';

interface CreateCommunityDialogProps {
  isVisible: boolean;
  onClose: () => void;
}

const CreateCommunityDialog: React.FC<CreateCommunityDialogProps> = ({ isVisible, onClose }) => {
  const user = useAppSelector((state) => state.user);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [initialBalance, setInitialBalance] = useState('1000');
  const [includeStarterPolicies, setIncludeStarterPolicies] = useState(true);
  const [joinPolicy, setJoinPolicy] = useState<'trust' | 'open'>('trust');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setNewCommunityName('');
    setNewCommunityDescription('');
    setInitialBalance('1000');
    setIncludeStarterPolicies(true);
    setJoinPolicy('trust');
    setError(null);
  };

  // Deploying opens the node's approval page, so it must start from this
  // click. The new community shows up in the list on its own once the node
  // confirms the deploy (Communities.tsx's deploy_contract listener).
  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim() || !user.serverUrl) {
      setError('Please fill in all required fields');
      return;
    }
    const initialBalanceValue = parseFloat(initialBalance);
    if (isNaN(initialBalanceValue) || initialBalanceValue < 0) {
      setError('Please enter a valid starting balance');
      return;
    }
    try {
      setIsCreating(true);
      setError(null);
      await createCommunity(
        user.serverUrl,
        user.profileContractId,
        newCommunityName.trim(),
        newCommunityDescription,
        initialBalanceValue,
        includeStarterPolicies,
        joinPolicy === 'open',
      );
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the community.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isVisible) return null;

  return (
    <Modal
      title="Create New Community"
      onClose={handleClose}
      locked={isCreating}
      actions={(
        <>
          <button
            onClick={handleClose}
            className={form.secondaryButton}
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateCommunity}
            className={form.primaryButton}
            disabled={!newCommunityName.trim() || isCreating}
          >
            {isCreating ? 'Approve on your node…' : 'Create Community'}
          </button>
        </>
      )}
    >
      <div className={form.field}>
        <label htmlFor="communityName" className={form.label}>Community Name *</label>
        <input
          id="communityName"
          type="text"
          value={newCommunityName}
          onChange={(e) => setNewCommunityName(e.target.value)}
          placeholder="Enter community name"
          className={form.input}
        />
      </div>

      <div className={form.field}>
        <label htmlFor="communityDescription" className={form.label}>Description</label>
        <textarea
          id="communityDescription"
          value={newCommunityDescription}
          onChange={(e) => setNewCommunityDescription(e.target.value)}
          placeholder="Describe your community"
          className={form.input}
          rows={3}
        />
      </div>

      <div className={form.field}>
        <label htmlFor="initialBalance" className={form.label}>Starting balance for new members</label>
        <input
          id="initialBalance"
          type="number"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          placeholder="1000"
          className={form.input}
          min="0"
          step="any"
        />
      </div>

      <div className={form.field}>
        <label htmlFor="joinPolicy" className={form.label}>How can new members join?</label>
        <select
          id="joinPolicy"
          value={joinPolicy}
          onChange={(e) => setJoinPolicy(e.target.value as 'trust' | 'open')}
          className={form.input}
        >
          <option value="trust">Web of trust — existing members approve new joiners</option>
          <option value="open">Open — anyone can join immediately, no approval needed</option>
        </select>
      </div>

      <div className={form.field}>
        <label className={form.radioOption}>
          <input
            type="checkbox"
            checked={includeStarterPolicies}
            onChange={(e) => setIncludeStarterPolicies(e.target.checked)}
          />
          {' '}Include starter policies: Personal Minting + Demurrage
        </label>
      </div>

      {error && (
        <div className={form.error}>
          {error}
        </div>
      )}
    </Modal>
  );
};

export default CreateCommunityDialog;
