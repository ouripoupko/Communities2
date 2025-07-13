
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppDispatch } from './store/hooks';
import { fetchCurrentUser } from './store/slices/userSlice';
import LoginPage from './pages/LoginPage';
import MyIdentity from './pages/MyIdentity';
import CommunityView from './pages/CommunityView';
import IssueView from './pages/IssueView';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.scss';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCurrentUser());
    }
  }, [isAuthenticated, dispatch]);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Validating session...</p>
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
