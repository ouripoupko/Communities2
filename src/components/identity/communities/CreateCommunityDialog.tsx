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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateCommunity = async () => {
    if (!newCommunityName.trim() || !user.publicKey || !user.serverUrl) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createCommunity(
        user.serverUrl,
        user.publicKey,
        newCommunityName,
        newCommunityDescription,
        user.profileContractId,
      );
      
      // Close dialog first, before resetting form
      onClose();
      
      // Reset form after closing
      setNewCommunityName('');
      setNewCommunityDescription('');
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
