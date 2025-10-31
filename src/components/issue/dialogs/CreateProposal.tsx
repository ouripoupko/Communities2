import { useState, useEffect, useCallback, memo } from 'react';
import { X } from 'lucide-react';
import styles from './CreateProposal.module.scss';

interface CreateProposalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string) => Promise<void>;
}

const CreateProposal = memo<CreateProposalProps>(({ isVisible, onClose, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      await onSubmit(title, description);
      setTitle('');
      setDescription('');
    } catch (err) {
      setError('Failed to create proposal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, description, onSubmit]);

  const handleClose = useCallback(() => {
    setTitle('');
    setDescription('');
    setError('');
    onClose();
  }, [onClose]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        handleClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, handleClose]);

  if (!isVisible) return null;

  return (
    <div 
      className={`${styles.createFormOverlay} ${styles.visible}`}
      onClick={handleClose}
    >
      <div 
        className={styles.createForm}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.formHeader}>
          <h3>Add New Proposal</h3>
          <button 
            onClick={handleClose}
            className={styles.closeButton}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>
        <div className="form-group">
          <label htmlFor="proposalTitle">Proposal Title</label>
          <input
            id="proposalTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter proposal title"
            className="input-field"
          />
        </div>
        <div className="form-group">
          <label htmlFor="proposalDescription">Description</label>
          <textarea
            id="proposalDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your proposal..."
            className="input-field"
            rows={4}
          />
        </div>
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}
        <div className="form-actions">
          <button 
            onClick={handleSubmit} 
            className="save-button" 
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Proposal'}
          </button>
          <button 
            onClick={handleClose}
            className="cancel-button"
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
});

CreateProposal.displayName = 'CreateProposal';

export default CreateProposal;

