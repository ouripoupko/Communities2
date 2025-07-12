import React, { useState, useEffect } from 'react';
import { User, Crown } from 'lucide-react';
import './Members.scss';

interface Member {
  id: string;
  name: string;
  role: 'owner' | 'member';
  joinedAt: string;
  contributionScore: number;
}

interface MembersProps {
  communityId: string;
}

const Members: React.FC<MembersProps> = ({ communityId }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const mockMembers: Member[] = [
        { id: '1', name: 'John Doe', role: 'owner', joinedAt: '2024-01-15', contributionScore: 95 },
        { id: '2', name: 'Jane Smith', role: 'member', joinedAt: '2024-02-01', contributionScore: 87 },
        { id: '3', name: 'Mike Johnson', role: 'member', joinedAt: '2024-02-15', contributionScore: 72 },
        { id: '4', name: 'Sarah Wilson', role: 'member', joinedAt: '2024-03-01', contributionScore: 65 },
      ];
      
      setMembers(mockMembers);
      setIsLoading(false);
    };

    fetchMembers();
  }, [communityId]);

  if (isLoading) {
    return (
      <div className="members-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="members-container">
      <div className="members-header">
        <h2>Members</h2>
        <p>{members.length} community members</p>
      </div>

      <div className="members-list">
        {members.map((member) => (
          <div key={member.id} className="member-card">
            <div className="member-avatar">
              <User size={24} />
              {member.role === 'owner' && <Crown size={16} className="owner-icon" />}
            </div>
            <div className="member-info">
              <h3>{member.name}</h3>
              <span className={`role-badge ${member.role}`}>
                {member.role === 'owner' ? 'Owner' : 'Member'}
              </span>
            </div>
            <div className="member-stats">
              <div className="stat">
                <span className="stat-label">Joined:</span>
                <span className="stat-value">{member.joinedAt}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Score:</span>
                <span className="stat-value">{member.contributionScore}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Members; 