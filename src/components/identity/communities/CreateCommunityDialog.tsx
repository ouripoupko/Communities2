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
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setNewCommunityName('');
    setNewCommunityDescription('');
    setInitialBalance('1000');
    setJoinPolicy('trust');
    setIncludeStarterPolicies(true);
    setError(null);
  };

  const handleCreateCommunity = () => {
    if (!newCommunityName.trim() || !user.publicKey || !user.serverUrl) {
      setError('Please fill in all required fields');
      return;
    }
    const initialBalanceValue = parseFloat(initialBalance);
    if (isNaN(initialBalanceValue) || initialBalanceValue < 0) {
      setError('Please enter a valid starting balance');
      return;
    }

    const { serverUrl, publicKey, profileContractId } = user;
    const name = newCommunityName.trim();
    const description = newCommunityDescription;
    const openJoin = joinPolicy === 'open';
    const withStarterPolicies = includeStarterPolicies;

    // Close right away - creation continues in the background. The new
    // community shows up in the list on its own once the server confirms
    // the deploy (Communities.tsx's existing deploy_contract SSE listener);
    // we don't fetch anything ourselves and we don't block the dialog on it.
    onClose();
    resetForm();

    void (async () => {
      try {
        const contractId = await createCommunity(
          serverUrl,
          publicKey,
          name,
          description,
          profileContractId,
          initialBalanceValue,
          openJoin,
        );

        if (contractId && withStarterPolicies) {
          await createPolicy(serverUrl, publicKey, contractId, {
            id: crypto.randomUUID(),
            name: 'Personal Minting',
            description: "Mints currency directly into every member's personal account.",
            source: { kind: 'void' },
            destination: { kind: 'everyPersonal' },
            mode: 'units',
            rateType: 'community-governed',
          });
          await createPolicy(serverUrl, publicKey, contractId, {
            id: crypto.randomUUID(),
            name: 'Demurrage',
            description: 'Gradually burns a share of every account balance.',
            source: { kind: 'everyAccount' },
            destination: { kind: 'void' },
            mode: 'percent',
            rateType: 'community-governed',
          });
        }
      } catch (err) {
        console.error('Failed to create community:', err);
      }
    })();
  };

  const handleClose = () => {
    resetForm();
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
            disabled={!newCommunityName.trim()}
          >
            Create Community
          </button>
          <button
            onClick={handleClose}
            className={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCommunityDialog;
