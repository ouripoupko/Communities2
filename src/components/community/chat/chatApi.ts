// ---------------------------------------------------------------------------
// Chat — local in-memory store, per-community topics and per-topic messages
// ---------------------------------------------------------------------------

export interface ChatTopic {
  id: string;
  communityId: string;
  title: string;
  author: string; // public key
  createdAt: number;
  lastActivity: number;
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  topicId: string;
  author: string; // public key
  text: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

const topicsByCommunity = new Map<string, ChatTopic[]>();
const messagesByTopic = new Map<string, ChatMessage[]>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function getCommunityTopics(communityId: string): ChatTopic[] {
  if (!topicsByCommunity.has(communityId)) {
    topicsByCommunity.set(communityId, []);
  }
  return topicsByCommunity.get(communityId)!;
}

function getTopicMessages(topicId: string): ChatMessage[] {
  if (!messagesByTopic.has(topicId)) {
    messagesByTopic.set(topicId, []);
  }
  return messagesByTopic.get(topicId)!;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

/** Returns topics for a community sorted by lastActivity descending. */
export function getTopics(communityId: string): ChatTopic[] {
  return [...getCommunityTopics(communityId)].sort(
    (a, b) => b.lastActivity - a.lastActivity
  );
}

/** Creates a new topic in the community and returns it. */
export function createTopic(communityId: string, title: string, author: string): ChatTopic {
  const now = Date.now();
  const topic: ChatTopic = {
    id: genId('topic'),
    communityId,
    title: title.trim(),
    author,
    createdAt: now,
    lastActivity: now,
    messageCount: 0,
  };
  getCommunityTopics(communityId).push(topic);
  return { ...topic };
}

/** Returns all messages for a topic in chronological order. */
export function getMessages(topicId: string): ChatMessage[] {
  return [...getTopicMessages(topicId)].sort((a, b) => a.timestamp - b.timestamp);
}

/** Adds a message to a topic and updates the topic's lastActivity and messageCount. */
export function addMessage(topicId: string, text: string, author: string): ChatMessage {
  const message: ChatMessage = {
    id: genId('msg'),
    topicId,
    author,
    text: text.trim(),
    timestamp: Date.now(),
  };
  getTopicMessages(topicId).push(message);

  // Update topic metadata — find it across all communities
  for (const topics of topicsByCommunity.values()) {
    const topic = topics.find(t => t.id === topicId);
    if (topic) {
      topic.lastActivity = message.timestamp;
      topic.messageCount += 1;
      break;
    }
  }

  return { ...message };
}
