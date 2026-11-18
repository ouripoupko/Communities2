import React, { useState } from 'react';
import type { CollaborationFields } from '../../../services/contracts/community';
import type { CollaborationKind } from '../../collaboration/kinds';
import Modal from '../../Modal';
import form from '../../dialogForm.module.scss';

interface CreateCollaborationDialogProps {
  /** The kind to create; the dialog is closed when null. */
  kind: CollaborationKind | null;
  onClose: () => void;
  onSubmit: (fields: CollaborationFields) => void | Promise<void>;
}

const EMPTY: CollaborationFields = { title: '', description: '', detail: '' };

/** Asks for what the kind's fields say, and fills the collaboration's texts with it. */
const CreateCollaborationForm: React.FC<{ kind: CollaborationKind } & Omit<CreateCollaborationDialogProps, 'kind'>> = ({
  kind,
  onClose,
  onSubmit,
}) => {
  const [fields, setFields] = useState<CollaborationFields>(EMPTY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSubmit = async () => {
    const missing = kind.fields.find((f) => f.required && !fields[f.slot].trim());
    if (missing) {
      setError(missing.required!);
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit(fields);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={kind.createLabel}
      onClose={onClose}
      locked={isSubmitting}
      actions={(
        <>
          <button onClick={onClose} className={form.secondaryButton} disabled={isSubmitting}>
            Cancel
          </button>
          <button onClick={validateAndSubmit} className={form.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : kind.submitLabel}
          </button>
        </>
      )}
    >
      {kind.fields.map((field) => {
        const id = `${kind.type}-${field.slot}`;
        const common = {
          id,
          className: form.input,
          value: fields[field.slot],
          onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setFields((f) => ({ ...f, [field.slot]: e.target.value })),
          placeholder: field.placeholder,
          disabled: isSubmitting,
        };
        return (
          <div key={field.slot} className={form.field}>
            <label htmlFor={id} className={form.label}>
              {field.label}{field.required ? ' *' : ''}
            </label>
            {field.rows ? <textarea {...common} rows={field.rows} /> : <input {...common} type="text" />}
          </div>
        );
      })}

      {error && <div className={form.error}>{error}</div>}
    </Modal>
  );
};

// The form mounts each time the dialog opens, so it always starts empty.
const CreateCollaborationDialog: React.FC<CreateCollaborationDialogProps> = ({ kind, ...props }) =>
  kind ? <CreateCollaborationForm key={kind.type} kind={kind} {...props} /> : null;

export default CreateCollaborationDialog;
