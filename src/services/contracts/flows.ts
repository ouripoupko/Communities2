import { joinAndWait, readSilently, writeSilently, write, deploy } from '../ibc';
import type { JoinOutcome, Sources } from '../ibc';
import type { FlowContext, FlowDefinition } from '../../components/collaboration/flows/types';
import { sourceOf } from './sources';

// A collaboration's contract is on its creator's node, and holds its flows,
// as a tree: each flow may have child flows. Each flow is a contract on the
// node of whoever added it, who hosts it. Others use a collaboration, and
// each of its flows, as guests, through the host's node. Removing a flow
// moves its branch to the collaboration's bin, from which it can be restored.

/** A flow, as its collaboration lists it. */
export interface FlowRef {
  /** The flow's contract id */
  id: string;
  /** The flow type, matching the registry (e.g. 'ranking') */
  type: string;
  title: string;
  /** Its host's node */
  node: string;
  /** Its host: whoever added it */
  agent: string;
  /** Its parent flow's id, or '' at the top level */
  parent: string;
  /** Orders siblings: later is lower */
  position: number;
  /** Its branch is in the bin */
  binned: boolean;
}

export async function getFlows(collaborationId: string): Promise<FlowRef[]> {
  const result = await readSilently(collaborationId, 'getFlows') as {
    id: string; flowType: string; title: string; node: string; agent: string; parent: string; position: number; binned: boolean;
  }[];
  return result.map((f) => ({
    id: f.id, type: f.flowType, title: f.title, node: f.node, agent: f.agent,
    parent: f.parent, position: Number(f.position), binned: f.binned,
  }));
}

/** What a collaboration's contract says of itself. */
export interface CollaborationInfo {
  title: string;
  creator: string;
  communityId: string;
}

export async function getCollaborationInfo(collaborationId: string): Promise<CollaborationInfo> {
  const [title, creator, communityId] = await Promise.all([
    readSilently(collaborationId, 'title'),
    readSilently(collaborationId, 'creator'),
    readSilently(collaborationId, 'communityId'),
  ]);
  return { title: String(title), creator: String(creator), communityId: String(communityId) };
}

/** Joins a collaboration as a guest, through its creator's node. Call it from a click. */
export async function joinCollaboration(collaborationId: string, hostNode: string, hostAgent: string): Promise<JoinOutcome> {
  return await joinAndWait(collaborationId, hostNode, hostAgent, { source: sourceOf('Collaboration.sol'), guest: true });
}

/**
 * Deploys a flow on the user's node, with the config its setup dialog gave.
 * Opens the node's approval page, so call it from a click. Resolves with its
 * id; then add it to the tree (addFlow).
 */
export async function deployFlow(flow: FlowDefinition, context: FlowContext, config: Record<string, unknown> = {}): Promise<string> {
  if (!flow.source) throw new Error(`The ${flow.label} flow is not available yet`);
  return await deploy({
    source: flow.source, name: context.title, constructor: flow.constructorArgs?.(config, context) ?? {},
  });
}

/** A flow the user deployed, and where in the tree to add it. */
export interface NewFlow {
  id: string;
  type: string;
  title: string;
  node: string;
  parent: string;
}

/**
 * Adds a flow the user deployed to a collaboration's tree, under its
 * parent. With silently, never asks: it fails (needsAccess) unless the user
 * let the app call addFlow without asking; otherwise it asks if needed, so
 * call it from a click.
 */
export async function addFlow(collaborationId: string, flow: NewFlow, { silently = false } = {}): Promise<void> {
  const values = { id: flow.id, flowType: flow.type, flowTitle: flow.title, node: flow.node, parent: flow.parent };
  if (silently) await writeSilently(collaborationId, 'addFlow', values);
  else await write(collaborationId, 'addFlow', values);
}

/**
 * Moves a flow's branch to the bin: its host, or the collaboration's
 * creator. The flows' contracts stay on their hosts' nodes. Call it from a click.
 */
export async function removeFlow(collaborationId: string, flowId: string): Promise<void> {
  await write(collaborationId, 'removeFlow', { id: flowId });
}

/** Takes a branch out of the bin, and puts it under parent ('' for the top level). Call it from a click. */
export async function restoreFlow(collaborationId: string, flowId: string, parent: string): Promise<void> {
  await write(collaborationId, 'restoreFlow', { id: flowId, parent });
}

/** Joins a flow as a guest, through its host's node. Call it from a click. */
export async function joinFlow(flow: FlowRef, source: Sources): Promise<JoinOutcome> {
  return await joinAndWait(flow.id, flow.node, flow.agent, { source, guest: true });
}
