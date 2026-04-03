import React, { useState, useCallback } from 'react';
import {
  HelpCircle, ChevronDown, ChevronRight, Plus, Pencil, Trash2, ThumbsUp,
} from 'lucide-react';

import type { FlowProps } from '../types';
import * as api from './qaApi';
import type { Question, Answer } from './qaApi';
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
  instanceId: string;
  myUpvotedId: string | null;
  onRefresh: () => void;
}> = ({ answer, instanceId, myUpvotedId, onRefresh }) => {
  const [editing, setEditing] = useState(false);
  const isOwn      = answer.createdBy === api.CURRENT_USER;
  const isUpvoted  = myUpvotedId === answer.id;
  const act = (fn: () => void) => { fn(); onRefresh(); };

  return (
    <div className={`${styles.answerItem} ${isOwn ? styles.answerOwn : ''}`}>
      {/* Upvote column */}
      <div className={styles.upvoteColumn}>
        <button
          className={`${styles.upvoteBtn} ${isUpvoted ? styles.upvoteBtnActive : ''}`}
          onClick={() => act(() => api.toggleUpvote(instanceId, answer.id))}
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
            onSubmit={text => { act(() => api.editAnswer(instanceId, answer.id, text)); setEditing(false); }}
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
                    onClick={() => act(() => api.deleteAnswer(instanceId, answer.id))}
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
  instanceId: string;
  tick: number;
  onRefresh: () => void;
}> = ({ question, instanceId, tick, onRefresh }) => {
  const answers = api.getSortedAnswers(instanceId, question.id);
  void tick; // consumed only to trigger re-render
  const [expanded,     setExpanded]     = useState(true);
  const [showAll,      setShowAll]      = useState(false);
  const [addingAnswer, setAddingAnswer] = useState(false);

  const act = (fn: () => void) => { fn(); onRefresh(); };
  const myUpvotedId = api.getMyUpvotedAnswerId(instanceId, question.id);
  const canAdd      = api.canAddAnswer(instanceId, question.id);

  // Always show at least the top answer; rest are behind "show more"
  const topAnswer        = answers[0] ?? null;
  const remaining        = answers.slice(1);
  const hiddenCount      = showAll ? 0 : remaining.length;

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
            {answers.length} answer{answers.length !== 1 ? 's' : ''}
          </span>
          {api.canDeleteQuestion(question) && (
            <button
              className={styles.questionDeleteBtn}
              onClick={e => { e.stopPropagation(); act(() => api.deleteQuestion(instanceId, question.id)); }}
              title="Delete question"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      <div className={styles.questionMeta}>
        by {question.createdBy === api.CURRENT_USER ? 'you' : question.createdBy}
      </div>

      {expanded && (
        <div className={styles.answersSection}>
          {answers.length === 0 && !addingAnswer && (
            <p className={styles.noAnswers}>No answers yet — be the first to answer.</p>
          )}

          {/* Top answer always shown */}
          {topAnswer && (
            <AnswerItem
              key={topAnswer.id}
              answer={topAnswer}
              instanceId={instanceId}
              myUpvotedId={myUpvotedId}
              onRefresh={onRefresh}
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
              instanceId={instanceId}
              myUpvotedId={myUpvotedId}
              onRefresh={onRefresh}
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
                onSubmit={text => {
                  act(() => api.addAnswer(instanceId, question.id, text));
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
const QAFlow: React.FC<FlowProps> = ({ instanceId }) => {
  const [questions, setQuestions] = useState(() => api.getQuestions(instanceId));
  const [addingQ,   setAddingQ]   = useState(false);
  // tick forces QuestionItems to re-derive sorted answers from the API after mutations
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setQuestions(api.getQuestions(instanceId));
    setTick(t => t + 1);
  }, [instanceId]);

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
          onSubmit={text => {
            api.addQuestion(instanceId, text);
            refresh();
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
            <QuestionItem
              key={q.id}
              question={q}
              instanceId={instanceId}
              tick={tick}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default QAFlow;
