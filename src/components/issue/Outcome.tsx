import React from 'react';
import clsx from 'clsx';
import { BarChart3 } from 'lucide-react';
import styles from './Outcome.module.scss';
import { useAppSelector } from '../../store/hooks';

// Constant for the acceptance bar ID
const ACCEPTANCE_BAR_ID = '__ACCEPTANCE_BAR__';

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
    
    // Get all proposal IDs including acceptance bar
    const allIds = new Set<string>();
    voteOrders.forEach((order: string[]) => {
      order.forEach(id => allIds.add(id));
    });
    const proposalIds = Array.from(allIds);

    const n = proposalIds.length;
    const indexes: {[keys: string]: number} = {};
    const sum_matrix: number[][] = [];
    proposalIds.forEach((value, index) => {
      indexes[value] = index;
      sum_matrix.push(new Array(n).fill(0));
    });

    // pairwise compare matrix
    for (let order of Object.values(voteOrders)) {
      const unordered = new Set(Object.keys(indexes));
      for (let above of order) {
        if (unordered.has(above)) {
          unordered.delete(above);
          let above_index = indexes[above];
          for (let below of unordered) {
            let below_index = indexes[below];
            sum_matrix[above_index][below_index] += 1;
          }
        }
      }
    }

    // copeland score
    let copeland: number[] = [];
    for (let row = 0; row < n; ++row) {
      for (let col = row+1; col < n; ++col) {
        sum_matrix[row][col] = (sum_matrix[row][col] > sum_matrix[col][row]) ? 2 :
                                ((sum_matrix[row][col] == sum_matrix[col][row]) ? 1 : 0);
        sum_matrix[col][row] = 2-sum_matrix[row][col];
      }
      copeland.push(sum_matrix[row].reduce((a,b) => a+b));
    }
    let order = Array.from(Array(n).keys());
    order.sort((a,b) => copeland[b]-copeland[a]);

    // smith sets
    let smith_sets = [];
    let row,col,lhs,rhs,prev: number;
    // loop on all sets
    for(rhs=1,lhs=0,prev=0;lhs<n;rhs=lhs+1) {
      // loop on a single set
      for(;lhs<rhs;lhs=rhs,rhs=row+1) {
        // include candidates with the same copeland score
        for(;rhs<n&&copeland[order[rhs]]==copeland[order[rhs-1]];rhs++);
        // loop on rows and cols to find all zeros
        for(col=rhs,row=n;col==rhs&&row>=rhs;row--) {
          for(col=lhs;col<rhs&&sum_matrix[order[row-1]][order[col]]==0;col++);
        }
      }
      smith_sets.push(Array.from({length: (lhs - prev)}, (_, k) => proposalIds[order[k + prev]]));
      prev = lhs;
    }
    
    return smith_sets;
  };
  
  const condorcetResult = calculateCondorcetResult();

  // Helper to get proposal title by id (including acceptance bar)
  const getProposalTitle = (id: string) => {
    if (id === '__ACCEPTANCE_BAR__') return 'Acceptance Bar';
    const proposal = proposals.find((p: Proposal) => p.id === id);
    return proposal ? proposal.title : id;
  };

  // Check if there are any cycles
  const hasCycles = condorcetResult && condorcetResult.some((group: string[]) => Array.isArray(group) && group.length > 1);

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
          {condorcetResult.map((group: any, index: number) => {
            const key = Array.isArray(group) ? group.join('-') : group;
            const rank = index + 1;
            
            return (
              <div key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div className={styles.resultRank}>#{rank}</div>
                  {Array.isArray(group) && group.length > 1 && (
                    <span className={styles.cycleLabel}>Cycle</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {(Array.isArray(group) ? group : [group]).map((id, idx) => {
                    // Check if this is the acceptance bar
                    const isAcceptanceBar = id === ACCEPTANCE_BAR_ID;
                    
                    if (isAcceptanceBar) {
                      return (
                        <div
                          key={id}
                          className={idx === 0 ? '' : styles.overlappingCard}
                          style={{ zIndex: idx + 1 }}
                        >
                          <div className={styles.acceptanceBar}>
                            <span className={clsx(styles.barLine, styles.left)} />
                            <span className={styles.barText}>Acceptance Bar</span>
                            <span className={clsx(styles.barLine, styles.right)} />
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={id}
                        className={`${styles.resultCard} ${Array.isArray(group) && group.length > 1 ? styles.cycleCard : ''} ${idx === 0 ? '' : styles.overlappingCard}`}
                        style={{ zIndex: idx + 1 }}
                      >
                        <div className={`${styles.resultContent} ${styles.stackedContent}`}>
                          <h4>{getProposalTitle(id)}</h4>
                        </div>
                      </div>
                    );
                  })}
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