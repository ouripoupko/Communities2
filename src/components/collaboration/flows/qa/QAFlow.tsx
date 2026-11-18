import React, { useState } from 'react';
import {
  HelpCircle, ChevronDown, ChevronRight, Plus, Pencil, Trash2, ThumbsUp, ThumbsDown,
} from 'lucide-react';

import type { FlowProps } from '../types';
import { useFlowData } from '../useFlowData';
import { useParticipants } from '../useParticipants';
import * as api from './qaApi';
import type { Question, Answer } from './qaApi';
import { FlowLoading, FlowError } from '../FlowShell';
import styles from './QAFlow.module.scss';

// ---------------------------------------------------------------------------
// Generic inline textarea form
// ---------------------------------------------------------------------------
const InlineTextForm: React.FC<{
  placeholder: string;
  initialValue?: string;
  submitLabel: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}> = ({ placeholder, initialValue = '', submitLabel, onSubmit, onCancel }) => {
  const [text,  setText]  = useState(initialValue);
  const [error, setError] = useState('');

  const submit = () => {
    if (!text.trim()) { setError('This field is required.'); return; }
    onSubmit(text);
  };

  return (
    <div className={styles.inlineForm}>
      <textarea
        className={styles.formTextarea}
        rows={3}
        placeholder={placeholder}
        value={text}
        autoFocus
        onChange={e => { setText(e.target.value); setError(''); }}
        onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
      />
      {error && <p className={styles.errorMsg}>{error}</p>}
      <div className={styles.formActions}>
        <button className={styles.btnConfirm} onClick={submit}>{submitLabel}</button>
        <button className={styles.btnCancel}  onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Answer item
// ---------------------------------------------------------------------------
const AnswerItem: React.FC<{
  answer: Answer;
  currentUser: string;
  contractId: string;
}> = ({ answer, currentUser, contractId }) => {
  const { nameOf } = useParticipants(currentUser);
  const [editing, setEditing] = useState(false);
  const isOwn    = answer.createdBy === currentUser;
  const myVote   = api.getMyVote(answer, currentUser);

  const handleVote = async (voteType: 'approve' | 'disapprove') => {
    await api.vote(contractId, answer, voteType, currentUser);
  };

  return (
    <div className={`${styles.answerItem} ${isOwn ? styles.answerOwn : ''}`}>
      {/* Answer content */}
      <div className={styles.answerContent}>
        {editing ? (
          <InlineTextForm
            placeholder="Edit your answer…"
            initialValue={answer.text}
            submitLabel="Save"
            onSubmit={async text => {
              await api.editAnswer(contractId, answer.id, text);
              setEditing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <p className={styles.answerText}>{answer.text}</p>
            <div className={styles.answerFooter}>
              <span className={`${styles.ownerChip} ${isOwn ? styles.ownerChipMe : ''}`}>
                {nameOf(answer.createdBy)}
              </span>
              {isOwn && (
                <div className={styles.answerActions}>
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtnEdit}`}
                    onClick={() => setEditing(true)}
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                    onClick={async () => {
                      await api.deleteAnswer(contractId, answer.id);
                    }}
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Vote column — right side */}
      <div className={styles.voteColumn}>
        <button
          className={`${styles.voteBtn} ${styles.voteBtnApprove} ${myVote === 'approve' ? styles.voteBtnApproveActive : ''}`}
          onClick={() => handleVote('approve')}
          disabled={isOwn}
          title={myVote === 'approve' ? 'Remove approval' : 'Approve this answer'}
        >
          <ThumbsUp size={16} />
          <span className={styles.voteCount}>{answer.approvals.length}</span>
        </button>
        <button
          className={`${styles.voteBtn} ${styles.voteBtnDisapprove} ${myVote === 'disapprove' ? styles.voteBtnDisapproveActive : ''}`}
          onClick={() => handleVote('disapprove')}
          disabled={isOwn}
          title={myVote === 'disapprove' ? 'Remove disapproval' : 'Disapprove this answer'}
        >
          <ThumbsDown size={16} />
          <span className={styles.voteCount}>{answer.disapprovals.length}</span>
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Question item
// ---------------------------------------------------------------------------
const QuestionItem: React.FC<{
  question: Question;
  answers: Answer[];
  currentUser: string;
  contractId: string;
  questions: Question[];
}> = ({ question, answers, currentUser, contractId }) => {
  const { byline } = useParticipants(currentUser);
  const sortedAnswers = api.getSortedAnswers(answers, question.id);
  const [expanded,     setExpanded]     = useState(true);
  const [showAll,      setShowAll]      = useState(false);
  const [addingAnswer, setAddingAnswer] = useState(false);

  const canAdd  = api.canAddAnswer(answers, question.id, currentUser);

  // Always show at least the top answer; rest are behind "show more"
  const topAnswer   = sortedAnswers[0] ?? null;
  const remaining   = sortedAnswers.slice(1);
  const hiddenCount = showAll ? 0 : remaining.length;

  const answerItemProps = { currentUser, contractId };

  return (
    <div className={styles.questionCard}>
      {/* Header */}
      <div
        className={styles.questionHeader}
        onClick={() => setExpanded(v => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setExpanded(v => !v); }}
      >
        <span className={styles.questionToggle}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className={styles.questionText}>{question.text}</span>
        <div className={styles.questionHeaderRight}>
          <span className={styles.answerCount}>
            {sortedAnswers.length} answer{sortedAnswers.length !== 1 ? 's' : ''}
          </span>
          {api.canDeleteQuestion(question, currentUser) && (
            <button
              className={styles.questionDeleteBtn}
              onClick={async e => {
                e.stopPropagation();
                await api.deleteQuestion(contractId, question.id);
              }}
              title="Delete question"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.questionMeta}>
        {byline(question.createdBy)}
      </div>

      {expanded && (
        <div className={styles.answersSection}>
          {sortedAnswers.length === 0 && !addingAnswer && (
            <p className={styles.noAnswers}>No answers yet — be the first to answer.</p>
          )}

          {/* Top answer always shown */}
          {topAnswer && (
            <AnswerItem key={topAnswer.id} answer={topAnswer} {...answerItemProps} />
          )}

          {/* Remaining answers — hidden until expanded */}
          {remaining.length > 0 && !showAll && (
            <button
              className={styles.showMoreBtn}
              onClick={e => { e.stopPropagation(); setShowAll(true); }}
            >
              <ChevronDown size={13} />
              Show {hiddenCount} more answer{hiddenCount !== 1 ? 's' : ''}
            </button>
          )}

          {showAll && remaining.map(a => (
            <AnswerItem key={a.id} answer={a} {...answerItemProps} />
          ))}

          {showAll && remaining.length > 0 && (
            <button
              className={styles.showMoreBtn}
              onClick={e => { e.stopPropagation(); setShowAll(false); }}
            >
              <ChevronDown size={13} className={styles.rotated} />
              Hide answers
            </button>
          )}

          {/* Add answer */}
          {canAdd && (
            addingAnswer ? (
              <InlineTextForm
                placeholder="Write your answer…"
                submitLabel="Post Answer"
                onSubmit={async text => {
                  await api.addAnswer(contractId, question.id, text);
                  setAddingAnswer(false);
                }}
                onCancel={() => setAddingAnswer(false)}
              />
            ) : (
              <button
                className={styles.addAnswerBtn}
                onClick={e => { e.stopPropagation(); setAddingAnswer(true); }}
              >
                <Plus size={13} /> Add Answer
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
// Questions newest first, and their answers.
const loadQA = (contractId: string) => Promise.all([
  api.loadQuestions(contractId),
  api.loadAnswers(contractId),
]).then(([questions, answers]) => ({
  questions: questions.sort((a, b) => b.createdAt - a.createdAt),
  answers,
}));

const QAFlow: React.FC<FlowProps> = ({ instanceId, currentUser }) => {
  const { data, loading, error, retry } = useFlowData(instanceId, loadQA);
  const [addingQ,   setAddingQ]   = useState(false);

  if (loading) return <FlowLoading />;
  if (error)   return <FlowError message={error} onRetry={retry} />;

  const { questions, answers } = data ?? { questions: [], answers: [] };

  const questionItemProps = {
    answers,
    currentUser,
    contractId: instanceId,
    questions,
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <HelpCircle size={18} className={styles.headerIcon} />
        <span>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Add question */}
      {addingQ ? (
        <InlineTextForm
          placeholder="Ask a question…"
          submitLabel="Post Question"
          onSubmit={async text => {
            await api.addQuestion(instanceId, text);
            setAddingQ(false);
          }}
          onCancel={() => setAddingQ(false)}
        />
      ) : (
        <button className={styles.addQuestionBtn} onClick={() => setAddingQ(true)}>
          <Plus size={15} /> Ask a Question
        </button>
      )}

      {/* Question list */}
      {questions.length === 0 ? (
        <p className={styles.noData}>No questions yet. Ask one above.</p>
      ) : (
        <div className={styles.questionList}>
          {questions.map(q => (
            <QuestionItem key={q.id} question={q} {...questionItemProps} />
          ))}
        </div>
      )}
    </div>
  );
};

export default QAFlow;
