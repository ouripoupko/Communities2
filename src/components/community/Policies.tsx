import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppSelector } from '../../store/hooks';
import { useCurrency } from '../../hooks/useCurrency';
import { createPolicy, type Policy } from '../../services/contracts/community';
import PolicyCard from './policies/PolicyCard';
import BalancesStatus from './BalancesStatus';
import CreatePolicyDialog, { type CreatePolicyFormData } from './dialogs/CreatePolicyDialog';
import styles from './Policies.module.scss';

interface PoliciesProps {
  communityId: string;
}

const Policies: React.FC<PoliciesProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const { communityMembers, membersLoading } = useAppSelector((state) => state.communities);
  const { publicKey } = useAppSelector((state) => state.user);
  const { labels, policies, currency, loading } = useCurrency(communityId);
  const allMembers: string[] = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];
  const isMember = !!publicKey && allMembers.includes(publicKey);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);

  // Policies tab shows only public, community-governed policies. Personal
  // commitments (self-set) live on the Wallet tab instead - see Wallet.tsx.
  const items: Policy[] = useMemo(
    () => policies.filter((p) => p.rateType === 'community-governed'),
    [policies],
  );

  // Creating may open the node's approval page: it starts from the dialog's
  // button. The page's contract_write listener reloads the policies.
  const handleCreatePolicy = async (data: CreatePolicyFormData) => {
    const destination: Policy['destination'] =
      data.destinationKind === 'account'
        ? { kind: 'account', account: data.destinationAccountId }
        : { kind: data.destinationKind };
    await createPolicy(communityId, {
      name: data.name,
      description: data.description,
      source: data.source,
      destination,
      mode: data.mode,
      rateType: 'community-governed',
    });
  };

  const handleCardClick = (policy: Policy) => {
    navigate(`/community/${communityId}/policy/${policy.id}`);
  };

  if (membersLoading[communityId] === true) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Policies</h2>
          <p>Loading community members...</p>
        </div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Policies</h2>
          <p>You are not yet a member of this community.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Policies</h2>
        <p>The monetary policies that govern this community's currency</p>
      </div>

      <BalancesStatus communityId={communityId} currency={currency} />

      <div className={styles.gates}>
        <button className={styles.gateButton} onClick={() => setPolicyDialogOpen(true)}>
          <Plus size={20} />
          Create Policy
        </button>
      </div>

      {loading && policies.length === 0 ? (
        <div className={styles.loadingState}>
          <p>Loading policies...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <p>No policies yet. Create a policy to get started.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {items.map((policy) => (
            <PolicyCard key={policy.id} policy={policy} accountLabels={labels} onClick={handleCardClick} />
          ))}
        </div>
      )}

      <CreatePolicyDialog
        isVisible={policyDialogOpen}
        communityId={communityId}
        onClose={() => setPolicyDialogOpen(false)}
        onSubmit={handleCreatePolicy}
      />
    </div>
  );
};

export default Policies;
