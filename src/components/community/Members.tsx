import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import ApprovalDialog from './dialogs/ApprovalDialog';
import MessageDialog from './dialogs/MessageDialog';
import styles from './Members.module.scss';
import { requestJoin } from '../../services/contracts/community';
import { eventStreamService } from '../../services/eventStream';
import type { BlockchainEvent } from '../../services/eventStream';

interface MemberItemProps {
  publicKey: string;
  profile: any;
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
  const { communityMembers, communityTasks, communityNominates, profiles } = useAppSelector((state) => state.communities);
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const allMembers: string[] = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];
  const tasks: Record<string, boolean> = communityTasks[communityId] || {};
  const taskAgents: string[] = Object.keys(tasks);
  const nominates: string[] = Array.isArray(communityNominates[communityId]) ? communityNominates[communityId] : [];
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

  const joinRequestResponseRef = useRef<any>(null);
  const contractWriteListenerRef = useRef<((event: BlockchainEvent) => void) | null>(null);

  const cleanupJoinListener = useCallback(() => {
    if (contractWriteListenerRef.current) {
      eventStreamService.removeEventListener('contract_write', contractWriteListenerRef.current);
      contractWriteListenerRef.current = null;
    }
    joinRequestResponseRef.current = null;
    setIsJoining(false);
  }, []);

  // Cleanup on unmount (user navigated away)
  useEffect(() => {
    return () => {
      cleanupJoinListener();
    };
  }, [cleanupJoinListener]);

  const handleJoinCommunity = async () => {
    if (!serverUrl || !publicKey || !communityId) return;
    
    setIsJoining(true);
    
    // Register event listener before making the request
    const handleContractWrite = (event: BlockchainEvent) => {
      // Check if this event is for our community and matches our request
      if (event.contract === communityId && joinRequestResponseRef.current) {
        // Check if the 'request' field matches our response
        if (event.request === joinRequestResponseRef.current) {
          // Check the 'reply' field
          if (event.reply === false) {
            setMessageDialog({
              isOpen: true,
              message: 'There are currently too many nominates in the community. Please try again later.'
            });
          }
          
          // Clean up listener and state once we found the matching event
          cleanupJoinListener();
        }
      }
    };
    
    // Store the listener reference for cleanup
    contractWriteListenerRef.current = handleContractWrite;
    
    // Register the event listener BEFORE making the request
    eventStreamService.addEventListener('contract_write', handleContractWrite);
    
    try {
      const response = await requestJoin(serverUrl, publicKey, communityId);
      // Store the response to match against the event
      // The listener will handle cleanup when the event arrives
      joinRequestResponseRef.current = response;
      // Don't set isJoining to false here - wait for the event
    } catch (error) {
      console.error('Failed to join community:', error);
      alert('Failed to join community. Please try again.');
      // Clean up listener on error - the request failed so no event will come
      cleanupJoinListener();
    }
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Members</h2>
          <p>{allMembers.length} community members</p>
        </div>
        
        {!currentUserInList && publicKey && (
          <div className={styles.joinSection}>
            <button
              onClick={handleJoinCommunity}
              disabled={isJoining}
              className={styles.joinButton}
            >
              {isJoining ? 'Joining...' : 'Join Community'}
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