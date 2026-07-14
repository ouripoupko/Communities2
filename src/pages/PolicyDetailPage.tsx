import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import PageHeader from '../components/PageHeader';
import containerStyles from './Container.module.scss';
import styles from './PolicyDetailPage.module.scss';
import { fetchCommunityMembers } from '../store/slices/communitiesSlice';
import { fetchPolicies } from '../store/slices/policiesSlice';
import {
  getContractParameters,
  setPolicyPreference,
  setCommitmentRate,
  setPolicyDetails,
  deletePolicy,
  getAccountDetails,
  policyParameterKey,
  type Policy,
  type IAccountDetails,
} from '../services/contracts/community';
import { getMemberDisplayName } from '../utils/memberDisplay';
import { describeSide, formatRate } from '../components/community/policies/policyDisplay';
import SignersPanel from '../components/community/SignersPanel';
import ConfirmDialog from '../components/community/dialogs/ConfirmDialog';
import { useEventStream } from '../hooks/useEventStream';

const PolicyDetailPage: React.FC = () => {
  const { communityId, policyId } = useParams<{ communityId: string; policyId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { communityMembers, profiles } = useAppSelector((state) => state.communities);
  const { communityPolicies } = useAppSelector((state) => state.policies);

  const [accountDetails, setAccountDetails] = useState<IAccountDetails>({});
  const [myPreference, setMyPreference] = useState('');
  const [median, setMedian] = useState(0);
  const [rateInput, setRateInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [editingDetails, setEditingDetails] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const allMembers = communityId && Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];

  const policy: Policy | undefined = useMemo(
    () => (communityId ? (communityPolicies[communityId] ?? []).find((p) => p.id === policyId) : undefined),
    [communityPolicies, communityId, policyId],
  );

  const loadPolicies = useCallback(() => {
    if (!communityId || !serverUrl || !publicKey) return;
    dispatch(fetchPolicies({ serverUrl, publicKey, contractId: communityId }));
  }, [communityId, serverUrl, publicKey, dispatch]);

  const loadAccountDetails = useCallback(async () => {
    if (!communityId || !serverUrl || !publicKey) return;
    const details = await getAccountDetails(serverUrl, publicKey, communityId);
    setAccountDetails(details);
  }, [communityId, serverUrl, publicKey]);

  const loadParameters = useCallback(async () => {
    if (!communityId || !serverUrl || !publicKey || !policyId) return;
    const params = await getContractParameters(serverUrl, publicKey, communityId);
    const key = policyParameterKey(policyId);
    setMedian(params.medians[key] ?? 0);
    setMyPreference(String(params.parameters[key] ?? 0));
  }, [communityId, serverUrl, publicKey, policyId]);

  useEffect(() => {
    if (!communityId || !serverUrl || !publicKey) return;
    dispatch(fetchCommunityMembers({ serverUrl, publicKey, contractId: communityId }));
  }, [communityId, serverUrl, publicKey, dispatch]);

  useEffect(() => {
    loadPolicies();
    void loadAccountDetails();
  }, [loadPolicies, loadAccountDetails]);

  useEffect(() => {
    void loadParameters();
  }, [loadParameters]);

  useEffect(() => {
    if (policy) {
      setNameInput(policy.name);
      setDescriptionInput(policy.description || '');
      setRateInput(String(policy.selfRate ?? 0));
    }
  }, [policy]);

  useEventStream(
    'contract_write',
    useCallback(
      (event) => {
        if (event.contract === communityId) {
          loadPolicies();
          void loadAccountDetails();
          void loadParameters();
        }
      },
      [communityId, loadPolicies, loadAccountDetails, loadParameters],
    ),
  );

  const resolveAccountLabel = useCallback(
    (id: string) => {
      if (accountDetails[id]?.name) return accountDetails[id].name as string;
      if (allMembers.includes(id)) return getMemberDisplayName(profiles[id]);
      return `${id.slice(0, 8)}...`;
    },
    [accountDetails, allMembers, profiles],
  );

  if (!communityId || !policyId) {
    return (
      <div className={containerStyles.container}>
        <div className={containerStyles.errorState}>
          <h2>Invalid Policy</h2>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className={containerStyles.container}>
        <div className={containerStyles.loadingState}>
          <div className={containerStyles.spinner}></div>
          <p>Loading policy...</p>
        </div>
      </div>
    );
  }

  const isCommitment = policy.rateType === 'self-set';
  const isCreator = !!publicKey && publicKey === policy.creator;
  const involvedAccountId =
    policy.source.kind === 'account'
      ? policy.source.account
      : policy.destination.kind === 'account'
        ? policy.destination.account
        : undefined;
  const involvedAccount = involvedAccountId ? accountDetails[involvedAccountId] : undefined;
  const isSigner = !!publicKey && !!involvedAccount?.signers?.includes(publicKey);
  const canEditDetails = isCreator || isSigner;
  const currentRate = isCommitment ? policy.selfRate ?? 0 : median;
  const canDelete = isCreator && (isCommitment || median === 0);

  const fromLabel = describeSide(policy.source, true, resolveAccountLabel);
  const toLabel = describeSide(policy.destination, false, resolveAccountLabel);

  const handleSavePreference = async () => {
    if (!serverUrl || !publicKey) return;
    const value = parseFloat(myPreference);
    if (isNaN(value)) return;
    setSavingPreference(true);
    try {
      await setPolicyPreference(serverUrl, publicKey, communityId, policyId, value);
      await loadParameters();
    } finally {
      setSavingPreference(false);
    }
  };

  const handleSaveRate = async () => {
    if (!serverUrl || !publicKey) return;
    const value = parseFloat(rateInput);
    if (isNaN(value)) return;
    setSavingRate(true);
    try {
      await setCommitmentRate(serverUrl, publicKey, communityId, policyId, value);
      loadPolicies();
    } finally {
      setSavingRate(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!serverUrl || !publicKey) return;
    setSavingDetails(true);
    try {
      await setPolicyDetails(serverUrl, publicKey, communityId, policyId, nameInput.trim(), descriptionInput.trim());
      setEditingDetails(false);
      loadPolicies();
    } finally {
      setSavingDetails(false);
    }
  };

  const handleDelete = async () => {
    if (!serverUrl || !publicKey) return;
    const ok = await deletePolicy(serverUrl, publicKey, communityId, policyId);
    if (ok) {
      navigate(`/community/${communityId}/policies`);
    }
  };

  return (
    <div className={containerStyles.container}>
      <PageHeader
        showBackButton
        backButtonText="Back to Community"
        onBackClick={() => navigate(`/community/${communityId}/policies`)}
        title={policy.name}
        subtitle={`${fromLabel} → ${toLabel}`}
        rightLabel={<span className={styles.badge}>{isCommitment ? 'Commitment' : 'Policy'}</span>}
        layout="two-row"
      />

      <div className={containerStyles.content}>
        <div className={containerStyles.main}>
          <div className={styles.rateHeader}>
            <span className={styles.rateLabel}>Current rate</span>
            <span className={styles.rateValue}>{formatRate(policy.mode, currentRate)}</span>
          </div>

          {isCommitment ? (
            <div className={styles.section}>
              <h4>Rate</h4>
              {isCreator ? (
                <div className={styles.inlineForm}>
                  <input
                    type="number"
                    className="input-field"
                    value={rateInput}
                    onChange={(e) => setRateInput(e.target.value)}
                    step="any"
                  />
                  <button className="save-button" onClick={() => void handleSaveRate()} disabled={savingRate}>
                    {savingRate ? 'Saving...' : 'Update Rate'}
                  </button>
                </div>
              ) : (
                <p className={styles.hint}>Only the owner of this commitment can change its rate.</p>
              )}
              <p className={styles.hint}>Changes take effect at the next tick.</p>
            </div>
          ) : (
            <div className={styles.section}>
              <h4>Your preference</h4>
              <p className={styles.hint}>
                This is a standing value, not a one-time vote — you can change it at any time. The
                community rate shown above is the live median of everyone&apos;s current preference.
              </p>
              <div className={styles.inlineForm}>
                <input
                  type="number"
                  className="input-field"
                  value={myPreference}
                  onChange={(e) => setMyPreference(e.target.value)}
                  step="any"
                />
                <button className="save-button" onClick={() => void handleSavePreference()} disabled={savingPreference}>
                  {savingPreference ? 'Saving...' : 'Update Preference'}
                </button>
              </div>
              <p className={styles.hint}>Community median: {formatRate(policy.mode, median)}</p>
            </div>
          )}

          {involvedAccountId && involvedAccount && (
            <div className={styles.section}>
              <SignersPanel
                communityId={communityId}
                accountId={involvedAccountId}
                signers={involvedAccount.signers ?? []}
                threshold={involvedAccount.threshold ?? 1}
                onChanged={() => void loadAccountDetails()}
              />
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h4>Details</h4>
              {canEditDetails && !editingDetails && (
                <button className={styles.editLink} onClick={() => setEditingDetails(true)}>
                  Edit
                </button>
              )}
            </div>
            {editingDetails ? (
              <div className={styles.editForm}>
                <input
                  type="text"
                  className="input-field"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
                <textarea
                  className="input-field"
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  rows={3}
                />
                <div className={styles.editActions}>
                  <button className="save-button" onClick={() => void handleSaveDetails()} disabled={savingDetails}>
                    {savingDetails ? 'Saving...' : 'Save'}
                  </button>
                  <button className="cancel-button" onClick={() => setEditingDetails(false)} disabled={savingDetails}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className={styles.description}>{policy.description || 'No description.'}</p>
            )}
          </div>

          {isCreator && (
            <div className={styles.section}>
              <button
                className={styles.deleteButton}
                onClick={() => setConfirmOpen(true)}
                disabled={!canDelete}
                title={
                  !isCommitment && !canDelete
                    ? "This policy still has an active community-supported rate — it can only be deleted once the community's median preference reaches 0."
                    : undefined
                }
              >
                <Trash2 size={16} />
                {isCommitment ? 'Cancel Commitment' : 'Delete Policy'}
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isVisible={confirmOpen}
        title={isCommitment ? 'Cancel Commitment' : 'Delete Policy'}
        message={
          isCommitment
            ? 'Are you sure you want to cancel this commitment? This cannot be undone.'
            : 'Are you sure you want to delete this policy? This cannot be undone.'
        }
        confirmLabel={isCommitment ? 'Cancel Commitment' : 'Delete Policy'}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default PolicyDetailPage;
