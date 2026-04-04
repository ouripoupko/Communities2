import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { useAppSelector } from '../../../store/hooks';
import CountryBadge from '../../collaboration/flows/shared/CountryBadge';
import { getTopics, createTopic } from './chatApi';
import styles from './ChatTopicList.module.scss';

interface ChatTopicListProps {
  communityId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ChatTopicList: React.FC<ChatTopicListProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const publicKey = useAppSelector((state) => state.user.publicKey);
  const profiles = useAppSelector((state) => state.communities.profiles);

  const [refreshKey, setRefreshKey] = useState(0);
  const [newTitle, setNewTitle] = useState('');

  let topics: ReturnType<typeof getTopics> = [];
  try {
    topics = getTopics(communityId);
  } catch {
    // chatApi may fail on corrupt state
  }

  const handleCreate = () => {
    const trimmed = newTitle.trim();
    if (!trimmed || !publicKey) return;
    createTopic(communityId, trimmed, publicKey);
    setNewTitle('');
    setRefreshKey(k => k + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div className={styles.container} data-refresh={refreshKey}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Chat</h2>
        <p>Open conversations about anything in your community.</p>
      </div>

      {/* New topic input */}
      <div className={styles.inputBar}>
        <input
          className={styles.titleInput}
          type="text"
          placeholder="Start a new topic…"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className={styles.newTopicBtn}
          onClick={handleCreate}
          disabled={!newTitle.trim() || !publicKey}
        >
          New Topic
        </button>
      </div>

      {/* Topic list */}
      {topics.length === 0 ? (
        <div className={styles.empty}>
          <MessageSquare size={36} />
          <p>No topics yet. Start a conversation!</p>
        </div>
      ) : (
        <div className={styles.topicList}>
          {topics.map(topic => {
            const profile = profiles?.[topic.author];
            const fullName = profile
              ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
              : null;
            const displayName = fullName || topic.author.slice(0, 12) + '…';
            const countryCode = profile?.country;

            return (
              <button
                key={topic.id}
                className={styles.topicCard}
                onClick={() => navigate(`/community/${communityId}/chat/${topic.id}`)}
              >
                <div className={styles.topicTitle}>{topic.title}</div>
                <div className={styles.topicMeta}>
                  <span className={styles.author}>
                    {displayName}
                    <CountryBadge countryCode={countryCode} />
                  </span>
                  <span className={styles.metaDivider}>·</span>
                  <span className={styles.msgCount}>
                    <MessageSquare size={12} />
                    {topic.messageCount}
                  </span>
                  <span className={styles.metaDivider}>·</span>
                  <span className={styles.timeAgo}>{timeAgo(topic.lastActivity)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChatTopicList;
