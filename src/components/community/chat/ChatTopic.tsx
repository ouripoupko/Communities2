import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useAppSelector } from '../../../store/hooks';
import CountryBadge from '../../collaboration/flows/shared/CountryBadge';
import { getMessages, addMessage, getTopics } from './chatApi';
import type { ChatMessage } from './chatApi';
import styles from './ChatTopic.module.scss';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ChatTopic: React.FC = () => {
  const { communityId, topicId } = useParams<{ communityId: string; topicId: string }>();
  const navigate = useNavigate();

  const publicKey = useAppSelector((state) => state.user.publicKey);
  const profiles = useAppSelector((state) => state.communities.profiles);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      return topicId ? getMessages(topicId) : [];
    } catch {
      return [];
    }
  });
  const [inputText, setInputText] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!communityId || !topicId) {
    return <div className={styles.notFound}>Topic not found.</div>;
  }

  // Find topic for title display
  let allTopics: ReturnType<typeof getTopics> = [];
  try {
    allTopics = getTopics(communityId);
  } catch {
    // chatApi may fail on corrupt state
  }
  const topic = allTopics.find(t => t.id === topicId);

  if (!topic) {
    return (
      <div className={styles.notFound}>
        <p>Topic not found.</p>
        <p className={styles.notFoundHint}>
          This topic may have ended or was created in a previous session.
          Chat history resets on page refresh.
        </p>
        <button
          className={styles.backBtn}
          onClick={() => navigate(`/community/${communityId}/chat`)}
        >
          <ArrowLeft size={16} /> Back to Chat
        </button>
      </div>
    );
  }

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !publicKey) return;
    addMessage(topicId, trimmed, publicKey);
    setInputText('');
    try {
      setMessages(getMessages(topicId));
    } catch {
      // Refresh failed — keep existing messages
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(`/community/${communityId}/chat`)}
          title="Back to Chat"
        >
          <ArrowLeft size={18} />
        </button>
        <span className={styles.topicTitle}>{topic.title}</span>
      </div>

      {/* Message stream */}
      <div className={styles.messageStream}>
        {messages.length === 0 && (
          <div className={styles.emptyStream}>
            <p>No messages yet. Say something!</p>
          </div>
        )}

        {messages.map(msg => {
          const isOwn = msg.author === publicKey;
          const profile = profiles?.[msg.author];
          const fullName = profile
            ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
            : null;
          const displayName = isOwn
            ? 'You'
            : fullName || msg.author.slice(0, 12) + '…';
          const countryCode = profile?.country;

          return (
            <div
              key={msg.id}
              className={`${styles.message} ${isOwn ? styles.mine : ''}`}
            >
              <div className={styles.messageMeta}>
                <span className={styles.authorName}>
                  {displayName}
                  <CountryBadge countryCode={countryCode} />
                </span>
                <span className={styles.timestamp}>{formatTime(msg.timestamp)}</span>
              </div>
              <div className={styles.messageText}>{msg.text}</div>
            </div>
          );
        })}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className={styles.inputBar}>
        <textarea
          className={styles.textarea}
          rows={1}
          placeholder="Write a message…"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!inputText.trim() || !publicKey}
          title="Send"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatTopic;
