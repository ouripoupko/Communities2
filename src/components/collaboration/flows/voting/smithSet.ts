// ---------------------------------------------------------------------------
// Smith set / Condorcet cycle grouping
// ---------------------------------------------------------------------------
// Algorithm:
//   1. Build a pairwise preference matrix from all participant rankings.
//   2. Build a "beats" directed graph: A → B when a strict majority prefers A.
//   3. Find strongly connected components (SCCs) via Tarjan's algorithm.
//      Each SCC represents a Condorcet cycle (or a single uncontested winner).
//   4. Topologically sort the condensation DAG — the first group is the Smith set.
// ---------------------------------------------------------------------------

export interface CycleGroup {
  /** Proposal IDs in this group (a Condorcet cycle or a single winner) */
  proposalIds: string[];
  /** 1 = best / Smith set, 2 = next tier, … */
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

/** beats[a] = set of candidates that a strictly beats (more prefer a than b) */
function buildBeatsGraph(
  candidates: string[],
  pref: Map<string, Map<string, number>>,
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
      if (aOverB > bOverA) {
        beats.get(a)!.push(b);
      }
    }
  }

  return beats;
}

/**
 * Tarjan's SCC algorithm.
 * Returns SCCs in *reverse* topological order of the condensation DAG
 * (i.e. the last SCC is the "dominant" group that beats everyone else).
 * Caller should reverse the result to get winners-first order.
 */
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute Condorcet-cycle groups for the given candidates.
 *
 * @param candidateIds  All proposal IDs to rank (ACCEPTANCE_BAR_ID must be excluded by caller).
 * @param allRankings   Each element is an ordered array of proposal IDs (most preferred first,
 *                      ACCEPTANCE_BAR_ID already removed).
 * @returns CycleGroup[] sorted from best (rank 1 = Smith set) to worst.
 */
export function computeCycleGroups(
  candidateIds: string[],
  allRankings: string[][],
): CycleGroup[] {
  if (candidateIds.length === 0) return [];

  if (allRankings.length === 0) {
    return [{ proposalIds: [...candidateIds], rank: 1 }];
  }

  const pref = buildPairwiseMatrix(allRankings);
  const beats = buildBeatsGraph(candidateIds, pref);
  // Tarjan returns reverse-topological; reverse to get winners first.
  const sccs = tarjanSCC(candidateIds, beats).reverse();

  return sccs.map((group, idx) => ({
    proposalIds: group,
    rank: idx + 1,
  }));
}
