import React from 'react';
import { ArrowLeft } from 'lucide-react';
import styles from './InfoPage.module.scss';

interface AboutPageProps {
  onBack: () => void;
}

const AboutPage: React.FC<AboutPageProps> = ({ onBack }) => (
  <div className={styles.container}>
    <button className={styles.backButton} onClick={onBack}>
      <ArrowLeft size={18} />
    </button>
    <div className={styles.content}>
      <h1 className={styles.title}>About Gloki</h1>
      <p className={styles.text}>
        Gloki is a global direct democracy platform that empowers communities to identify
        cross-border problems, deliberate on solutions, and create mandates for collective action.
      </p>
      <p className={styles.text}>
        Built on blockchain-backed governance tools, Gloki enables transparent decision-making
        through structured pipelines — from problem identification to community mandates.
      </p>
      <p className={styles.text}>
        Every voice matters. Every vote counts.
      </p>
    </div>
  </div>
);

export default AboutPage;
