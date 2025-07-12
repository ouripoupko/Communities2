
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import MyIdentity from './pages/MyIdentity';
import CommunityView from './pages/CommunityView';
import IssueView from './pages/IssueView';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.scss';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/identity" replace />} />
        <Route path="/identity/*" element={<MyIdentity />} />
        <Route path="/community/:communityId/*" element={<CommunityView />} />
        <Route path="/issue/:issueId/*" element={<IssueView />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
