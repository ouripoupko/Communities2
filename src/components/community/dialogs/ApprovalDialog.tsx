import React, { useState } from 'react';
import { approveAgent, disapproveAgent } from '../../../services/contracts/community';
import Modal from '../../Modal';
import form from '../../dialogForm.module.scss';
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Each may open the node's approval page, so each starts from its button.
  const act = async (action: () => Promise<void>) => {
    try {
      setBusy(true);
      setError(null);
      await action();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  const handleApprove = () => act(() => approveAgent(communityId, agentPublicKey));
  const handleDisapprove = () => act(() => disapproveAgent(communityId, agentPublicKey));

  if (!isOpen) return null;

  // The user answers it: approve or disapprove; it does not close otherwise.
  return (
    <Modal
      title="Confirm this person"
      onClose={onClose}
      closable={false}
      actions={(
        <>
          <button className={form.dangerButton} onClick={() => void handleDisapprove()} disabled={busy}>
            Disapprove
          </button>
          <button className={styles.approveButton} onClick={() => void handleApprove()} disabled={busy}>
            {busy ? 'Approve on your node…' : 'Approve'}
          </button>
        </>
      )}
    >
      <div className={styles.profileImage}>
        {agentProfileImage ? (
          <img src={agentProfileImage} alt="Profile" />
        ) : (
          <div className={styles.placeholder}>
            <span>?</span>
          </div>
        )}
      </div>

      <p className={styles.message}>
        Do you confirm that the person with public key{' '}
        <span className={styles.publicKey}>{agentPublicKey}</span>{' '}
        is named <span className={styles.name}>{agentName}</span>{' '}
        and looks like this?
      </p>

      {error && <div className={form.error}>{error}</div>}
    </Modal>
  );
};

export default ApprovalDialog;
