
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
const PolicyDetailPage = lazy(() => import('./pages/PolicyDetailPage'));
const IssueView = lazy(() => import('./pages/IssueView'));
const InitiativeView = lazy(() => import('./pages/collaboration/InitiativeView'));
const WishView = lazy(() => import('./pages/collaboration/WishView'));
const AgreementView = lazy(() => import('./pages/collaboration/AgreementView'));

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
          <Route path="/community/:communityId/policy/:policyId" element={<PolicyDetailPage />} />
          <Route path="/community/:communityId/*" element={<CommunityView />} />
          <Route path="/issue/:issueHostServer/:issueHostAgent/:communityId/:issueId/*" element={<IssueView />} />
          <Route path="/initiative/:initiativeHostServer/:initiativeHostAgent/:initiativeId/*" element={<InitiativeView />} />
          <Route path="/wish/:wishId/*" element={<WishView />} />
          <Route path="/agreement/:agreementId" element={<AgreementView />} />
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
