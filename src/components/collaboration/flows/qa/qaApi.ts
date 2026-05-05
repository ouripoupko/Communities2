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
  approvals: string[];
  disapprovals: string[];
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
  return {
    id:           String(a.id          ?? ''),
    questionId:   String(a.questionId  ?? ''),
    text:         String(a.text        ?? ''),
    createdBy:    String(a.createdBy   ?? ''),
    createdAt:    Number(a.createdAt   ?? 0),
    approvals:    Array.isArray(a.approvals)    ? (a.approvals    as unknown[]).map(u => String(u)) : [],
    disapprovals: Array.isArray(a.disapprovals) ? (a.disapprovals as unknown[]).map(u => String(u)) : [],
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
  question: Question,
  currentUser: string,
): Promise<void> {
  if (question.createdBy !== currentUser) return;
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'delete_question', values: { question_id: question.id } } as IMethod,
  });
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
    id:           crypto.randomUUID(),
    questionId,
    text:         text.trim(),
    createdBy:    currentUser,
    createdAt:    Date.now(),
    approvals:    [],
    disapprovals: [],
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
  answer: Answer,
  currentUser: string,
  text: string,
): Promise<void> {
  if (answer.createdBy !== currentUser) return;
  const updated = { ...answer, text: text.trim() };
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_answer', values: { answer: updated } } as IMethod,
  });
}

export async function deleteAnswer(
  server: string,
  agent: string,
  contractId: string,
  answer: Answer,
  currentUser: string,
): Promise<void> {
  if (answer.createdBy !== currentUser) return;
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'delete_answer', values: { answer_id: answer.id } } as IMethod,
  });
}

export async function vote(
  server: string,
  agent: string,
  contractId: string,
  answer: Answer,
  voteType: 'approve' | 'disapprove',
  currentUser: string,
): Promise<void> {
  if (answer.createdBy === currentUser) return;

  const currentVote = getMyVote(answer, currentUser);
  let approvals    = answer.approvals.filter(u => u !== currentUser);
  let disapprovals = answer.disapprovals.filter(u => u !== currentUser);

  if (currentVote !== voteType) {
    if (voteType === 'approve') approvals    = [...approvals, currentUser];
    else                        disapprovals = [...disapprovals, currentUser];
  }

  const updated = { ...answer, approvals, disapprovals };
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_answer', values: { answer: updated } } as IMethod,
  });
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Combines the net gap (approvals − disapprovals) with voter confidence.
 * Uses Bayesian shrinkage toward 0: score approaches net as voter count grows.
 * k=3 means an answer needs ~3 votes before its gap is taken at face value.
 */
export function supportScore(approvals: number, disapprovals: number): number {
  const net   = approvals - disapprovals;
  const total = approvals + disapprovals;
  if (total === 0) return 0;
  return net * (total / (total + 3));
}

export function getMyVote(answer: Answer, currentUser: string): 'approve' | 'disapprove' | null {
  if (answer.approvals.includes(currentUser))    return 'approve';
  if (answer.disapprovals.includes(currentUser)) return 'disapprove';
  return null;
}

export function getSortedAnswers(answers: Answer[], questionId: string): Answer[] {
  return answers
    .filter(a => a.questionId === questionId)
    .sort((a, b) => {
      const sa = supportScore(a.approvals.length, a.disapprovals.length);
      const sb = supportScore(b.approvals.length, b.disapprovals.length);
      return sb - sa || a.createdAt - b.createdAt;
    });
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
