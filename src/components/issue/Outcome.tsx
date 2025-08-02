import React from 'react';
import { BarChart3 } from 'lucide-react';
import './Outcome.scss';
import { useAppSelector } from '../../store/hooks';

interface Proposal {
  id: string;
  title: string;
  description: string;
  author: string;
  score: number;
  rank: number;
  voteCount: number;
}

interface OutcomeProps {
  issueId: string;
}

const Outcome: React.FC<OutcomeProps> = ({ issueId }) => {
  const issueDetails = useAppSelector((state: any) => state.issues.issueDetails[issueId] || {});
  const proposals = useAppSelector((state: any) => state.issues.issueProposals[issueId] || []);
  const condorcetResult = (issueDetails && typeof issueDetails === 'object' && 'condorcetResult' in issueDetails) ? (issueDetails as any).condorcetResult : undefined;
  const isLoading = !condorcetResult;

  // Helper to get proposal title by id (including acceptance bar)
  const getProposalTitle = (id: string) => {
    if (id === '__ACCEPTANCE_BAR__') return 'Acceptance Bar';
    const proposal = proposals.find((p: Proposal) => p.id === id);
    return proposal ? proposal.title : id;
  };

  // Check if there are any cycles
  const hasCycles = condorcetResult && condorcetResult.ranking.some((group: string[]) => group.length > 1);

  if (isLoading) {
    return (
      <div className="outcome-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Calculating voting results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="outcome-container">
      <div className="outcome-header">
        <h2>Aggregated Ranking</h2>
        <p>
          This ranking is computed using the Condorcet method. {hasCycles && (
            <span style={{ color: '#b91c1c', fontWeight: 600 }}>
              Cycles detected: proposals in a cycle are shown grouped and are mutually tied.
            </span>
          )}
        </p>
      </div>

      <div className="results-section">
        <div className="results-list">
          {condorcetResult.ranking.map((group: string[]) =>
            group.length === 1 ? (
              <div key={group[0]} className="result-card">
                <div className="result-content">
                  <h4>{getProposalTitle(group[0])}</h4>
                </div>
              </div>
            ) : (
              <div key={group.join('-')} className="cycle-group">
                {group.map((id, idx) => (
                  <div
                    key={id}
                    className="result-card cycle-card"
                    style={{
                      marginLeft: `${idx * 24}px`,
                      marginTop: idx === 0 ? 0 : '-32px',
                      zIndex: 100 - idx,
                      position: 'relative',
                    }}
                  >
                    <div className="result-content">
                      <h4>{getProposalTitle(id)}</h4>
                      {idx === 0 && (
                        <span className="cycle-label">Cycle</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      <div className="scoring-info">
        <div className="info-card">
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