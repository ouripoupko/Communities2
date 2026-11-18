import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Handshake } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { useCurrency } from '../../hooks/useCurrency';
import { createPolicy, personalAccountId, type Policy } from '../../services/contracts/community';
import { formatAmount } from './policies/policyDisplay';
import PolicyCard from './policies/PolicyCard';
import BalancesStatus from './BalancesStatus';
import SendPaymentDialog from './dialogs/SendPaymentDialog';
import CreateCommitmentDialog, { type CreateCommitmentFormData } from './dialogs/CreateCommitmentDialog';
import styles from './Wallet.module.scss';

interface WalletProps {
  communityId: string;
}

const Wallet: React.FC<WalletProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const { publicKey } = useAppSelector((state) => state.user);
  const { communityMembers, membersLoading } = useAppSelector((state) => state.communities);
  const { accounts, labels, policies, currency } = useCurrency(communityId);
  const allMembers: string[] = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];
  const isMember = !!publicKey && allMembers.includes(publicKey);
  const myAccountId = publicKey ? personalAccountId(publicKey) : '';

  const [sendOpen, setSendOpen] = useState(false);
  const [commitmentDialogOpen, setCommitmentDialogOpen] = useState(false);

  const myCommitments: Policy[] = useMemo(
    () => policies.filter((p) => p.rateType === 'self-set' && p.creator.toLowerCase() === myAccountId),
    [policies, myAccountId],
  );

  // Creating a commitment may open the node's approval page: it starts from
  // the dialog's button. The page's contract_write listener reloads it.
  const handleCreateCommitment = async (data: CreateCommitmentFormData) => {
    await createPolicy(communityId, {
      name: data.name,
      source: { kind: 'account', account: data.fromAccountId },
      destination: { kind: 'account', account: data.toAccountId },
      mode: data.mode,
      rateType: 'self-set',
      selfRate: data.rate,
    });
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

  const myAccount = accounts.find((a) => a.id === myAccountId);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Wallet</h2>
        <p>Your balance and your personal commitments</p>
      </div>

      <BalancesStatus communityId={communityId} currency={currency} />

      <div className={styles.section}>
        <h3>My Account</h3>
        <div className={styles.accountRow}>
          <span className={styles.balance}>{formatAmount(myAccount?.balance ?? 0)}</span>
          <button className={styles.sendButton} onClick={() => setSendOpen(true)}>
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
              <PolicyCard key={policy.id} policy={policy} accountLabels={labels} onClick={handleCommitmentClick} />
            ))}
          </div>
        )}
      </div>

      <SendPaymentDialog
        isVisible={sendOpen}
        communityId={communityId}
        fromAccountId={myAccountId}
        fromAccountLabel="My personal account"
        onClose={() => setSendOpen(false)}
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
