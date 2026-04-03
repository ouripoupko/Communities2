import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

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
  upvotes: string[];
}

function normalizeQuestion(q: Record<string, unknown>): Question {
  return {
    id:        String(q.id        ?? ''),
    text:      String(q.text      ?? ''),
    createdBy: String(q.createdBy ?? ''),
    createdAt: Number(q.createdAt ?? 0),
  };
}

function normalizeAnswer(a: Record<string, unknown>): Answer {
  const upvotes = Array.isArray(a.upvotes)
    ? (a.upvotes as unknown[]).map(u => String(u))
    : [];
  return {
    id:         String(a.id         ?? ''),
    questionId: String(a.questionId ?? ''),
    text:       String(a.text       ?? ''),
    createdBy:  String(a.createdBy  ?? ''),
    createdAt:  Number(a.createdAt  ?? 0),
    upvotes,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function loadQuestions(
  server: string,
  agent: string,
  contractId: string,
): Promise<Question[]> {
  const result = await contractRead({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'get_questions', values: {} } as IMethod,
  });
  const raw = Array.isArray(result) ? result : [];
  return (raw as Record<string, unknown>[]).map(normalizeQuestion);
}

export async function loadAnswers(
  server: string,
  agent: string,
  contractId: string,
): Promise<Answer[]> {
  const result = await contractRead({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'get_answers', values: {} } as IMethod,
  });
  const raw = Array.isArray(result) ? result : [];
  return (raw as Record<string, unknown>[]).map(normalizeAnswer);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function addQuestion(
  server: string,
  agent: string,
  contractId: string,
  currentUser: string,
  text: string,
): Promise<void> {
  const question: Question = {
    id:        crypto.randomUUID(),
    text:      text.trim(),
    createdBy: currentUser,
    createdAt: Date.now(),
  };
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'add_question', values: { question } } as IMethod,
  });
}

export async function deleteQuestion(
  server: string,
  agent: string,
  contractId: string,
  questions: Question[],
  answers: Answer[],
  questionId: string,
  currentUser: string,
): Promise<void> {
  const q = questions.find(q => q.id === questionId);
  if (!q || q.createdBy !== currentUser) return;

  const filteredQuestions = questions.filter(q => q.id !== questionId);
  const filteredAnswers   = answers.filter(a => a.questionId !== questionId);

  await Promise.all([
    contractWrite({
      serverUrl: server,
      publicKey: agent,
      contractId,
      method: { name: 'set_questions', values: { questions: filteredQuestions } } as IMethod,
    }),
    contractWrite({
      serverUrl: server,
      publicKey: agent,
      contractId,
      method: { name: 'set_answers', values: { answers: filteredAnswers } } as IMethod,
    }),
  ]);
}

export async function addAnswer(
  server: string,
  agent: string,
  contractId: string,
  currentUser: string,
  answers: Answer[],
  questionId: string,
  text: string,
): Promise<void> {
  const alreadyAnswered = answers.some(
    a => a.questionId === questionId && a.createdBy === currentUser,
  );
  if (alreadyAnswered) return;

  const answer: Answer = {
    id:         crypto.randomUUID(),
    questionId,
    text:       text.trim(),
    createdBy:  currentUser,
    createdAt:  Date.now(),
    upvotes:    [],
  };
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'add_answer', values: { answer } } as IMethod,
  });
}

export async function editAnswer(
  server: string,
  agent: string,
  contractId: string,
  answers: Answer[],
  answerId: string,
  currentUser: string,
  text: string,
): Promise<void> {
  const updated = answers.map(a =>
    a.id === answerId && a.createdBy === currentUser ? { ...a, text: text.trim() } : a,
  );
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_answers', values: { answers: updated } } as IMethod,
  });
}

export async function deleteAnswer(
  server: string,
  agent: string,
  contractId: string,
  answers: Answer[],
  answerId: string,
  currentUser: string,
): Promise<void> {
  const filtered = answers.filter(
    a => !(a.id === answerId && a.createdBy === currentUser),
  );
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_answers', values: { answers: filtered } } as IMethod,
  });
}

export async function toggleUpvote(
  server: string,
  agent: string,
  contractId: string,
  answers: Answer[],
  answerId: string,
  currentUser: string,
): Promise<void> {
  const target = answers.find(a => a.id === answerId);
  if (!target) return;

  const { questionId } = target;
  const alreadyVotedThis = target.upvotes.includes(currentUser);

  // Remove currentUser's upvote from all answers in the same question
  let updated = answers.map(a => {
    if (a.questionId !== questionId) return a;
    return { ...a, upvotes: a.upvotes.filter(u => u !== currentUser) };
  });

  // If the clicked answer was NOT already the one voted, add the upvote
  if (!alreadyVotedThis) {
    updated = updated.map(a =>
      a.id === answerId ? { ...a, upvotes: [...a.upvotes, currentUser] } : a,
    );
  }

  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_answers', values: { answers: updated } } as IMethod,
  });
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function getSortedAnswers(answers: Answer[], questionId: string): Answer[] {
  return answers
    .filter(a => a.questionId === questionId)
    .sort((a, b) => b.upvotes.length - a.upvotes.length || a.createdAt - b.createdAt);
}

export function getMyUpvotedAnswerId(
  answers: Answer[],
  questionId: string,
  currentUser: string,
): string | null {
  const a = answers.find(
    a => a.questionId === questionId && a.upvotes.includes(currentUser),
  );
  return a ? a.id : null;
}

export function canAddAnswer(
  answers: Answer[],
  questionId: string,
  currentUser: string,
): boolean {
  return !answers.some(
    a => a.questionId === questionId && a.createdBy === currentUser,
  );
}

export function canDeleteQuestion(question: Question, currentUser: string): boolean {
  return question.createdBy === currentUser;
}
