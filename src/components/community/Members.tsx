import React, { useState, useEffect } from 'react';
import { User, Crown } from 'lucide-react';
import './Members.scss';
import { useAppSelector } from '../../store/hooks';

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
  // Get the list of public keys from Redux
  const communityMembers = useAppSelector(state => state.contracts.communityMembers);
  const members = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];

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