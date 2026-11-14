import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import styles from './CreateCommunityDialog.module.scss';
import { createCommunity } from '../../../services/contracts/community';

interface CreateCommunityDialogProps {
  isVisible: boolean;
  onClose: () => void;
}

const CreateCommunityDialog: React.FC<CreateCommunityDialogProps> = ({ isVisible, onClose }) => {
  const user = useAppSelector((state) => state.user);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setNewCommunityName('');
    setNewCommunityDescription('');
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
    try {
      setIsCreating(true);
      setError(null);
      await createCommunity(user.serverUrl, user.profileContractId, newCommunityName.trim(), newCommunityDescription);
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
            disabled={!newCommunityName.trim() || isCreating}
          >
            {isCreating ? 'Approve on your node…' : 'Create Community'}
          </button>
          <button
            onClick={handleClose}
            className={styles.cancelButton}
            disabled={isCreating}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCommunityDialog;
