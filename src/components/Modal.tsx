import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Modal.module.scss';

interface ModalProps {
  /** The header's title; without one, the dialog has no header. */
  title?: string;
  /** Closes it: the × button, a click outside, and Escape. */
  onClose: () => void;
  /** While true (an action is in progress), nothing closes it. */
  locked?: boolean;
  /** False for a dialog that must be answered: no ×, and it closes only by its actions. */
  closable?: boolean;
  /** The footer's buttons. */
  actions?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  children: React.ReactNode;
}

/**
 * The frame every dialog shares: the overlay, the header, the body, and the
 * footer. While open it holds the keyboard focus and the page's scroll.
 * Render it only while the dialog is open.
 */
const Modal: React.FC<ModalProps> = ({
  title, onClose, locked = false, closable = true, actions, size = 'medium', children,
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // The latest close, for the listener below.
  const close = useRef(() => {});
  useEffect(() => {
    close.current = () => { if (closable && !locked) onClose(); };
  }, [closable, locked, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close.current(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the dialog, unless a field in it took the focus (autoFocus).
    const returnTo = document.activeElement as HTMLElement | null;
    if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      returnTo?.focus?.();
    };
  }, []);

  return createPortal(
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) close.current(); }}>
      <div
        ref={dialogRef}
        className={`${styles.dialog} ${styles[size]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        {title && (
          <div className={styles.header}>
            <h3 id={titleId} className={styles.title}>{title}</h3>
            {closable && (
              <button type="button" className={styles.closeButton} onClick={() => close.current()} disabled={locked} aria-label="Close">
                <X size={20} />
              </button>
            )}
          </div>
        )}
        <div className={styles.body}>{children}</div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
