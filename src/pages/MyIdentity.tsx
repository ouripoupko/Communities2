import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Users, QrCode, LogOut } from 'lucide-react';
import Profile from '../components/identity/Profile';
import Communities from '../components/identity/Communities';
import JoinCommunity from '../components/identity/JoinCommunity';
import '../components/layout/Layout.scss';

const MyIdentity: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
    <div className="identity-view-container">
      <div className="identity-header">
        <div className="header-left">
          <div className="identity-info">
            <div className="identity-title-row">
              <h1>My Identity</h1>
              <button onClick={handleLogout} className="logout-button">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
            <div className="user-info">
              <div className="user-key">
                <span className="label">Key:</span>
                <span className="value">{user?.publicKey}</span>
              </div>
              <div className="user-server">
                <span className="label">Server:</span>
                <span className="value">{user?.serverUrl}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="identity-content">
        <nav className="identity-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(`/identity/${item.path}`)}
              className={`nav-item ${window.location.pathname.includes(`/identity/${item.path}`) ? 'active' : ''}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="identity-main">
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

export default MyIdentity; 