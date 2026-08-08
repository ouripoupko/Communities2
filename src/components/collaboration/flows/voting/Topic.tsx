import React, { useState } from 'react';
import styles from './Topic.module.scss';

// ---------------------------------------------------------------------------
// Shared by RankingFlow and ScoringFlow — both ask for the same thing before
// their tab is created: the topic (mandatory) people are proposing options
// for and voting on, plus an optional description.
// ---------------------------------------------------------------------------

type TopicIcon = React.ComponentType<{ size?: number; className?: string }>;

// ---------------------------------------------------------------------------
// Pre-create setup dialog
// ---------------------------------------------------------------------------

export const TopicSetupDialog: React.FC<{
  heading: string;
  icon: TopicIcon;
  onDone: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}> = ({ heading, icon: Icon, onDone, onCancel }) => {
  const [topic,       setTopic]       = useState('');
  const [description, setDescription] = useState('');
  const [error,        setError]      = useState('');

  const submit = () => {
    if (!topic.trim()) { setError('Topic is required.'); return; }
    onDone({ topic: topic.trim(), description: description.trim() });
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3 className={styles.dialogTitle}>{heading}</h3>
          <button className={styles.closeButton} onClick={onCancel}>×</button>
        </div>

        <div className={styles.dialogContent}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Topic *</label>
            <input
              className={styles.input}
              type="text"
              value={topic}
              autoFocus
              placeholder="What are people deciding on?"
              onChange={(e) => { setTopic(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Description <span className={styles.optional}>(optional)</span></label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={description}
              placeholder="Any context participants should know?"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}
        </div>

        <div className={styles.dialogActions}>
          <button className={styles.btnCreate} onClick={submit}>
            <Icon size={15} /> Create
          </button>
          <button className={styles.btnCancel} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
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
