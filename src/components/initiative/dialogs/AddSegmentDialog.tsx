import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import styles from './AddSegmentDialog.module.scss';

interface AddSegmentDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (text: string) => Promise<void>;
}

const AddSegmentDialog: React.FC<AddSegmentDialogProps> = ({
  isVisible,
  onClose,
  onSubmit,
}) => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(trimmed);
      setText('');
      onClose();
    } catch (err) {
      setError('Failed to add segment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [text, onSubmit, onClose]);

  const handleClose = useCallback(() => {
    setText('');
    setError('');
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) handleClose();
    };
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, handleClose]);

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Add to Roadmap</h3>
          <button
            onClick={handleClose}
            className={styles.closeBtn}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>
        <div className={styles.content}>
          <label htmlFor="segmentText">Your contribution</label>
          <textarea
            id="segmentText"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a sentence or paragraph to the vision..."
            rows={5}
            disabled={isSubmitting}
          />
          {error && <div className={styles.error}>{error}</div>}
        </div>
        <div className={styles.actions}>
          <button
            onClick={handleSubmit}
            className={styles.submitBtn}
            disabled={!text.trim() || isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
          <button onClick={handleClose} className={styles.cancelBtn} disabled={isSubmitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddSegmentDialog;
