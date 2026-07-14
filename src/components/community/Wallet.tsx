import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Handshake } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useEventStream } from '../../hooks/useEventStream';
import { fetchPolicies } from '../../store/slices/policiesSlice';
import {
  createPolicy,
  getAccountDetails,
  type IAccountDetails,
  type Policy,
} from '../../services/contracts/community';
import { getMemberDisplayName } from '../../utils/memberDisplay';
import PolicyCard from './policies/PolicyCard';
import SendPaymentDialog from './dialogs/SendPaymentDialog';
import CreateCommitmentDialog, { type CreateCommitmentFormData } from './dialogs/CreateCommitmentDialog';
import styles from './Wallet.module.scss';

interface WalletProps {
  communityId: string;
}

const Wallet: React.FC<WalletProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { communityMembers, membersLoading, profiles } = useAppSelector((state) => state.communities);
  const { communityPolicies } = useAppSelector((state) => state.policies);

  const allMembers: string[] = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];
  const isMember = !!publicKey && allMembers.includes(publicKey);

  const [accountDetails, setAccountDetails] = useState<IAccountDetails>({});
  const [sendFromAccount, setSendFromAccount] = useState<string | null>(null);
  const [commitmentDialogOpen, setCommitmentDialogOpen] = useState(false);

  const myCommitments: Policy[] = useMemo(
    () =>
      (communityPolicies[communityId] ?? []).filter(
        (p) => p.rateType === 'self-set' && p.creator === publicKey,
      ),
    [communityPolicies, communityId, publicKey],
  );

  const accountLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const pubkey of allMembers) {
      labels[pubkey] = getMemberDisplayName(profiles[pubkey]);
    }
    for (const [id, info] of Object.entries(accountDetails)) {
      if (info.type === 'public') labels[id] = info.name || id;
    }
    return labels;
  }, [allMembers, profiles, accountDetails]);

  const loadAccounts = useCallback(async () => {
    if (!communityId || !serverUrl || !publicKey) return;
    const details = await getAccountDetails(serverUrl, publicKey, communityId);
    setAccountDetails(details);
  }, [communityId, serverUrl, publicKey]);

  const loadCommitments = useCallback(() => {
    if (!communityId || !serverUrl || !publicKey) return;
    dispatch(fetchPolicies({ serverUrl, publicKey, contractId: communityId }));
  }, [communityId, serverUrl, publicKey, dispatch]);

  useEffect(() => {
    void loadAccounts();
    loadCommitments();
  }, [loadAccounts, loadCommitments]);

  useEventStream(
    'contract_write',
    useCallback(
      (event) => {
        if (event.contract === communityId) {
          void loadAccounts();
          loadCommitments();
        }
      },
      [communityId, loadAccounts, loadCommitments],
    ),
  );

  const handleCreateCommitment = async (data: CreateCommitmentFormData) => {
    if (!serverUrl || !publicKey) return;

    await createPolicy(serverUrl, publicKey, communityId, {
      id: crypto.randomUUID(),
      name: data.name,
      description: '',
      source: { kind: 'account', account: data.fromAccountId },
      destination: { kind: 'account', account: data.toAccountId },
      mode: data.mode,
      rateType: 'self-set',
      selfRate: data.rate,
    });

    loadCommitments();
  };

  const handleCommitmentClick = (policy: Policy) => {
    navigate(`/community/${communityId}/policy/${policy.id}`);
  };

  if (membersLoading[communityId] === true) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Wallet</h2>
          <p>Loading community members...</p>
        </div>
      </div>
    );
  }

  if (!isMember || !publicKey) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Wallet</h2>
          <p>You are not yet a member of this community.</p>
        </div>
      </div>
    );
  }

  const myAccount = accountDetails[publicKey];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Wallet</h2>
        <p>Your balance and your personal commitments</p>
      </div>

      <div className={styles.section}>
        <h3>My Account</h3>
        <div className={styles.accountRow}>
          <span className={styles.balance}>{myAccount?.balance ?? 0}</span>
          <button className={styles.sendButton} onClick={() => setSendFromAccount(publicKey)}>
            <Send size={16} />
            Send
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>My Commitments</h3>
          <button className={styles.commitmentButton} onClick={() => setCommitmentDialogOpen(true)}>
            <Handshake size={16} />
            Create Commitment
          </button>
        </div>
        {myCommitments.length === 0 ? (
          <p className={styles.emptyHint}>You don&apos;t have any personal commitments yet.</p>
        ) : (
          <div className={styles.list}>
            {myCommitments.map((policy) => (
              <PolicyCard key={policy.id} policy={policy} accountLabels={accountLabels} onClick={handleCommitmentClick} />
            ))}
          </div>
        )}
      </div>

      <SendPaymentDialog
        isVisible={sendFromAccount !== null}
        communityId={communityId}
        fromAccountId={sendFromAccount ?? ''}
        fromAccountLabel="My personal account"
        onClose={() => setSendFromAccount(null)}
        onSent={() => void loadAccounts()}
      />

      <CreateCommitmentDialog
        isVisible={commitmentDialogOpen}
        communityId={communityId}
        onClose={() => setCommitmentDialogOpen(false)}
        onSubmit={handleCreateCommitment}
      />
    </div>
  );
};

export default Wallet;
