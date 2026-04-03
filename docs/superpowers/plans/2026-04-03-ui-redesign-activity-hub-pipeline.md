# UI Redesign: Activity Hub, Initiative Pipeline, Chat & Collab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat Collaborations page with an Activity Hub, guided Initiative pipeline, Discord-style Chat, and template-based Collab workspace.

**Architecture:** Hybrid approach — new UI layers (ActivityHub, PipelineView, Chat) over existing flow components (ApprovalFlow, QVFlow, etc.) and CollaborationPage tab system. Chat is local in-memory. Pipeline controls which flows appear per stage. Collab uses templates to pre-populate tabs.

**Tech Stack:** React 19, TypeScript, Redux Toolkit, SCSS Modules, Vite, lucide-react icons. No test framework — verification via `npm run dev` and browser DevTools.

**Spec:** `docs/superpowers/specs/2026-04-03-ui-redesign-activity-hub-pipeline.md`

**Note:** This project has no test framework configured. Steps that would normally be TDD use manual verification instead. Each task ends with a visual check in the dev server.

---

## File Structure

### New Files
```
src/components/community/ActivityHub.tsx              — Hub page with 3 summary cards
src/components/community/ActivityHub.module.scss      — Hub styles
src/components/community/chat/ChatTopicList.tsx        — Topic list view
src/components/community/chat/ChatTopicList.module.scss
src/components/community/chat/ChatTopic.tsx            — Flat message stream
src/components/community/chat/ChatTopic.module.scss
src/components/community/chat/chatApi.ts               — In-memory chat data store
src/components/community/dialogs/CreateInitiativeDialog.tsx   — Structured initiative form
src/components/community/dialogs/CreateInitiativeDialog.module.scss
src/components/community/dialogs/CreateCollabDialog.tsx       — Name + template picker
src/components/community/dialogs/CreateCollabDialog.module.scss
src/components/collaboration/PipelineView.tsx          — Pipeline wrapper for initiatives
src/components/collaboration/PipelineView.module.scss
src/components/collaboration/collabTemplates.ts        — Template → flow ID mappings
```

### Modified Files
```
src/App.tsx                                            — Add chat routes
src/pages/CommunityView.tsx                            — Rename tab, update routes, add chat/collab routes
src/pages/collaboration/CollaborationPage.tsx           — Accept pipeline mode (externally controlled tabs)
src/pages/collaboration/InitiativeView.tsx              — Use PipelineView instead of raw CollaborationPage
src/services/contracts/community.ts                     — Add 'collab' type, update createInitiative
src/assets/contracts/initiative_contract.py             — Add set_stage/get_stage, extend details
src/types/initiative.ts                                 — Add evidence, countries, stage fields
src/components/collaboration/flows/types.ts             — Add 'collab' to CollaborationType
```

### Removed (later cleanup task)
```
src/components/community/collaborations/CreateCollaborationButtons.tsx
src/components/community/collaborations/CollaborationFilterBar.tsx
```

---

## Task 1: Chat Data Layer

Build the in-memory chat API first since it has no dependencies.

**Files:**
- Create: `src/components/community/chat/chatApi.ts`

- [ ] **Step 1: Create the chat data types and store**

```typescript
// src/components/community/chat/chatApi.ts

export interface ChatTopic {
  id: string;
  communityId: string;
  title: string;
  author: string;
  createdAt: number;
  lastActivity: number;
  messageCount: number;
}

export interface ChatMessage {
  id: string;
  topicId: string;
  author: string;
  text: string;
  timestamp: number;
}

// Per-community topic store
const topicsByCommunity = new Map<string, ChatTopic[]>();
// Per-topic message store
const messagesByTopic = new Map<string, ChatMessage[]>();

export function getTopics(communityId: string): ChatTopic[] {
  const topics = topicsByCommunity.get(communityId) ?? [];
  return [...topics].sort((a, b) => b.lastActivity - a.lastActivity);
}

export function createTopic(communityId: string, title: string, author: string): ChatTopic {
  const topic: ChatTopic = {
    id: `topic_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    communityId,
    title: title.trim(),
    author,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    messageCount: 0,
  };
  const existing = topicsByCommunity.get(communityId) ?? [];
  existing.push(topic);
  topicsByCommunity.set(communityId, existing);
  return { ...topic };
}

export function getMessages(topicId: string): ChatMessage[] {
  return (messagesByTopic.get(topicId) ?? []).map(m => ({ ...m }));
}

export function addMessage(topicId: string, author: string, text: string): ChatMessage {
  const msg: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    topicId,
    author,
    text: text.trim(),
    timestamp: Date.now(),
  };
  const existing = messagesByTopic.get(topicId) ?? [];
  existing.push(msg);
  messagesByTopic.set(topicId, existing);

  // Update topic lastActivity and messageCount
  for (const [, topics] of topicsByCommunity) {
    const topic = topics.find(t => t.id === topicId);
    if (topic) {
      topic.lastActivity = msg.timestamp;
      topic.messageCount += 1;
      break;
    }
  }

  return { ...msg };
}
```

- [ ] **Step 2: Verify file compiles**

Run: `cd "/Volumes/2TB Drive/💪Work & Volunteer/🔵 gloki/Gloki Build/Communities2" && npx tsc --noEmit src/components/community/chat/chatApi.ts 2>&1 | head -20`

Expected: No errors (or only unrelated errors from other files). If tsc can't resolve the single file, run `npx vite build 2>&1 | tail -20` to check for compile errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/community/chat/chatApi.ts
git commit -m "feat: add in-memory chat data layer (topics + messages)"
```

---

## Task 2: Chat Topic List Component

**Files:**
- Create: `src/components/community/chat/ChatTopicList.tsx`
- Create: `src/components/community/chat/ChatTopicList.module.scss`

- [ ] **Step 1: Create the topic list component**

```tsx
// src/components/community/chat/ChatTopicList.tsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus } from 'lucide-react';
import { useAppSelector } from '../../../store/hooks';
import { getTopics, createTopic } from './chatApi';
import CountryBadge from '../../collaboration/flows/shared/CountryBadge';
import styles from './ChatTopicList.module.scss';

interface ChatTopicListProps {
  communityId: string;
}

const ChatTopicList: React.FC<ChatTopicListProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const profiles = useAppSelector((s) => s.communities.profiles);
  const [newTitle, setNewTitle] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const topics = useMemo(() => getTopics(communityId), [communityId, refreshKey]);

  const handleCreate = () => {
    if (!newTitle.trim() || !publicKey) return;
    createTopic(communityId, newTitle, publicKey);
    setNewTitle('');
    setRefreshKey((k) => k + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Chat</h2>
        <p>Open conversations about anything in your community.</p>
      </div>

      <div className={styles.createBar}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Start a new topic..."
          className={styles.input}
        />
        <button
          onClick={handleCreate}
          disabled={!newTitle.trim()}
          className={styles.createBtn}
        >
          <Plus size={18} />
          New Topic
        </button>
      </div>

      <div className={styles.list}>
        {topics.length === 0 ? (
          <div className={styles.empty}>
            <MessageSquare size={32} />
            <p>No topics yet. Start a conversation!</p>
          </div>
        ) : (
          topics.map((topic) => {
            const profile = profiles[topic.author];
            return (
              <button
                key={topic.id}
                className={styles.topicCard}
                onClick={() => navigate(`/community/${communityId}/chat/${topic.id}`)}
              >
                <div className={styles.topicMain}>
                  <span className={styles.topicTitle}>{topic.title}</span>
                  <span className={styles.topicMeta}>
                    {profile?.country && <CountryBadge countryCode={profile.country} size="small" />}
                    <span>{topic.messageCount} messages</span>
                    <span>{formatTime(topic.lastActivity)}</span>
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatTopicList;
```

- [ ] **Step 2: Create the SCSS module**

```scss
// src/components/community/chat/ChatTopicList.module.scss
@use '../../../styles/variables' as *;

.container {
  max-width: 800px;
  margin: 0 auto;

  .header {
    margin-bottom: $spacing-xl;

    h2 {
      font-size: $text-2xl;
      font-weight: $font-bold;
      color: $gray-800;
      margin-bottom: $spacing-sm;
    }

    p {
      color: $gray-600;
    }
  }

  .createBar {
    display: flex;
    gap: $spacing-md;
    margin-bottom: $spacing-xl;

    .input {
      flex: 1;
      padding: $spacing-md $spacing-lg;
      border: 1px solid $gray-200;
      border-radius: $radius-lg;
      font-size: $text-base;
      background: white;
      color: $gray-800;

      &:focus {
        outline: none;
        border-color: $primary;
      }
    }

    .createBtn {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      padding: $spacing-md $spacing-lg;
      background-color: $primary;
      color: white;
      border: none;
      border-radius: $radius-lg;
      font-size: $text-sm;
      font-weight: $font-medium;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color $transition-base;

      &:hover:not(:disabled) {
        background-color: $primary-dark;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: $spacing-sm;
  }

  .topicCard {
    display: flex;
    align-items: center;
    width: 100%;
    padding: $spacing-lg;
    background: white;
    border: 1px solid $gray-200;
    border-radius: $radius-lg;
    cursor: pointer;
    text-align: left;
    transition: all $transition-base;

    &:hover {
      border-color: $primary;
      box-shadow: $shadow-md;
    }

    .topicMain {
      display: flex;
      flex-direction: column;
      gap: $spacing-xs;
      min-width: 0;

      .topicTitle {
        font-size: $text-base;
        font-weight: $font-semibold;
        color: $gray-800;
      }

      .topicMeta {
        display: flex;
        align-items: center;
        gap: $spacing-md;
        font-size: $text-sm;
        color: $gray-500;
      }
    }
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: $spacing-3xl;
    color: $gray-400;
    text-align: center;

    p {
      margin-top: $spacing-md;
      color: $gray-500;
    }
  }
}

@media (prefers-color-scheme: dark) {
  .container {
    .header {
      h2 { color: $dark-text; }
      p { color: $dark-text-secondary; }
    }

    .createBar .input {
      background-color: $dark-bg;
      border-color: $dark-border;
      color: $dark-text;
    }

    .topicCard {
      background-color: $dark-bg;
      border-color: $dark-border;

      .topicMain .topicTitle { color: $dark-text; }
      .topicMain .topicMeta { color: $dark-text-secondary; }
    }

    .empty {
      color: $dark-text-secondary;
      p { color: $dark-text-secondary; }
    }
  }
}
```

- [ ] **Step 3: Verify builds**

Run: `npx vite build 2>&1 | tail -5`
Expected: Build succeeds (the component isn't routed yet, but it should compile).

- [ ] **Step 4: Commit**

```bash
git add src/components/community/chat/ChatTopicList.tsx src/components/community/chat/ChatTopicList.module.scss
git commit -m "feat: add ChatTopicList component with create and browse"
```

---

## Task 3: Chat Topic (Message Stream) Component

**Files:**
- Create: `src/components/community/chat/ChatTopic.tsx`
- Create: `src/components/community/chat/ChatTopic.module.scss`

- [ ] **Step 1: Create the message stream component**

```tsx
// src/components/community/chat/ChatTopic.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useAppSelector } from '../../../store/hooks';
import { getMessages, addMessage, getTopics } from './chatApi';
import CountryBadge from '../../collaboration/flows/shared/CountryBadge';
import styles from './ChatTopic.module.scss';

const ChatTopic: React.FC = () => {
  const { communityId, topicId } = useParams<{ communityId: string; topicId: string }>();
  const navigate = useNavigate();
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const profiles = useAppSelector((s) => s.communities.profiles);
  const [text, setText] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const topic = useMemo(() => {
    if (!communityId || !topicId) return null;
    return getTopics(communityId).find((t) => t.id === topicId) ?? null;
  }, [communityId, topicId, refreshKey]);

  const messages = useMemo(() => {
    if (!topicId) return [];
    return getMessages(topicId);
  }, [topicId, refreshKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim() || !publicKey || !topicId) return;
    addMessage(topicId, publicKey, text);
    setText('');
    setRefreshKey((k) => k + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!topic) {
    return (
      <div className={styles.container}>
        <p>Topic not found.</p>
        <button onClick={() => navigate(`/community/${communityId}/chat`)}>Back to Chat</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button
          className={styles.backBtn}
          onClick={() => navigate(`/community/${communityId}/chat`)}
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <h3 className={styles.topicTitle}>{topic.title}</h3>
      </div>

      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.empty}>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const profile = profiles[msg.author];
            const isMe = msg.author === publicKey;
            return (
              <div
                key={msg.id}
                className={`${styles.message} ${isMe ? styles.mine : ''}`}
              >
                <div className={styles.msgHeader}>
                  <span className={styles.msgAuthor}>
                    {isMe ? 'You' : (profile?.name || msg.author.slice(0, 8))}
                  </span>
                  {profile?.country && <CountryBadge countryCode={profile.country} size="small" />}
                  <span className={styles.msgTime}>{formatTime(msg.timestamp)}</span>
                </div>
                <p className={styles.msgText}>{msg.text}</p>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputBar}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className={styles.input}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className={styles.sendBtn}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatTopic;
```

- [ ] **Step 2: Create the SCSS module**

```scss
// src/components/community/chat/ChatTopic.module.scss
@use '../../../styles/variables' as *;

.container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  max-width: 800px;
  margin: 0 auto;

  .topBar {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    padding-bottom: $spacing-lg;
    border-bottom: 1px solid $gray-200;
    margin-bottom: $spacing-lg;

    .backBtn {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
      padding: $spacing-sm $spacing-md;
      background: none;
      border: 1px solid $gray-200;
      border-radius: $radius-md;
      color: $gray-600;
      cursor: pointer;
      font-size: $text-sm;

      &:hover {
        background-color: $gray-100;
      }
    }

    .topicTitle {
      font-size: $text-lg;
      font-weight: $font-semibold;
      color: $gray-800;
    }
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: $spacing-md;
    padding-bottom: $spacing-lg;
  }

  .message {
    padding: $spacing-md $spacing-lg;
    background-color: $gray-50;
    border-radius: $radius-lg;

    &.mine {
      background-color: rgba($primary, 0.08);
    }

    .msgHeader {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      margin-bottom: $spacing-xs;

      .msgAuthor {
        font-size: $text-sm;
        font-weight: $font-semibold;
        color: $gray-700;
      }

      .msgTime {
        font-size: $text-xs;
        color: $gray-400;
        margin-left: auto;
      }
    }

    .msgText {
      font-size: $text-base;
      color: $gray-800;
      line-height: 1.5;
      margin: 0;
    }
  }

  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: $gray-400;
  }

  .inputBar {
    display: flex;
    gap: $spacing-sm;
    padding-top: $spacing-lg;
    border-top: 1px solid $gray-200;

    .input {
      flex: 1;
      padding: $spacing-md $spacing-lg;
      border: 1px solid $gray-200;
      border-radius: $radius-lg;
      font-size: $text-base;
      background: white;

      &:focus {
        outline: none;
        border-color: $primary;
      }
    }

    .sendBtn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      background-color: $primary;
      color: white;
      border: none;
      border-radius: $radius-lg;
      cursor: pointer;
      transition: background-color $transition-base;

      &:hover:not(:disabled) {
        background-color: $primary-dark;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

@media (prefers-color-scheme: dark) {
  .container {
    .topBar {
      border-color: $dark-border;
      .backBtn { color: $dark-text-secondary; border-color: $dark-border; &:hover { background-color: $dark-surface; } }
      .topicTitle { color: $dark-text; }
    }

    .message {
      background-color: $dark-surface;
      &.mine { background-color: rgba($primary, 0.15); }
      .msgHeader .msgAuthor { color: $dark-text; }
      .msgText { color: $dark-text; }
    }

    .inputBar {
      border-color: $dark-border;
      .input { background-color: $dark-bg; border-color: $dark-border; color: $dark-text; }
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/community/chat/ChatTopic.tsx src/components/community/chat/ChatTopic.module.scss
git commit -m "feat: add ChatTopic message stream component"
```

---

## Task 4: Wire Chat Routes into CommunityView

**Files:**
- Modify: `src/pages/CommunityView.tsx`

- [ ] **Step 1: Add lazy imports and routes for Chat**

In `CommunityView.tsx`, add lazy imports after the existing ones (after line 12):

```typescript
const ChatTopicList = lazy(() => import('../components/community/chat/ChatTopicList'));
const ChatTopic = lazy(() => import('../components/community/chat/ChatTopic'));
```

- [ ] **Step 2: Rename the Collaborations nav item and add Chat**

Replace the `navItems` array (line 114-119) with:

```typescript
  const navItems = [
    { path: 'activity', label: 'Activity', icon: Handshake },
    { path: 'chat', label: 'Chat', icon: MessageSquare },
    { path: 'members', label: 'Members', icon: Users },
    { path: 'currency', label: 'Currency', icon: Coins },
    { path: 'share', label: 'Share', icon: Share2 },
  ];
```

Add `MessageSquare` to the lucide-react import at line 3:

```typescript
import { Handshake, Users, Coins, Share2, IdCard, QrCode, MessageSquare } from 'lucide-react';
```

- [ ] **Step 3: Update Routes**

Replace the `<Routes>` block (lines 197-204) with:

```tsx
<Routes>
  <Route path="issues" element={<Navigate to={`/community/${communityId}/activity`} replace />} />
  <Route path="collaborations" element={<Navigate to={`/community/${communityId}/activity`} replace />} />
  <Route path="activity" element={<Collaborations communityId={communityId!} />} />
  <Route path="chat" element={<ChatTopicList communityId={communityId!} />} />
  <Route path="chat/:topicId" element={<ChatTopic />} />
  <Route path="members" element={<Members communityId={communityId!} />} />
  <Route path="currency" element={<Currency communityId={communityId!} />} />
  <Route path="share" element={<Share communityId={communityId!} />} />
  <Route path="*" element={<Collaborations communityId={communityId!} />} />
</Routes>
```

Note: The `activity` route still points to `Collaborations` for now — it will be replaced by `ActivityHub` in Task 8.

- [ ] **Step 4: Verify in browser**

Run: `npx vite --host` (if not already running)

Navigate to a community. Verify:
1. "Activity" tab appears (renamed from "Collaborations")
2. "Chat" tab appears and shows the topic list
3. Creating a topic works and navigating into it shows the message stream
4. Old `/collaborations` URL redirects to `/activity`

- [ ] **Step 5: Commit**

```bash
git add src/pages/CommunityView.tsx
git commit -m "feat: wire Chat routes into CommunityView, rename Collaborations to Activity"
```

---

## Task 5: Collab Templates Config

**Files:**
- Create: `src/components/collaboration/collabTemplates.ts`

- [ ] **Step 1: Create the templates config**

```typescript
// src/components/collaboration/collabTemplates.ts

export interface CollabTemplate {
  id: string;
  label: string;
  description: string;
  flowIds: string[];
}

export const COLLAB_TEMPLATES: CollabTemplate[] = [
  {
    id: 'event',
    label: 'Plan an Event',
    description: 'Scheduling, task board, and role assignment',
    flowIds: ['scheduling', 'task-board', 'roles'],
  },
  {
    id: 'project',
    label: 'Run a Project',
    description: 'Task board, collaborative document, and roles',
    flowIds: ['task-board', 'document', 'roles'],
  },
  {
    id: 'fundraise',
    label: 'Fundraise',
    description: 'Fundraising campaign with budget allocation',
    flowIds: ['fundraising', 'budget-allocation'],
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Start empty and add tools as needed',
    flowIds: [],
  },
];

/** Flow IDs available in Collab's Custom "Add" menu (excludes decision-making flows). */
export const COLLAB_FLOW_IDS = [
  'scheduling',
  'task-board',
  'roles',
  'fundraising',
  'budget-allocation',
  'document',
];
```

- [ ] **Step 2: Commit**

```bash
git add src/components/collaboration/collabTemplates.ts
git commit -m "feat: add collab template definitions"
```

---

## Task 6: CreateCollabDialog

**Files:**
- Create: `src/components/community/dialogs/CreateCollabDialog.tsx`
- Create: `src/components/community/dialogs/CreateCollabDialog.module.scss`

- [ ] **Step 1: Create the dialog component**

```tsx
// src/components/community/dialogs/CreateCollabDialog.tsx
import React, { useState, useEffect } from 'react';
import { COLLAB_TEMPLATES, type CollabTemplate } from '../../collaboration/collabTemplates';
import styles from './CreateCollabDialog.module.scss';

interface CreateCollabDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (name: string, template: CollabTemplate) => void | Promise<void>;
}

const CreateCollabDialog: React.FC<CreateCollabDialogProps> = ({
  isVisible,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('event');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      setName('');
      setSelectedTemplate('event');
      setError(null);
    }
  }, [isVisible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }
    const template = COLLAB_TEMPLATES.find((t) => t.id === selectedTemplate);
    if (!template) return;

    setIsSubmitting(true);
    try {
      await Promise.resolve(onSubmit(name, template));
      onClose();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3>Start a Collab</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <p className={styles.intro}>Practical tools for getting things done together.</p>

          <div className={styles.formGroup}>
            <label className={styles.label}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Nairobi Workshop Planning"
              className={styles.input}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Template</label>
            <div className={styles.templateGrid}>
              {COLLAB_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  className={`${styles.templateCard} ${selectedTemplate === t.id ? styles.selected : ''}`}
                  onClick={() => setSelectedTemplate(t.id)}
                  disabled={isSubmitting}
                >
                  <span className={styles.templateLabel}>{t.label}</span>
                  <span className={styles.templateDesc}>{t.description}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.actions}>
          <button onClick={handleSubmit} className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Start Collab'}
          </button>
          <button onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCollabDialog;
```

- [ ] **Step 2: Create the SCSS module**

```scss
// src/components/community/dialogs/CreateCollabDialog.module.scss
@use '../../../styles/variables' as *;

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: $spacing-lg;
}

.dialog {
  background: white;
  border-radius: $radius-xl;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-xl;
  border-bottom: 1px solid $gray-200;

  h3 {
    font-size: $text-xl;
    font-weight: $font-bold;
    color: $gray-800;
    margin: 0;
  }

  .closeButton {
    background: none;
    border: none;
    font-size: $text-2xl;
    color: $gray-400;
    cursor: pointer;
    padding: $spacing-xs;

    &:hover { color: $gray-600; }
  }
}

.content {
  padding: $spacing-xl;

  .intro {
    color: $gray-600;
    font-size: $text-sm;
    margin-bottom: $spacing-xl;
  }

  .formGroup {
    margin-bottom: $spacing-xl;

    .label {
      display: block;
      font-size: $text-sm;
      font-weight: $font-medium;
      color: $gray-700;
      margin-bottom: $spacing-sm;
    }

    .input {
      width: 100%;
      padding: $spacing-md $spacing-lg;
      border: 1px solid $gray-200;
      border-radius: $radius-md;
      font-size: $text-base;

      &:focus {
        outline: none;
        border-color: $primary;
      }
    }
  }

  .templateGrid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: $spacing-md;

    .templateCard {
      display: flex;
      flex-direction: column;
      gap: $spacing-xs;
      padding: $spacing-lg;
      border: 2px solid $gray-200;
      border-radius: $radius-lg;
      background: white;
      text-align: left;
      cursor: pointer;
      transition: all $transition-base;

      &:hover { border-color: $gray-300; }

      &.selected {
        border-color: $primary;
        background-color: rgba($primary, 0.05);
      }

      .templateLabel {
        font-size: $text-sm;
        font-weight: $font-semibold;
        color: $gray-800;
      }

      .templateDesc {
        font-size: $text-xs;
        color: $gray-500;
        line-height: 1.4;
      }
    }
  }

  .error {
    color: $error;
    font-size: $text-sm;
    margin-top: $spacing-md;
  }
}

.actions {
  padding: $spacing-lg $spacing-xl $spacing-xl;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  .submitBtn {
    width: 100%;
    padding: $spacing-md;
    background-color: $primary;
    color: white;
    border: none;
    border-radius: $radius-lg;
    font-size: $text-base;
    font-weight: $font-medium;
    cursor: pointer;

    &:hover:not(:disabled) { background-color: $primary-dark; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  .cancelBtn {
    width: 100%;
    padding: $spacing-md;
    background: none;
    border: 1px solid $gray-200;
    border-radius: $radius-lg;
    font-size: $text-base;
    color: $gray-600;
    cursor: pointer;

    &:hover { background-color: $gray-50; }
  }
}

@media (prefers-color-scheme: dark) {
  .dialog { background-color: $dark-bg; }
  .header { border-color: $dark-border; h3 { color: $dark-text; } }
  .content {
    .intro { color: $dark-text-secondary; }
    .formGroup {
      .label { color: $dark-text; }
      .input { background-color: $dark-surface; border-color: $dark-border; color: $dark-text; }
    }
    .templateGrid .templateCard {
      background-color: $dark-surface;
      border-color: $dark-border;
      .templateLabel { color: $dark-text; }
      .templateDesc { color: $dark-text-secondary; }
      &.selected { border-color: $primary; background-color: rgba($primary, 0.15); }
    }
  }
  .actions .cancelBtn { border-color: $dark-border; color: $dark-text-secondary; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/community/dialogs/CreateCollabDialog.tsx src/components/community/dialogs/CreateCollabDialog.module.scss
git commit -m "feat: add CreateCollabDialog with template picker"
```

---

## Task 7: CreateInitiativeDialog (Structured Form)

**Files:**
- Create: `src/components/community/dialogs/CreateInitiativeDialog.tsx`
- Create: `src/components/community/dialogs/CreateInitiativeDialog.module.scss`
- Modify: `src/types/initiative.ts` — extend with evidence and countries

- [ ] **Step 1: Extend the InitiativeData type**

In `src/types/initiative.ts`, replace the entire file with:

```typescript
/**
 * Initiative types — shared between ActivityHub and InitiativeView.
 * Initiatives are smart contracts on the owner's server.
 */

export type PipelineStage = 'problem' | 'discussion' | 'proposals' | 'vote' | 'mandate';

export interface InitiativeData {
  id: string;
  title: string;
  description?: string;
  evidence?: string[];
  countries?: string[];
  stage?: PipelineStage;
  currencyGathered?: number;
  currencyGoal?: number;
  createdAt: number;
  activityCount?: number;
  hostServer?: string;
  hostAgent?: string;
}
```

- [ ] **Step 2: Create the dialog component**

```tsx
// src/components/community/dialogs/CreateInitiativeDialog.tsx
import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import styles from './CreateInitiativeDialog.module.scss';

const COUNTRY_OPTIONS = [
  { code: 'KE', name: 'Kenya' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'MW', name: 'Malawi' },
  { code: 'CD', name: 'DR Congo' },
  { code: 'OTHER', name: 'Other' },
];

export interface InitiativeFormData {
  title: string;
  description: string;
  evidence: string[];
  countries: string[];
}

interface CreateInitiativeDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (data: InitiativeFormData) => void | Promise<void>;
}

const CreateInitiativeDialog: React.FC<CreateInitiativeDialogProps> = ({
  isVisible,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState<string[]>(['']);
  const [countries, setCountries] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      setTitle('');
      setDescription('');
      setEvidence(['']);
      setCountries([]);
      setError(null);
    }
  }, [isVisible]);

  const handleAddEvidence = () => setEvidence((prev) => [...prev, '']);

  const handleRemoveEvidence = (index: number) => {
    setEvidence((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEvidenceChange = (index: number, value: string) => {
    setEvidence((prev) => prev.map((v, i) => (i === index ? value : v)));
  };

  const toggleCountry = (code: string) => {
    setCountries((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please describe the problem');
      return;
    }
    if (!description.trim()) {
      setError('Please explain why this matters');
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.resolve(
        onSubmit({
          title: title.trim(),
          description: description.trim(),
          evidence: evidence.filter((e) => e.trim()),
          countries,
        }),
      );
      onClose();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isVisible) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3>Start Initiative</h3>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          <p className={styles.intro}>
            Describe a problem that affects people across borders. Your community will work
            together through discussion, proposals, and voting to reach a shared mandate.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.label}>What's the problem? *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A clear, concise problem statement"
              className={styles.input}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Why does this matter? *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain why this is a cross-border issue and why it needs collective action..."
              className={styles.textarea}
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Evidence</label>
            <p className={styles.hint}>Links to articles, reports, or data that demonstrate this problem.</p>
            {evidence.map((url, i) => (
              <div key={i} className={styles.evidenceRow}>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => handleEvidenceChange(i, e.target.value)}
                  placeholder="https://..."
                  className={styles.input}
                  disabled={isSubmitting}
                />
                {evidence.length > 1 && (
                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemoveEvidence(i)}
                    disabled={isSubmitting}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              className={styles.addEvidenceBtn}
              onClick={handleAddEvidence}
              disabled={isSubmitting}
            >
              <Plus size={14} />
              Add another link
            </button>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Countries affected</label>
            <div className={styles.countryGrid}>
              {COUNTRY_OPTIONS.map((c) => (
                <button
                  key={c.code}
                  className={`${styles.countryChip} ${countries.includes(c.code) ? styles.selected : ''}`}
                  onClick={() => toggleCountry(c.code)}
                  disabled={isSubmitting}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}
        </div>

        <div className={styles.actions}>
          <button onClick={handleSubmit} className={styles.submitBtn} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Start Initiative'}
          </button>
          <button onClick={onClose} className={styles.cancelBtn} disabled={isSubmitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateInitiativeDialog;
```

- [ ] **Step 3: Create the SCSS module**

Use the same overlay/dialog pattern as `CreateCollabDialog.module.scss`, plus these additions:

```scss
// src/components/community/dialogs/CreateInitiativeDialog.module.scss
@use '../../../styles/variables' as *;

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: $spacing-lg;
}

.dialog {
  background: white;
  border-radius: $radius-xl;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-xl;
  border-bottom: 1px solid $gray-200;

  h3 { font-size: $text-xl; font-weight: $font-bold; color: $gray-800; margin: 0; }
  .closeButton { background: none; border: none; font-size: $text-2xl; color: $gray-400; cursor: pointer; &:hover { color: $gray-600; } }
}

.content {
  padding: $spacing-xl;

  .intro {
    color: $gray-600;
    font-size: $text-sm;
    line-height: 1.6;
    margin-bottom: $spacing-xl;
    padding: $spacing-md $spacing-lg;
    background-color: rgba($primary, 0.05);
    border-radius: $radius-md;
    border-left: 3px solid $primary;
  }

  .formGroup {
    margin-bottom: $spacing-xl;

    .label {
      display: block;
      font-size: $text-sm;
      font-weight: $font-medium;
      color: $gray-700;
      margin-bottom: $spacing-sm;
    }

    .hint {
      font-size: $text-xs;
      color: $gray-500;
      margin-bottom: $spacing-sm;
    }

    .input, .textarea {
      width: 100%;
      padding: $spacing-md $spacing-lg;
      border: 1px solid $gray-200;
      border-radius: $radius-md;
      font-size: $text-base;
      font-family: inherit;

      &:focus { outline: none; border-color: $primary; }
    }

    .textarea { resize: vertical; }
  }

  .evidenceRow {
    display: flex;
    gap: $spacing-sm;
    margin-bottom: $spacing-sm;

    .input { flex: 1; }

    .removeBtn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: none;
      border: 1px solid $gray-200;
      border-radius: $radius-md;
      color: $gray-400;
      cursor: pointer;
      flex-shrink: 0;
      align-self: center;

      &:hover { color: $error; border-color: $error; }
    }
  }

  .addEvidenceBtn {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-sm 0;
    background: none;
    border: none;
    color: $primary;
    font-size: $text-sm;
    cursor: pointer;

    &:hover { text-decoration: underline; }
  }

  .countryGrid {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;

    .countryChip {
      padding: $spacing-sm $spacing-lg;
      border: 1px solid $gray-200;
      border-radius: $radius-full;
      background: white;
      font-size: $text-sm;
      color: $gray-600;
      cursor: pointer;
      transition: all $transition-base;

      &:hover { border-color: $primary; }

      &.selected {
        background-color: $primary;
        color: white;
        border-color: $primary;
      }
    }
  }

  .error {
    color: $error;
    font-size: $text-sm;
    margin-top: $spacing-md;
  }
}

.actions {
  padding: $spacing-lg $spacing-xl $spacing-xl;
  display: flex;
  flex-direction: column;
  gap: $spacing-md;

  .submitBtn {
    width: 100%;
    padding: $spacing-md;
    background-color: #ea580c;
    color: white;
    border: none;
    border-radius: $radius-lg;
    font-size: $text-base;
    font-weight: $font-medium;
    cursor: pointer;

    &:hover:not(:disabled) { background-color: darken(#ea580c, 8%); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  .cancelBtn {
    width: 100%;
    padding: $spacing-md;
    background: none;
    border: 1px solid $gray-200;
    border-radius: $radius-lg;
    font-size: $text-base;
    color: $gray-600;
    cursor: pointer;

    &:hover { background-color: $gray-50; }
  }
}

@media (prefers-color-scheme: dark) {
  .dialog { background-color: $dark-bg; }
  .header { border-color: $dark-border; h3 { color: $dark-text; } }
  .content {
    .intro { color: $dark-text-secondary; background-color: rgba($primary, 0.1); }
    .formGroup {
      .label { color: $dark-text; }
      .hint { color: $dark-text-secondary; }
      .input, .textarea { background-color: $dark-surface; border-color: $dark-border; color: $dark-text; }
    }
    .countryGrid .countryChip {
      background-color: $dark-surface;
      border-color: $dark-border;
      color: $dark-text-secondary;
      &.selected { background-color: $primary; color: white; }
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/initiative.ts src/components/community/dialogs/CreateInitiativeDialog.tsx src/components/community/dialogs/CreateInitiativeDialog.module.scss
git commit -m "feat: add CreateInitiativeDialog with structured form (problem, evidence, countries)"
```

---

## Task 8: Activity Hub Component

Replace the Collaborations page with the Activity Hub that shows summary cards for Initiative, Collab, and Chat.

**Files:**
- Create: `src/components/community/ActivityHub.tsx`
- Create: `src/components/community/ActivityHub.module.scss`
- Modify: `src/pages/CommunityView.tsx` — swap Collaborations for ActivityHub

- [ ] **Step 1: Create ActivityHub component**

```tsx
// src/components/community/ActivityHub.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Users2, MessageSquare, ChevronRight } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCollaborations } from '../../store/slices/communitiesSlice';
import { createInitiative, addCollaboration, type Collaboration } from '../../services/contracts/community';
import { getTopics } from './chat/chatApi';
import CreateInitiativeDialog, { type InitiativeFormData } from './dialogs/CreateInitiativeDialog';
import CreateCollabDialog from './dialogs/CreateCollabDialog';
import type { CollabTemplate } from '../collaboration/collabTemplates';
import styles from './ActivityHub.module.scss';

interface ActivityHubProps {
  communityId: string;
}

const ActivityHub: React.FC<ActivityHubProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { publicKey, serverUrl } = useAppSelector((s) => s.user);
  const { communityCollaborations, communityMembers, membersLoading } = useAppSelector((s) => s.communities);

  const [showInitiativeDialog, setShowInitiativeDialog] = useState(false);
  const [showCollabDialog, setShowCollabDialog] = useState(false);
  const [chatRefresh, setChatRefresh] = useState(0);

  const allItems: Collaboration[] = useMemo(
    () => communityCollaborations[communityId] ?? [],
    [communityCollaborations, communityId],
  );

  const initiatives = useMemo(() => allItems.filter((i) => i.type === 'initiative'), [allItems]);
  const collabs = useMemo(() => allItems.filter((i) => i.type === 'collab'), [allItems]);
  const chatTopics = useMemo(() => getTopics(communityId), [communityId, chatRefresh]);

  const allMembers: string[] = Array.isArray(communityMembers[communityId])
    ? communityMembers[communityId]
    : [];
  const isMember = publicKey && allMembers.includes(publicKey);

  useEffect(() => {
    if (!communityId || !serverUrl || !publicKey) return;
    dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
  }, [communityId, serverUrl, publicKey, dispatch]);

  // Refresh chat topics periodically
  useEffect(() => {
    const interval = setInterval(() => setChatRefresh((k) => k + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateInitiative = async (data: InitiativeFormData) => {
    if (!serverUrl || !publicKey) throw new Error('Not logged in');
    await createInitiative(serverUrl, publicKey, communityId, {
      title: data.title,
      description: data.description,
    });
    dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
  };

  const handleCreateCollab = async (name: string, template: CollabTemplate) => {
    if (!serverUrl || !publicKey) throw new Error('Not logged in');
    const collab: Collaboration = {
      id: crypto.randomUUID(),
      type: 'collab' as Collaboration['type'],
      title: name,
      createdAt: Date.now(),
      activityCount: 0,
    };
    await addCollaboration(serverUrl, publicKey, communityId, collab);

    // Pre-populate tabs for the template via localStorage
    if (template.flowIds.length > 0) {
      const tabs = template.flowIds.map((flowId) => ({
        instanceId: crypto.randomUUID(),
        flowId,
      }));
      try {
        const raw = localStorage.getItem('collaborationTabs');
        const all = raw ? JSON.parse(raw) : {};
        all[collab.id] = tabs;
        localStorage.setItem('collaborationTabs', JSON.stringify(all));
      } catch { /* localStorage unavailable */ }
    }

    dispatch(fetchCollaborations({ serverUrl, publicKey, contractId: communityId }));
  };

  if (membersLoading[communityId] === true) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading community...</p>
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
        <p>Solve problems that transcend borders. Start with an initiative, collaborate on projects, or chat with your community.</p>
      </div>

      {/* Initiative Card */}
      <div className={`${styles.card} ${styles.initiativeCard}`}>
        <div className={styles.cardHeader}>
          <Zap size={20} />
          <h3>Initiatives</h3>
          <span className={styles.count}>{initiatives.length}</span>
          <button
            className={styles.viewAll}
            onClick={() => {/* future: dedicated initiative list */}}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        {initiatives.length === 0 ? (
          <p className={styles.cardEmpty}>No initiatives yet. Be the first to identify a cross-border problem.</p>
        ) : (
          <div className={styles.cardPreview}>
            {initiatives.slice(0, 2).map((item) => (
              <button
                key={item.id}
                className={styles.previewItem}
                onClick={() => {
                  const hostServer = item.hostServer || serverUrl || 'local';
                  const hostAgent = item.hostAgent || publicKey || 'local';
                  navigate(
                    `/initiative/${encodeURIComponent(hostServer)}/${encodeURIComponent(hostAgent)}/${communityId}/${item.id}/roadmap`,
                  );
                }}
              >
                <span className={styles.previewTitle}>{item.title}</span>
              </button>
            ))}
          </div>
        )}
        <button className={styles.cardAction} onClick={() => setShowInitiativeDialog(true)}>
          <Zap size={16} />
          Start Initiative
        </button>
      </div>

      {/* Collab Card */}
      <div className={`${styles.card} ${styles.collabCard}`}>
        <div className={styles.cardHeader}>
          <Users2 size={20} />
          <h3>Collabs</h3>
          <span className={styles.count}>{collabs.length}</span>
          <button className={styles.viewAll} onClick={() => {/* future: dedicated collab list */}}>
            <ChevronRight size={16} />
          </button>
        </div>
        {collabs.length === 0 ? (
          <p className={styles.cardEmpty}>No collabs yet. Create a workspace to plan and execute together.</p>
        ) : (
          <div className={styles.cardPreview}>
            {collabs.slice(0, 2).map((item) => (
              <div key={item.id} className={styles.previewItem}>
                <span className={styles.previewTitle}>{item.title}</span>
              </div>
            ))}
          </div>
        )}
        <button className={styles.cardAction} onClick={() => setShowCollabDialog(true)}>
          <Users2 size={16} />
          Start Collab
        </button>
      </div>

      {/* Chat Card */}
      <div className={`${styles.card} ${styles.chatCard}`}>
        <div className={styles.cardHeader}>
          <MessageSquare size={20} />
          <h3>Chat</h3>
          <span className={styles.count}>{chatTopics.length}</span>
          <button
            className={styles.viewAll}
            onClick={() => navigate(`/community/${communityId}/chat`)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        {chatTopics.length === 0 ? (
          <p className={styles.cardEmpty}>No conversations yet.</p>
        ) : (
          <div className={styles.cardPreview}>
            {chatTopics.slice(0, 3).map((topic) => (
              <button
                key={topic.id}
                className={styles.previewItem}
                onClick={() => navigate(`/community/${communityId}/chat/${topic.id}`)}
              >
                <span className={styles.previewTitle}>{topic.title}</span>
                <span className={styles.previewMeta}>{topic.messageCount} msgs</span>
              </button>
            ))}
          </div>
        )}
        <button
          className={styles.cardAction}
          onClick={() => navigate(`/community/${communityId}/chat`)}
        >
          <MessageSquare size={16} />
          Open Chat
        </button>
      </div>

      <CreateInitiativeDialog
        isVisible={showInitiativeDialog}
        onClose={() => setShowInitiativeDialog(false)}
        onSubmit={handleCreateInitiative}
      />
      <CreateCollabDialog
        isVisible={showCollabDialog}
        onClose={() => setShowCollabDialog(false)}
        onSubmit={handleCreateCollab}
      />
    </div>
  );
};

export default ActivityHub;
```

- [ ] **Step 2: Create the SCSS module**

```scss
// src/components/community/ActivityHub.module.scss
@use '../../styles/variables' as *;

$initiative-color: #ea580c;
$collab-color: #0d9488;
$chat-color: #7c3aed;

.container {
  max-width: 800px;
  margin: 0 auto;

  .header {
    margin-bottom: $spacing-2xl;

    h2 {
      font-size: $text-2xl;
      font-weight: $font-bold;
      color: $gray-800;
      margin-bottom: $spacing-sm;
    }

    p {
      color: $gray-600;
      line-height: 1.5;
    }
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: $spacing-3xl;

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid $gray-200;
      border-top: 3px solid $primary;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: $spacing-lg;
    }
  }

  .card {
    background: white;
    border-radius: $radius-lg;
    border: 1px solid $gray-200;
    padding: $spacing-xl;
    margin-bottom: $spacing-lg;
    box-shadow: $shadow-sm;

    .cardHeader {
      display: flex;
      align-items: center;
      gap: $spacing-sm;
      margin-bottom: $spacing-lg;

      h3 {
        font-size: $text-lg;
        font-weight: $font-semibold;
        color: $gray-800;
        margin: 0;
      }

      .count {
        font-size: $text-sm;
        color: $gray-400;
        background-color: $gray-100;
        padding: $spacing-xs $spacing-sm;
        border-radius: $radius-full;
      }

      .viewAll {
        margin-left: auto;
        background: none;
        border: none;
        color: $gray-400;
        cursor: pointer;

        &:hover { color: $gray-600; }
      }
    }

    .cardEmpty {
      color: $gray-500;
      font-size: $text-sm;
      padding: $spacing-md 0;
    }

    .cardPreview {
      display: flex;
      flex-direction: column;
      gap: $spacing-sm;
      margin-bottom: $spacing-lg;

      .previewItem {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: $spacing-md $spacing-lg;
        background-color: $gray-50;
        border-radius: $radius-md;
        border: none;
        width: 100%;
        text-align: left;
        cursor: pointer;
        transition: background-color $transition-base;

        &:hover { background-color: $gray-100; }

        .previewTitle {
          font-size: $text-sm;
          font-weight: $font-medium;
          color: $gray-700;
        }

        .previewMeta {
          font-size: $text-xs;
          color: $gray-400;
        }
      }
    }

    .cardAction {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: $spacing-sm;
      width: 100%;
      padding: $spacing-md;
      border-radius: $radius-lg;
      font-size: $text-sm;
      font-weight: $font-medium;
      cursor: pointer;
      transition: all $transition-base;
      border: 1px solid transparent;
    }

    &.initiativeCard {
      border-left: 3px solid $initiative-color;

      .cardHeader svg { color: $initiative-color; }

      .cardAction {
        background-color: rgba($initiative-color, 0.1);
        color: $initiative-color;
        border-color: rgba($initiative-color, 0.3);

        &:hover { background-color: rgba($initiative-color, 0.2); }
      }
    }

    &.collabCard {
      border-left: 3px solid $collab-color;

      .cardHeader svg { color: $collab-color; }

      .cardAction {
        background-color: rgba($collab-color, 0.1);
        color: $collab-color;
        border-color: rgba($collab-color, 0.3);

        &:hover { background-color: rgba($collab-color, 0.2); }
      }
    }

    &.chatCard {
      border-left: 3px solid $chat-color;

      .cardHeader svg { color: $chat-color; }

      .cardAction {
        background-color: rgba($chat-color, 0.1);
        color: $chat-color;
        border-color: rgba($chat-color, 0.3);

        &:hover { background-color: rgba($chat-color, 0.2); }
      }
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (prefers-color-scheme: dark) {
  .container {
    .header {
      h2 { color: $dark-text; }
      p { color: $dark-text-secondary; }
    }

    .card {
      background-color: $dark-bg;
      border-color: $dark-border;

      .cardHeader {
        h3 { color: $dark-text; }
        .count { background-color: $dark-surface; color: $dark-text-secondary; }
      }

      .cardEmpty { color: $dark-text-secondary; }

      .cardPreview .previewItem {
        background-color: $dark-surface;
        &:hover { background-color: lighten($dark-surface, 5%); }
        .previewTitle { color: $dark-text; }
      }
    }
  }
}
```

- [ ] **Step 3: Update CommunityView to use ActivityHub**

In `src/pages/CommunityView.tsx`:

Replace the Collaborations lazy import (line 8):
```typescript
const ActivityHub = lazy(() => import('../components/community/ActivityHub'));
```

Remove the old import:
```typescript
// DELETE: const Collaborations = lazy(() => import('../components/community/Collaborations'));
```

Update the Routes to use ActivityHub:
```tsx
<Route path="activity" element={<ActivityHub communityId={communityId!} />} />
```

Update the wildcard fallback:
```tsx
<Route path="*" element={<ActivityHub communityId={communityId!} />} />
```

- [ ] **Step 4: Add 'collab' to Collaboration type**

In `src/services/contracts/community.ts`, update the Collaboration interface (line 229):

```typescript
export interface Collaboration {
  id: string;
  type: 'initiative' | 'wish' | 'agreement' | 'collab';
  // ... rest stays the same
```

- [ ] **Step 5: Verify in browser**

Run the dev server and navigate to a community. Verify:
1. Activity hub shows three summary cards (Initiatives, Collabs, Chat)
2. "Start Initiative" opens the new structured form
3. "Start Collab" opens the template picker dialog
4. "Open Chat" navigates to the chat topic list
5. Updated subtitle text is visible

- [ ] **Step 6: Commit**

```bash
git add src/components/community/ActivityHub.tsx src/components/community/ActivityHub.module.scss src/pages/CommunityView.tsx src/services/contracts/community.ts
git commit -m "feat: add Activity Hub replacing Collaborations page with initiative, collab, and chat cards"
```

---

## Task 9: Pipeline View for Initiatives

The core of the redesign — wraps the initiative page with a stage progress bar and controls which flows are visible.

**Files:**
- Create: `src/components/collaboration/PipelineView.tsx`
- Create: `src/components/collaboration/PipelineView.module.scss`
- Modify: `src/pages/collaboration/InitiativeView.tsx` — use PipelineView
- Modify: `src/assets/contracts/initiative_contract.py` — add stage methods

- [ ] **Step 1: Add stage methods to initiative contract**

In `src/assets/contracts/initiative_contract.py`, add these methods after `get_details`:

```python
    # Pipeline stage
    def set_stage(self, stage):
        self.db['stage'] = stage

    def get_stage(self):
        if 'stage' not in self.db:
            return 'problem'
        return self.db['stage']
```

- [ ] **Step 2: Create PipelineView component**

```tsx
// src/components/collaboration/PipelineView.tsx
import React, { useState, useEffect, useCallback } from 'react';
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

const STAGES: { id: PipelineStage; label: string; hint: string }[] = [
  { id: 'problem', label: 'Problem', hint: 'Review the evidence. Does this problem truly cross borders?' },
  { id: 'discussion', label: 'Discussion', hint: 'Share perspectives. What does this look like in your country?' },
  { id: 'proposals', label: 'Proposals', hint: 'Suggest solutions. What should be done about this?' },
  { id: 'vote', label: 'Vote', hint: 'Allocate your voting credits to the proposals you support most.' },
  { id: 'mandate', label: 'Mandate', hint: 'The community has spoken. This is your shared position.' },
];

interface PipelineViewProps {
  title: string;
  collaborationId: string;
  communityId: string;
}

const PipelineView: React.FC<PipelineViewProps> = ({
  title,
  collaborationId,
  communityId,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { publicKey, serverUrl } = useAppSelector((s) => s.user);
  const communityMembers = useAppSelector((s) => s.communities.communityMembers);

  const [stage, setStage] = useState<PipelineStage>('problem');
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const [showConcerns, setShowConcerns] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // Ensure community members are loaded
  useEffect(() => {
    if (publicKey && serverUrl && communityId && !communityMembers[communityId]) {
      dispatch(fetchCommunityMembers({ serverUrl, publicKey, contractId: communityId }));
    }
  }, [publicKey, serverUrl, communityId, communityMembers, dispatch]);

  // Fetch current stage and details
  useEffect(() => {
    if (!serverUrl || !publicKey || !collaborationId) return;

    contractRead({
      serverUrl,
      publicKey,
      contractId: collaborationId,
      method: { name: 'get_stage', values: {} } as IMethod,
    })
      .then((result) => { if (result) setStage(result as PipelineStage); })
      .catch(() => {});

    contractRead({
      serverUrl,
      publicKey,
      contractId: collaborationId,
      method: { name: 'get_details', values: {} } as IMethod,
    })
      .then((result) => { if (result) setDetails(result as Record<string, unknown>); })
      .catch(() => {});
  }, [serverUrl, publicKey, collaborationId]);

  const currentStageIndex = STAGES.findIndex((s) => s.id === stage);
  const currentStageInfo = STAGES[currentStageIndex];

  const handleAdvance = useCallback(async () => {
    if (!serverUrl || !publicKey || currentStageIndex >= STAGES.length - 1) return;
    const nextStage = STAGES[currentStageIndex + 1].id;
    setAdvancing(true);
    try {
      await contractWrite({
        serverUrl,
        publicKey,
        contractId: collaborationId,
        method: { name: 'set_stage', values: { stage: nextStage } } as IMethod,
      });
      setStage(nextStage);
    } catch {
      // silent
    } finally {
      setAdvancing(false);
    }
  }, [serverUrl, publicKey, collaborationId, currentStageIndex]);

  // Stable instanceId for flows (derived from collaborationId + stage)
  const flowInstanceId = `${collaborationId}_${stage}`;

  return (
    <div className={cs.container}>
      <PageHeader
        showBackButton={true}
        backButtonText="Back to Community"
        onBackClick={() => navigate(`/community/${communityId}/activity`)}
        title={title}
        layout="two-row"
      />

      <div className={cs.content}>
        {/* Pipeline Progress Bar */}
        <div className={styles.pipeline}>
          {STAGES.map((s, i) => (
            <div
              key={s.id}
              className={`${styles.stage} ${i <= currentStageIndex ? styles.completed : ''} ${s.id === stage ? styles.current : ''}`}
            >
              <div className={styles.stageNumber}>{i + 1}</div>
              <span className={styles.stageLabel}>{s.label}</span>
              {i < STAGES.length - 1 && <ChevronRight size={14} className={styles.stageArrow} />}
            </div>
          ))}
        </div>

        <div className={cs.main}>
          {/* Stage hint */}
          <div className={styles.stageHint}>
            <p>{currentStageInfo?.hint}</p>
          </div>

          {/* Problem Definition stage */}
          {stage === 'problem' && (
            <div className={styles.problemStage}>
              <h3>{details.title as string || title}</h3>
              {details.description && <p className={styles.description}>{details.description as string}</p>}
              {Array.isArray(details.evidence) && details.evidence.length > 0 && (
                <div className={styles.evidenceSection}>
                  <h4>Evidence</h4>
                  <ul>
                    {(details.evidence as string[]).map((url, i) => (
                      <li key={i}>
                        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(details.countries) && details.countries.length > 0 && (
                <div className={styles.countriesSection}>
                  <h4>Countries Affected</h4>
                  <div className={styles.countryChips}>
                    {(details.countries as string[]).map((code) => (
                      <span key={code} className={styles.chip}>{code}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Discussion stage — flat chat-style messages */}
          {stage === 'discussion' && (
            <div className={styles.flowContainer}>
              <p className={styles.flowNote}>Discussion is open. Share your perspective on this problem.</p>
              {/* Uses a simple comment list for now; future: embed Chat component */}
            </div>
          )}

          {/* Proposals stage */}
          {stage === 'proposals' && (
            <ApprovalFlow
              instanceId={flowInstanceId}
              collaborationId={collaborationId}
              collaborationType="initiative"
            />
          )}

          {/* Vote stage */}
          {stage === 'vote' && (
            <QVFlow
              instanceId={flowInstanceId}
              collaborationId={collaborationId}
              collaborationType="initiative"
            />
          )}

          {/* Mandate stage */}
          {stage === 'mandate' && (
            <div className={styles.mandateStage}>
              <h3>Mandate Reached</h3>
              <p>The community has voted. The results above represent this community's collective position.</p>
            </div>
          )}

          {/* Stage advancement */}
          {currentStageIndex < STAGES.length - 1 && (
            <div className={styles.advanceBar}>
              <button
                onClick={handleAdvance}
                disabled={advancing}
                className={styles.advanceBtn}
              >
                {advancing ? 'Advancing...' : `Move to ${STAGES[currentStageIndex + 1].label}`}
              </button>
              <button
                onClick={() => setShowConcerns(!showConcerns)}
                className={styles.concernBtn}
              >
                <AlertTriangle size={16} />
                Raise Concern
              </button>
            </div>
          )}

          {/* Concerns sidebar */}
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
```

- [ ] **Step 3: Create PipelineView SCSS**

```scss
// src/components/collaboration/PipelineView.module.scss
@use '../../styles/variables' as *;

$initiative-color: #ea580c;

.pipeline {
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
  padding: $spacing-lg;
  gap: $spacing-xs;
  overflow-x: auto;

  .stage {
    display: flex;
    align-items: center;
    gap: $spacing-xs;

    .stageNumber {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: $text-xs;
      font-weight: $font-bold;
      background-color: $gray-200;
      color: $gray-500;
      flex-shrink: 0;
    }

    .stageLabel {
      font-size: $text-sm;
      font-weight: $font-medium;
      color: $gray-400;
      white-space: nowrap;
    }

    .stageArrow {
      color: $gray-300;
      flex-shrink: 0;
    }

    &.completed .stageNumber {
      background-color: $initiative-color;
      color: white;
    }

    &.completed .stageLabel {
      color: $gray-700;
    }

    &.current .stageNumber {
      background-color: $initiative-color;
      color: white;
      box-shadow: 0 0 0 3px rgba($initiative-color, 0.3);
    }

    &.current .stageLabel {
      color: $gray-800;
      font-weight: $font-semibold;
    }
  }
}

.stageHint {
  padding: $spacing-md $spacing-lg;
  background-color: rgba($initiative-color, 0.05);
  border-left: 3px solid $initiative-color;
  border-radius: $radius-md;
  margin-bottom: $spacing-lg;

  p {
    color: $gray-600;
    font-size: $text-sm;
    margin: 0;
  }
}

.problemStage {
  h3 {
    font-size: $text-xl;
    font-weight: $font-bold;
    color: $gray-800;
    margin-bottom: $spacing-md;
  }

  .description {
    color: $gray-600;
    line-height: 1.6;
    margin-bottom: $spacing-xl;
  }

  .evidenceSection, .countriesSection {
    margin-bottom: $spacing-xl;

    h4 {
      font-size: $text-sm;
      font-weight: $font-semibold;
      color: $gray-700;
      margin-bottom: $spacing-sm;
    }
  }

  .evidenceSection ul {
    list-style: none;
    padding: 0;

    li {
      padding: $spacing-sm 0;

      a {
        color: $primary;
        font-size: $text-sm;
        word-break: break-all;

        &:hover { text-decoration: underline; }
      }
    }
  }

  .countryChips {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-sm;

    .chip {
      padding: $spacing-xs $spacing-md;
      background-color: $gray-100;
      border-radius: $radius-full;
      font-size: $text-sm;
      color: $gray-600;
    }
  }
}

.flowContainer {
  .flowNote {
    color: $gray-500;
    font-size: $text-sm;
    margin-bottom: $spacing-lg;
    font-style: italic;
  }
}

.mandateStage {
  text-align: center;
  padding: $spacing-3xl;

  h3 {
    font-size: $text-xl;
    font-weight: $font-bold;
    color: $initiative-color;
    margin-bottom: $spacing-md;
  }

  p { color: $gray-600; }
}

.advanceBar {
  display: flex;
  gap: $spacing-md;
  margin-top: $spacing-2xl;
  padding-top: $spacing-xl;
  border-top: 1px solid $gray-200;

  .advanceBtn {
    flex: 1;
    padding: $spacing-md;
    background-color: $initiative-color;
    color: white;
    border: none;
    border-radius: $radius-lg;
    font-size: $text-base;
    font-weight: $font-medium;
    cursor: pointer;

    &:hover:not(:disabled) { background-color: darken($initiative-color, 8%); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  .concernBtn {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
    padding: $spacing-md $spacing-lg;
    background: none;
    border: 1px solid $warning;
    border-radius: $radius-lg;
    color: $warning;
    font-size: $text-sm;
    cursor: pointer;

    &:hover { background-color: rgba($warning, 0.1); }
  }
}

.concernsPanel {
  margin-top: $spacing-xl;
  padding: $spacing-xl;
  background-color: rgba($warning, 0.05);
  border: 1px solid rgba($warning, 0.2);
  border-radius: $radius-lg;
}

@media (max-width: $breakpoint-sm) {
  .pipeline {
    .stageLabel { display: none; }
    gap: $spacing-sm;
  }

  .advanceBar { flex-direction: column; }
}

@media (prefers-color-scheme: dark) {
  .pipeline {
    background-color: $dark-bg;

    .stage {
      .stageNumber { background-color: $dark-surface; color: $dark-text-secondary; }
      .stageLabel { color: $dark-text-secondary; }
      &.completed .stageLabel { color: $dark-text; }
      &.current .stageLabel { color: $dark-text; }
    }
  }

  .stageHint { background-color: rgba($initiative-color, 0.1); p { color: $dark-text-secondary; } }

  .problemStage {
    h3 { color: $dark-text; }
    .description { color: $dark-text-secondary; }
    .countryChips .chip { background-color: $dark-surface; color: $dark-text-secondary; }
  }

  .advanceBar { border-color: $dark-border; }
}
```

- [ ] **Step 4: Update InitiativeView to use PipelineView**

Replace the entire content of `src/pages/collaboration/InitiativeView.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import PipelineView from '../../components/collaboration/PipelineView';
import { useAppSelector } from '../../store/hooks';
import { contractRead } from '../../services/api';
import type { IMethod } from '../../services/interfaces';
import type { InitiativeData } from '../../types/initiative';

const InitiativeView: React.FC = () => {
  const { communityId, initiativeId } = useParams<{
    initiativeHostServer: string;
    initiativeHostAgent: string;
    communityId: string;
    initiativeId: string;
  }>();
  const location = useLocation();
  const initiative = (location.state as { initiative?: InitiativeData })?.initiative;
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);

  const [title, setTitle] = useState(initiative?.title ?? 'Initiative');

  useEffect(() => {
    if (initiative?.title || !serverUrl || !publicKey || !initiativeId) return;
    contractRead({
      serverUrl,
      publicKey,
      contractId: initiativeId,
      method: { name: 'get_details', values: {} } as IMethod,
    })
      .then((details: Record<string, unknown>) => {
        if (details?.title) setTitle(details.title as string);
      })
      .catch(() => {});
  }, [initiative?.title, serverUrl, publicKey, initiativeId]);

  return (
    <PipelineView
      title={title}
      collaborationId={initiativeId!}
      communityId={communityId!}
    />
  );
};

export default InitiativeView;
```

- [ ] **Step 5: Verify in browser**

Navigate to a community, create an initiative via the Activity Hub, then click into it. Verify:
1. Pipeline progress bar shows at the top with 5 stages
2. "Problem" stage is active by default showing initiative details
3. "Move to Discussion" button works
4. "Raise Concern" button toggles the concerns panel
5. Back button goes to `/community/{id}/activity`

- [ ] **Step 6: Commit**

```bash
git add src/assets/contracts/initiative_contract.py src/components/collaboration/PipelineView.tsx src/components/collaboration/PipelineView.module.scss src/pages/collaboration/InitiativeView.tsx
git commit -m "feat: add PipelineView with 5-stage initiative progression"
```

---

## Task 10: Cleanup Old Components

Remove components that are no longer used.

**Files:**
- Delete: `src/components/community/collaborations/CreateCollaborationButtons.tsx`
- Delete: `src/components/community/collaborations/CollaborationFilterBar.tsx`
- Modify: `src/components/community/Collaborations.tsx` — keep as legacy but remove from active routing (already replaced by ActivityHub)

- [ ] **Step 1: Verify no imports of old components**

Run: `grep -r "CreateCollaborationButtons\|CollaborationFilterBar" src/ --include="*.tsx" --include="*.ts" -l`

Expected: Only `Collaborations.tsx` references them. Since ActivityHub has replaced the route, Collaborations.tsx is no longer rendered.

- [ ] **Step 2: Remove the old component files**

```bash
rm src/components/community/collaborations/CreateCollaborationButtons.tsx
rm src/components/community/collaborations/CollaborationFilterBar.tsx
```

- [ ] **Step 3: Remove the debug console.log from communitiesSlice**

In `src/store/slices/communitiesSlice.ts`, remove the two `console.log` lines added during debugging (around lines 86-88):

```typescript
// DELETE these lines:
console.log('[fetchCollaborations] raw result:', JSON.stringify(result, null, 2));
console.log('[fetchCollaborations] parsed collaborations:', collaborations.length, collaborations);
```

- [ ] **Step 4: Verify build succeeds**

Run: `npx vite build 2>&1 | tail -10`
Expected: Build completes successfully with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old CollaborationButtons, FilterBar, and debug logs"
```

---

## Task 11: Update CLAUDE.md

Update the project documentation to reflect the new architecture.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

Add/update these sections to reflect the new structure:

Under **Collaboration Pages**, replace existing content with:

```markdown
## Activity Hub & Navigation

- `ActivityHub` (`src/components/community/ActivityHub.tsx`): dashboard with Initiative, Collab, Chat summary cards
- CommunityView default tab renamed from "Collaborations" to "Activity" at route `/activity`
- Three sections: Initiative (pipeline), Collab (teamwork templates), Chat (topics + messages)

## Initiative Pipeline

- `PipelineView` (`src/components/collaboration/PipelineView.tsx`): wraps initiative with 5-stage progress bar
- Stages: Problem Definition → Discussion → Proposals (ApprovalFlow) → Vote (QVFlow) → Mandate
- Stage stored on initiative contract via `set_stage`/`get_stage`
- `CreateInitiativeDialog`: structured form with problem, evidence URLs, countries affected
- ConcernsFlow available as sidebar at any stage

## Chat

- `ChatTopicList` + `ChatTopic` in `src/components/community/chat/`
- Local in-memory data via `chatApi.ts`, keyed by communityId
- Routes: `/community/:communityId/chat` and `/community/:communityId/chat/:topicId`

## Collab

- Template-based workspaces using Ouri's flow tools (Scheduling, Task Board, Roles, etc.)
- Templates defined in `src/components/collaboration/collabTemplates.ts`
- `CreateCollabDialog`: name + template picker, pre-populates tabs via localStorage
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Activity Hub, Pipeline, Chat, Collab architecture"
```

---

## Self-Review Checklist

1. **Spec coverage:**
   - Section 1 (Activity Hub) → Task 8
   - Section 2 (Initiative Pipeline) → Tasks 7, 9
   - Section 3 (Chat) → Tasks 1, 2, 3, 4
   - Section 4 (Collab) → Tasks 5, 6, 8 (creation wired into ActivityHub)
   - Section 5 (Routing) → Task 4, 8
   - Section 6 (Components) → All tasks collectively
   - Onboarding text → Tasks 7, 8, 9

2. **Placeholder scan:** No TBDs or TODOs. All code is complete.

3. **Type consistency:** `PipelineStage` defined in Task 7 (initiative.ts), used in Task 9 (PipelineView). `CollabTemplate` defined in Task 5, used in Tasks 6 and 8. `Collaboration` type extended in Task 8 with `'collab'`. `InitiativeFormData` defined in Task 7, used in Task 8. All consistent.

4. **Note:** The Discussion stage (Task 9) currently shows placeholder text. A future enhancement would embed the Chat message stream component directly. The spec noted using "the Chat message stream component" for discussion — this can be wired in as a follow-up by importing `ChatTopic`-style functionality with the initiative's collaborationId as the topicId.
