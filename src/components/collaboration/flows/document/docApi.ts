// ---------------------------------------------------------------------------
// Collaborative document — persistent API backed by contract storage
// ---------------------------------------------------------------------------

import { contractRead, contractWrite } from '../../../../services/api';
import type { IMethod } from '../../../../services/interfaces';

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
// Normalize helpers — safely coerce unknown contract data to typed objects
// ---------------------------------------------------------------------------
function normalizeElement(e: Record<string, unknown>): DocElement {
  return {
    id:       String(e.id ?? ''),
    type:     (e.type as ElementType) ?? 'sentence',
    text:     String(e.text ?? ''),
    owner:    String(e.owner ?? ''),
    parentId: e.parentId != null ? String(e.parentId) : null,
    order:    Number(e.order ?? 0),
  };
}

function normalizeProposal(p: Record<string, unknown>): Proposal {
  return {
    id:           String(p.id ?? ''),
    targetId:     String(p.targetId ?? ''),
    kind:         (p.kind as ProposalKind) ?? 'edit',
    proposedText: p.proposedText != null ? String(p.proposedText) : undefined,
    proposer:     String(p.proposer ?? ''),
    supporters:   Array.isArray(p.supporters) ? p.supporters.map(String) : [],
    rejecters:    Array.isArray(p.rejecters)  ? p.rejecters.map(String)  : [],
  };
}

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

function nextOrder(elements: DocElement[], parentId: string | null): number {
  const siblings = elements.filter(e => e.parentId === parentId && e.type !== 'title');
  return siblings.length > 0 ? Math.max(...siblings.map(e => e.order)) + 1 : 1;
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
// Async API — contract I/O
// ---------------------------------------------------------------------------

export async function loadDocument(
  server: string,
  agent: string,
  contractId: string,
): Promise<DocumentState> {
  const [rawElements, rawProposals] = await Promise.all([
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_elements', values: {} } as IMethod }),
    contractRead({ serverUrl: server, publicKey: agent, contractId, method: { name: 'get_proposals', values: {} } as IMethod }),
  ]);

  const elements: DocElement[] = Array.isArray(rawElements)
    ? rawElements.map(e => normalizeElement(e as Record<string, unknown>))
    : [];

  const proposals: Proposal[] = Array.isArray(rawProposals)
    ? rawProposals.map(p => normalizeProposal(p as Record<string, unknown>))
    : [];

  return { elements, proposals };
}

export async function addElement(
  server: string,
  agent: string,
  contractId: string,
  elements: DocElement[],
  currentUser: string,
  type: ElementType,
  parentId: string | null,
  text: string,
): Promise<void> {
  const newElement: DocElement = {
    id:       crypto.randomUUID(),
    type,
    text:     text.trim(),
    owner:    currentUser,
    parentId,
    order:    nextOrder(elements, parentId),
  };
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'add_element', values: { element: newElement } } as IMethod,
  });
}

export async function updateElement(
  server: string,
  agent: string,
  contractId: string,
  elements: DocElement[],
  id: string,
  currentUser: string,
  text: string,
): Promise<void> {
  if (!canDirectEdit(elements, id, currentUser)) return;
  const updated = elements.map(e => e.id === id ? { ...e, text: text.trim() } : e);
  await contractWrite({
    serverUrl: server,
    publicKey: agent,
    contractId,
    method: { name: 'set_elements', values: { elements: updated } } as IMethod,
  });
}

export async function deleteElement(
  server: string,
  agent: string,
  contractId: string,
  elements: DocElement[],
  proposals: Proposal[],
  id: string,
  currentUser: string,
): Promise<void> {
  if (!canDirectDelete(elements, id, currentUser)) return;
  const toRemove = new Set([id, ...getDescendants(elements, id).map(e => e.id)]);
  const filteredElements  = elements.filter(e => !toRemove.has(e.id));
  const filteredProposals = proposals.filter(p => !toRemove.has(p.targetId));
  await Promise.all([
    contractWrite({ serverUrl: server, publicKey: agent, contractId, method: { name: 'set_elements',  values: { elements: filteredElements }   } as IMethod }),
    contractWrite({ serverUrl: server, publicKey: agent, contractId, method: { name: 'set_proposals', values: { proposals: filteredProposals } } as IMethod }),
  ]);
}

export async function proposeEdit(
  server: string,
  agent: string,
  contractId: string,
  elements: DocElement[],
  proposals: Proposal[],
  targetId: string,
  currentUser: string,
  proposedText: string,
): Promise<void> {
  if (!canProposeEdit(elements, targetId, currentUser)) return;

  const newProposal: Proposal = {
    id:          crypto.randomUUID(),
    targetId,
    kind:        'edit',
    proposedText: proposedText.trim(),
    proposer:    currentUser,
    supporters:  [currentUser],
    rejecters:   [],
  };

  let updatedProposals = [...proposals, newProposal];
  let updatedElements  = elements;

  // Check if majority is immediately met
  if (newProposal.supporters.length >= MAJORITY) {
    updatedElements  = elements.map(e => e.id === targetId ? { ...e, text: newProposal.proposedText! } : e);
    updatedProposals = proposals; // don't add the proposal — it was applied instantly
    await Promise.all([
      contractWrite({ serverUrl: server, publicKey: agent, contractId, method: { name: 'set_elements',  values: { elements: updatedElements }   } as IMethod }),
      contractWrite({ serverUrl: server, publicKey: agent, contractId, method: { name: 'set_proposals', values: { proposals: updatedProposals } } as IMethod }),
    ]);
  } else {
    await contractWrite({ serverUrl: server, publicKey: agent, contractId, method: { name: 'set_proposals', values: { proposals: updatedProposals } } as IMethod });
  }
}

export async function proposeDelete(
  server: string,
  agent: string,
  contractId: string,
  elements: DocElement[],
  proposals: Proposal[],
  targetId: string,
  currentUser: string,
): Promise<void> {
  if (!canProposeDelete(elements, targetId, currentUser)) return;

  const newProposal: Proposal = {
    id:         crypto.randomUUID(),
    targetId,
    kind:       'delete',
    proposer:   currentUser,
    supporters: [currentUser],
    rejecters:  [],
  };

  let updatedProposals = [...proposals, newProposal];
  let updatedElements  = elements;

  if (newProposal.supporters.length >= MAJORITY) {
    const toRemove      = new Set([targetId, ...getDescendants(elements, targetId).map(e => e.id)]);
    updatedElements     = elements.filter(e => !toRemove.has(e.id));
    updatedProposals    = proposals.filter(p => !toRemove.has(p.targetId));
    await Promise.all([
      contractWrite({ serverUrl: server, publicKey: agent, contractId, method: { name: 'set_elements',  values: { elements: updatedElements }   } as IMethod }),
      contractWrite({ serverUrl: server, publicKey: agent, contractId, method: { name: 'set_proposals', values: { proposals: updatedProposals } } as IMethod }),
    ]);
  } else {
    await contractWrite({ serverUrl: server, publicKey: agent, contractId, method: { name: 'set_proposals', values: { proposals: updatedProposals } } as IMethod });
  }
}

export async function voteProposal(
  server: string,
  agent: string,
  contractId: string,
  elements: DocElement[],
  proposals: Proposal[],
  proposalId: string,
  currentUser: string,
  vote: 'support' | 'reject',
): Promise<void> {
  const proposal = proposals.find(p => p.id === proposalId);
  if (!proposal) return;

  // Update supporters/rejecters — remove currentUser from both, then add to appropriate list
  const supporters = proposal.supporters.filter(s => s !== currentUser);
  const rejecters  = proposal.rejecters.filter(r => r !== currentUser);
  if (vote === 'support') supporters.push(currentUser);
  else                    rejecters.push(currentUser);

  const updatedProposal: Proposal = { ...proposal, supporters, rejecters };
  let updatedProposals = proposals.map(p => p.id === proposalId ? updatedProposal : p);
  let updatedElements  = elements;

  if (updatedProposal.supporters.length >= MAJORITY) {
    // Apply and remove proposal
    if (updatedProposal.kind === 'delete') {
      const toRemove   = new Set([updatedProposal.targetId, ...getDescendants(elements, updatedProposal.targetId).map(e => e.id)]);
      updatedElements  = elements.filter(e => !toRemove.has(e.id));
      updatedProposals = updatedProposals.filter(p => !toRemove.has(p.targetId));
    } else if (updatedProposal.kind === 'edit' && updatedProposal.proposedText !== undefined) {
      updatedElements  = elements.map(e => e.id === updatedProposal.targetId ? { ...e, text: updatedProposal.proposedText! } : e);
      updatedProposals = updatedProposals.filter(p => p.id !== proposalId);
    }
    await Promise.all([
      contractWrite({ serverUrl: server, publicKey: agent, contractId, method: { name: 'set_elements',  values: { elements: updatedElements }   } as IMethod }),
      contractWrite({ serverUrl: server, publicKey: agent, contractId, method: { name: 'set_proposals', values: { proposals: updatedProposals } } as IMethod }),
    ]);
  } else if (updatedProposal.rejecters.length >= MAJORITY) {
    // Discard proposal
    updatedProposals = updatedProposals.filter(p => p.id !== proposalId);
    await contractWrite({ serverUrl: server, publicKey: agent, contractId, method: { name: 'set_proposals', values: { proposals: updatedProposals } } as IMethod });
  } else {
    // Just update the vote counts
    await contractWrite({ serverUrl: server, publicKey: agent, contractId, method: { name: 'set_proposals', values: { proposals: updatedProposals } } as IMethod });
  }
}
