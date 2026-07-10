// ---------------------------------------------------------------------------
// Smith set / Schwartz set — Condorcet cycle grouping
// ---------------------------------------------------------------------------
// Algorithm (shared by both set definitions):
//   1. Build a pairwise preference matrix from all participant rankings.
//   2. Build a "beats" directed graph over candidates:
//        - Smith set:    a → b when a strict majority prefers a to b.
//        - Schwartz set: a → b when a is NOT majority-defeated by b
//                         (ties produce edges in both directions).
//   3. Find strongly connected components (SCCs) via Tarjan's algorithm —
//      each SCC is a Condorcet cycle (or a single undefeated candidate).
//   4. Repeatedly peel off the SCCs with no incoming edges from the
//      remaining graph as one tied rank tier, then recurse on what's left.
//      This step is what correctly merges multiple top-tier SCCs that have
//      no edge between them (i.e. are genuinely tied as blocks) into a
//      single rank, instead of assigning them an arbitrary order.
// ---------------------------------------------------------------------------

export type CycleSetMode = 'smith' | 'schwartz';

export interface CycleGroup {
  /** Proposal IDs in this group (a Condorcet cycle, tie, or a single winner) */
  proposalIds: string[];
  /** 1 = best, 2 = next tier, … */
  rank: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** pref[a][b] = number of participants who ranked a above b */
function buildPairwiseMatrix(rankings: string[][]): Map<string, Map<string, number>> {
  const pref = new Map<string, Map<string, number>>();

  for (const ranking of rankings) {
    for (let i = 0; i < ranking.length; i++) {
      for (let j = i + 1; j < ranking.length; j++) {
        const a = ranking[i];
        const b = ranking[j];
        if (!pref.has(a)) pref.set(a, new Map());
        if (!pref.has(b)) pref.set(b, new Map());
        pref.get(a)!.set(b, (pref.get(a)!.get(b) ?? 0) + 1);
      }
    }
  }

  return pref;
}

/**
 * beats[a] = candidates a defeats.
 * mode 'smith':    strict majority required (a → b iff aOverB > bOverA).
 * mode 'schwartz': non-strict — a → b iff a is not majority-defeated by b
 *                   (aOverB >= bOverA), so exact ties produce edges both ways.
 */
function buildBeatsGraph(
  candidates: string[],
  pref: Map<string, Map<string, number>>,
  mode: CycleSetMode,
): Map<string, string[]> {
  const beats = new Map<string, string[]>();
  for (const c of candidates) beats.set(c, []);

  for (let i = 0; i < candidates.length; i++) {
    for (let j = 0; j < candidates.length; j++) {
      if (i === j) continue;
      const a = candidates[i];
      const b = candidates[j];
      const aOverB = pref.get(a)?.get(b) ?? 0;
      const bOverA = pref.get(b)?.get(a) ?? 0;
      const aWeaklyBeatsB = mode === 'smith' ? aOverB > bOverA : aOverB >= bOverA;
      if (aWeaklyBeatsB) {
        beats.get(a)!.push(b);
      }
    }
  }

  return beats;
}

/** Tarjan's SCC algorithm. Returns SCCs in no particular guaranteed order. */
function tarjanSCC(nodes: string[], graph: Map<string, string[]>): string[][] {
  let counter = 0;
  const indexMap = new Map<string, number>();
  const lowlinkMap = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  function strongconnect(v: string): void {
    indexMap.set(v, counter);
    lowlinkMap.set(v, counter);
    counter++;
    stack.push(v);
    onStack.add(v);

    for (const w of graph.get(v) ?? []) {
      if (!indexMap.has(w)) {
        strongconnect(w);
        lowlinkMap.set(v, Math.min(lowlinkMap.get(v)!, lowlinkMap.get(w)!));
      } else if (onStack.has(w)) {
        lowlinkMap.set(v, Math.min(lowlinkMap.get(v)!, indexMap.get(w)!));
      }
    }

    if (lowlinkMap.get(v) === indexMap.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const v of nodes) {
    if (!indexMap.has(v)) strongconnect(v);
  }

  return sccs;
}

/**
 * Groups candidates into rank tiers by repeatedly peeling off the SCCs with
 * no incoming edges from the remaining graph. Multiple such "source" SCCs
 * found in the same pass share a rank — this is what correctly represents a
 * tie between two blocks that have no dominance relation between them,
 * instead of assigning them an arbitrary sequential rank.
 */
function computeTieredGroups(candidateIds: string[], beats: Map<string, string[]>): CycleGroup[] {
  const sccs = tarjanSCC(candidateIds, beats);
  const sccIndexOf = new Map<string, number>();
  sccs.forEach((scc, i) => scc.forEach((c) => sccIndexOf.set(c, i)));

  const outEdges: Set<number>[] = sccs.map(() => new Set());
  for (const [a, targets] of beats) {
    const ai = sccIndexOf.get(a)!;
    for (const b of targets) {
      const bi = sccIndexOf.get(b)!;
      if (ai !== bi) outEdges[ai].add(bi);
    }
  }

  const inDegree = sccs.map(() => 0);
  outEdges.forEach((targets) => targets.forEach((t) => inDegree[t]++));

  const remaining = new Set(sccs.map((_, i) => i));
  const groups: CycleGroup[] = [];
  let rank = 1;

  while (remaining.size > 0) {
    const sources = [...remaining].filter((i) => inDegree[i] === 0);
    const tier = sources.length > 0 ? sources : [...remaining]; // guard; DAG always has a source
    groups.push({ proposalIds: tier.flatMap((i) => sccs[i]), rank });
    rank++;
    for (const i of tier) {
      remaining.delete(i);
      outEdges[i].forEach((t) => { if (remaining.has(t)) inDegree[t]--; });
    }
  }

  return groups;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute Condorcet-cycle rank tiers for the given candidates.
 *
 * @param candidateIds  All proposal IDs to rank (ACCEPTANCE_BAR_ID must be excluded by caller).
 * @param allRankings   Each element is an ordered array of proposal IDs (most preferred first,
 *                      ACCEPTANCE_BAR_ID already removed).
 * @param mode          'smith' (strict pairwise wins only) or 'schwartz' (ties merge candidates
 *                       into the same tier instead of splitting them by arbitrary tie-break order).
 * @returns CycleGroup[] sorted from best (rank 1) to worst.
 */
export function computeCycleGroups(
  candidateIds: string[],
  allRankings: string[][],
  mode: CycleSetMode = 'smith',
): CycleGroup[] {
  if (candidateIds.length === 0) return [];

  if (allRankings.length === 0) {
    return [{ proposalIds: [...candidateIds], rank: 1 }];
  }

  const pref = buildPairwiseMatrix(allRankings);
  const beats = buildBeatsGraph(candidateIds, pref, mode);
  return computeTieredGroups(candidateIds, beats);
}
