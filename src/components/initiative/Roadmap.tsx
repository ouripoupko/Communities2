import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Sparkles, Pencil } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchRoadmap } from '../../store/slices/initiativeSlice';
import type { RoadmapSegment, EditProposal } from '../../store/slices/initiativeSlice';
import {
  addSegment,
  createEditProposal,
  voteOnProposal,
  applyProposal,
} from '../../services/contracts/initiative';
import { fetchRoadmapSynthesis } from '../../services/openai';
import { eventStreamService } from '../../services/eventStream';
import type { BlockchainEvent } from '../../services/eventStream';
import AddSegmentDialog from './dialogs/AddSegmentDialog';
import ProposeEditDialog from './dialogs/ProposeEditDialog';
import styles from './Roadmap.module.scss';

interface RoadmapProps {
  initiativeId: string;
}

const Roadmap: React.FC<RoadmapProps> = ({ initiativeId }) => {
  const { initiativeHostServer: encodedHostServer } = useParams<{
    initiativeHostServer?: string;
  }>();
  const dispatch = useAppDispatch();
  const { publicKey, serverUrl, profile } = useAppSelector((state) => state.user);
  const { roadmap, roadmapLoading } = useAppSelector((state) => state.initiative);
  const { profiles } = useAppSelector((state) => state.communities);

  const hostServer =
    encodedHostServer && encodedHostServer !== 'local'
      ? decodeURIComponent(encodedHostServer)
      : serverUrl || '';
  const effectiveServer = hostServer || serverUrl || '';
  const effectiveAgent = publicKey || '';

  const data = roadmap[initiativeId];
  const segments: RoadmapSegment[] = data?.segments ?? [];
  const editProposals: EditProposal[] = data?.editProposals ?? [];
  const proposalVotes = data?.proposalVotes ?? {};
  const members = data?.members ?? [];

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showProposeEdit, setShowProposeEdit] = useState(false);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
  const [proposeEditInitialText, setProposeEditInitialText] = useState('');
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [mobileActiveSegment, setMobileActiveSegment] = useState<string | null>(null);
  const [selectedForEdit, setSelectedForEdit] = useState<Set<string>>(new Set());

  const pendingProposals = useMemo(
    () => editProposals.filter((p) => p.status === 'pending'),
    [editProposals],
  );

  const getAuthorDisplay = (author: string) => {
    if (publicKey && author === publicKey) return 'You';
    const profile = profiles[author];
    if (profile) {
      const name = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
      if (name) return name;
    }
    return author.length > 12 ? `${author.slice(0, 12)}...` : author;
  };

  const handleContractWrite = useCallback(
    (event: BlockchainEvent) => {
      if (event.contract === initiativeId && effectiveServer && effectiveAgent) {
        dispatch(
          fetchRoadmap({
            serverUrl: effectiveServer,
            publicKey: effectiveAgent,
            contractId: initiativeId,
          }),
        );
      }
    },
    [initiativeId, effectiveServer, effectiveAgent, dispatch],
  );

  useEffect(() => {
    if (!initiativeId || !effectiveServer || !effectiveAgent) return;
    dispatch(
      fetchRoadmap({
        serverUrl: effectiveServer,
        publicKey: effectiveAgent,
        contractId: initiativeId,
      }),
    );
  }, [initiativeId, effectiveServer, effectiveAgent, dispatch]);

  useEffect(() => {
    eventStreamService.addEventListener('contract_write', handleContractWrite);
    return () => eventStreamService.removeEventListener('contract_write', handleContractWrite);
  }, [handleContractWrite]);

  const handleAddSegment = async (text: string) => {
    if (!effectiveServer || !effectiveAgent) throw new Error('Not connected');
    await addSegment(effectiveServer, effectiveAgent, initiativeId, effectiveAgent, text);
  };

  const handleProposeEdit = async (newText: string) => {
    if (!effectiveServer || !effectiveAgent || selectedSegmentIds.length === 0) return;
    const proposalId = crypto.randomUUID();
    await createEditProposal(
      effectiveServer,
      effectiveAgent,
      initiativeId,
      proposalId,
      effectiveAgent,
      selectedSegmentIds,
      newText,
    );
    setShowProposeEdit(false);
    setSelectedSegmentIds([]);
  };

  const handleVote = async (proposalId: string, support: boolean) => {
    if (!effectiveServer || !effectiveAgent) return;
    await voteOnProposal(
      effectiveServer,
      effectiveAgent,
      initiativeId,
      proposalId,
      effectiveAgent,
      support,
    );
  };

  const handleApplyProposal = async (proposalId: string) => {
    if (!effectiveServer || !effectiveAgent) return;
    await applyProposal(effectiveServer, effectiveAgent, initiativeId, proposalId);
  };

  const handleAskAI = async () => {
    const apiKey = profile?.openaiApiKey;
    if (!apiKey?.trim()) {
      alert('Please add your OpenAI API key in your profile to use AI synthesis.');
      return;
    }
    setAiLoading(true);
    setAiDraft(null);
    try {
      const result = await fetchRoadmapSynthesis(apiKey, segments);
      setAiDraft(result);
    } catch (err) {
      console.error(err);
      alert('AI synthesis failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAdoptAsProposal = () => {
    if (!aiDraft) return;
    const refined = aiDraft
      .split(/\n+/)
      .map((s) => s.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
    const newText = refined.join('\n\n');
    setSelectedSegmentIds(segments.map((s) => s.id));
    setProposeEditInitialText(newText);
    setShowProposeEdit(true);
    setAiDraft(null);
    setSelectedForEdit(new Set());
  };

  const startProposeEdit = (segmentIds: string[], texts: string[]) => {
    setSelectedSegmentIds(segmentIds);
    setProposeEditInitialText(texts.join(' '));
    setShowProposeEdit(true);
    setSelectedForEdit(new Set());
  };

  const toggleSegmentSelection = (segId: string) => {
    setSelectedForEdit((prev) => {
      const next = new Set(prev);
      if (next.has(segId)) next.delete(segId);
      else next.add(segId);
      return next;
    });
  };

  const openProposeEditFromSelection = () => {
    const ids = Array.from(selectedForEdit);
    const texts = ids
      .map((id) => segments.find((s) => s.id === id)?.text)
      .filter(Boolean) as string[];
    if (ids.length > 0) {
      startProposeEdit(ids, texts);
    }
    setSelectedForEdit(new Set());
  };

  const segmentOrder = useMemo(() => segments.map((s) => s.id), [segments]);
  const proposalByLastSegment = useMemo(() => {
    const map = new Map<string, EditProposal>();
    for (const p of pendingProposals) {
      let lastIdx = -1;
      for (const id of p.segmentIds) {
        const idx = segmentOrder.indexOf(id);
        if (idx > lastIdx) lastIdx = idx;
      }
      if (lastIdx >= 0) {
        const lastId = segmentOrder[lastIdx];
        map.set(lastId, p);
      }
    }
    return map;
  }, [pendingProposals, segmentOrder]);

  const supportCount = (proposalId: string) =>
    Object.values(proposalVotes[proposalId] ?? {}).filter(Boolean).length;
  const rejectCount = (proposalId: string) =>
    Object.values(proposalVotes[proposalId] ?? {}).filter((v) => !v).length;
  const majorityThreshold = Math.floor(members.length / 2) + 1;
  const hasUserVoted = (proposalId: string) =>
    effectiveAgent && proposalId in (proposalVotes[proposalId] ?? {});

  if (roadmapLoading[initiativeId]) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>Loading roadmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Roadmap</h2>
          <p>Collaborative vision — add segments, propose edits, vote on changes</p>
        </div>
        <div className={styles.headerActions}>
          {selectedForEdit.size > 0 && (
            <button
              type="button"
              className={styles.addButton}
              onClick={openProposeEditFromSelection}
            >
              <Pencil size={18} />
              Propose Edit ({selectedForEdit.size})
            </button>
          )}
          <button
            type="button"
            className={styles.aiButton}
            onClick={handleAskAI}
            disabled={aiLoading || segments.length === 0}
          >
            <Sparkles size={18} />
            {aiLoading ? 'Synthesizing...' : 'Ask AI to Synthesize'}
          </button>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setShowAddDialog(true)}
          >
            <Plus size={20} />
            Add
          </button>
        </div>
      </div>

      <div className={styles.document}>
        {segments.length === 0 && pendingProposals.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No segments yet. Add the first contribution to the roadmap.</p>
          </div>
        ) : (
          <>
            {segments.map((seg, idx) => {
              const proposal = proposalByLastSegment.get(seg.id);
              return (
                <React.Fragment key={seg.id}>
                  <span
                    className={`${styles.segment} ${mobileActiveSegment === seg.id ? styles.mobileActive : ''} ${selectedForEdit.has(seg.id) ? styles.selected : ''}`}
                    onMouseEnter={() => setMobileActiveSegment(null)}
                    onTouchStart={() =>
                      setMobileActiveSegment((prev) => (prev === seg.id ? null : seg.id))
                    }
                  >
                    <input
                      type="checkbox"
                      className={styles.segmentCheckbox}
                      checked={selectedForEdit.has(seg.id)}
                      onChange={() => toggleSegmentSelection(seg.id)}
                      onClick={(e) => e.stopPropagation()}
                      title="Select for edit"
                    />
                    <span className={styles.segmentText}>{seg.text}</span>
                    <span className={styles.segmentMeta}>{getAuthorDisplay(seg.author)}</span>
                    <span className={styles.segmentActions}>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => startProposeEdit([seg.id], [seg.text])}
                        title="Propose edit"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    </span>
                    {idx < segments.length - 1 ? ' ' : ''}
                  </span>
                  {proposal && (
                    <div className={styles.proposalOverlay}>
                      <div className={styles.proposalLabel}>Suggestion</div>
                      <div className={styles.proposalText}>{proposal.newText}</div>
                      <div className={styles.proposalActions}>
                        {!hasUserVoted(proposal.id) ? (
                          <>
                            <button
                              type="button"
                              className={styles.supportBtn}
                              onClick={() => handleVote(proposal.id, true)}
                            >
                              Support
                            </button>
                            <button
                              type="button"
                              className={styles.rejectBtn}
                              onClick={() => handleVote(proposal.id, false)}
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        <span className={styles.voteCount}>
                          Support: {supportCount(proposal.id)} / Reject: {rejectCount(proposal.id)}
                        </span>
                        {supportCount(proposal.id) >= majorityThreshold && (
                          <button
                            type="button"
                            className={styles.supportBtn}
                            onClick={() => handleApplyProposal(proposal.id)}
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {pendingProposals
              .filter((p) => !p.segmentIds.some((id) => segmentOrder.includes(id)))
              .map((p) => (
                <div key={p.id} className={styles.proposalOverlay}>
                  <div className={styles.proposalLabel}>Orphaned proposal</div>
                  <div className={styles.proposalText}>{p.newText}</div>
                  <div className={styles.proposalActions}>
                    {!hasUserVoted(p.id) ? (
                      <>
                        <button
                          type="button"
                          className={styles.supportBtn}
                          onClick={() => handleVote(p.id, true)}
                        >
                          Support
                        </button>
                        <button
                          type="button"
                          className={styles.rejectBtn}
                          onClick={() => handleVote(p.id, false)}
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    <span className={styles.voteCount}>
                      Support: {supportCount(p.id)} / Reject: {rejectCount(p.id)}
                    </span>
                    {supportCount(p.id) >= majorityThreshold && (
                      <button
                        type="button"
                        className={styles.supportBtn}
                        onClick={() => handleApplyProposal(p.id)}
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </>
        )}
      </div>

      {aiDraft && (
        <div className={styles.aiDraft}>
          <div className={styles.draftTitle}>AI Refined Segments</div>
          <div className={styles.draftContent}>{aiDraft}</div>
          <button type="button" className={styles.adoptBtn} onClick={handleAdoptAsProposal}>
            Adopt as my Proposal
          </button>
        </div>
      )}

      <AddSegmentDialog
        isVisible={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSubmit={handleAddSegment}
      />

      <ProposeEditDialog
        isVisible={showProposeEdit}
        onClose={() => {
          setShowProposeEdit(false);
          setSelectedSegmentIds([]);
        }}
        initialText={proposeEditInitialText}
        segmentIds={selectedSegmentIds}
        onSubmit={handleProposeEdit}
      />
    </div>
  );
};

export default Roadmap;
