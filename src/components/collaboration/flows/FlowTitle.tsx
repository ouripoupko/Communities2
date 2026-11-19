import React, { useState } from 'react';
import Modal from '../../Modal';
import form from '../../dialogForm.module.scss';
import type { SetupProps } from './types';

// Every new flow has a title: its setup form asks for it, the tree lists the
// flow by it, and the flow's contract gets it. Every form asks with this
// field, so it reads the same everywhere.

/** A setup form's title field. */
export const TitleField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  placeholder?: string;
}> = ({ value, onChange, onEnter, placeholder = 'What is this flow for?' }) => (
  <div className={form.field}>
    <label htmlFor="flowTitle" className={form.label}>Title *</label>
    <input
      id="flowTitle"
      className={form.input}
      type="text"
      value={value}
      autoFocus
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') onEnter?.(); }}
    />
  </div>
);

/** The setup form of a flow that asks for nothing but its title. */
export const TitleSetupDialog: React.FC<SetupProps & {
  heading: string;
  icon: React.ComponentType<{ size?: number }>;
}> = ({ heading, icon: Icon, onDone, onCancel }) => {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!title.trim()) { setError('Please give the flow a title.'); return; }
    onDone({ title: title.trim() });
  };

  return (
    <Modal
      title={heading}
      onClose={onCancel}
      actions={(
        <>
          <button className={form.secondaryButton} onClick={onCancel}>Cancel</button>
          <button className={form.primaryButton} onClick={submit}>
            <Icon size={15} /> Create
          </button>
        </>
      )}
    >
      <TitleField value={title} onChange={(v) => { setTitle(v); setError(''); }} onEnter={submit} />
      {error && <div className={form.error}>{error}</div>}
    </Modal>
  );
};
