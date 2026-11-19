import React, { useState } from 'react';
import Modal from '../../../Modal';
import form from '../../../dialogForm.module.scss';
import { TitleField } from '../FlowTitle';
import type { SetupProps } from '../types';
import styles from './Topic.module.scss';

// ---------------------------------------------------------------------------
// Shared by RankingFlow and ScoringFlow — both ask for the same thing before
// the flow is created: its title (mandatory), what people are proposing
// options for and voting on, plus an optional description.
// ---------------------------------------------------------------------------

type TopicIcon = React.ComponentType<{ size?: number; className?: string }>;

// ---------------------------------------------------------------------------
// Pre-create setup dialog
// ---------------------------------------------------------------------------

export const TopicSetupDialog: React.FC<SetupProps & {
  heading: string;
  icon: TopicIcon;
}> = ({ heading, icon: Icon, onDone, onCancel }) => {
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [error,        setError]      = useState('');

  const submit = () => {
    if (!title.trim()) { setError('Please give the flow a title.'); return; }
    onDone({ title: title.trim(), description: description.trim() });
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
      <TitleField
        value={title}
        placeholder="What are people deciding on?"
        onChange={(v) => { setTitle(v); setError(''); }}
        onEnter={submit}
      />

      <div className={form.field}>
        <label className={form.label}>Description <span className={styles.optional}>(optional)</span></label>
        <textarea
          className={form.input}
          rows={3}
          value={description}
          placeholder="Any context participants should know?"
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {error && <div className={form.error}>{error}</div>}
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Header shown at the top of the tab once the topic is set
// ---------------------------------------------------------------------------

export const TopicHeader: React.FC<{
  icon: TopicIcon;
  topic: string;
  description?: string;
}> = ({ icon: Icon, topic, description }) => (
  <div className={styles.topicHeader}>
    <Icon size={18} className={styles.topicIcon} />
    <div className={styles.topicHeaderText}>
      <h2 className={styles.topicTitle}>{topic}</h2>
      {description && <p className={styles.topicDesc}>{description}</p>}
    </div>
  </div>
);
