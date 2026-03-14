import React from 'react';
import { X, Heart, AlertCircle } from 'lucide-react';
import type { Collaboration } from '../../../services/contracts/community';
import styles from './AddRelatedWishDialog.module.scss';

interface AIMatchesDialogProps {
  isVisible: boolean;
  onClose: () => void;
  matches: Collaboration[];
  currentUserKey: string | null;
  onAddOwn: (wish: Collaboration) => void;
}

const CONSENT_MESSAGE =
  "Adding someone else's wish requires their consent. We don't support automated notifications yet, please reach out to the owner personally to ask them to link their wish here.";

const AIMatchesDialog: React.FC<AIMatchesDialogProps> = ({
  isVisible,
  onClose,
  matches,
  currentUserKey,
  onAddOwn,
}) => {
  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Potential collaborations</h3>
          <button type="button" onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.content}>
          {matches.length === 0 ? (
            <p className={styles.empty}>No strong matches found.</p>
          ) : (
            <ul className={styles.list}>
              {matches.map((wish) => {
                const isOwn = currentUserKey && wish.author === currentUserKey;
                return (
                  <li key={wish.id} className={styles.item}>
                    <div className={styles.wishCard}>
                      <Heart size={18} />
                      <div className={styles.wishInfo}>
                        <span className={styles.wishTitle}>{wish.title}</span>
                        {wish.dreamNeed && (
                          <span className={styles.wishDesc}>
                            {wish.dreamNeed.slice(0, 80)}...
                          </span>
                        )}
                        {isOwn ? (
                          <button
                            type="button"
                            className={styles.addOwnBtn}
                            onClick={() => {
                              onAddOwn(wish);
                              onClose();
                            }}
                          >
                            Add to related
                          </button>
                        ) : (
                          <div className={styles.consentMsg}>
                            <AlertCircle size={16} />
                            <span>{CONSENT_MESSAGE}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIMatchesDialog;
