import React, { useState } from 'react';
import { useAppSelector } from '../../../store/hooks';
import styles from './CreateIssueDialog.module.scss';
import { createIssue } from '../../../services/contracts/community';

interface CreateIssueDialogProps {
  isVisible: boolean;
  onClose: () => void;
  communityId: string;
}

const CreateIssueDialog: React.FC<CreateIssueDialogProps> = ({ isVisible, onClose, communityId }) => {
  const user = useAppSelector((state) => state.user);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueDescription, setNewIssueDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateIssue = async () => {
    if (!newIssueTitle.trim() || !user || !user.serverUrl || !user.publicKey) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createIssue(
        user.serverUrl,
        user.publicKey,
        communityId,
        {
          title: newIssueTitle,
          description: newIssueDescription,
        },
      );

      // Reset form and close dialog
      setNewIssueTitle('');
      setNewIssueDescription('');
      setError(null);
      onClose();
      
    } catch (error) {
      console.error('Failed to create issue:', error);
      setError('Failed to create issue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewIssueTitle('');
    setNewIssueDescription('');
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
          <h3 className={styles.title}>Create New Issue</h3>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.formGroup}>
            <label htmlFor="issueTitle" className={styles.label}>Issue Title *</label>
            <input
              id="issueTitle"
              type="text"
              value={newIssueTitle}
              onChange={(e) => setNewIssueTitle(e.target.value)}
              placeholder="Enter issue title"
              className={styles.inputField}
              disabled={isSubmitting}
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="issueDescription" className={styles.label}>Description</label>
            <textarea
              id="issueDescription"
              value={newIssueDescription}
              onChange={(e) => setNewIssueDescription(e.target.value)}
              placeholder="Describe the issue..."
              className={`${styles.inputField} ${styles.textarea}`}
              rows={4}
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
            onClick={handleCreateIssue} 
            className={styles.createButton} 
            disabled={isSubmitting || !newIssueTitle.trim()}
          >
            {isSubmitting ? 'Creating...' : 'Create Issue'}
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

export default CreateIssueDialog;
