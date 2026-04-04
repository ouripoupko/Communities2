import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useSwipeRef } from '../../hooks/useSwipeNavigation';
import { contractRead, contractWrite } from '../../services/api';
import { fetchCommunityMembers } from '../../store/slices/communitiesSlice';
import type { IMethod } from '../../services/interfaces';
import type { PipelineStage } from '../../types/initiative';
import ProblemVoteFlow from './flows/voting/ProblemVoteFlow';
import DiscussionFlow from './flows/discussion/DiscussionFlow';
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
    hint: 'Review the evidence. Does this problem truly cross borders? 67% community upvote required to advance. 50% of concerns must be resolved.',
  },
  {
    id: 'discussion',
    label: 'Discussion',
    hint: 'Add nuances and perspectives. What does this look like in your country? 33% community participation required to advance.',
  },
  {
    id: 'proposals',
    label: 'Proposals',
    hint: 'Suggest solutions with evidence. Upvote the best ones. Top 3 proposals advance to voting.',
  },
  {
    id: 'vote',
    label: 'Vote',
    hint: 'Allocate your voting credits to the proposals you support most. Votes are weighted by the square root of credits.',
  },
  {
    id: 'mandate',
    label: 'Mandate',
    hint: 'The community has spoken. Pledge your support and track progress on the mandate.',
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
  const [viewStage, setViewStage] = useState<PipelineStage>('problem');
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const [showConcerns, setShowConcerns] = useState(false);
  const [advancing, setAdvancing] = useState(false);

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
          setViewStage(result as PipelineStage);
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

  useEffect(() => {
    if (!serverUrl || !publicKey || !communityId) return;
    if (communityMembers[communityId]) return;
    dispatch(fetchCommunityMembers({ serverUrl, publicKey, contractId: communityId }));
  }, [serverUrl, publicKey, communityId, communityMembers, dispatch]);

  const memberCount = Array.isArray(communityMembers[communityId])
    ? communityMembers[communityId].length
    : 0;

  const currentStageIndex = STAGES.findIndex((s) => s.id === stage);
  const viewStageIndex = STAGES.findIndex((s) => s.id === viewStage);
  const viewStageConfig = STAGES[viewStageIndex];
  const nextStage = currentStageIndex < STAGES.length - 1 ? STAGES[currentStageIndex + 1] : null;
  const isViewingCurrentStage = viewStage === stage;

  const pipelineSwipeRef = useSwipeRef<HTMLDivElement>({
    onSwipeLeft: () => {
      const nextIdx = viewStageIndex + 1;
      if (nextIdx < STAGES.length) setViewStage(STAGES[nextIdx].id);
    },
    onSwipeRight: () => {
      const prevIdx = viewStageIndex - 1;
      if (prevIdx >= 0) setViewStage(STAGES[prevIdx].id);
    },
  });

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
      setViewStage(nextStage.id);
    } catch {
      // silently fail
    } finally {
      setAdvancing(false);
    }
  };

  const flowInstanceId = `${collaborationId}_${viewStage}`;

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
        backButtonText="Initiatives"
        onBackClick={() => navigate(`/community/${communityId}/initiative`)}
        title={title}
        layout="two-row"
      />

      <div className={cs.content}>
        <div className={cs.main} ref={pipelineSwipeRef}>
          {/* Pipeline labels */}
          <div className={styles.pipelineLabels}>
            <span className={styles.pipelineEndLabel}>Global Problem</span>
            <span className={styles.pipelineEndLabel}>Global Solution</span>
          </div>

          {/* Pipeline progress bar */}
          <div className={styles.pipeline}>
            {STAGES.map((s, idx) => {
              const isCompleted = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              const isViewing = idx === viewStageIndex;
              return (
                <React.Fragment key={s.id}>
                  {idx > 0 && (
                    <div className={`${styles.connector} ${isCompleted ? styles.connectorCompleted : ''}`} />
                  )}
                  <button className={styles.stageBtn} onClick={() => setViewStage(s.id)}>
                    <div
                      className={`${styles.stageDot} ${isCompleted ? styles.completed : ''} ${isCurrent ? styles.current : ''} ${isViewing ? styles.viewing : ''}`}
                    >
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span
                      className={`${styles.stageLabel} ${isCurrent ? styles.currentLabel : ''} ${isViewing && !isCurrent ? styles.viewingLabel : ''}`}
                    >
                      {s.label}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Stage hint */}
          {viewStageConfig && (
            <div className={styles.stageHint}>
              {!isViewingCurrentStage && <span className={styles.previewBadge}>Preview</span>}
              {viewStageConfig.hint}
            </div>
          )}

          {/* ── Step 1: Problem ── */}
          {viewStage === 'problem' && (
            <ProblemVoteFlow
              instanceId={`${collaborationId}_problem_vote`}
              description={description}
              evidenceLinks={evidenceLinks}
              countries={countries}
              communityMemberCount={memberCount}
              parentContractId={collaborationId}
              stageKey="problemVoteContractId"
            />
          )}

          {/* ── Step 2: Discussion ── */}
          {viewStage === 'discussion' && (
            <div className={styles.flowContainer}>
              <div className={styles.discussionContext}>
                <p>Add nuances and perspectives to this problem. What does it look like in your country? How does it affect your community?</p>
                <p className={styles.discussionMetric}>
                  <strong>{Math.ceil(memberCount * 0.33)} members</strong> (33% of community) must contribute for this stage to advance.
                </p>
              </div>
              <DiscussionFlow
                instanceId={flowInstanceId}
                collaborationId={collaborationId}
                collaborationType="initiative"
              />
            </div>
          )}

          {/* ── Step 3: Proposals ── */}
          {viewStage === 'proposals' && (
            <div className={styles.flowContainer}>
              {description && (
                <div className={styles.problemContext}>
                  <span className={styles.contextLabel}>The Problem:</span>
                  <p>{description}</p>
                </div>
              )}
              <ApprovalFlow
                instanceId={flowInstanceId}
                collaborationId={collaborationId}
                collaborationType="initiative"
                parentContractId={collaborationId}
                stageKey="proposalsContractId"
              />
            </div>
          )}

          {/* ── Step 4: Vote ── */}
          {viewStage === 'vote' && (
            <div className={styles.flowContainer}>
              <QVFlow
                instanceId={flowInstanceId}
                collaborationId={collaborationId}
                collaborationType="initiative"
                parentContractId={collaborationId}
                stageKey="voteContractId"
              />
            </div>
          )}

          {/* ── Step 5: Mandate ── */}
          {viewStage === 'mandate' && (
            <div className={styles.mandateStage}>
              <h2>Mandate Reached</h2>
              <p>
                The community has voted and established a shared position on this issue.
                This mandate represents the collective will of community members across borders.
              </p>
              <div className={styles.mandateActions}>
                <button className={styles.pledgeBtn}>
                  Pledge Support
                </button>
                <p className={styles.mandateNote}>
                  Click to pledge your support and commit to action. Track your progress and report back to the community.
                </p>
              </div>
            </div>
          )}

          {/* Advance bar — only show when viewing current stage */}
          {isViewingCurrentStage && (
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
          )}

          {/* Concerns panel */}
          {showConcerns && (
            <div className={styles.concernsPanel}>
              <ConcernsFlow
                instanceId={`${collaborationId}_concerns`}
                collaborationId={collaborationId}
                collaborationType="initiative"
                parentContractId={collaborationId}
                stageKey="concernsContractId"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PipelineView;
