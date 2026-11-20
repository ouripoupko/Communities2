import React, { useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import type { IProfile } from '../../services/interfaces';
import ApprovalDialog from './dialogs/ApprovalDialog';
import MessageDialog from './dialogs/MessageDialog';
import styles from './Members.module.scss';
import { joinCommunity } from '../../services/contracts/community';

interface MemberItemProps {
  publicKey: string;
  profile: IProfile | null;
  showApproveButton?: boolean;
  isApproved?: boolean;
  onApprove?: () => void;
}

const MemberItem: React.FC<MemberItemProps> = ({ 
  publicKey, 
  profile, 
  showApproveButton = false, 
  isApproved = false, 
  onApprove 
}) => {
  const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '';
  const displayName = fullName || 'Unknown Member';
  const profileImage = profile?.userPhoto;

  return (
    <div className={styles.memberCard}>
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
        <div className={styles.nameRow}>
          <div className={styles.memberName}>{displayName}</div>
          {showApproveButton && (
            <button 
              className={isApproved ? styles.approvedButton : styles.pendingButton}
              disabled={isApproved}
              onClick={onApprove}
            >
              {isApproved ? 'Approved' : 'Approve'}
            </button>
          )}
        </div>
        <div className={styles.publicKey}>{publicKey}</div>
      </div>
    </div>
  );
};

interface MembersProps {
  communityId: string;
}

const Members: React.FC<MembersProps> = ({ communityId }) => {
  const { communityMembers, communityTasks, communityNominates, communityProperties, profiles } =
    useAppSelector((state) => state.communities);
  const { publicKey, serverUrl, profileContractId } = useAppSelector((state) => state.user);
  const allMembers: string[] = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];
  const tasks: Record<string, boolean> = communityTasks[communityId] || {};
  const taskAgents: string[] = Object.keys(tasks);
  const nominates: string[] = Array.isArray(communityNominates[communityId]) ? communityNominates[communityId] : [];
  const isOpenJoin = !!communityProperties[communityId]?.openJoin;
  const isNominee = !!publicKey && nominates.includes(publicKey);
  const [isJoining, setIsJoining] = useState(false);
  const [messageDialog, setMessageDialog] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: ''
  });
  
  // Filter out task agents who are already members to avoid duplicates in display
  const members: string[] = allMembers.filter(member => !taskAgents.includes(member));

  // State for approval dialog
  const [approvalDialog, setApprovalDialog] = useState<{
    isOpen: boolean;
    agentPublicKey: string;
    agentName: string;
    agentProfileImage?: string;
  }>({
    isOpen: false,
    agentPublicKey: '',
    agentName: '',
    agentProfileImage: undefined
  });

  const handleApproveClick = (agentId: string) => {
    const profile = profiles[agentId];
    const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '';
    const displayName = fullName || 'Unknown Member';
    const profileImage = profile?.userPhoto;

    setApprovalDialog({
      isOpen: true,
      agentPublicKey: agentId,
      agentName: displayName,
      agentProfileImage: profileImage
    });
  };

  const handleCloseDialog = () => {
    setApprovalDialog({
      isOpen: false,
      agentPublicKey: '',
      agentName: '',
      agentProfileImage: undefined
    });
  };

  // Combine task agents and members into a single list
  const allPeople = [
    ...taskAgents.map(agentId => ({
      publicKey: agentId,
      profile: profiles[agentId],
      showApproveButton: true,
      isApproved: tasks[agentId],
      onApprove: () => handleApproveClick(agentId)
    })),
    ...members.map(publicKey => ({
      publicKey,
      profile: profiles[publicKey],
      showApproveButton: false,
      isApproved: false,
      onApprove: undefined
    }))
  ];

  // Check if current user is already a member or has requested to join (in nominates)
  const currentUserInList = publicKey && (
    allMembers.includes(publicKey) || 
    nominates.includes(publicKey)
  );

  // Joining may open the node's approval page, so it starts from this click.
  // With open join it makes the user a member; otherwise it nominates them.
  const handleJoinCommunity = async () => {
    if (!serverUrl || !communityId) return;
    setIsJoining(true);
    try {
      // CommunityView reloads the members on the write's event
      await joinCommunity(communityId, serverUrl, profileContractId);
    } catch (error) {
      setMessageDialog({
        isOpen: true,
        message: `Failed to join the community: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Members</h2>
          <p>
            {allMembers.length} community {allMembers.length === 1 ? 'member' : 'members'} ·{' '}
            {isOpenJoin ? 'Open membership — anyone can join immediately' : 'Web of trust — new members need approval'}
          </p>
        </div>

        {isNominee && (
          <p className={styles.nomineeNote}>
            You asked to join. Approve each member below whom you know, and they approve you: once all
            of you approved each other, you are a member.
          </p>
        )}
        
        {!currentUserInList && publicKey && (
          <div className={styles.joinSection}>
            <button
              onClick={handleJoinCommunity}
              disabled={isJoining}
              className={styles.joinButton}
            >
              {isJoining ? 'Approve on your node…' : isOpenJoin ? 'Become a Member' : 'Ask to Join'}
            </button>
          </div>
        )}
        
        <div className={styles.list}>
          {allPeople.length === 0 ? (
            <div className="empty-state">
              <p>No members found.</p>
            </div>
          ) : (
            allPeople.map((person) => (
              <MemberItem
                key={person.publicKey}
                publicKey={person.publicKey}
                profile={person.profile}
                showApproveButton={person.showApproveButton}
                isApproved={person.isApproved}
                onApprove={person.onApprove}
              />
            ))
          )}
        </div>
      </div>

      <ApprovalDialog
        isOpen={approvalDialog.isOpen}
        onClose={handleCloseDialog}
        agentPublicKey={approvalDialog.agentPublicKey}
        agentName={approvalDialog.agentName}
        agentProfileImage={approvalDialog.agentProfileImage}
        communityId={communityId}
      />

      <MessageDialog
        isOpen={messageDialog.isOpen}
        message={messageDialog.message}
        onClose={() => setMessageDialog({ isOpen: false, message: '' })}
      />
    </>
  );
};

export default Members; 