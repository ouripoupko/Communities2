
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Get the base path from Vite's import.meta.env.BASE_URL
const getBasename = () => {
  const baseUrl = import.meta.env.BASE_URL;
  // Remove trailing slash and return the basename
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const LoginPage = lazy(() => import('./pages/LoginPage'));
const IdentityView = lazy(() => import('./pages/IdentityView'));
const CommunityView = lazy(() => import('./pages/CommunityView'));
const IssueView = lazy(() => import('./pages/IssueView'));

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Validating session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Suspense fallback={<div className="loading-container"><div className="loading-spinner"></div><p>Loading...</p></div>}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <Router basename={getBasename()}>
      <Suspense fallback={<div className="loading-container"><div className="loading-spinner"></div><p>Loading...</p></div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/identity" replace />} />
          <Route path="/identity/*" element={<IdentityView />} />
          <Route path="/community/:communityId/*" element={<CommunityView />} />
          <Route path="/issue/:issueHostServer/:issueHostAgent/:communityId/:issueId/*" element={<IssueView />} />
        </Routes>
      </Suspense>
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
