
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import StageFooter from './components/shared/StageFooter';

// Get the base path from Vite's import.meta.env.BASE_URL
const getBasename = () => {
  const baseUrl = import.meta.env.BASE_URL;
  // Remove trailing slash and return the basename
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const LoginPage = lazy(() => import('./pages/LoginPage'));
const StageFeedView = lazy(() => import('./pages/StageFeedView'));
const IdentityView = lazy(() => import('./pages/IdentityView'));
const CommunityView = lazy(() => import('./pages/CommunityView'));
const IssueView = lazy(() => import('./pages/IssueView'));
const InitiativeView = lazy(() => import('./pages/collaboration/InitiativeView'));
const WishView = lazy(() => import('./pages/collaboration/WishView'));
const AgreementView = lazy(() => import('./pages/collaboration/AgreementView'));
const CreateCommunityPage = lazy(() => import('./pages/CreateCommunityPage'));

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
    <ErrorBoundary fallbackMessage="Gloki encountered an unexpected error. Please refresh the page.">
      <Router basename={getBasename()}>
        <Suspense fallback={<div className="loading-container"><div className="loading-spinner"></div><p>Loading...</p></div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/stage/problem" replace />} />
            <Route path="/stage/:stageId" element={<StageFeedView />} />
            <Route path="/identity/*" element={<IdentityView />} />
            <Route path="/create-community" element={<CreateCommunityPage />} />
            <Route path="/community/:communityId/*" element={<CommunityView />} />
            <Route path="/issue/:issueHostServer/:issueHostAgent/:communityId/:issueId/*" element={<IssueView />} />
            <Route path="/initiative/:initiativeHostServer/:initiativeHostAgent/:communityId/:initiativeId/*" element={<InitiativeView />} />
            <Route path="/wish/:communityId/:wishId/*" element={<WishView />} />
            <Route path="/agreement/:communityId/:agreementId" element={<AgreementView />} />
          </Routes>
          <StageFooter />
        </Suspense>
      </Router>
    </ErrorBoundary>
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
