import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Users2, MessageSquare, ChevronRight } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCollaborations } from '../../store/slices/communitiesSlice';
import {
  addCollaboration,
  type Collaboration,
} from '../../services/contracts/community';
import { getTopics } from './chat/chatApi';
import type { ChatTopic } from './chat/chatApi';
import CreateCollabDialog from './dialogs/CreateCollabDialog';
import type { CollabTemplate } from '../collaboration/collabTemplates';
import styles from './ActivityHub.module.scss';

interface ActivityHubProps {
  communityId: string;
}

const ActivityHub: React.FC<ActivityHubProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { communityMembers, membersLoading, communityCollaborations } = useAppSelector(
    (state) => state.communities,
  );
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);

  const [showCollabDialog, setShowCollabDialog] = useState(false);
  const [chatTopics, setChatTopics] = useState<ChatTopic[]>([]);

  // Membership check
  const allMembers: string[] = Array.isArray(communityMembers[communityId])
    ? communityMembers[communityId]
    : [];
  const isMember = publicKey && allMembers.includes(publicKey);

  // Collaborations split by type
  const allItems: Collaboration[] = useMemo(
    () => communityCollaborations[communityId] ?? [],
    [communityCollaborations, communityId],
  );

  const initiatives = useMemo(
    () => allItems.filter((item) => item.type === 'initiative'),
    [allItems],
  );

  const collabs = useMemo(
    () => allItems.filter((item) => item.type === 'collab'),
    [allItems],
  );

  // Fetch collaborations on mount
  useEffect(() => {
    if (!communityId || !serverUrl || !publicKey) return;
    dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
  }, [communityId, serverUrl, publicKey, dispatch]);

  // Load chat topics and refresh periodically
  useEffect(() => {
    const loadTopics = () => {
      const topics = getTopics(communityId);
      setChatTopics(topics);
    };
    loadTopics();
    const interval = setInterval(loadTopics, 5000);
    return () => clearInterval(interval);
  }, [communityId]);

  const handleCreateCollab = async (name: string, template: CollabTemplate) => {
    if (!serverUrl || !publicKey) throw new Error('Not logged in');

    const collabId = crypto.randomUUID();

    // Pre-populate tabs in localStorage based on template flowIds
    const existingTabs = JSON.parse(localStorage.getItem('collaborationTabs') || '{}');
    const tabs = template.flowIds.map((flowId) => ({
      id: crypto.randomUUID(),
      flowId,
      label: flowId,
      instanceId: crypto.randomUUID(),
    }));
    existingTabs[collabId] = tabs;
    localStorage.setItem('collaborationTabs', JSON.stringify(existingTabs));

    const newCollab: Collaboration = {
      id: collabId,
      type: 'collab',
      title: name,
      createdAt: Date.now(),
      activityCount: 0,
      hostServer: serverUrl,
      hostAgent: publicKey,
    };

    await addCollaboration(serverUrl, publicKey, communityId, newCollab);
    dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
  };

  const handleInitiativeClick = (item: Collaboration) => {
    const hostServer = item.hostServer || serverUrl || 'local';
    const hostAgent = item.hostAgent || publicKey || 'local';
    navigate(
      `/initiative/${encodeURIComponent(hostServer)}/${encodeURIComponent(hostAgent)}/${communityId}/${item.id}/roadmap`,
    );
  };

  const handleCollabClick = (item: Collaboration) => {
    navigate(`/collaboration/${communityId}/${item.id}`);
  };

  if (membersLoading[communityId] === true) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading community members...</p>
        </div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Activity</h2>
          <p>You are not yet a member of this community.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Activity</h2>
        <p>Solve problems that transcend borders — together</p>
      </div>

      {/* Initiative card */}
      <div className={`${styles.card} ${styles.initiativeCard}`}>
        <div className={styles.cardHeader}>
          <Zap size={18} className={styles.cardIcon} />
          <span className={styles.cardTitle}>Initiatives</span>
          <span className={styles.cardCount}>{initiatives.length}</span>
          <button
            className={styles.cardChevron}
            onClick={() => navigate(`/community/${communityId}/activity`)}
            title="View all initiatives"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className={styles.cardPreview}>
          {initiatives.length === 0 ? (
            <p className={styles.cardEmpty}>No initiatives yet. Start one below.</p>
          ) : (
            initiatives.slice(0, 3).map((item) => (
              <button
                key={item.id}
                className={styles.previewItem}
                onClick={() => handleInitiativeClick(item)}
              >
                <span className={styles.previewTitle}>{item.title}</span>
                <ChevronRight size={14} className={styles.previewChevron} />
              </button>
            ))
          )}
        </div>

        <button
          className={`${styles.cardAction} ${styles.initiativeAction}`}
          onClick={() => navigate(`/community/${communityId}/create-initiative`)}
        >
          Start Initiative
        </button>
      </div>

      {/* Collab card */}
      <div className={`${styles.card} ${styles.collabCard}`}>
        <div className={styles.cardHeader}>
          <Users2 size={18} className={styles.cardIcon} />
          <span className={styles.cardTitle}>Collabs</span>
          <span className={styles.cardCount}>{collabs.length}</span>
          <button
            className={styles.cardChevron}
            onClick={() => navigate(`/community/${communityId}/activity`)}
            title="View all collabs"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className={styles.cardPreview}>
          {collabs.length === 0 ? (
            <p className={styles.cardEmpty}>No collabs yet. Start one below.</p>
          ) : (
            collabs.slice(0, 3).map((item) => (
              <button
                key={item.id}
                className={styles.previewItem}
                onClick={() => handleCollabClick(item)}
              >
                <span className={styles.previewTitle}>{item.title}</span>
                <ChevronRight size={14} className={styles.previewChevron} />
              </button>
            ))
          )}
        </div>

        <button
          className={`${styles.cardAction} ${styles.collabAction}`}
          onClick={() => setShowCollabDialog(true)}
        >
          Start Collab
        </button>
      </div>

      {/* Chat card */}
      <div className={`${styles.card} ${styles.chatCard}`}>
        <div className={styles.cardHeader}>
          <MessageSquare size={18} className={styles.cardIcon} />
          <span className={styles.cardTitle}>Chat</span>
          <span className={styles.cardCount}>{chatTopics.length}</span>
          <button
            className={styles.cardChevron}
            onClick={() => navigate(`/community/${communityId}/chat`)}
            title="Open chat"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className={styles.cardPreview}>
          {chatTopics.length === 0 ? (
            <p className={styles.cardEmpty}>No topics yet. Open chat to start one.</p>
          ) : (
            chatTopics.slice(0, 2).map((topic) => (
              <button
                key={topic.id}
                className={styles.previewItem}
                onClick={() => navigate(`/community/${communityId}/chat/${topic.id}`)}
              >
                <span className={styles.previewTitle}>{topic.title}</span>
                <span className={styles.previewMeta}>{topic.messageCount} msg</span>
              </button>
            ))
          )}
        </div>

        <button
          className={`${styles.cardAction} ${styles.chatAction}`}
          onClick={() => navigate(`/community/${communityId}/chat`)}
        >
          Open Chat
        </button>
      </div>

      {/* Dialogs */}
      <CreateCollabDialog
        isVisible={showCollabDialog}
        onClose={() => setShowCollabDialog(false)}
        onSubmit={handleCreateCollab}
      />
    </div>
  );
};

export default ActivityHub;
