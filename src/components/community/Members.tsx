import React from 'react';
import { useAppSelector } from '../../store/hooks';

interface MembersProps {
  communityId: string;
}

const Members: React.FC<MembersProps> = ({ communityId }) => {
  // Get the list of public keys from Redux
  const communityMembers = useAppSelector((state) => state.communities.communityMembers);
  const members: string[] = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];

  return (
    <div className="members-container">
      <div className="members-header">
        <h2>Members</h2>
        <p>{members.length} community members</p>
      </div>
      <div className="members-list">
        {members.length === 0 ? (
          <div className="empty-state">
            <p>No members found.</p>
          </div>
        ) : (
          members.map((publicKey: string) => (
            <div key={publicKey} className="member-card">
              <div className="member-info">
                <span className="public-key">{publicKey}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Members; 