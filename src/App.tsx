
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { COLLABORATION_KINDS } from './components/collaboration/kinds';

// Get the base path from Vite's import.meta.env.BASE_URL
const getBasename = () => {
  const baseUrl = import.meta.env.BASE_URL;
  // Remove trailing slash and return the basename
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const LoginPage = lazy(() => import('./pages/LoginPage'));
const IdentityView = lazy(() => import('./pages/IdentityView'));
const CommunityView = lazy(() => import('./pages/CommunityView'));
const PolicyDetailPage = lazy(() => import('./pages/PolicyDetailPage'));
const CollaborationView = lazy(() => import('./pages/collaboration/CollaborationView'));

function AppContent() {
  const { isAuthenticated, isLoading, bootError } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Validating session...</p>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="loading-container">
        <p>{bootError}</p>
        <button className="login-button" onClick={() => window.location.reload()}>
          Reload page
        </button>
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
          <Route path="/community/:communityId/policy/:policyId" element={<PolicyDetailPage />} />
          <Route path="/community/:communityId/*" element={<CommunityView />} />
          {COLLABORATION_KINDS.map((kind) => (
            <Route
              key={kind.type}
              path={`/${kind.type}/:hostServer/:hostAgent/:collaborationId/*`}
              element={<CollaborationView kind={kind} />}
            />
          ))}
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
