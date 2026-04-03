import React from 'react';
import { ArrowLeft } from 'lucide-react';
import styles from './InfoPage.module.scss';

interface ContactPageProps {
  onBack: () => void;
}

const ContactPage: React.FC<ContactPageProps> = ({ onBack }) => (
  <div className={styles.container}>
    <button className={styles.backButton} onClick={onBack}>
      <ArrowLeft size={18} />
    </button>
    <div className={styles.content}>
      <h1 className={styles.title}>Contact Gloki</h1>
      <p className={styles.text}>
        Have questions, feedback, or want to get involved?
      </p>
      <p className={styles.text}>
        Reach out to us and we'll get back to you as soon as possible.
      </p>
      <div className={styles.contactInfo}>
        <p>hello@gloki.org</p>
      </div>
    </div>
  </div>
);

export default ContactPage;
