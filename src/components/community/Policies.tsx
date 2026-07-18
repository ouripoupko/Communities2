import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useEventStream } from '../../hooks/useEventStream';
import { fetchPolicies } from '../../store/slices/policiesSlice';
import {
  createPolicy,
  getAccountDetails,
  type Policy,
} from '../../services/contracts/community';
import { getMemberDisplayName } from '../../utils/memberDisplay';
import PolicyCard from './policies/PolicyCard';
import CreatePolicyDialog, { type CreatePolicyFormData } from './dialogs/CreatePolicyDialog';
import styles from './Policies.module.scss';

interface PoliciesProps {
  communityId: string;
}

const Policies: React.FC<PoliciesProps> = ({ communityId }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { communityMembers, membersLoading, profiles } = useAppSelector((state) => state.communities);
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { communityPolicies, policiesLoading } = useAppSelector((state) => state.policies);

  const allMembers: string[] = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];
  const isMember = !!publicKey && allMembers.includes(publicKey);

  const [accountNames, setAccountNames] = useState<Record<string, string>>({});
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);

  // Policies tab shows only public, community-governed policies. Personal
  // commitments (self-set) live on the Wallet tab instead - see Wallet.tsx.
  const items: Policy[] = useMemo(
    () => (communityPolicies[communityId] ?? []).filter((p) => p.rateType === 'community-governed'),
    [communityPolicies, communityId],
  );

  const loadPolicies = useCallback(() => {
    if (!communityId || !serverUrl || !publicKey) return;
    dispatch(fetchPolicies({ serverUrl, publicKey, contractId: communityId }));
  }, [communityId, serverUrl, publicKey, dispatch]);

  const loadAccountNames = useCallback(async () => {
    if (!communityId || !serverUrl || !publicKey) return;
    const details = await getAccountDetails(serverUrl, publicKey, communityId);
    const names: Record<string, string> = {};
    for (const [id, info] of Object.entries(details)) {
      if (info.type === 'public' || info.type === 'fund') names[id] = info.name || id;
    }
    setAccountNames(names);
  }, [communityId, serverUrl, publicKey]);

  useEffect(() => {
    loadPolicies();
    void loadAccountNames();
  }, [loadPolicies, loadAccountNames]);

  useEventStream(
    'contract_write',
    useCallback(
      (event) => {
        if (event.contract === communityId) {
          loadPolicies();
          void loadAccountNames();
        }
      },
      [communityId, loadPolicies, loadAccountNames],
    ),
  );

  const accountLabels = useMemo(() => {
    const labels: Record<string, string> = { ...accountNames };
    for (const pubkey of allMembers) {
      labels[pubkey] = getMemberDisplayName(profiles[pubkey]);
    }
    return labels;
  }, [accountNames, allMembers, profiles]);

  const handleCreatePolicy = async (data: CreatePolicyFormData) => {
    if (!serverUrl || !publicKey) return;

    const destination: Policy['destination'] =
      data.destinationKind === 'account'
        ? { kind: 'account', account: data.destinationAccountId }
        : { kind: data.destinationKind };

    await createPolicy(serverUrl, publicKey, communityId, {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description,
      source: data.source,
      destination,
      mode: data.mode,
      rateType: 'community-governed',
    });

    // No refetch here - the contract_write SSE listener above picks this
    // up once the server confirms it.
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

      <div className={styles.gates}>
        <button className={styles.gateButton} onClick={() => setPolicyDialogOpen(true)}>
          <Plus size={20} />
          Create Policy
        </button>
      </div>

      {policiesLoading[communityId] === true ? (
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
            <PolicyCard key={policy.id} policy={policy} accountLabels={accountLabels} onClick={handleCardClick} />
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
