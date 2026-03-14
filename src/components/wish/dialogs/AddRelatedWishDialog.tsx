import React from 'react';
import { X, Heart } from 'lucide-react';
import type { Collaboration } from '../../../services/contracts/community';
import styles from './AddRelatedWishDialog.module.scss';

interface AddRelatedWishDialogProps {
  isVisible: boolean;
  onClose: () => void;
  myWishes: Collaboration[];
  onSelect: (wish: Collaboration) => void;
}

const AddRelatedWishDialog: React.FC<AddRelatedWishDialogProps> = ({
  isVisible,
  onClose,
  myWishes,
  onSelect,
}) => {
  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Add from your wishes</h3>
          <button type="button" onClick={onClose} className={styles.closeBtn}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.content}>
          {myWishes.length === 0 ? (
            <p className={styles.empty}>You have no wishes in this community yet.</p>
          ) : (
            <ul className={styles.list}>
              {myWishes.map((wish) => (
                <li key={wish.id} className={styles.item}>
                  <button
                    type="button"
                    className={styles.wishBtn}
                    onClick={() => {
                      onSelect(wish);
                      onClose();
                    }}
                  >
                    <Heart size={18} />
                    <div className={styles.wishInfo}>
                      <span className={styles.wishTitle}>{wish.title}</span>
                      {wish.dreamNeed && (
                        <span className={styles.wishDesc}>
                          {wish.dreamNeed.length > 80
                            ? `${wish.dreamNeed.slice(0, 80)}...`
                            : wish.dreamNeed}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddRelatedWishDialog;
