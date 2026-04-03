// ---------------------------------------------------------------------------
// Q&A flow — local in-memory store, no persistence yet
// ---------------------------------------------------------------------------

export interface Question {
  id: string;
  text: string;
  createdBy: string;
  createdAt: number;
}

export interface Answer {
  id: string;
  questionId: string;
  text: string;
  createdBy: string;
  createdAt: number;
  upvotes: string[]; // participantIds who upvoted
}

export const CURRENT_USER = 'me';
const ALL_PARTICIPANTS = ['me', 'alice', 'bob', 'carol'];
export const COMMUNITY_SIZE = ALL_PARTICIPANTS.length;

// ---------------------------------------------------------------------------
// Per-instance store (keyed by instanceId)
// ---------------------------------------------------------------------------
interface QAStore {
  questions: Question[];
  answers: Answer[];
}

const SEED_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'What is the best way to reach consensus quickly?',
    createdBy: 'alice',
    createdAt: Date.now() - 3_600_000 * 72,
  },
  {
    id: 'q2',
    text: 'How should we handle members who are consistently absent?',
    createdBy: 'bob',
    createdAt: Date.now() - 3_600_000 * 48,
  },
  {
    id: 'q3',
    text: 'What community currency exchange rate should we adopt?',
    createdBy: 'me',
    createdAt: Date.now() - 3_600_000 * 6,
  },
];

const SEED_ANSWERS: Answer[] = [
  {
    id: 'a1',
    questionId: 'q1',
    text: 'Use a time-boxed discussion followed by a simple majority vote.',
    createdBy: 'alice',
    createdAt: Date.now() - 3_600_000 * 70,
    upvotes: ['me', 'carol'],
  },
  {
    id: 'a2',
    questionId: 'q1',
    text: 'Consent-based decision making: proceed unless someone raises a paramount objection.',
    createdBy: 'bob',
    createdAt: Date.now() - 3_600_000 * 68,
    upvotes: ['bob'],
  },
  {
    id: 'a3',
    questionId: 'q2',
    text: 'Send a personal check-in message first, then raise it with the group if there is no response.',
    createdBy: 'carol',
    createdAt: Date.now() - 3_600_000 * 46,
    upvotes: ['alice', 'bob'],
  },
];

const storesByInstance = new Map<string, QAStore>();

function getStore(instanceId: string): QAStore {
  if (!storesByInstance.has(instanceId)) {
    storesByInstance.set(instanceId, {
      questions: SEED_QUESTIONS.map(q => ({ ...q })),
      answers: SEED_ANSWERS.map(a => ({ ...a, upvotes: [...a.upvotes] })),
    });
  }
  return storesByInstance.get(instanceId)!;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function getQuestions(instanceId: string): Question[] {
  return [...getStore(instanceId).questions].sort((a, b) => b.createdAt - a.createdAt);
}

export function getAllAnswers(instanceId: string): Answer[] {
  return [...getStore(instanceId).answers];
}

/** Returns answers for a question sorted by upvote count descending, then oldest first. */
export function getSortedAnswers(instanceId: string, questionId: string): Answer[] {
  return getStore(instanceId).answers
    .filter(a => a.questionId === questionId)
    .sort((a, b) => b.upvotes.length - a.upvotes.length || a.createdAt - b.createdAt);
}

export function getMyAnswer(instanceId: string, questionId: string): Answer | undefined {
  return getStore(instanceId).answers.find(a => a.questionId === questionId && a.createdBy === CURRENT_USER);
}

export function getMyUpvotedAnswerId(instanceId: string, questionId: string): string | null {
  const a = getStore(instanceId).answers.find(a => a.questionId === questionId && a.upvotes.includes(CURRENT_USER));
  return a ? a.id : null;
}

// ---------------------------------------------------------------------------
// Capability checks
// ---------------------------------------------------------------------------

export function canAddAnswer(instanceId: string, questionId: string): boolean {
  return !getStore(instanceId).answers.some(a => a.questionId === questionId && a.createdBy === CURRENT_USER);
}

export function canDeleteQuestion(question: Question): boolean {
  return question.createdBy === CURRENT_USER;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
}

export function addQuestion(instanceId: string, text: string): Question {
  const store = getStore(instanceId);
  const q: Question = {
    id: uid('q'),
    text: text.trim(),
    createdBy: CURRENT_USER,
    createdAt: Date.now(),
  };
  store.questions = [...store.questions, q];
  return q;
}

export function deleteQuestion(instanceId: string, questionId: string): void {
  const store = getStore(instanceId);
  store.answers   = store.answers.filter(a => a.questionId !== questionId);
  store.questions = store.questions.filter(q => q.id !== questionId);
}

export function addAnswer(instanceId: string, questionId: string, text: string): Answer {
  const store = getStore(instanceId);
  const a: Answer = {
    id: uid('a'),
    questionId,
    text: text.trim(),
    createdBy: CURRENT_USER,
    createdAt: Date.now(),
    upvotes: [],
  };
  store.answers = [...store.answers, a];
  return a;
}

export function editAnswer(instanceId: string, answerId: string, text: string): void {
  const store = getStore(instanceId);
  store.answers = store.answers.map(a => a.id === answerId ? { ...a, text: text.trim() } : a);
}

export function deleteAnswer(instanceId: string, answerId: string): void {
  const store = getStore(instanceId);
  store.answers = store.answers.filter(a => a.id !== answerId);
}

/**
 * Toggle upvote for the current user on the given answer.
 * A user can upvote at most one answer per question; clicking a different
 * answer moves the upvote, clicking the same answer removes it.
 */
export function toggleUpvote(instanceId: string, answerId: string): void {
  const store = getStore(instanceId);
  const target = store.answers.find(a => a.id === answerId);
  if (!target) return;

  const { questionId } = target;
  const alreadyVotedThis = target.upvotes.includes(CURRENT_USER);

  // Remove current user's upvote from every answer in this question
  store.answers = store.answers.map(a => {
    if (a.questionId !== questionId) return a;
    return { ...a, upvotes: a.upvotes.filter(u => u !== CURRENT_USER) };
  });

  // If the clicked answer was NOT already the one voted for, add the upvote
  if (!alreadyVotedThis) {
    store.answers = store.answers.map(a =>
      a.id === answerId ? { ...a, upvotes: [...a.upvotes, CURRENT_USER] } : a
    );
  }
}
