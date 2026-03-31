// ---------------------------------------------------------------------------
// Collaborative document — local in-memory store, no persistence yet
// ---------------------------------------------------------------------------

export type ElementType = 'title' | 'section' | 'subsection' | 'paragraph' | 'sentence';
export type ProposalKind = 'delete' | 'edit';

export interface DocElement {
  id: string;
  type: ElementType;
  text: string;
  owner: string;
  parentId: string | null; // null for title and top-level sections
  order: number;
}

export interface Proposal {
  id: string;
  targetId: string;
  kind: ProposalKind;
  proposedText?: string; // only for 'edit'
  proposer: string;
  supporters: string[];
  rejecters: string[];
}

export interface DocumentState {
  elements: DocElement[];
  proposals: Proposal[];
}

// ---------------------------------------------------------------------------
// Community constants
// ---------------------------------------------------------------------------
export const CURRENT_USER = 'me';
export const COMMUNITY_SIZE = 4; // me, alice, bob, carol
export const MAJORITY = Math.floor(COMMUNITY_SIZE / 2) + 1; // 3

// Which element types may be added inside which parent types
export const ALLOWED_CHILDREN: Partial<Record<ElementType, ElementType[]>> = {
  section:    ['subsection', 'paragraph'],
  subsection: ['paragraph'],
  paragraph:  ['sentence'],
};

// ---------------------------------------------------------------------------
// Mutable state
// ---------------------------------------------------------------------------
let elements: DocElement[] = [
  { id: 'title', type: 'title',      text: 'Community Action Plan',                              owner: 'system', parentId: null,  order: 0 },
  { id: 's1',    type: 'section',    text: 'Introduction',                                       owner: 'alice',  parentId: null,  order: 1 },
  { id: 'p1',    type: 'paragraph',  text: 'Background',                                         owner: 'alice',  parentId: 's1',  order: 1 },
  { id: 'sen1',  type: 'sentence',   text: 'Our community faces unique challenges in 2025.',      owner: 'alice',  parentId: 'p1',  order: 1 },
  { id: 'sen2',  type: 'sentence',   text: 'Together we can build a stronger foundation.',        owner: 'bob',    parentId: 'p1',  order: 2 },
  { id: 's2',    type: 'section',    text: 'Goals',                                              owner: 'me',     parentId: null,  order: 2 },
  { id: 'ss1',   type: 'subsection', text: 'Short-term Goals',                                   owner: 'me',     parentId: 's2',  order: 1 },
  { id: 'p2',    type: 'paragraph',  text: 'Immediate Actions',                                  owner: 'me',     parentId: 'ss1', order: 1 },
  { id: 'sen3',  type: 'sentence',   text: 'Launch a community survey by Q2.',                   owner: 'me',     parentId: 'p2',  order: 1 },
];

let proposals: Proposal[] = [
  {
    id: 'prop1',
    targetId: 'sen1',
    kind: 'edit',
    proposedText: 'Our community faces new opportunities in 2025.',
    proposer: 'bob',
    supporters: ['alice'],
    rejecters: [],
  },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
function getDescendants(id: string): DocElement[] {
  const children = elements.filter(e => e.parentId === id);
  return [...children, ...children.flatMap(c => getDescendants(c.id))];
}

function hasOthersDescendants(id: string): boolean {
  return getDescendants(id).some(e => e.owner !== CURRENT_USER);
}

function nextOrder(parentId: string | null): number {
  const siblings = elements.filter(e => e.parentId === parentId && e.type !== 'title');
  return siblings.length > 0 ? Math.max(...siblings.map(e => e.order)) + 1 : 1;
}

function internalDelete(id: string): void {
  const toRemove = new Set([id, ...getDescendants(id).map(e => e.id)]);
  elements  = elements.filter(e => !toRemove.has(e.id));
  proposals = proposals.filter(p => !toRemove.has(p.targetId));
}

function applyOrDiscard(proposalId: string): void {
  const p = proposals.find(q => q.id === proposalId);
  if (!p) return;
  if (p.supporters.length >= MAJORITY) {
    if (p.kind === 'delete') {
      internalDelete(p.targetId);
    } else if (p.kind === 'edit' && p.proposedText !== undefined) {
      elements = elements.map(e => e.id === p.targetId ? { ...e, text: p.proposedText! } : e);
    }
    proposals = proposals.filter(q => q.id !== proposalId);
  } else if (p.rejecters.length >= MAJORITY) {
    proposals = proposals.filter(q => q.id !== proposalId);
  }
}

// ---------------------------------------------------------------------------
// Public API — capability checks
// ---------------------------------------------------------------------------

export function canDirectEdit(id: string): boolean {
  const el = elements.find(e => e.id === id);
  if (!el) return false;
  if (el.type === 'title') return true; // anyone can edit the title text
  return el.owner === CURRENT_USER;
}

export function canDirectDelete(id: string): boolean {
  const el = elements.find(e => e.id === id);
  if (!el || el.type === 'title') return false;
  if (el.owner !== CURRENT_USER) return false;
  return !hasOthersDescendants(id);
}

export function canProposeEdit(id: string): boolean {
  const el = elements.find(e => e.id === id);
  if (!el || el.type === 'title') return false;
  return el.owner !== CURRENT_USER;
}

export function canProposeDelete(id: string): boolean {
  const el = elements.find(e => e.id === id);
  if (!el || el.type === 'title') return false;
  if (el.owner === CURRENT_USER) return hasOthersDescendants(id);
  return true;
}

// ---------------------------------------------------------------------------
// Public API — mutations
// ---------------------------------------------------------------------------

export function getDocument(): DocumentState {
  return {
    elements:  elements.map(e => ({ ...e })),
    proposals: proposals.map(p => ({ ...p, supporters: [...p.supporters], rejecters: [...p.rejecters] })),
  };
}

export function addElement(type: ElementType, parentId: string | null, text: string): void {
  const id = `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  elements = [...elements, { id, type, text: text.trim(), owner: CURRENT_USER, parentId, order: nextOrder(parentId) }];
}

export function updateElement(id: string, text: string): void {
  if (!canDirectEdit(id)) return;
  elements = elements.map(e => e.id === id ? { ...e, text: text.trim() } : e);
}

export function deleteElement(id: string): void {
  if (!canDirectDelete(id)) return;
  internalDelete(id);
}

export function proposeEdit(targetId: string, proposedText: string): void {
  const id = `prop_${Date.now()}`;
  proposals = [...proposals, { id, targetId, kind: 'edit', proposedText: proposedText.trim(), proposer: CURRENT_USER, supporters: [CURRENT_USER], rejecters: [] }];
  applyOrDiscard(id);
}

export function proposeDelete(targetId: string): void {
  const id = `prop_${Date.now()}`;
  proposals = [...proposals, { id, targetId, kind: 'delete', proposer: CURRENT_USER, supporters: [CURRENT_USER], rejecters: [] }];
  applyOrDiscard(id);
}

export function voteProposal(proposalId: string, vote: 'support' | 'reject'): void {
  proposals = proposals.map(p => {
    if (p.id !== proposalId) return p;
    const supporters = p.supporters.filter(s => s !== CURRENT_USER);
    const rejecters  = p.rejecters.filter(r => r !== CURRENT_USER);
    if (vote === 'support') supporters.push(CURRENT_USER);
    else rejecters.push(CURRENT_USER);
    return { ...p, supporters, rejecters };
  });
  applyOrDiscard(proposalId);
}
