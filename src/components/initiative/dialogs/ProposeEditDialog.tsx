import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import styles from './AddSegmentDialog.module.scss';

interface ProposeEditDialogProps {
  isVisible: boolean;
  onClose: () => void;
  initialText: string;
  segmentIds: string[];
  onSubmit: (newText: string) => Promise<void>;
}

const ProposeEditDialog: React.FC<ProposeEditDialogProps> = ({
  isVisible,
  onClose,
  initialText,
  segmentIds,
  onSubmit,
}) => {
  const [text, setText] = useState(initialText);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setText(initialText);
  }, [initialText, isVisible]);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(trimmed);
      onClose();
    } catch (err) {
      setError('Failed to create proposal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [text, onSubmit, onClose]);

  const handleClose = useCallback(() => {
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
          <h3>Propose Edit</h3>
          <button
            onClick={handleClose}
            className={styles.closeBtn}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>
        <div className={styles.content}>
          <label htmlFor="editText">Refined text (replacing {segmentIds.length} segment{segmentIds.length !== 1 ? 's' : ''})</label>
          <textarea
            id="editText"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Edit the combined text..."
            rows={6}
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
            {isSubmitting ? 'Submitting...' : 'Create Proposal'}
          </button>
          <button onClick={handleClose} className={styles.cancelBtn} disabled={isSubmitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposeEditDialog;
