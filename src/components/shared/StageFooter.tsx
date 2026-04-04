import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, MessageCircle, Lightbulb, Vote, ScrollText } from 'lucide-react';
import styles from './StageFooter.module.scss';

const STAGES = [
  { id: 'problem', label: 'Problem', icon: AlertCircle, path: '/stage/problem' },
  { id: 'discussion', label: 'Discuss', icon: MessageCircle, path: '/stage/discussion' },
  { id: 'proposals', label: 'Proposals', icon: Lightbulb, path: '/stage/proposals' },
  { id: 'vote', label: 'Vote', icon: Vote, path: '/stage/vote' },
  { id: 'mandate', label: 'Mandate', icon: ScrollText, path: '/stage/mandate' },
] as const;

const StageFooter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide on community pages (they have their own footer)
  if (location.pathname.startsWith('/community/')) return null;

  const activeStage = STAGES.find((s) => location.pathname.startsWith(s.path))?.id ?? null;

  return (
    <nav className={styles.footer}>
      {STAGES.map((stage) => {
        const isActive = stage.id === activeStage;
        return (
          <button
            key={stage.id}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            onClick={() => navigate(stage.path)}
          >
            <stage.icon size={22} />
            <span>{stage.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default StageFooter;
