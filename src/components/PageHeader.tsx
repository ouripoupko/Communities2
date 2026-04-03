import React from 'react';
import { ArrowLeft } from 'lucide-react';
import styles from './PageHeader.module.scss';

export interface ActionButton {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  title?: string;
  variant?: 'default' | 'logout';
}

export interface PageHeaderProps {
  // Top row configuration
  showBackButton?: boolean;
  backButtonText?: string;
  backButtonVariant?: 'default' | 'compact';
  onBackClick?: () => void;
  actionButtons?: ActionButton[];

  // Bottom row configuration
  title: string;
  subtitle?: string;
  rightLabel?: React.ReactNode;

  // Layout configuration
  layout?: 'two-row' | 'single-row' | 'homepage';

  // Homepage layout extras
  onMenuClick?: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  showBackButton = false,
  backButtonText = 'Back',
  backButtonVariant = 'default',
  onBackClick,
  actionButtons = [],
  title,
  subtitle,
  rightLabel,
  layout = 'two-row',
  onMenuClick,
}) => {
  if (layout === 'homepage') {
    return (
      <div className={`${styles.header} ${styles.homepageHeader}`}>
        <div className={styles.homepageRow}>
          <span className={styles.wordmark}>Gloki</span>
          {onMenuClick && (
            <button className={styles.menuButton} onClick={onMenuClick}>
              Menu
            </button>
          )}
        </div>
      </div>
    );
  }

  if (layout === 'single-row') {
    return (
      <div className={styles.header}>
        <div className={`${styles.headerLeft} ${styles.singleRowLayout}`}>
          {showBackButton && onBackClick && (
            <button onClick={onBackClick} className={styles.backButton}>
              <ArrowLeft size={16} />
              {backButtonText}
            </button>
          )}
          <div className={styles.info}>
            <div className={styles.titleRow}>
              <h1>{title}</h1>
              {rightLabel}
            </div>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actionButtons.length > 0 && (
            <div className={styles.headerActions}>
              {actionButtons.map((button, index) => (
                <button
                  key={index}
                  className={`${styles.actionButton} ${button.variant === 'logout' ? styles.logoutButton : ''}`}
                  onClick={button.onClick}
                  title={button.title || button.label}
                >
                  <button.icon size={18} />
                  <span>{button.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.header}>
      <div className={styles.headerTop}>
        {showBackButton && onBackClick && (
          <button
            onClick={onBackClick}
            className={`${styles.backButton} ${backButtonVariant === 'compact' ? styles.backButtonCompact : ''}`}
          >
            <ArrowLeft size={backButtonVariant === 'compact' ? 18 : 16} />
            {backButtonVariant === 'default' && backButtonText}
          </button>
        )}
        {actionButtons.length > 0 && (
          <div className={styles.headerActions}>
            {actionButtons.map((button, index) => (
              <button
                key={index}
                className={`${styles.actionButton} ${button.variant === 'logout' ? styles.logoutButton : ''}`}
                onClick={button.onClick}
                title={button.title || button.label}
              >
                <button.icon size={18} />
                <span>{button.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={styles.headerBottom}>
        <div className={styles.info}>
          <div className={styles.titleRow}>
            <h1>{title}</h1>
            {rightLabel}
          </div>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;
