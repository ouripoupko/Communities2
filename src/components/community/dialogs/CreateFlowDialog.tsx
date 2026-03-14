import React, { useState, useEffect } from 'react';
import styles from './CreateFlowDialog.module.scss';

export type CollaborationType = 'initiative' | 'wish' | 'agreement';

interface CreateFlowDialogProps {
  isVisible: boolean;
  onClose: () => void;
  collaborationType: CollaborationType | null;
  onSubmit: (data: Record<string, string>) => void | Promise<void>;
}

const CreateFlowDialog: React.FC<CreateFlowDialogProps> = ({
  isVisible,
  onClose,
  collaborationType,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dreamNeed, setDreamNeed] = useState('');
  const [rule, setRule] = useState('');
  const [protection, setProtection] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      setTitle('');
      setDescription('');
      setDreamNeed('');
      setRule('');
      setProtection('');
      setError(null);
    }
  }, [isVisible, collaborationType]);

  const getDialogTitle = () => {
    switch (collaborationType) {
      case 'initiative':
        return 'Start Initiative';
      case 'wish':
        return 'Make a Wish';
      case 'agreement':
        return 'Propose Agreement';
      default:
        return 'Create';
    }
  };

  const getSubmitLabel = () => {
    switch (collaborationType) {
      case 'initiative':
        return 'Start Initiative';
      case 'wish':
        return 'Submit Wish';
      case 'agreement':
        return 'Propose Agreement';
      default:
        return 'Create';
    }
  };

  const validateAndSubmit = async () => {
    setError(null);
    switch (collaborationType) {
      case 'initiative':
        if (!title.trim()) {
          setError('Please enter a title');
          return;
        }
        break;
      case 'wish':
        if (!title.trim()) {
          setError('Please enter a title');
          return;
        }
        if (!dreamNeed.trim()) {
          setError('Please share your dream or need');
          return;
        }
        break;
      case 'agreement':
        if (!rule.trim()) {
          setError('Please enter the rule');
          return;
        }
        if (!protection.trim()) {
          setError('Please describe what harm this prevents');
          return;
        }
        break;
      default:
        return;
    }

    setIsSubmitting(true);
    try {
      switch (collaborationType) {
        case 'initiative':
          await Promise.resolve(onSubmit({ title, description }));
          break;
        case 'wish':
          await Promise.resolve(onSubmit({ title, dreamNeed }));
          break;
        case 'agreement':
          await Promise.resolve(onSubmit({ rule, protection }));
          break;
      }
      handleClose();
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setDreamNeed('');
    setRule('');
    setProtection('');
    setError(null);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isVisible || !collaborationType) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3 className={styles.title}>{getDialogTitle()}</h3>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          {collaborationType === 'initiative' && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="initiativeTitle" className={styles.label}>
                  Title *
                </label>
                <input
                  id="initiativeTitle"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What action will you take?"
                  className={styles.inputField}
                  disabled={isSubmitting}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="initiativeDescription" className={styles.label}>
                  Description
                </label>
                <textarea
                  id="initiativeDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your initiative..."
                  className={`${styles.inputField} ${styles.textarea}`}
                  rows={4}
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          {collaborationType === 'wish' && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="wishTitle" className={styles.label}>
                  Title *
                </label>
                <input
                  id="wishTitle"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What do you wish for?"
                  className={styles.inputField}
                  disabled={isSubmitting}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="wishDreamNeed" className={styles.label}>
                  Dream / Need *
                </label>
                <textarea
                  id="wishDreamNeed"
                  value={dreamNeed}
                  onChange={(e) => setDreamNeed(e.target.value)}
                  placeholder="What do you dream of for this community or for yourself?"
                  className={`${styles.inputField} ${styles.textarea} ${styles.textareaLarge}`}
                  rows={6}
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          {collaborationType === 'agreement' && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="agreementRule" className={styles.label}>
                  Rule *
                </label>
                <input
                  id="agreementRule"
                  type="text"
                  value={rule}
                  onChange={(e) => setRule(e.target.value)}
                  placeholder="The proposed rule or agreement"
                  className={styles.inputField}
                  disabled={isSubmitting}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="agreementProtection" className={styles.label}>
                  Protection *
                </label>
                <textarea
                  id="agreementProtection"
                  value={protection}
                  onChange={(e) => setProtection(e.target.value)}
                  placeholder="What harm does this prevent?"
                  className={`${styles.inputField} ${styles.textarea}`}
                  rows={4}
                  disabled={isSubmitting}
                />
              </div>
            </>
          )}

          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>

        <div className={styles.actions}>
          <button
            onClick={validateAndSubmit}
            className={styles.createButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : getSubmitLabel()}
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

export default CreateFlowDialog;
