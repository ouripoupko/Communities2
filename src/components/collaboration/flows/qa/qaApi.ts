import { readSilently, write } from '../../../../services/ibc';

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

// ---------------------------------------------------------------------------
// The contract (QAFlow.sol) enforces the rules: one answer per participant
// per question, only authors change their own, no voting on your own answer.
// Whoever signs is the participant.
// ---------------------------------------------------------------------------

export async function loadQuestions(contractId: string): Promise<Question[]> {
  const result = await readSilently(contractId, 'getQuestions') as {
    id: string; text: string; createdBy: string; createdAt: number;
  }[];
  return result.map((q) => ({ id: q.id, text: q.text, createdBy: q.createdBy, createdAt: Number(q.createdAt) * 1000 }));
}

export async function loadAnswers(contractId: string): Promise<Answer[]> {
  const result = await readSilently(contractId, 'getAnswers') as {
    id: string; questionId: string; text: string; createdBy: string; createdAt: number; approvals: string[]; disapprovals: string[];
  }[];
  return result.map((a) => ({
    id: a.id,
    questionId: a.questionId,
    text: a.text,
    createdBy: a.createdBy,
    createdAt: Number(a.createdAt) * 1000,
    approvals: a.approvals,
    disapprovals: a.disapprovals,
  }));
}

// Each may open the node's approval page: call them from a click.

export async function addQuestion(contractId: string, text: string): Promise<void> {
  await write(contractId, 'addQuestion', { text: text.trim() });
}

export async function deleteQuestion(contractId: string, questionId: string): Promise<void> {
  await write(contractId, 'deleteQuestion', { questionId });
}

export async function addAnswer(contractId: string, questionId: string, text: string): Promise<void> {
  await write(contractId, 'addAnswer', { questionId, text: text.trim() });
}

export async function editAnswer(contractId: string, answerId: string, text: string): Promise<void> {
  await write(contractId, 'editAnswer', { answerId, text: text.trim() });
}

export async function deleteAnswer(contractId: string, answerId: string): Promise<void> {
  await write(contractId, 'deleteAnswer', { answerId });
}

/** Approves or disapproves an answer; the same vote again takes it back. */
export async function vote(contractId: string, answer: Answer, voteType: 'approve' | 'disapprove', currentUser: string): Promise<void> {
  const value = getMyVote(answer, currentUser) === voteType ? 0 : voteType === 'approve' ? 1 : 2;
  await write(contractId, 'vote', { answerId: answer.id, value });
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
