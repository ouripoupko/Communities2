import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import PageHeader from '../components/PageHeader';
import containerStyles from './Container.module.scss';
import styles from './PolicyDetailPage.module.scss';
import { fetchCommunityMembers } from '../store/slices/communitiesSlice';
import { useCurrency } from '../hooks/useCurrency';
import {
  setPolicyPreference,
  setCommitmentRate,
  setPolicyDetails,
  deletePolicy,
  type Policy,
} from '../services/contracts/community';
import { describeSide, formatRate, sideCount } from '../components/community/policies/policyDisplay';
import RateInput from '../components/community/policies/RateInput';
import ConfirmDialog from '../components/community/dialogs/ConfirmDialog';

const PolicyDetailPage: React.FC = () => {
  const { communityId = '', policyId = '' } = useParams<{ communityId: string; policyId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { accounts, labels, policies } = useCurrency(communityId);

  const [myPreference, setMyPreference] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [editingDetails, setEditingDetails] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [savingRate, setSavingRate] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const policy: Policy | undefined = useMemo(
    () => policies.find((p) => p.id === policyId),
    [policies, policyId],
  );

  useEffect(() => {
    if (!communityId || !serverUrl || !publicKey) return;
    dispatch(fetchCommunityMembers({ contractId: communityId }));
  }, [communityId, serverUrl, publicKey, dispatch]);

  // Reset the inputs to the policy when what they show changes. Not on every
  // reload: any member's write to the community reloads the policies, and
  // must not erase what the user is typing.
  const shownKey = policy
    ? JSON.stringify([policy.id, policy.name, policy.description, policy.selfRate, policy.myPreference])
    : '';
  const [shownPolicy, setShownPolicy] = useState('');
  if (shownKey !== shownPolicy) {
    setShownPolicy(shownKey);
    if (policy) {
      setNameInput(policy.name);
      setDescriptionInput(policy.description || '');
      setRateInput(String(policy.selfRate));
      setMyPreference(policy.myPreference === null ? '' : String(policy.myPreference));
    }
  }

  const resolveAccountLabel = useCallback(
    (id: string) => labels[id] ?? `${id.slice(0, 8)}...`,
    [labels],
  );

  // Each change may open the node's approval page, so each starts from its
  // button. The page's contract_write listener (useCurrency) reloads the policy.
  const act = async (setBusy: (busy: boolean) => void, action: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

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
  const isCreator = !!publicKey && publicKey.toLowerCase() === policy.creator.toLowerCase();
  const canDelete = isCreator && (isCommitment || policy.currentRate === 0);
  const destinationCount = sideCount(policy.destination, accounts);

  const fromLabel = describeSide(policy.source, true, resolveAccountLabel);
  const toLabel = describeSide(policy.destination, false, resolveAccountLabel);

  const handleSavePreference = () => act(setSavingPreference, async () => {
    const value = parseFloat(myPreference);
    if (isNaN(value) || value < 0) throw new Error('Please enter a rate of zero or more.');
    await setPolicyPreference(communityId, policyId, value);
  });

  const handleSaveRate = () => act(setSavingRate, async () => {
    const value = parseFloat(rateInput);
    if (isNaN(value) || value < 0) throw new Error('Please enter a rate of zero or more.');
    await setCommitmentRate(communityId, policyId, value);
  });

  const handleSaveDetails = () => act(setSavingDetails, async () => {
    await setPolicyDetails(communityId, policyId, nameInput.trim(), descriptionInput.trim());
    setEditingDetails(false);
  });

  const handleDelete = () => act(() => {}, async () => {
    await deletePolicy(communityId, policyId);
    navigate(`/community/${communityId}/${isCommitment ? 'wallet' : 'policies'}`);
  });

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
            <span className={styles.rateValue}>{formatRate(policy.mode, policy.currentRate)}</span>
          </div>

          {actionError && <p className={styles.error}>{actionError}</p>}

          {isCommitment ? (
            <div className={styles.section}>
              <h4>Rate</h4>
              {isCreator ? (
                <div className={styles.inlineForm}>
                  <RateInput
                    value={rateInput}
                    onChange={setRateInput}
                    source={policy.source}
                    destination={policy.destination}
                    mode={policy.mode}
                    destinationCount={destinationCount}
                    className="input-field"
                  />
                  <button className="save-button" onClick={() => void handleSaveRate()} disabled={savingRate}>
                    {savingRate ? 'Saving...' : 'Update Rate'}
                  </button>
                </div>
              ) : (
                <p className={styles.hint}>Only the owner of this commitment can change its rate.</p>
              )}
              <p className={styles.hint}>Changes take effect from the next day.</p>
            </div>
          ) : (
            <div className={styles.section}>
              <h4>Your preference</h4>
              <p className={styles.hint}>
                This is a standing value, not a one-time vote — you can change it at any time. The
                community rate shown above is the median of every member's current preference; a member
                who hasn't set one counts as 0 ({policy.preferences === 1 ? '1 member has' : `${policy.preferences} members have`} set
                one so far).
              </p>
              <div className={styles.inlineForm}>
                <RateInput
                  value={myPreference}
                  onChange={setMyPreference}
                  source={policy.source}
                  destination={policy.destination}
                  mode={policy.mode}
                  destinationCount={destinationCount}
                  className="input-field"
                />
                <button className="save-button" onClick={() => void handleSavePreference()} disabled={savingPreference}>
                  {savingPreference ? 'Saving...' : 'Update Preference'}
                </button>
              </div>
              <p className={styles.hint}>Community median: {formatRate(policy.mode, policy.currentRate)}</p>
            </div>
          )}

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h4>Details</h4>
              {isCreator && !editingDetails && (
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
