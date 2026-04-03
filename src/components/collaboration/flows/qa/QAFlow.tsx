import React, { useState, useCallback, useEffect } from 'react';
import {
  HelpCircle, ChevronDown, ChevronRight, Plus, Pencil, Trash2, ThumbsUp,
} from 'lucide-react';

import type { FlowProps } from '../types';
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
  myUpvotedId: string | null;
  currentUser: string;
  server: string;
  agent: string;
  contractId: string;
  answers: Answer[];
  load: () => Promise<void>;
}> = ({ answer, myUpvotedId, currentUser, server, agent, contractId, answers, load }) => {
  const [editing, setEditing] = useState(false);
  const isOwn     = answer.createdBy === currentUser;
  const isUpvoted = myUpvotedId === answer.id;

  return (
    <div className={`${styles.answerItem} ${isOwn ? styles.answerOwn : ''}`}>
      {/* Upvote column */}
      <div className={styles.upvoteColumn}>
        <button
          className={`${styles.upvoteBtn} ${isUpvoted ? styles.upvoteBtnActive : ''}`}
          onClick={async () => {
            await api.toggleUpvote(server, agent, contractId, answers, answer.id, currentUser);
            await load();
          }}
          title={isUpvoted ? 'Remove upvote' : 'Upvote this answer'}
        >
          <ThumbsUp size={14} />
        </button>
        <span className={`${styles.upvoteCount} ${isUpvoted ? styles.upvoteCountActive : ''}`}>
          {answer.upvotes.length}
        </span>
      </div>

      {/* Answer content */}
      <div className={styles.answerContent}>
        {editing ? (
          <InlineTextForm
            placeholder="Edit your answer…"
            initialValue={answer.text}
            submitLabel="Save"
            onSubmit={async text => {
              await api.editAnswer(server, agent, contractId, answers, answer.id, currentUser, text);
              setEditing(false);
              await load();
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <p className={styles.answerText}>{answer.text}</p>
            <div className={styles.answerFooter}>
              <span className={`${styles.ownerChip} ${isOwn ? styles.ownerChipMe : ''}`}>
                {isOwn ? 'you' : answer.createdBy}
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
                      await api.deleteAnswer(server, agent, contractId, answers, answer.id, currentUser);
                      await load();
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
  server: string;
  agent: string;
  contractId: string;
  questions: Question[];
  load: () => Promise<void>;
}> = ({ question, answers, currentUser, server, agent, contractId, questions, load }) => {
  const sortedAnswers = api.getSortedAnswers(answers, question.id);
  const [expanded,     setExpanded]     = useState(true);
  const [showAll,      setShowAll]      = useState(false);
  const [addingAnswer, setAddingAnswer] = useState(false);

  const myUpvotedId = api.getMyUpvotedAnswerId(answers, question.id, currentUser);
  const canAdd      = api.canAddAnswer(answers, question.id, currentUser);

  // Always show at least the top answer; rest are behind "show more"
  const topAnswer   = sortedAnswers[0] ?? null;
  const remaining   = sortedAnswers.slice(1);
  const hiddenCount = showAll ? 0 : remaining.length;

  const answerItemProps = { currentUser, server, agent, contractId, answers, load };

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
                await api.deleteQuestion(server, agent, contractId, questions, answers, question.id, currentUser);
                await load();
              }}
              title="Delete question"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.questionMeta}>
        by {question.createdBy === currentUser ? 'you' : question.createdBy}
      </div>

      {expanded && (
        <div className={styles.answersSection}>
          {sortedAnswers.length === 0 && !addingAnswer && (
            <p className={styles.noAnswers}>No answers yet — be the first to answer.</p>
          )}

          {/* Top answer always shown */}
          {topAnswer && (
            <AnswerItem
              key={topAnswer.id}
              answer={topAnswer}
              myUpvotedId={myUpvotedId}
              {...answerItemProps}
            />
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
            <AnswerItem
              key={a.id}
              answer={a}
              myUpvotedId={myUpvotedId}
              {...answerItemProps}
            />
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
                  await api.addAnswer(server, agent, contractId, currentUser, answers, question.id, text);
                  setAddingAnswer(false);
                  await load();
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
const QAFlow: React.FC<FlowProps> = ({ instanceId, flowServer, flowAgent, currentUser }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers,   setAnswers]   = useState<Answer[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [addingQ,   setAddingQ]   = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [qs, as] = await Promise.all([
        api.loadQuestions(flowServer, flowAgent, instanceId),
        api.loadAnswers(flowServer, flowAgent, instanceId),
      ]);
      setQuestions(qs.sort((a, b) => b.createdAt - a.createdAt));
      setAnswers(as);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [instanceId, flowServer, flowAgent]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <FlowLoading />;
  if (error)   return <FlowError message={error} onRetry={load} />;

  const questionItemProps = {
    answers,
    currentUser,
    server: flowServer,
    agent: flowAgent,
    contractId: instanceId,
    questions,
    load,
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
            await api.addQuestion(flowServer, flowAgent, instanceId, currentUser, text);
            setAddingQ(false);
            await load();
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
            <QuestionItem
              key={q.id}
              question={q}
              {...questionItemProps}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default QAFlow;
