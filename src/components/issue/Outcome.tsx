import React from 'react';
import { BarChart3 } from 'lucide-react';
import styles from './Outcome.module.scss';
import { useAppSelector } from '../../store/hooks';

interface Proposal {
  id: string;
  title: string;
  description: string;
  author: string;
}

interface OutcomeProps {
  issueId: string;
}

const Outcome: React.FC<OutcomeProps> = ({ issueId }) => {
  const issueDetails = useAppSelector((state) => state.issues.issueDetails[issueId] || {});
  const proposals = useAppSelector((state) => state.issues.issueProposals[issueId] || []);
  const votes = issueDetails.votes || {};
  
  // Calculate Condorcet results from the available votes
  const calculateCondorcetResult = () => {
    const voteOrders = Object.values(votes).map((vote: any) => vote.order);
    if (voteOrders.length === 0) return null;
    
    // Get all proposal IDs (excluding acceptance bar)
    const proposalIds = proposals.map(p => p.id);
    
    // Create pairwise comparison matrix
    const comparisons = new Map();
    
    // Initialize comparison counts
    for (let i = 0; i < proposalIds.length; i++) {
      for (let j = i + 1; j < proposalIds.length; j++) {
        const a = proposalIds[i];
        const b = proposalIds[j];
        comparisons.set(`${a}-${b}`, { aWins: 0, bWins: 0 });
      }
    }
    
    // Count pairwise comparisons
    voteOrders.forEach(order => {
      for (let i = 0; i < proposalIds.length; i++) {
        for (let j = i + 1; j < proposalIds.length; j++) {
          const a = proposalIds[i];
          const b = proposalIds[j];
          const aIndex = order.indexOf(a);
          const bIndex = order.indexOf(b);
          
          if (aIndex !== -1 && bIndex !== -1) {
            const key = aIndex < bIndex ? `${a}-${b}` : `${b}-${a}`;
            if (comparisons.has(key)) {
              const comp = comparisons.get(key);
              if (aIndex < bIndex) {
                comp.aWins++;
              } else {
                comp.bWins++;
              }
            }
          }
        }
      }
    });
    
    // Build preference graph
    const graph = new Map<string, Set<string>>();
    proposalIds.forEach(id => graph.set(id, new Set<string>()));
    
    comparisons.forEach((comp, key) => {
      const [a, b] = key.split('-');
      if (comp.aWins > comp.bWins) {
        graph.get(a)?.add(b);
      } else if (comp.bWins > comp.aWins) {
        graph.get(b)?.add(a);
      }
    });
    
    // Find Condorcet winner or detect cycles
    const ranking: any[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (node: string): string[] => {
      if (visiting.has(node)) {
        // Cycle detected
        const cycle = [];
        let current = node;
        do {
          cycle.push(current);
          const nextNode = Array.from(graph.get(current) || []).find(n => visiting.has(n));
          current = nextNode || '';
        } while (current !== node && current !== '' && current !== undefined);
        return cycle;
      }
      if (visited.has(node)) return [];
      
      visiting.add(node);
      const cycle = Array.from(graph.get(node) || []).find(n => visit(n).length > 0);
      visiting.delete(node);
      visited.add(node);
      
      if (cycle) {
        return [cycle];
      }
      
      ranking.unshift(node);
      return [];
    };
    
    // Process all nodes
    for (const node of proposalIds) {
      if (!visited.has(node)) {
        const cycle = visit(node);
        if (cycle.length > 0) {
          ranking.unshift(cycle);
        }
      }
    }
    
    return { ranking };
  };
  
  const condorcetResult = calculateCondorcetResult();

  // Helper to get proposal title by id (including acceptance bar)
  const getProposalTitle = (id: string) => {
    if (id === '__ACCEPTANCE_BAR__') return 'Acceptance Bar';
    const proposal = proposals.find((p: Proposal) => p.id === id);
    return proposal ? proposal.title : id;
  };

  // Check if there are any cycles
  const hasCycles = condorcetResult && condorcetResult.ranking.some((group: string[]) => Array.isArray(group) && group.length > 1);

  // Show message when no proposals exist (proposals are already loaded by parent)
  if (proposals.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Aggregated Ranking</h2>
          <p>No proposals have been submitted for this issue yet.</p>
        </div>
      </div>
    );
  }

  // Show message when no votes exist yet
  if (!condorcetResult) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Aggregated Ranking</h2>
          <p>No votes have been submitted yet. Results will appear here once voting begins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Aggregated Ranking</h2>
        <p>
          This ranking is computed using the Condorcet method. {hasCycles && (
            <span style={{ color: '#b91c1c', fontWeight: 600 }}>
              Cycles detected: proposals in a cycle are shown grouped and are mutually tied.
            </span>
          )}
        </p>
      </div>

      <div className={styles.resultsSection}>
        <div className={styles.resultsList}>
          {condorcetResult.ranking.map((group: any, index: number) => {
            const key = Array.isArray(group) ? group.join('-') : group;
            const rank = index + 1;
            
            return Array.isArray(group) && group.length > 1 ? (
              <div key={key} className={styles.cycleGroup}>
                <div className={styles.resultRank}>#{rank}</div>
                {group.map((id, idx) => (
                  <div
                    key={id}
                    className={`${styles.resultCard} ${styles.cycleCard}`}
                    style={{
                      marginLeft: `${idx * 24}px`,
                      marginTop: idx === 0 ? 0 : '-32px',
                      zIndex: 100 - idx,
                      position: 'relative',
                    }}
                  >
                    <div className={styles.resultContent}>
                      <h4>{getProposalTitle(id)}</h4>
                      {idx === 0 && (
                        <span className={styles.cycleLabel}>Cycle</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div key={key} className={styles.resultCard}>
                <div className={styles.resultRank}>#{rank}</div>
                <div className={styles.resultContent}>
                  <h4>{getProposalTitle(group)}</h4>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.scoringInfo}>
        <div className={styles.infoCard}>
          <BarChart3 size={20} />
          <div>
            <h4>Condorcet Method</h4>
            <p>
              Each proposal is compared pairwise. If a cycle is detected, it means the group of proposals are mutually tied in the collective ranking.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Outcome; 