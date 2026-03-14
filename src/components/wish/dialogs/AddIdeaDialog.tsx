import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import styles from './AddHelpDialog.module.scss';

interface AddIdeaDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (description: string) => void | Promise<void>;
  isSubmitting?: boolean;
}

const AddIdeaDialog: React.FC<AddIdeaDialogProps> = ({
  isVisible,
  onClose,
  onSubmit,
  isSubmitting = false,
}) => {
  const [description, setDescription] = useState('');

  if (!isVisible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (!trimmed || isSubmitting) return;
    try {
      await onSubmit(trimmed);
      setDescription('');
      onClose();
    } catch {
      // Parent handles error; keep dialog open
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setDescription('');
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Add Collaboration Idea</h3>
          <button type="button" onClick={handleClose} className={styles.closeBtn} disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>
        <form className={styles.content} onSubmit={handleSubmit}>
          <p className={styles.prompt}>Describe a way to manifest this wish:</p>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. We could start a weekly study group, build a shared garden..."
            rows={4}
            disabled={isSubmitting}
            autoFocus
          />
          <div className={styles.actions}>
            <button type="button" onClick={handleClose} className={styles.cancelBtn} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!description.trim() || isSubmitting}
            >
              <Sparkles size={18} />
              {isSubmitting ? 'Adding...' : 'Add Idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddIdeaDialog;
