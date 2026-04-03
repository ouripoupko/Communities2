import React, { useState, useRef, useCallback, useEffect, Suspense, lazy } from 'react';
import { IdCard, QrCode, Share2 } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import type { IProfile } from '../../services/interfaces';
import ApprovalDialog from './dialogs/ApprovalDialog';
import MessageDialog from './dialogs/MessageDialog';
import styles from './Members.module.scss';
import { requestJoin } from '../../services/contracts/community';
import { eventStreamService } from '../../services/eventStream';
import type { BlockchainEvent } from '../../services/eventStream';

const IdentityCardDialog = lazy(() => import('./dialogs/IdentityCardDialog'));
const QRScannerDialog = lazy(() => import('./dialogs/QRScannerDialog'));
const Share = lazy(() => import('./Share'));

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
  const { communityMembers, communityTasks, communityNominates, profiles, communityProperties } = useAppSelector((state) => state.communities);
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const allMembers: string[] = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];
  const tasks: Record<string, boolean> = communityTasks[communityId] || {};
  const taskAgents: string[] = Object.keys(tasks);
  const nominates: string[] = Array.isArray(communityNominates[communityId]) ? communityNominates[communityId] : [];
  const [isJoining, setIsJoining] = useState(false);
  const [showIdentityCard, setShowIdentityCard] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [messageDialog, setMessageDialog] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: ''
  });

  const members: string[] = allMembers.filter(member => !taskAgents.includes(member));
  const isMember = publicKey && allMembers.includes(publicKey);

  const communityName = communityProperties[communityId]?.name || 'Community';

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

  const allPeople = [
    ...taskAgents.map(agentId => ({
      publicKey: agentId,
      profile: profiles[agentId],
      showApproveButton: true,
      isApproved: tasks[agentId],
      onApprove: () => handleApproveClick(agentId)
    })),
    ...members.map(pk => ({
      publicKey: pk,
      profile: profiles[pk],
      showApproveButton: false,
      isApproved: false,
      onApprove: undefined
    }))
  ];

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

  useEffect(() => {
    return () => {
      cleanupJoinListener();
    };
  }, [cleanupJoinListener]);

  const handleJoinCommunity = async () => {
    if (!serverUrl || !publicKey || !communityId) return;

    setIsJoining(true);

    const handleContractWrite = (event: BlockchainEvent) => {
      if (event.contract === communityId && joinRequestResponseRef.current) {
        if (event.request === joinRequestResponseRef.current) {
          if (event.reply === false) {
            setMessageDialog({
              isOpen: true,
              message: 'There are currently too many nominates in the community. Please try again later.'
            });
          }
          cleanupJoinListener();
        }
      }
    };

    contractWriteListenerRef.current = handleContractWrite;
    eventStreamService.addEventListener('contract_write', handleContractWrite);

    try {
      const response = await requestJoin(serverUrl, publicKey, communityId);
      joinRequestResponseRef.current = response;
    } catch (error) {
      console.error('Failed to join community:', error);
      alert('Failed to join community. Please try again.');
      cleanupJoinListener();
    }
  };

  return (
    <>
      <div className={styles.container}>
        {/* Identity & Trust section — members only */}
        {isMember && (
          <div className={styles.trustSection}>
            <h3 className={styles.trustTitle}>Identity & Trust</h3>
            <p className={styles.trustText}>
              Every member is verified through a web of trust. Existing members vouch for new
              members' identities. Show your ID card to prove membership, or scan another
              member's card to verify theirs.
            </p>
            <div className={styles.trustActions}>
              <button className={styles.trustBtn} onClick={() => setShowIdentityCard(true)}>
                <IdCard size={18} />
                <span>My ID Card</span>
              </button>
              <button className={styles.trustBtn} onClick={() => setShowQRScanner(true)}>
                <QrCode size={18} />
                <span>Scan Member</span>
              </button>
              <button className={styles.trustBtn} onClick={() => setShowShare((v) => !v)}>
                <Share2 size={18} />
                <span>Share</span>
              </button>
            </div>
            {showShare && (
              <div className={styles.shareEmbed}>
                <Suspense fallback={<p>Loading...</p>}>
                  <Share communityId={communityId} />
                </Suspense>
              </div>
            )}
          </div>
        )}

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

      {/* Dialogs */}
      <Suspense fallback={null}>
        <IdentityCardDialog
          isOpen={showIdentityCard}
          onClose={() => setShowIdentityCard(false)}
          communityName={communityName}
        />
        <QRScannerDialog
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          communityId={communityId}
        />
      </Suspense>
    </>
  );
};

export default Members;
