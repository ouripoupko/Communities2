import { useEffect, useCallback, memo } from 'react';
import { X } from 'lucide-react';
import styles from './AIFeedbackDialog.module.scss';

interface AIFeedbackDialogProps {
  isVisible: boolean;
  onClose: () => void;
  /** Stored AI feedback text; when null or empty, show "no feedback yet" message */
  aiFeedback: string | null;
}

const NO_FEEDBACK_MESSAGE =
  'No feedback found yet. AI feedback is generated when someone adds a proposal and has an API key set in their profile.';

const AIFeedbackDialog = memo<AIFeedbackDialogProps>(({ isVisible, onClose, aiFeedback }) => {
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

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

  const hasFeedback = aiFeedback != null && aiFeedback.trim() !== '';

  return (
    <div
      className={`${styles.overlay} ${styles.visible}`}
      onClick={handleClose}
    >
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3>AI feedback</h3>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            type="button"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className={styles.content}>
          {hasFeedback ? (
            <p className={styles.feedbackText}>{aiFeedback}</p>
          ) : (
            <p className={styles.noFeedback}>{NO_FEEDBACK_MESSAGE}</p>
          )}
        </div>
        <div className={styles.actions}>
          <button onClick={handleClose} className="cancel-button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

AIFeedbackDialog.displayName = 'AIFeedbackDialog';

export default AIFeedbackDialog;
