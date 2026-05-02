import React, { useState, useCallback, useEffect } from 'react';
import { FileText, MessageSquare, Download } from 'lucide-react';

import type { FlowProps } from '../types';
import { useEventStream } from '../../../../hooks/useEventStream';
import * as api from './docApi';
import type { DocElement, DocumentState, ElementType } from './docApi';
import { downloadDocumentPDF } from './docPdf';
import { FlowLoading, FlowError } from '../FlowShell';
import styles from './DocFlow.module.scss';

// ---------------------------------------------------------------------------
// UI state — exactly one "active" interaction at a time
// ---------------------------------------------------------------------------
type UIMode =
  | { tag: 'idle' }
  | { tag: 'editing';       id: string;              text: string }
  | { tag: 'adding';        parentId: string | null; childType: ElementType; text: string }
  | { tag: 'proposingEdit'; targetId: string;        text: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TYPE_LABEL: Record<ElementType, string> = {
  title: 'Title', section: 'Section', subsection: 'Subsection',
  paragraph: 'Paragraph', sentence: 'Sentence',
};

const sortedChildren = (elements: DocElement[], parentId: string | null) =>
  elements.filter(e => e.parentId === parentId && e.type !== 'title').sort((a, b) => a.order - b.order);

// ---------------------------------------------------------------------------
// Tiny shared components
// ---------------------------------------------------------------------------
const TypeBadge: React.FC<{ type: ElementType }> = ({ type }) => (
  <span className={`${styles.typeBadge} ${styles[`type_${type}`]}`}>{TYPE_LABEL[type]}</span>
);

const OwnerBadge: React.FC<{ owner: string; currentUser: string }> = ({ owner, currentUser }) => {
  if (owner === currentUser || owner === 'system') return null;
  return <span className={styles.ownerBadge}>{owner}</span>;
};

// ---------------------------------------------------------------------------
// Inline edit / add form
// ---------------------------------------------------------------------------
const InlineForm: React.FC<{
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}> = ({ value, placeholder, onChange, onConfirm, onCancel, confirmLabel = 'Save' }) => (
  <div className={styles.inlineForm}>
    <textarea
      className={styles.inlineTextarea}
      value={value}
      placeholder={placeholder}
      autoFocus
      rows={2}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onConfirm(); }
        if (e.key === 'Escape') onCancel();
      }}
    />
    <div className={styles.inlineActions}>
      <button className={styles.btnConfirm} onClick={onConfirm}>{confirmLabel}</button>
      <button className={styles.btnCancel}  onClick={onCancel}>Cancel</button>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// ElementNode — recursive
// ---------------------------------------------------------------------------
interface NodeProps {
  el: DocElement;
  docState: DocumentState;
  ui: UIMode;
  setUI: (m: UIMode) => void;
  currentUser: string;
  flowServer: string;
  flowAgent: string;
  instanceId: string;
}

const ElementNode: React.FC<NodeProps> = ({ el, docState, ui, setUI, currentUser, flowServer, flowAgent, instanceId }) => {
  const { elements, proposals } = docState;

  const isEditing       = ui.tag === 'editing'       && ui.id       === el.id;
  const isProposingEdit = ui.tag === 'proposingEdit' && ui.targetId === el.id;
  const isAddingHere    = ui.tag === 'adding'        && ui.parentId === el.id;

  const directEdit   = api.canDirectEdit(elements, el.id, currentUser);
  const directDelete = api.canDirectDelete(elements, el.id, currentUser);
  const propEdit     = api.canProposeEdit(elements, el.id, currentUser);
  const propDelete   = api.canProposeDelete(elements, el.id, currentUser);
  const childTypes   = api.ALLOWED_CHILDREN[el.type] ?? [];

  const children = sortedChildren(elements, el.id);

  // --- handlers ---
  const confirmEdit = async () => {
    if (ui.tag !== 'editing') return;
    if (!ui.text.trim()) return;
    await api.updateElement(flowServer, flowAgent, instanceId, elements, el.id, currentUser, ui.text);
    setUI({ tag: 'idle' });
  };

  const confirmProposeEdit = async () => {
    if (ui.tag !== 'proposingEdit') return;
    if (!ui.text.trim()) return;
    await api.proposeEdit(flowServer, flowAgent, instanceId, elements, proposals, el.id, currentUser, ui.text);
    setUI({ tag: 'idle' });
  };

  const confirmAdd = async () => {
    if (ui.tag !== 'adding') return;
    if (!ui.text.trim()) return;
    await api.addElement(flowServer, flowAgent, instanceId, elements, currentUser, ui.childType, ui.parentId, ui.text);
    setUI({ tag: 'idle' });
  };

  return (
    <div className={`${styles.elementNode} ${styles[`node_${el.type}`]}`}>
      {/* ── Row ── */}
      <div className={styles.elementRow}>
        <TypeBadge type={el.type} />
        <OwnerBadge owner={el.owner} currentUser={currentUser} />

        {isEditing ? (
          <InlineForm
            value={ui.text}
            onChange={t => setUI({ tag: 'editing', id: el.id, text: t })}
            onConfirm={confirmEdit}
            onCancel={() => setUI({ tag: 'idle' })}
          />
        ) : (
          <span className={`${styles.elementText} ${styles[`text_${el.type}`]}`}>{el.text}</span>
        )}

        {!isEditing && !isProposingEdit && (
          <div className={styles.actions}>
            {directEdit && (
              <button className={styles.btnAction}
                onClick={() => setUI({ tag: 'editing', id: el.id, text: el.text })}>
                Edit
              </button>
            )}
            {directDelete && (
              <button className={`${styles.btnAction} ${styles.btnDanger}`}
                onClick={async () => {
                  await api.deleteElement(flowServer, flowAgent, instanceId, elements, proposals, el.id, currentUser);
                }}>
                Delete
              </button>
            )}
            {propEdit && (
              <button className={styles.btnAction}
                onClick={() => setUI({ tag: 'proposingEdit', targetId: el.id, text: el.text })}>
                Propose Edit
              </button>
            )}
            {propDelete && (
              <button className={`${styles.btnAction} ${styles.btnDanger}`}
                onClick={async () => {
                  await api.proposeDelete(flowServer, flowAgent, instanceId, elements, proposals, el.id, currentUser);
                }}>
                Propose Delete
              </button>
            )}
            {childTypes.map(ct => (
              <button key={ct} className={`${styles.btnAction} ${styles.btnAdd}`}
                onClick={() => setUI({ tag: 'adding', parentId: el.id, childType: ct, text: '' })}>
                + {TYPE_LABEL[ct]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Propose-edit form ── */}
      {isProposingEdit && (
        <InlineForm
          value={ui.tag === 'proposingEdit' ? ui.text : ''}
          placeholder="Propose alternative text…"
          confirmLabel="Submit proposal"
          onChange={t => setUI({ tag: 'proposingEdit', targetId: el.id, text: t })}
          onConfirm={confirmProposeEdit}
          onCancel={() => setUI({ tag: 'idle' })}
        />
      )}

      {/* ── Children ── */}
      {children.length > 0 && (
        <div className={styles.children}>
          {children.map(child => (
            <ElementNode key={child.id} el={child} docState={docState}
              ui={ui} setUI={setUI}
              currentUser={currentUser} flowServer={flowServer} flowAgent={flowAgent} instanceId={instanceId} />
          ))}
        </div>
      )}

      {/* ── Add-child form ── */}
      {isAddingHere && (
        <div className={styles.addChildForm}>
          <InlineForm
            value={ui.tag === 'adding' ? ui.text : ''}
            placeholder={`New ${ui.tag === 'adding' ? TYPE_LABEL[ui.childType] : 'element'}…`}
            confirmLabel="Add"
            onChange={t => {
              if (ui.tag === 'adding') setUI({ tag: 'adding', parentId: el.id, childType: ui.childType, text: t });
            }}
            onConfirm={confirmAdd}
            onCancel={() => setUI({ tag: 'idle' })}
          />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Document tab
// ---------------------------------------------------------------------------
const DocumentTab: React.FC<{
  docState: DocumentState;
  ui: UIMode;
  setUI: (m: UIMode) => void;
  currentUser: string;
  flowServer: string;
  flowAgent: string;
  instanceId: string;
}> = ({ docState, ui, setUI, currentUser, flowServer, flowAgent, instanceId }) => {
  const { elements } = docState;

  const title    = elements.find(e => e.type === 'title');
  const sections = sortedChildren(elements, null);

  const isTitleEditing  = ui.tag === 'editing' && ui.id === 'title';
  const isAddingSection = ui.tag === 'adding'  && ui.parentId === null;

  const confirmTitleEdit = async () => {
    if (ui.tag !== 'editing') return;
    await api.updateElement(flowServer, flowAgent, instanceId, elements, 'title', currentUser, ui.text);
    setUI({ tag: 'idle' });
  };

  const confirmAddSection = async () => {
    if (ui.tag !== 'adding' || !ui.text.trim()) return;
    await api.addElement(flowServer, flowAgent, instanceId, elements, currentUser, 'section', null, ui.text);
    setUI({ tag: 'idle' });
  };

  return (
    <div className={styles.documentTab}>
      {/* Title */}
      {title && (
        <div className={styles.titleRow}>
          {isTitleEditing ? (
            <InlineForm
              value={ui.text}
              onChange={t => setUI({ tag: 'editing', id: 'title', text: t })}
              onConfirm={confirmTitleEdit}
              onCancel={() => setUI({ tag: 'idle' })}
            />
          ) : (
            <div className={styles.titleDisplay}>
              <h1 className={styles.titleText}>{title.text}</h1>
              <button className={styles.btnAction}
                onClick={() => setUI({ tag: 'editing', id: 'title', text: title.text })}>
                Edit
              </button>
            </div>
          )}
        </div>
      )}

      {/* Sections */}
      {sections.map(s => (
        <ElementNode key={s.id} el={s} docState={docState}
          ui={ui} setUI={setUI}
          currentUser={currentUser} flowServer={flowServer} flowAgent={flowAgent} instanceId={instanceId} />
      ))}

      {/* Add section */}
      {isAddingSection ? (
        <div className={styles.addSectionForm}>
          <InlineForm
            value={ui.tag === 'adding' ? ui.text : ''}
            placeholder="New section title…"
            confirmLabel="Add"
            onChange={t => setUI({ tag: 'adding', parentId: null, childType: 'section', text: t })}
            onConfirm={confirmAddSection}
            onCancel={() => setUI({ tag: 'idle' })}
          />
        </div>
      ) : (
        <button className={styles.addSectionBtn}
          onClick={() => setUI({ tag: 'adding', parentId: null, childType: 'section', text: '' })}>
          + Add Section
        </button>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Proposals tab
// ---------------------------------------------------------------------------
const ProposalsTab: React.FC<{
  docState: DocumentState;
  currentUser: string;
  flowServer: string;
  flowAgent: string;
  instanceId: string;
}> = ({ docState, currentUser, flowServer, flowAgent, instanceId }) => {
  const { elements, proposals } = docState;

  if (proposals.length === 0) {
    return <p className={styles.noData}>No active proposals.</p>;
  }

  const labelFor = (id: string) => {
    const el = elements.find(e => e.id === id);
    return el ? `${TYPE_LABEL[el.type]}: "${el.text}"` : '[deleted]';
  };

  return (
    <div className={styles.proposalsTab}>
      {proposals.map(p => {
        const myVote = p.supporters.includes(currentUser) ? 'support'
          : p.rejecters.includes(currentUser) ? 'reject' : null;

        return (
          <div key={p.id} className={styles.proposalCard}>
            <div className={styles.proposalHeader}>
              <span className={`${styles.proposalKind} ${p.kind === 'delete' ? styles.kindDelete : styles.kindEdit}`}>
                {p.kind === 'delete' ? 'Delete' : 'Edit'}
              </span>
              <span className={styles.proposalBy}>proposed by {p.proposer}</span>
            </div>

            <div className={styles.proposalTarget}>
              <span className={styles.targetLabel}>Target:</span>
              <span className={styles.targetText}>{labelFor(p.targetId)}</span>
            </div>

            {p.kind === 'edit' && p.proposedText && (
              <div className={styles.proposedText}>
                <span className={styles.targetLabel}>New text:</span>
                <span className={styles.targetText}>{p.proposedText}</span>
              </div>
            )}

            <div className={styles.voteBar}>
              <div className={styles.voteBarFill}
                style={{ width: `${(p.supporters.length / api.MAJORITY) * 100}%` }} />
            </div>
            <div className={styles.voteCounts}>
              <span>{p.supporters.length}/{api.MAJORITY} support</span>
              <span>{p.rejecters.length}/{api.MAJORITY} reject</span>
            </div>

            <div className={styles.proposalActions}>
              <button
                className={`${styles.btnVote} ${myVote === 'support' ? styles.btnVoteActive : ''}`}
                onClick={async () => {
                  await api.voteProposal(flowServer, flowAgent, instanceId, elements, proposals, p.id, currentUser, 'support');
                }}>
                Support ({p.supporters.length})
              </button>
              <button
                className={`${styles.btnVote} ${styles.btnVoteReject} ${myVote === 'reject' ? styles.btnVoteActive : ''}`}
                onClick={async () => {
                  await api.voteProposal(flowServer, flowAgent, instanceId, elements, proposals, p.id, currentUser, 'reject');
                }}>
                Reject ({p.rejecters.length})
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------
const DocFlow: React.FC<FlowProps> = ({ instanceId, flowServer, flowAgent, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'document' | 'proposals'>('document');
  const [docState,  setDocState]  = useState<DocumentState | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [ui,        setUI]        = useState<UIMode>({ tag: 'idle' });

  const reload = useCallback(async () => {
    try {
      const state = await api.loadDocument(flowServer, flowAgent, instanceId);
      setDocState(state);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    }
  }, [flowServer, flowAgent, instanceId]);

  useEffect(() => { reload(); }, [reload]);

  useEventStream('contract_write', useCallback((event) => {
    if (event.contract === instanceId) void reload();
  }, [instanceId, reload]));

  if (error) {
    return <FlowError message={error} onRetry={reload} />;
  }

  if (!docState) {
    return <FlowLoading />;
  }

  return (
    <div className={styles.container}>
      {/* ── Header bar ── */}
      <div className={styles.headerBar}>
        <div className={styles.tabBar}>
          <button className={`${styles.tab} ${activeTab === 'document'  ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('document')}>
            <FileText size={16} /> Document
          </button>
          <button className={`${styles.tab} ${activeTab === 'proposals' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('proposals')}>
            <MessageSquare size={16} /> Proposals
            {docState.proposals.length > 0 && (
              <span className={styles.badge}>{docState.proposals.length}</span>
            )}
          </button>
        </div>
        <button className={styles.downloadBtn}
          onClick={() => downloadDocumentPDF(docState.elements)}>
          <Download size={16} /> Download PDF
        </button>
      </div>

      {activeTab === 'document' && (
        <DocumentTab
          docState={docState}
          ui={ui}
          setUI={setUI}
          currentUser={currentUser}
          flowServer={flowServer}
          flowAgent={flowAgent}
          instanceId={instanceId}
        />
      )}
      {activeTab === 'proposals' && (
        <ProposalsTab
          docState={docState}
          currentUser={currentUser}
          flowServer={flowServer}
          flowAgent={flowAgent}
          instanceId={instanceId}
        />
      )}
    </div>
  );
};

export default DocFlow;
