import React, { useState, useEffect } from 'react';
import { BarChart3, Trophy, Award } from 'lucide-react';
import './Outcome.scss';

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
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOutcome = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockProposals: Proposal[] = [
        {
          id: '1',
          title: 'Use Auth0 for authentication',
          description: 'Implement Auth0 as the primary authentication provider with OAuth2 and JWT support.',
          author: 'John Doe',
          score: 85,
          rank: 1,
          voteCount: 12
        },
        {
          id: '2',
          title: 'Build custom auth solution',
          description: 'Create a custom authentication system using Node.js and Passport.js.',
          author: 'Jane Smith',
          score: 72,
          rank: 2,
          voteCount: 8
        },
        {
          id: '3',
          title: 'Use Firebase Authentication',
          description: 'Leverage Firebase Authentication for easy integration and management.',
          author: 'Mike Johnson',
          score: 58,
          rank: 3,
          voteCount: 5
        }
      ];
      
      setProposals(mockProposals);
      setIsLoading(false);
    };

    fetchOutcome();
  }, [issueId]);

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
        <h2>Voting Results</h2>
        <p>Aggregated ranking using positional scoring</p>
      </div>

      <div className="winner-section">
        <div className="winner-card">
          <Trophy size={32} className="trophy-icon" />
          <h3>Winner</h3>
          <div className="winner-proposal">
            <h4>{proposals[0]?.title}</h4>
            <p>{proposals[0]?.description}</p>
            <span className="author">by {proposals[0]?.author}</span>
          </div>
          <div className="winner-stats">
            <div className="stat">
              <span className="label">Score:</span>
              <span className="value">{proposals[0]?.score} points</span>
            </div>
            <div className="stat">
              <span className="label">Votes:</span>
              <span className="value">{proposals[0]?.voteCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="results-section">
        <h3>All Results</h3>
        <div className="results-list">
          {proposals.map((proposal, index) => (
            <div key={proposal.id} className={`result-card ${index === 0 ? 'winner' : ''}`}>
              <div className="result-rank">
                {index === 0 ? (
                  <Trophy size={20} className="rank-icon winner" />
                ) : index === 1 ? (
                  <Award size={20} className="rank-icon second" />
                ) : index === 2 ? (
                  <Award size={20} className="rank-icon third" />
                ) : (
                  <span className="rank-number">{proposal.rank}</span>
                )}
              </div>
              
              <div className="result-content">
                <h4>{proposal.title}</h4>
                <p>{proposal.description}</p>
                <span className="author">by {proposal.author}</span>
              </div>

              <div className="result-stats">
                <div className="stat">
                  <span className="label">Score:</span>
                  <span className="value">{proposal.score} pts</span>
                </div>
                <div className="stat">
                  <span className="label">Votes:</span>
                  <span className="value">{proposal.voteCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="scoring-info">
        <div className="info-card">
          <BarChart3 size={20} />
          <div>
            <h4>Scoring System</h4>
            <p>Positional scoring: 1st place = 3 points, 2nd place = 2 points, 3rd place = 1 point</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Outcome; 