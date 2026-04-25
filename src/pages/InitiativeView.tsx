import React from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Map, AlertCircle, ListTodo } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Roadmap from '../components/initiative/Roadmap';
import Gaps from '../components/initiative/Gaps';
import Steps from '../components/initiative/Steps';
import styles from './Container.module.scss';
import type { InitiativeData } from '../types/initiative';

const InitiativeView: React.FC = () => {
  const { initiativeHostServer, initiativeHostAgent, communityId, initiativeId } = useParams<{
    initiativeHostServer: string;
    initiativeHostAgent: string;
    communityId: string;
    initiativeId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Initiative data: from location.state (when navigating from Collaborations) or synthetic fallback
  const initiative = (location.state as { initiative?: InitiativeData })?.initiative ?? getSyntheticInitiative(initiativeId!, communityId!);

  const navItems = [
    { path: 'roadmap', label: 'Roadmap', icon: Map },
    { path: 'gaps', label: 'Gaps', icon: AlertCircle },
    { path: 'steps', label: 'Steps', icon: ListTodo },
  ];

  const decodedHostServer = initiativeHostServer ? decodeURIComponent(initiativeHostServer) : 'local';

  return (
    <div className={styles.container}>
      <PageHeader
        showBackButton={true}
        backButtonText="Back to Community"
        onBackClick={() => navigate(`/community/${communityId}/collaborations`)}
        title={initiative?.title ?? 'Initiative'}
        layout="two-row"
      />

      <div className={styles.content}>
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() =>
                navigate(
                  `/initiative/${encodeURIComponent(decodedHostServer)}/${initiativeHostAgent || ''}/${communityId}/${initiativeId}/${item.path}`
                )
              }
              className={`${styles.navItem} ${
                location.pathname.includes(`/${item.path}`) ? styles.active : ''
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.main}>
          <Routes>
            <Route path="roadmap" element={<Roadmap initiativeId={initiativeId!} />} />
            <Route path="gaps" element={<Gaps initiativeId={initiativeId!} />} />
            <Route path="steps" element={<Steps initiativeId={initiativeId!} />} />
            <Route path="*" element={<Roadmap initiativeId={initiativeId!} />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

/** Fallback synthetic initiative when no state is passed (e.g. direct URL) */
function getSyntheticInitiative(initiativeId: string, _communityId: string): InitiativeData {
  return {
    id: initiativeId,
    title: 'Sample Initiative',
    description: 'This is a placeholder initiative. Data will be loaded from the contract when implemented.',
    currencyGathered: 25,
    currencyGoal: 100,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    activityCount: 12,
  };
}

export default InitiativeView;
