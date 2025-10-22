import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCommunityMembers } from '../../store/slices/communitiesSlice';
import styles from './Members.module.scss';

interface MembersProps {
  communityId: string;
}

const Members: React.FC<MembersProps> = ({ communityId }) => {
  const dispatch = useAppDispatch();
  const { communityMembers, profiles } = useAppSelector((state) => state.communities);
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const members: string[] = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];

  // Fetch members data when component mounts
  useEffect(() => {
    if (publicKey && serverUrl && communityId && !communityMembers[communityId]) {
      dispatch(fetchCommunityMembers({
        serverUrl,
        publicKey,
        contractId: communityId,
        existingProfiles: profiles,
      }));
    }
  }, [communityId, publicKey, serverUrl, communityMembers, profiles, dispatch]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Members</h2>
        <p>{members.length} community members</p>
      </div>
      <div className={styles.list}>
        {members.length === 0 ? (
          <div className="empty-state">
            <p>No members found.</p>
          </div>
        ) : (
          members.map((publicKey: string) => {
            const profile = profiles[publicKey];
            const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '';
            const displayName = fullName || 'Unknown Member';
            const profileImage = profile?.userPhoto;
            
            return (
              <div key={publicKey} className={styles.memberCard}>
                <div className={styles.memberAvatar}>
                  {profileImage ? (
                    <img 
                      src={profileImage} 
                      alt={displayName}
                      className={styles.avatarImage}
                    />
                  ) : (
                    <div className={styles.defaultAvatar}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className={styles.memberInfo}>
                  <div className={styles.memberName}>{displayName}</div>
                  <div className={styles.publicKey}>{publicKey}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Members; 