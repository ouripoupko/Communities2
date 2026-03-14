import React, { useState } from 'react';
import { X } from 'lucide-react';
import styles from './AddSegmentDialog.module.scss';

interface AddGapDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (title: string, description: string) => Promise<void>;
}

const AddGapDialog: React.FC<AddGapDialogProps> = ({
  isVisible,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;

    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(t, description.trim());
      setTitle('');
      setDescription('');
      onClose();
    } catch {
      setError('Failed to add gap. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setDescription('');
      setError('');
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Add Gap</h3>
          <button
            onClick={handleClose}
            className={styles.closeBtn}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>
        <form className={styles.content} onSubmit={handleSubmit}>
          <label htmlFor="gapTitle">Title</label>
          <input
            id="gapTitle"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Need more volunteers"
            disabled={isSubmitting}
          />
          <label htmlFor="gapDescription" style={{ marginTop: '1rem' }}>
            Description
          </label>
          <textarea
            id="gapDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what is needed..."
            rows={3}
            disabled={isSubmitting}
          />
          {error && <div className={styles.error}>{error}</div>}
        </form>
        <div className={styles.actions}>
          <button
            type="submit"
            onClick={handleSubmit}
            className={styles.submitBtn}
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            className={styles.cancelBtn}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddGapDialog;
