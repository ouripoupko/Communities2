import React, { useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { addSigner, removeSigner } from '../../services/contracts/community';
import { getMemberDisplayName } from '../../utils/memberDisplay';
import AccountPicker from './AccountPicker';
import styles from './SignersPanel.module.scss';

interface SignersPanelProps {
  communityId: string;
  accountId: string;
  signers: string[];
  threshold: number;
}

const SignersPanel: React.FC<SignersPanelProps> = ({ communityId, accountId, signers, threshold }) => {
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { profiles } = useAppSelector((state) => state.communities);
  const [addingSigner, setAddingSigner] = useState('');
  const [busy, setBusy] = useState(false);

  const isSigner = !!publicKey && signers.includes(publicKey);

  // Neither handler refetches after its write - the parent's
  // contract_write SSE listener picks up the new signer list once the
  // server confirms it.
  const handleAdd = async () => {
    if (!addingSigner || !publicKey || !serverUrl) return;
    setBusy(true);
    try {
      await addSigner(serverUrl, publicKey, communityId, accountId, addingSigner);
      setAddingSigner('');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (signer: string) => {
    if (!publicKey || !serverUrl) return;
    setBusy(true);
    try {
      await removeSigner(serverUrl, publicKey, communityId, accountId, signer);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h4 className={styles.title}>Signers</h4>
        <span className={styles.threshold}>Threshold: {threshold} of {signers.length}</span>
      </div>
      <ul className={styles.list}>
        {signers.map((signer) => (
          <li key={signer} className={styles.item}>
            <span>{getMemberDisplayName(profiles[signer])}</span>
            {isSigner && signers.length > 1 && (
              <button
                type="button"
                className={styles.removeButton}
                onClick={() => void handleRemove(signer)}
                disabled={busy}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
      {isSigner && (
        <div className={styles.addRow}>
          <AccountPicker
            communityId={communityId}
            value={addingSigner}
            onChange={setAddingSigner}
            excludeAccountIds={signers}
            kinds={['personal']}
            placeholder="Add a signer..."
            disabled={busy}
          />
          <button
            type="button"
            className={styles.addButton}
            onClick={() => void handleAdd()}
            disabled={busy || !addingSigner}
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
};

export default SignersPanel;
