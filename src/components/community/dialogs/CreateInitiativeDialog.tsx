import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import styles from './CreateInitiativeDialog.module.scss';

export interface InitiativeFormData {
  title: string;
  description: string;
  evidence: string[];
  countries: string[];
}

interface CountryOption {
  code: string;
  label: string;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'KE', label: 'Kenya' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'MW', label: 'Malawi' },
  { code: 'CD', label: 'DR Congo' },
  { code: 'OTHER', label: 'Other' },
];

interface CreateInitiativeDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: InitiativeFormData) => void | Promise<void>;
}

const CreateInitiativeDialog: React.FC<CreateInitiativeDialogProps> = ({
  isVisible,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<string[]>(['']);
  const [countries, setCountries] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      setTitle('');
      setDescription('');
      setEvidence(['']);
      setCountries([]);
      setError(null);
    }
  }, [isVisible]);

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setEvidence(['']);
    setCountries([]);
    setError(null);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleEvidenceChange = (index: number, value: string) => {
    setEvidence((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleAddEvidence = () => {
    setEvidence((prev) => [...prev, '']);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleCountry = (code: string) => {
    setCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async () => {
    setError(null);

    if (!title.trim()) {
      setError('Please describe the problem');
      return;
    }
    if (!description.trim()) {
      setError('Please explain why this matters');
      return;
    }

    const filteredEvidence = evidence.filter((e) => e.trim() !== '');

    setIsSubmitting(true);
    try {
      await Promise.resolve(
        onSubmit({
          title: title.trim(),
          description: description.trim(),
          evidence: filteredEvidence,
          countries,
        })
      );
      handleClose();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3 className={styles.title}>Start an Initiative</h3>
          <button className={styles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.callout}>
            Describe a problem that affects people across borders. Your community will work together
            through discussion, proposals, and voting to reach a shared mandate.
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="initiativeTitle" className={styles.label}>
              What's the problem? *
            </label>
            <input
              id="initiativeTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Describe the problem in one sentence"
              className={styles.inputField}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="initiativeDescription" className={styles.label}>
              Why does this matter? *
            </label>
            <textarea
              id="initiativeDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the impact and why this needs action..."
              className={`${styles.inputField} ${styles.textarea}`}
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Evidence</label>
            <p className={styles.hint}>Add links to reports, articles, or data sources</p>
            {evidence.map((url, index) => (
              <div key={index} className={styles.evidenceRow}>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleEvidenceChange(index, e.target.value)}
                  placeholder="https://..."
                  className={styles.inputField}
                  disabled={isSubmitting}
                />
                {evidence.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => handleRemoveEvidence(index)}
                    disabled={isSubmitting}
                    title="Remove"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className={styles.addEvidenceButton}
              onClick={handleAddEvidence}
              disabled={isSubmitting}
            >
              <Plus size={14} />
              Add link
            </button>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Countries affected</label>
            <div className={styles.chipGroup}>
              {COUNTRY_OPTIONS.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  className={`${styles.chip} ${countries.includes(country.code) ? styles.chipSelected : ''}`}
                  onClick={() => handleToggleCountry(country.code)}
                  disabled={isSubmitting}
                >
                  {country.label}
                </button>
              ))}
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>

        <div className={styles.actions}>
          <button
            onClick={handleSubmit}
            className={styles.createButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Start Initiative'}
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

export default CreateInitiativeDialog;
