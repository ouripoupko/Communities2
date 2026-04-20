import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GitBranch, Coins, Users2, Shield, Globe } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createCommunity } from '../services/contracts/community';
import { isDemoContract } from '../services/demo/demoRegistry';
import { seedDemoCommunity } from '../services/demo/seedDemoCommunity';
import { fetchContracts } from '../store/slices/userSlice';
import styles from './CreateCommunityPage.module.scss';

const FEATURES = [
  {
    name: 'Governance Pipeline',
    icon: GitBranch,
    description: '5-stage democratic process from problem recognition to mandated action',
  },
  {
    name: 'Community Currency',
    icon: Coins,
    description: 'Mint, send, and manage a currency owned by your community',
  },
  {
    name: 'Collaboration Tools',
    icon: Users2,
    description: 'Shared workspaces for documents, tasks, scheduling, and roles',
  },
  {
    name: 'Identity & Trust',
    icon: Shield,
    description: 'Verify members through a web of trust, QR-based identity cards',
  },
  {
    name: 'AI Translation',
    icon: Globe,
    description: 'Automatic translation across 12 languages so everyone can participate',
  },
];

const CreateCommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { publicKey, serverUrl, profileContractId } = useAppSelector((s) => s.user);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Please enter a community name');
      return;
    }
    if (!serverUrl || !publicKey) {
      setError('Not logged in');
      return;
    }

    setIsSubmitting(true);
    try {
      const contractId = await createCommunity(
        serverUrl,
        publicKey,
        name.trim(),
        description.trim(),
        profileContractId,
      );

      if (contractId && isDemoContract(contractId)) {
        seedDemoCommunity(contractId, publicKey);
      }

      // Refresh the contracts list so the new (including demo) community shows up.
      await dispatch(fetchContracts());

      navigate(contractId && isDemoContract(contractId) ? `/community/${contractId}` : '/identity/communities');
    } catch {
      setError('Failed to create community. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/identity/communities')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Create a Community</h1>
      </div>

      {/* What is a Community? */}
      <div className={styles.card}>
        <h2>What is a Community on Gloki?</h2>
        <p>
          A community is a group of people united by a shared interest, location, cause, or goal.
          On Gloki, communities are spaces for collective decision-making — where members can
          identify problems, propose solutions, and vote on actions together.
        </p>
        <p>
          Every community on Gloki has access to the same democratic tools: a 5-stage governance
          pipeline, community currency, collaboration workspaces, and identity verification.
        </p>
      </div>

      {/* Why Create? */}
      <div className={styles.card}>
        <h2>Why Create a Community?</h2>
        <p>
          <strong>Bring direct democracy to your group.</strong> Whether you're a neighbourhood
          association, a student union, a workplace team, or an activist collective — Gloki gives
          your group the tools to make decisions transparently and fairly.
        </p>
        <p>
          <strong>Every voice counts.</strong> Quadratic voting ensures no single person dominates
          the outcome. Thresholds ensure decisions have genuine community support before moving forward.
        </p>
        <p>
          <strong>From problems to mandates.</strong> Don't just talk about issues — turn them into
          commitments. Gloki's pipeline moves problems through discussion, proposals, and voting
          into mandates your community can act on.
        </p>
      </div>

      {/* Features */}
      <div className={styles.card}>
        <h2>What Gloki Provides Your Community</h2>
        <div className={styles.featureList}>
          {FEATURES.map((feature) => {
            const FeatureIcon = feature.icon;
            return (
              <div key={feature.name} className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <FeatureIcon size={16} />
                </div>
                <div className={styles.featureContent}>
                  <h3>{feature.name}</h3>
                  <p>{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <div className={styles.card}>
        <h2>What We Need From You</h2>
        <p>To create a community, we just need two things:</p>

        <div className={styles.formGroup}>
          <label htmlFor="communityName" className={styles.label}>Community name</label>
          <input
            id="communityName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Berlin Climate Action Network"
            className={styles.inputField}
            disabled={isSubmitting}
          />
          <p className={styles.hint}>This is how your community appears to other Gloki users.</p>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="communityDesc" className={styles.label}>Description</label>
          <textarea
            id="communityDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this community about? What are you trying to achieve?"
            className={`${styles.inputField} ${styles.textarea}`}
            rows={4}
            disabled={isSubmitting}
          />
          <p className={styles.hint}>A good description helps attract the right members.</p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <button
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={isSubmitting || !name.trim()}
        >
          {isSubmitting ? 'Creating...' : 'Create Community'}
        </button>
      </div>
    </div>
  );
};

export default CreateCommunityPage;
