import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, AlertTriangle } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { contractRead, contractWrite } from '../../services/api';
import { fetchCommunityMembers } from '../../store/slices/communitiesSlice';
import type { IMethod } from '../../services/interfaces';
import type { PipelineStage } from '../../types/initiative';
import ApprovalFlow from './flows/voting/ApprovalFlow';
import QVFlow from './flows/voting/QVFlow';
import ConcernsFlow from './flows/concerns/ConcernsFlow';
import PageHeader from '../PageHeader';
import cs from '../../pages/Container.module.scss';
import styles from './PipelineView.module.scss';

interface StageConfig {
  id: PipelineStage;
  label: string;
  hint: string;
}

const STAGES: StageConfig[] = [
  {
    id: 'problem',
    label: 'Problem',
    hint: 'Review the evidence. Does this problem truly cross borders?',
  },
  {
    id: 'discussion',
    label: 'Discussion',
    hint: 'Share perspectives. What does this look like in your country?',
  },
  {
    id: 'proposals',
    label: 'Proposals',
    hint: 'Suggest solutions. What should be done about this?',
  },
  {
    id: 'vote',
    label: 'Vote',
    hint: 'Allocate your voting credits to the proposals you support most.',
  },
  {
    id: 'mandate',
    label: 'Mandate',
    hint: 'The community has spoken. This is your shared position.',
  },
];

interface PipelineViewProps {
  title: string;
  collaborationId: string;
  communityId: string;
}

const PipelineView: React.FC<PipelineViewProps> = ({ title, collaborationId, communityId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const communityMembers = useAppSelector((s) => s.communities.communityMembers);

  const [stage, setStage] = useState<PipelineStage>('problem');
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const [showConcerns, setShowConcerns] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // Fetch stage and details on mount
  useEffect(() => {
    if (!serverUrl || !publicKey || !collaborationId) return;

    contractRead({
      serverUrl,
      publicKey,
      contractId: collaborationId,
      method: { name: 'get_stage', values: {} } as IMethod,
    })
      .then((result: unknown) => {
        if (typeof result === 'string' && STAGES.some((s) => s.id === result)) {
          setStage(result as PipelineStage);
        }
      })
      .catch(() => {});

    contractRead({
      serverUrl,
      publicKey,
      contractId: collaborationId,
      method: { name: 'get_details', values: {} } as IMethod,
    })
      .then((result: Record<string, unknown>) => {
        if (result && typeof result === 'object') {
          setDetails(result);
        }
      })
      .catch(() => {});
  }, [serverUrl, publicKey, collaborationId]);

  // Fetch community members if not loaded
  useEffect(() => {
    if (!serverUrl || !publicKey || !communityId) return;
    if (communityMembers[communityId]) return;
    dispatch(fetchCommunityMembers({ serverUrl, publicKey, contractId: communityId }));
  }, [serverUrl, publicKey, communityId, communityMembers, dispatch]);

  const currentStageIndex = STAGES.findIndex((s) => s.id === stage);
  const currentStageConfig = STAGES[currentStageIndex];
  const nextStage = currentStageIndex < STAGES.length - 1 ? STAGES[currentStageIndex + 1] : null;

  const handleAdvance = async () => {
    if (!nextStage || !serverUrl || !publicKey || advancing) return;
    setAdvancing(true);
    try {
      await contractWrite({
        serverUrl,
        publicKey,
        contractId: collaborationId,
        method: { name: 'set_stage', values: { stage: nextStage.id } } as IMethod,
      });
      setStage(nextStage.id);
    } catch {
      // silently fail
    } finally {
      setAdvancing(false);
    }
  };

  // Stable per-stage instance ID
  const flowInstanceId = `${collaborationId}_${stage}`;

  const evidenceLinks = Array.isArray(details.evidence)
    ? (details.evidence as string[])
    : [];
  const countries = Array.isArray(details.countries)
    ? (details.countries as string[])
    : [];
  const description = typeof details.description === 'string' ? details.description : '';

  return (
    <div className={cs.container}>
      <PageHeader
        showBackButton
        backButtonText="Activity"
        onBackClick={() => navigate(`/community/${communityId}/activity`)}
        title={title}
        layout="two-row"
      />

      <div className={cs.content}>
        <div className={cs.main}>
          {/* Pipeline progress bar */}
          <div className={styles.pipeline}>
            {STAGES.map((s, idx) => {
              const isCompleted = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <React.Fragment key={s.id}>
                  <div className={styles.stage}>
                    <span
                      className={`${styles.stageNumber} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.current : ''}`}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className={`${styles.stageLabel} ${isCurrent ? styles.currentLabel : ''}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <ChevronRight size={16} className={styles.stageArrow} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Stage hint */}
          {currentStageConfig && (
            <div className={styles.stageHint}>
              {currentStageConfig.hint}
            </div>
          )}

          {/* Stage content */}
          {stage === 'problem' && (
            <div className={styles.problemStage}>
              {description && <p className={styles.description}>{description}</p>}
              {evidenceLinks.length > 0 && (
                <div className={styles.evidence}>
                  <h4>Evidence</h4>
                  <ul>
                    {evidenceLinks.map((link, i) => (
                      <li key={i}>
                        <a href={link} target="_blank" rel="noopener noreferrer">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {countries.length > 0 && (
                <div className={styles.countries}>
                  {countries.map((code) => (
                    <span key={code} className={styles.countryChip}>
                      {code}
                    </span>
                  ))}
                </div>
              )}
              {!description && evidenceLinks.length === 0 && countries.length === 0 && (
                <p className={styles.emptyNote}>No problem details have been added yet.</p>
              )}
            </div>
          )}

          {stage === 'discussion' && (
            <div className={styles.flowContainer}>
              <p className={styles.flowNote}>
                Discussion is open. Share your perspective on this problem.
              </p>
            </div>
          )}

          {stage === 'proposals' && (
            <div className={styles.flowContainer}>
              <ApprovalFlow
                instanceId={flowInstanceId}
                collaborationId={collaborationId}
                collaborationType="initiative"
              />
            </div>
          )}

          {stage === 'vote' && (
            <div className={styles.flowContainer}>
              <QVFlow
                instanceId={flowInstanceId}
                collaborationId={collaborationId}
                collaborationType="initiative"
              />
            </div>
          )}

          {stage === 'mandate' && (
            <div className={styles.mandateStage}>
              <h2>Mandate Reached</h2>
              <p>
                The community has voted and established a shared position on this issue.
                This mandate represents the collective will of community members across
                borders.
              </p>
            </div>
          )}

          {/* Advance bar */}
          <div className={styles.advanceBar}>
            {nextStage ? (
              <button
                className={styles.advanceButton}
                onClick={handleAdvance}
                disabled={advancing}
              >
                {advancing ? 'Moving...' : `Move to ${nextStage.label}`}
              </button>
            ) : (
              <span className={styles.finalStage}>Final stage reached</span>
            )}
            <button
              className={styles.concernButton}
              onClick={() => setShowConcerns((v) => !v)}
            >
              <AlertTriangle size={14} />
              {showConcerns ? 'Hide Concerns' : 'Raise Concern'}
            </button>
          </div>

          {/* Concerns panel */}
          {showConcerns && (
            <div className={styles.concernsPanel}>
              <ConcernsFlow
                instanceId={`${collaborationId}_concerns`}
                collaborationId={collaborationId}
                collaborationType="initiative"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PipelineView;
