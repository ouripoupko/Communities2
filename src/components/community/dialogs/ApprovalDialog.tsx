import React from 'react';
import { approveAgent, disapproveAgent } from '../../../services/contracts/community';
import { useAppSelector } from '../../../store/hooks';
import styles from './ApprovalDialog.module.scss';

interface ApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  agentPublicKey: string;
  agentName: string;
  agentProfileImage?: string;
  communityId: string;
}

const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  isOpen,
  onClose,
  agentPublicKey,
  agentName,
  agentProfileImage,
  communityId
}) => {
  const { publicKey, serverUrl } = useAppSelector((state: any) => state.user);

  const handleApprove = async () => {
    if (!publicKey || !serverUrl) return;
    
    try {
      await approveAgent(
        serverUrl,
        publicKey,
        communityId,
        agentPublicKey,
      );
      onClose();
    } catch (error) {
      console.error('Failed to approve agent:', error);
    }
  };

  const handleDisapprove = async () => {
    if (!publicKey || !serverUrl) return;
    
    try {
      await disapproveAgent(
        serverUrl,
        publicKey,
        communityId,
        agentPublicKey
      );
      onClose();
    } catch (error) {
      console.error('Failed to disapprove agent:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.content}>
          <div className={styles.profileSection}>
            <div className={styles.profileImage}>
              {agentProfileImage ? (
                <img src={agentProfileImage} alt="Profile" />
              ) : (
                <div className={styles.placeholder}>
                  <span>?</span>
                </div>
              )}
            </div>
          </div>
          
          <div className={styles.messageSection}>
            <p className={styles.message}>
              Do you confirm that the person with public key{' '}
              <span className={styles.publicKey}>{agentPublicKey}</span>{' '}
              is named <span className={styles.name}>{agentName}</span>{' '}
              and looks like this?
            </p>
          </div>
          
          <div className={styles.actions}>
            <button 
              className={styles.disapproveButton}
              onClick={handleDisapprove}
            >
              Disapprove
            </button>
            <button 
              className={styles.approveButton}
              onClick={handleApprove}
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalDialog;
