import React from 'react';
import { Loader, AlertCircle } from 'lucide-react';
import styles from './FlowShell.module.scss';

export const FlowLoading: React.FC = () => (
  <div className={styles.center}>
    <Loader size={24} className={styles.spinner} />
    <p>Loading…</p>
  </div>
);

export const FlowError: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className={styles.center}>
    <AlertCircle size={24} className={styles.errorIcon} />
    <p className={styles.errorMsg}>{message}</p>
    {onRetry && (
      <button className={styles.retryBtn} onClick={onRetry}>Retry</button>
    )}
  </div>
);
