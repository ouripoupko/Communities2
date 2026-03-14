import React, { useState } from 'react';
import { X } from 'lucide-react';
import styles from './AddSegmentDialog.module.scss';

interface AddStepDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (label: string) => Promise<void>;
}

const AddStepDialog: React.FC<AddStepDialogProps> = ({
  isVisible,
  onClose,
  onSubmit,
}) => {
  const [label, setLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(trimmed);
      setLabel('');
      onClose();
    } catch {
      setError('Failed to add step. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setLabel('');
      setError('');
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Add Step</h3>
          <button
            onClick={handleClose}
            className={styles.closeBtn}
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>
        <form className={styles.content} onSubmit={handleSubmit}>
          <label htmlFor="stepLabel">Action item</label>
          <input
            id="stepLabel"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Schedule first planning meeting"
            disabled={isSubmitting}
          />
          {error && <div className={styles.error}>{error}</div>}
        </form>
        <div className={styles.actions}>
          <button
            type="submit"
            onClick={handleSubmit}
            className={styles.submitBtn}
            disabled={!label.trim() || isSubmitting}
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

export default AddStepDialog;
