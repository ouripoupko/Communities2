import React, { useState } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import InitiativeFeed from '../components/identity/InitiativeFeed';
import Communities from '../components/identity/Communities';
import Profile from '../components/identity/Profile';
import JoinCommunity from '../components/identity/JoinCommunity';
import HomepageMenu from '../components/identity/HomepageMenu';
import AboutPage from '../components/identity/AboutPage';
import ContactPage from '../components/identity/ContactPage';
import styles from './Container.module.scss';

const IdentityView: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleNavigate = (path: string) => {
    navigate(`/identity/${path}`);
  };

  return (
    <div className={styles.container}>
      <PageHeader
        title="Gloki"
        layout="homepage"
        onMenuClick={() => setMenuOpen(true)}
      />

      <HomepageMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onCreateCommunity={() => {
          navigate('/identity/communities', { state: { createCommunity: true } });
        }}
      />

      <div className={styles.content}>
        <div className={styles.main}>
          <Routes>
            <Route index element={<InitiativeFeed />} />
            <Route path="communities" element={<Communities />} />
            <Route path="profile" element={<Profile />} />
            <Route path="join" element={<JoinCommunity />} />
            <Route path="about" element={<AboutPage onBack={() => navigate('/identity')} />} />
            <Route path="contact" element={<ContactPage onBack={() => navigate('/identity')} />} />
            <Route path="hidden" element={<Communities showHidden />} />
            <Route path="*" element={<Navigate to="/identity" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default IdentityView;
