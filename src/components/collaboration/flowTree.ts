import type { FlowRef } from '../../services/contracts/flows';

/** A flow in the tree, with its children (in order). */
export interface FlowNode {
  flow: FlowRef;
  children: FlowNode[];
}

export interface FlowTree {
  /** The top level of the tree. */
  roots: FlowNode[];
  /** The branches in the bin, each with its children. */
  bin: FlowNode[];
  /** Every flow, in the tree or in the bin, by id. */
  byId: Map<string, FlowNode>;
}

/** Builds the tree, and the bin, from a collaboration's flows. */
export function buildTree(flows: FlowRef[]): FlowTree {
  const byId = new Map<string, FlowNode>(flows.map((flow) => [flow.id, { flow, children: [] }]));
  const roots: FlowNode[] = [];
  const bin: FlowNode[] = [];
  const sorted = [...flows].sort((a, b) => a.position - b.position);
  // A binned flow leaves its parent, but keeps its children: they belong to
  // its branch in the bin.
  for (const flow of sorted) {
    const node = byId.get(flow.id)!;
    if (flow.binned) bin.push(node);
    else if (!flow.parent) roots.push(node);
    else byId.get(flow.parent)?.children.push(node);
  }
  return { roots, bin, byId };
}

/** The flow's ancestors, top level first, while it is in the tree. */
export function ancestorsOf(tree: FlowTree, id: string): FlowRef[] {
  const out: FlowRef[] = [];
  for (let p = tree.byId.get(id)?.flow.parent; p; p = tree.byId.get(p)?.flow.parent) {
    const node = tree.byId.get(p);
    if (!node) break;
    out.unshift(node.flow);
  }
  return out;
}

/** How many flows are under a node. */
export function countUnder(node: FlowNode): number {
  return node.children.reduce((n, child) => n + 1 + countUnder(child), 0);
}
