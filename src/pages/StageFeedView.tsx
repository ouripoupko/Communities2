import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, MessageCircle, Lightbulb, Vote, ScrollText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchCollaborations, fetchCommunityProperties, fetchCommunityMembers } from '../store/slices/communitiesSlice';
import { contractRead, contractWrite } from '../services/api';
import type { IMethod } from '../services/interfaces';
import type { Collaboration } from '../services/contracts/community';
import type { PipelineStage } from '../types/initiative';
import PageHeader from '../components/PageHeader';
import HomepageMenu from '../components/identity/HomepageMenu';
import StageFooter from '../components/shared/StageFooter';
import styles from './StageFeedView.module.scss';
import cs from './Container.module.scss';

interface InitiativeWithMeta extends Collaboration {
  communityId: string;
  communityName: string;
  authorName?: string;
}

interface TallyData {
  up: number;
  down: number;
  total: number;
}

const STAGE_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ size?: number }>; description: string; emptyHint: string }> = {
  problem: {
    label: 'Problem',
    icon: AlertCircle,
    description: 'Problems being identified. Vote to advance them.',
    emptyHint: 'No problems at this stage yet. Start an initiative from a community to propose a global problem.',
  },
  discussion: {
    label: 'Discussion',
    icon: MessageCircle,
    description: 'Problems under community discussion.',
    emptyHint: 'No problems in discussion. Problems advance here after reaching 67% community approval.',
  },
  proposals: {
    label: 'Proposals',
    icon: Lightbulb,
    description: 'Problems ready for solution proposals.',
    emptyHint: 'No problems at the proposals stage. Problems advance here after community discussion.',
  },
  vote: {
    label: 'Vote',
    icon: Vote,
    description: 'Formal voting on proposed solutions.',
    emptyHint: 'No problems in formal voting. Problems advance here after proposals reach approval.',
  },
  mandate: {
    label: 'Mandate',
    icon: ScrollText,
    description: 'Completed mandates — democratic decisions made.',
    emptyHint: 'No mandates yet. Mandates are created when a problem completes the full governance pipeline.',
  },
};

const StageFeedView: React.FC = () => {
  const { stageId } = useParams<{ stageId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { contracts, serverUrl, publicKey } = useAppSelector((s) => s.user);
  const { communityCollaborations, communityProperties, communityMembers } = useAppSelector((s) => s.communities);
  const profiles = useAppSelector((s) => s.communities.profiles);
  const { hidden } = useAppSelector((s) => s.preferences);

  const stage = (stageId || 'problem') as PipelineStage;
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.problem;

  const communityContracts = useMemo(
    () => contracts.filter((c) => c.contract === 'community_contract.py' && !hidden.includes(c.id)),
    [contracts, hidden],
  );

  // Fetch collaborations, properties, members for all visible communities
  useEffect(() => {
    if (!serverUrl || !publicKey) return;
    communityContracts.forEach((c) => {
      if (!communityCollaborations[c.id]) {
        dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: c.id }));
      }
      if (!communityProperties[c.id]) {
        dispatch(fetchCommunityProperties({ serverUrl, publicKey, contractId: c.id }));
      }
      if (!communityMembers[c.id]) {
        dispatch(fetchCommunityMembers({ serverUrl, publicKey, contractId: c.id }));
      }
    });
  }, [serverUrl, publicKey, communityContracts, communityCollaborations, communityProperties, communityMembers, dispatch]);

  // Collect all initiatives across communities
  const allInitiatives: InitiativeWithMeta[] = useMemo(() => {
    const result: InitiativeWithMeta[] = [];
    for (const c of communityContracts) {
      const collabs = communityCollaborations[c.id] ?? [];
      const name = communityProperties[c.id]?.name || c.name || c.id.slice(0, 8);
      for (const collab of collabs) {
        if (collab.type === 'initiative') {
          const authorProfile = collab.author && profiles ? profiles[collab.author] : undefined;
          const profileName = authorProfile ? `${authorProfile.firstName} ${authorProfile.lastName}`.trim() : '';
          const authorName = profileName || (collab.author ? collab.author.slice(0, 8) + '...' : undefined);
          result.push({ ...collab, communityId: c.id, communityName: name, authorName });
        }
      }
    }
    return result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [communityContracts, communityCollaborations, communityProperties, profiles]);

  // Fetch stages for all initiatives
  const [stages, setStages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!serverUrl || !publicKey || allInitiatives.length === 0) return;
    allInitiatives.forEach((item) => {
      if (stages[item.id]) return;
      contractRead({
        serverUrl,
        publicKey,
        contractId: item.id,
        method: { name: 'get_stage', values: {} } as IMethod,
      })
        .then((result: unknown) => {
          if (typeof result === 'string') {
            setStages((prev) => ({ ...prev, [item.id]: result }));
          }
        })
        .catch(() => {});
    });
  }, [serverUrl, publicKey, allInitiatives]);

  // Filter initiatives to current stage
  const stageInitiatives = useMemo(
    () => allInitiatives.filter((item) => stages[item.id] === stage),
    [allInitiatives, stages, stage],
  );

  // Fetch tallies for problem stage
  const [tallies, setTallies] = useState<Record<string, TallyData>>({});
  const [votingInProgress, setVotingInProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (stage !== 'problem' || !serverUrl || !publicKey) return;
    stageInitiatives.forEach((item) => {
      if (tallies[item.id]) return;
      contractRead({
        serverUrl,
        publicKey,
        contractId: item.id,
        method: { name: 'Storage', values: { key: 'problemVoteContractId' } } as IMethod,
      })
        .then((pvContractIdRaw: unknown) => {
          const pvContractId = typeof pvContractIdRaw === 'string' ? pvContractIdRaw : null;
          if (!pvContractId) return;
          return contractRead({
            serverUrl,
            publicKey,
            contractId: pvContractId,
            method: { name: 'get_tally', values: {} } as IMethod,
          });
        })
        .then((tally: unknown) => {
          if (tally && typeof tally === 'object') {
            setTallies((prev) => ({ ...prev, [item.id]: tally as TallyData }));
          }
        })
        .catch(() => {});
    });
  }, [stage, serverUrl, publicKey, stageInitiatives]);

  // Inline vote handler for problem stage
  const handleVote = useCallback(
    async (initiativeId: string, direction: 'up' | 'down') => {
      if (!serverUrl || !publicKey || votingInProgress[initiativeId]) return;
      setVotingInProgress((prev) => ({ ...prev, [initiativeId]: true }));
      try {
        // Get the problem vote sub-contract
        const pvContractIdRaw = await contractRead({
          serverUrl,
          publicKey,
          contractId: initiativeId,
          method: { name: 'Storage', values: { key: 'problemVoteContractId' } } as IMethod,
        });
        const pvContractId = typeof pvContractIdRaw === 'string' ? pvContractIdRaw : null;
        if (!pvContractId) return;

        await contractWrite({
          serverUrl,
          publicKey,
          contractId: pvContractId,
          method: { name: 'vote', values: { direction } } as IMethod,
        });

        // Refresh tally
        const tally = await contractRead({
          serverUrl,
          publicKey,
          contractId: pvContractId,
          method: { name: 'get_tally', values: {} } as IMethod,
        });
        if (tally && typeof tally === 'object') {
          setTallies((prev) => ({ ...prev, [initiativeId]: tally as TallyData }));
        }
      } catch {
        // Vote may fail if already voted — silent
      } finally {
        setVotingInProgress((prev) => ({ ...prev, [initiativeId]: false }));
      }
    },
    [serverUrl, publicKey, votingInProgress],
  );

  const handleCardClick = (item: InitiativeWithMeta) => {
    const hostServer = item.hostServer || serverUrl || 'local';
    const hostAgent = item.hostAgent || publicKey || 'local';
    navigate(
      `/initiative/${encodeURIComponent(hostServer)}/${encodeURIComponent(hostAgent)}/${item.communityId}/${item.id}/roadmap`,
    );
  };

  const handleCommunityClick = (e: React.MouseEvent, communityId: string) => {
    e.stopPropagation();
    navigate(`/community/${communityId}/initiative`);
  };

  const formatTimeAgo = (timestamp: number): string => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Loading: stages not yet fetched for any initiative
  const isLoading = allInitiatives.length > 0 && Object.keys(stages).length < allInitiatives.length;

  const StageIcon = config.icon;

  const handleMenuNavigate = (path: string) => {
    navigate(`/identity/${path}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={cs.container}>
      <PageHeader
        title="Gloki"
        layout="homepage"
        onMenuClick={() => setMenuOpen(true)}
      />

      <HomepageMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleMenuNavigate}
        onLogout={handleLogout}
        onCreateCommunity={() => {
          navigate('/identity/communities', { state: { createCommunity: true } });
        }}
      />

      <div className={styles.feedContainer}>
        {stageInitiatives.length === 0 ? (
          <div className={styles.empty}>
            <StageIcon size={48} />
            <h3>{isLoading ? 'Loading initiatives...' : `No ${config.label} items`}</h3>
            <p>{isLoading ? 'Fetching data from communities...' : config.emptyHint}</p>
          </div>
        ) : (
          stageInitiatives.map((item) => {
            const tally = tallies[item.id];
            const memberCount = Array.isArray(communityMembers[item.communityId])
              ? communityMembers[item.communityId].length
              : 0;
            const threshold = Math.ceil(memberCount * 0.67);

            return (
              <div key={item.id} className={styles.card} onClick={() => handleCardClick(item)}>
                <div className={styles.cardMeta}>
                  <button
                    className={styles.communityBadge}
                    onClick={(e) => handleCommunityClick(e, item.communityId)}
                  >
                    {item.communityName}
                  </button>
                  {item.authorName && (
                    <span className={styles.author}>{item.authorName}</span>
                  )}
                  {item.createdAt && (
                    <span className={styles.time}>{formatTimeAgo(item.createdAt)}</span>
                  )}
                </div>

                <h3 className={styles.cardTitle}>{item.title || 'Untitled Initiative'}</h3>
                {item.description && (
                  <p className={styles.cardDescription}>{item.description}</p>
                )}

                {/* Stage-specific inline content */}
                {stage === 'problem' && tally && (
                  <div className={styles.voteRow}>
                    <div className={styles.voteButtons}>
                      <button
                        className={styles.voteUp}
                        onClick={(e) => { e.stopPropagation(); handleVote(item.id, 'up'); }}
                        disabled={!!votingInProgress[item.id]}
                      >
                        Approve {tally.up}
                      </button>
                      <button
                        className={styles.voteDown}
                        onClick={(e) => { e.stopPropagation(); handleVote(item.id, 'down'); }}
                        disabled={!!votingInProgress[item.id]}
                      >
                        Reject {tally.down}
                      </button>
                    </div>
                    {memberCount > 0 && (
                      <div className={styles.progressRow}>
                        <div className={styles.progressBar}>
                          <div
                            className={`${styles.progressFill} ${tally.up >= threshold ? styles.progressMet : ''}`}
                            style={{ width: `${Math.min((tally.up / threshold) * 100, 100)}%` }}
                          />
                        </div>
                        <span className={styles.progressLabel}>
                          {tally.up >= threshold
                            ? 'Threshold met'
                            : `${Math.max(threshold - tally.up, 0)} more needed`}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {stage === 'discussion' && (
                  <div className={styles.stageInfo}>
                    <MessageCircle size={14} />
                    <span>Tap to join the discussion</span>
                  </div>
                )}

                {stage === 'proposals' && (
                  <div className={styles.stageInfo}>
                    <Lightbulb size={14} />
                    <span>Tap to view and submit proposals</span>
                  </div>
                )}

                {stage === 'vote' && (
                  <div className={styles.stageInfo}>
                    <Vote size={14} />
                    <span>Tap to cast your vote</span>
                  </div>
                )}

                {stage === 'mandate' && (
                  <div className={styles.stageInfo}>
                    <ScrollText size={14} />
                    <span>Community decision reached</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <StageFooter />
    </div>
  );
};

export default StageFeedView;
