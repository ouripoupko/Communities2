import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCommunityMembers } from '../../store/slices/communitiesSlice';

interface MembersProps {
  communityId: string;
}

const Members: React.FC<MembersProps> = ({ communityId }) => {
  const dispatch = useAppDispatch();
  const { communityMembers } = useAppSelector((state) => state.communities);
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const members: string[] = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];

  // Fetch members data when component mounts
  useEffect(() => {
    if (publicKey && serverUrl && communityId && !communityMembers[communityId]) {
      dispatch(fetchCommunityMembers({
        serverUrl,
        publicKey,
        contractId: communityId,
      }));
    }
  }, [communityId, publicKey, serverUrl, communityMembers, dispatch]);

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