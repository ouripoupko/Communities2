import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import styles from './CreateCommunityDialog.module.scss';
import { createCommunity, createPolicy } from '../../../services/contracts/community';

interface CreateCommunityDialogProps {
  isVisible: boolean;
  onClose: () => void;
}

const CreateCommunityDialog: React.FC<CreateCommunityDialogProps> = ({ isVisible, onClose }) => {
  const user = useAppSelector((state) => state.user);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [initialBalance, setInitialBalance] = useState('1000');
  const [joinPolicy, setJoinPolicy] = useState<'trust' | 'open'>('trust');
  const [includeStarterPolicies, setIncludeStarterPolicies] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim() || !user.publicKey || !user.serverUrl) {
      setError('Please fill in all required fields');
      return;
    }
    const initialBalanceValue = parseFloat(initialBalance);
    if (isNaN(initialBalanceValue) || initialBalanceValue < 0) {
      setError('Please enter a valid starting balance');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const contractId = await createCommunity(
        user.serverUrl,
        user.publicKey,
        newCommunityName,
        newCommunityDescription,
        user.profileContractId,
        initialBalanceValue,
        joinPolicy === 'open',
      );

      if (contractId && includeStarterPolicies) {
        await createPolicy(user.serverUrl, user.publicKey, contractId, {
          id: crypto.randomUUID(),
          name: 'Personal Minting',
          description: "Mints currency directly into every member's personal account.",
          source: { kind: 'void' },
          destination: { kind: 'everyPersonal' },
          mode: 'units',
          rateType: 'community-governed',
        });
        await createPolicy(user.serverUrl, user.publicKey, contractId, {
          id: crypto.randomUUID(),
          name: 'Demurrage',
          description: 'Gradually burns a share of every account balance.',
          source: { kind: 'everyAccount' },
          destination: { kind: 'void' },
          mode: 'percent',
          rateType: 'community-governed',
        });
      }

      // Close dialog first, before resetting form
      onClose();

      // Reset form after closing
      setNewCommunityName('');
      setNewCommunityDescription('');
      setInitialBalance('1000');
      setJoinPolicy('trust');
      setIncludeStarterPolicies(true);
      setError(null);
      setIsSubmitting(false);

    } catch (error) {
      console.error('Failed to create community:', error);
      setError('Failed to create community. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return; // Prevent closing during submission

    setNewCommunityName('');
    setNewCommunityDescription('');
    setInitialBalance('1000');
    setJoinPolicy('trust');
    setIncludeStarterPolicies(true);
    setError(null);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3 className={styles.title}>Create New Community</h3>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.formGroup}>
            <label htmlFor="communityName" className={styles.label}>Community Name *</label>
            <input
              id="communityName"
              type="text"
              value={newCommunityName}
              onChange={(e) => setNewCommunityName(e.target.value)}
              placeholder="Enter community name"
              className={styles.inputField}
              disabled={isSubmitting}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="communityDescription" className={styles.label}>Description</label>
            <textarea
              id="communityDescription"
              value={newCommunityDescription}
              onChange={(e) => setNewCommunityDescription(e.target.value)}
              placeholder="Describe your community"
              className={`${styles.inputField} ${styles.textarea}`}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="initialBalance" className={styles.label}>Starting balance for new members</label>
            <input
              id="initialBalance"
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="1000"
              className={styles.inputField}
              disabled={isSubmitting}
              min="0"
              step="any"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="joinPolicy" className={styles.label}>How can new members join?</label>
            <select
              id="joinPolicy"
              value={joinPolicy}
              onChange={(e) => setJoinPolicy(e.target.value as 'trust' | 'open')}
              className={styles.inputField}
              disabled={isSubmitting}
            >
              <option value="trust">Web of trust — existing members approve new joiners</option>
              <option value="open">Open — anyone can join immediately, no approval needed</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label>
              <input
                type="checkbox"
                checked={includeStarterPolicies}
                onChange={(e) => setIncludeStarterPolicies(e.target.checked)}
                disabled={isSubmitting}
              />
              {' '}Include starter policies: Personal Minting + Demurrage
            </label>
          </div>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
        </div>
        
        <div className={styles.actions}>
          <button 
            onClick={handleCreateCommunity} 
            className={styles.createButton} 
            disabled={isSubmitting || !newCommunityName.trim()}
          >
            {isSubmitting ? 'Creating...' : 'Create Community'}
          </button>
          <button
            onClick={handleClose}
            className={styles.cancelButton}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCommunityDialog;
