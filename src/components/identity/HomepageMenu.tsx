import React, { useEffect, useRef } from 'react';
import { User, QrCode, Plus, LogOut, EyeOff, Info, Mail, X } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import styles from './HomepageMenu.module.scss';

interface HomepageMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  onCreateCommunity: () => void;
}

const HomepageMenu: React.FC<HomepageMenuProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onLogout,
  onCreateCommunity,
}) => {
  const hiddenCount = useAppSelector((s) => s.preferences.hidden.length);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        ref={panelRef}
        className={styles.panel}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>Menu</span>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.menuItems}>
          <button className={styles.menuItem} onClick={() => { onNavigate('profile'); onClose(); }}>
            <User size={20} />
            <span>Profile</span>
          </button>
          <button className={styles.menuItem} onClick={() => { onNavigate('join'); onClose(); }}>
            <QrCode size={20} />
            <span>Join Community</span>
          </button>
          <button className={styles.menuItem} onClick={() => { onCreateCommunity(); onClose(); }}>
            <Plus size={20} />
            <span>Create Community</span>
          </button>
          <button className={`${styles.menuItem} ${styles.logoutItem}`} onClick={() => { onLogout(); onClose(); }}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>

          <div className={styles.divider} />

          <button className={styles.menuItem} onClick={() => { onNavigate('hidden'); onClose(); }}>
            <EyeOff size={20} />
            <span>Hidden Communities</span>
            {hiddenCount > 0 && <span className={styles.badge}>{hiddenCount}</span>}
          </button>
          <button className={styles.menuItem} onClick={() => { onNavigate('about'); onClose(); }}>
            <Info size={20} />
            <span>About</span>
          </button>
          <button className={styles.menuItem} onClick={() => { onNavigate('contact'); onClose(); }}>
            <Mail size={20} />
            <span>Contact</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomepageMenu;
