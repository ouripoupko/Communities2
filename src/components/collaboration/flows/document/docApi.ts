// ---------------------------------------------------------------------------
// Collaborative document — persistent API backed by contract storage
// ---------------------------------------------------------------------------

import { readSilently, write } from '../../../../services/ibc';

export type ElementType = 'title' | 'section' | 'subsection' | 'paragraph' | 'sentence';
export type ProposalKind = 'delete' | 'edit';

export interface DocElement {
  id: string;
  type: ElementType;
  text: string;
  owner: string;
  parentId: string | null;
  order: number;
}

export interface Proposal {
  id: string;
  targetId: string;
  kind: ProposalKind;
  proposedText?: string;
  proposer: string;
  supporters: string[];
  rejecters: string[];
}

export interface DocumentState {
  elements: DocElement[];
  proposals: Proposal[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const MAJORITY = 3;

export const ALLOWED_CHILDREN: Partial<Record<ElementType, ElementType[]>> = {
  section:    ['subsection', 'paragraph'],
  subsection: ['paragraph'],
  paragraph:  ['sentence'],
};

// ---------------------------------------------------------------------------
// Internal pure helpers
// ---------------------------------------------------------------------------
function getDescendants(elements: DocElement[], id: string): DocElement[] {
  const children = elements.filter(e => e.parentId === id);
  return [...children, ...children.flatMap(c => getDescendants(elements, c.id))];
}

function hasOthersDescendants(elements: DocElement[], id: string, currentUser: string): boolean {
  return getDescendants(elements, id).some(e => e.owner !== currentUser);
}


// ---------------------------------------------------------------------------
// Public capability checks (pure, no I/O)
// ---------------------------------------------------------------------------

export function canDirectEdit(elements: DocElement[], id: string, currentUser: string): boolean {
  const el = elements.find(e => e.id === id);
  if (!el) return false;
  if (el.type === 'title') return true;
  return el.owner === currentUser;
}

export function canDirectDelete(elements: DocElement[], id: string, currentUser: string): boolean {
  const el = elements.find(e => e.id === id);
  if (!el || el.type === 'title') return false;
  if (el.owner !== currentUser) return false;
  return !hasOthersDescendants(elements, id, currentUser);
}

export function canProposeEdit(elements: DocElement[], id: string, currentUser: string): boolean {
  const el = elements.find(e => e.id === id);
  if (!el || el.type === 'title') return false;
  return el.owner !== currentUser;
}

export function canProposeDelete(elements: DocElement[], id: string, currentUser: string): boolean {
  const el = elements.find(e => e.id === id);
  if (!el || el.type === 'title') return false;
  if (el.owner === currentUser) return hasOthersDescendants(elements, id, currentUser);
  return true;
}

// ---------------------------------------------------------------------------
// Async API — the contract (DocumentFlow.sol) enforces the same rules: the
// checks above only decide which buttons to show. Whoever signs is the
// participant. The contract applies a proposal once MAJORITY support it, and
// discards it once MAJORITY reject it.
// ---------------------------------------------------------------------------

const TYPES: ElementType[] = ['title', 'section', 'subsection', 'paragraph', 'sentence'];
const KINDS: ProposalKind[] = ['edit', 'delete'];

/** The deploy's constructor arguments: the document's title is the flow's. */
export const documentConstructor = (_config: Record<string, unknown>, context: { title: string }) => ({ title: context.title });

export async function loadDocument(contractId: string): Promise<DocumentState> {
  const [rawElements, rawProposals] = await Promise.all([
    readSilently(contractId, 'getElements') as Promise<{
      id: string; elementType: number; text: string; owner: string; parent: string; order: number;
    }[]>,
    readSilently(contractId, 'getProposals') as Promise<{
      id: string; targetId: string; kind: number; proposedText: string; proposer: string; supporters: string[]; rejecters: string[];
    }[]>,
  ]);
  const elements: DocElement[] = rawElements.map((e) => ({
    id: e.id, type: TYPES[Number(e.elementType)], text: e.text, owner: e.owner,
    parentId: e.parent || null, order: Number(e.order),
  }));
  const proposals: Proposal[] = rawProposals.map((p) => ({
    id: p.id, targetId: p.targetId, kind: KINDS[Number(p.kind)],
    proposedText: KINDS[Number(p.kind)] === 'edit' ? p.proposedText : undefined,
    proposer: p.proposer, supporters: p.supporters, rejecters: p.rejecters,
  }));
  return { elements, proposals };
}

// Each may open the node's approval page: call them from a click.

export async function addElement(contractId: string, type: ElementType, parentId: string | null, text: string): Promise<void> {
  await write(contractId, 'addElement', { elementType: TYPES.indexOf(type), parent: parentId ?? '', text: text.trim() });
}

export async function updateElement(contractId: string, id: string, text: string): Promise<void> {
  await write(contractId, 'editElement', { id, text: text.trim() });
}

export async function deleteElement(contractId: string, id: string): Promise<void> {
  await write(contractId, 'deleteElement', { id });
}

export async function proposeEdit(contractId: string, targetId: string, proposedText: string): Promise<void> {
  await write(contractId, 'proposeEdit', { targetId, text: proposedText.trim() });
}

export async function proposeDelete(contractId: string, targetId: string): Promise<void> {
  await write(contractId, 'proposeDelete', { targetId });
}

export async function voteProposal(contractId: string, proposalId: string, vote: 'support' | 'reject'): Promise<void> {
  await write(contractId, 'voteProposal', { proposalId, support: vote === 'support' });
}
