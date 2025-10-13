import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Users, QrCode, LogOut } from 'lucide-react';
import Profile from '../components/identity/Profile';
import Communities from '../components/identity/Communities';
import JoinCommunity from '../components/identity/JoinCommunity';
import styles from './Container.module.scss';

const IdentityView: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { path: 'profile', label: 'Profile', icon: User },
    { path: 'communities', label: 'Communities', icon: Users },
    { path: 'join', label: 'Join Community', icon: QrCode },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.info}>
            <div className={styles.titleRow}>
              <h1>My Identity</h1>
              <button onClick={handleLogout} className={styles.logoutButton}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(`/identity/${item.path}`)}
              className={`${styles.navItem} ${location.pathname.includes(`/identity/${item.path}`) ? styles.active : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.main}>
          <Routes>
            <Route path="profile" element={<Profile />} />
            <Route path="communities" element={<Communities />} />
            <Route path="join" element={<JoinCommunity />} />
            <Route path="*" element={<Profile />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default IdentityView;

