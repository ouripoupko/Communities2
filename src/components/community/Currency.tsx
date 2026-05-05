import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Coins, Send, TrendingUp, TrendingDown, Star } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchUserBalance } from '../../store/slices/currencySlice';
import { useEventStream } from '../../hooks/useEventStream';
import styles from './Currency.module.scss';
import {
  transfer, setParameters,
  getAccountDetails, getAllAllocations, setAllocation,
  getDistributionStatus, distributeCommons,
} from '../../services/contracts/community';
import type { IDistributionStatus } from '../../services/contracts/community';

interface CurrencyProps {
  communityId: string;
}

const Currency: React.FC<CurrencyProps> = ({ communityId }) => {
  const dispatch = useAppDispatch();
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { communityMembers, membersLoading } = useAppSelector((state) => state.communities);
  const { userBalance, parameters, loading: balanceLoading } = useAppSelector((state) => state.currency);
  
  // Currency info
  const currency = {
    id: communityId,
    name: 'Community Credits',
    symbol: 'credits',
    totalSupply: 1000000,
    circulatingSupply: 750000,
    decimals: 2
  };
  
  // Get median values for display (top card)
  const medianMintRate = parameters?.medians?.mint || 0;
  const medianBurnRate = parameters?.medians?.burn || 0;
  const medianCommonsMintRate = parameters?.medians?.commons_mint || 0;

  // Get user's stored parameters (bottom card)
  const userMintPreference = parameters?.parameters?.mint || 0;
  const userBurnPreference = parameters?.parameters?.burn || 0;
  const userCommonsMintPreference = parameters?.parameters?.commons_mint || 0;

  // Check if user is a member of the community
  const allMembers: string[] = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];
  const isMember = publicKey && allMembers.includes(publicKey);
  const isMembersLoading = membersLoading[communityId] || false;
  
  const [selectedMember, setSelectedMember] = useState('');
  const [amount, setAmount] = useState('');
  const [mintPreference, setMintPreference] = useState('');
  const [burnPreference, setBurnPreference] = useState('');
  const [commonsMintPreference, setCommonsMintPreference] = useState('');
  const [mintFocused, setMintFocused] = useState(false);
  const [burnFocused, setBurnFocused] = useState(false);
  const [commonsMintFocused, setCommonsMintFocused] = useState(false);

  // Budget allocation state
  const [accountDetails, setAccountDetails] = useState<Record<string, { type: string; balance: number }>>({});
  const [allAllocations, setAllAllocations] = useState<Record<string, Record<string, number>>>({});
  const [distributionStatus, setDistributionStatus] = useState<IDistributionStatus | null>(null);
  const [myAllocation, setMyAllocation] = useState<Record<string, number>>({});
  const [allocationLoading, setAllocationLoading] = useState(true);
  const [allocationSaving, setAllocationSaving] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const myAllocationInitialized = useRef(false);
  const myAllocationRef = useRef(myAllocation);
  myAllocationRef.current = myAllocation;
  
  // Update local state when parameters change
  useEffect(() => {
    if (parameters) {
      setMintPreference('');
      setBurnPreference('');
      setCommonsMintPreference('');
    }
  }, [parameters]);

  // Check if preferences have changed
  const hasChanges = (mintPreference !== '' && mintPreference !== userMintPreference.toString()) ||
                     (burnPreference !== '' && burnPreference !== userBurnPreference.toString()) ||
                     (commonsMintPreference !== '' && commonsMintPreference !== userCommonsMintPreference.toString());

  // Fetch user balance on component mount
  useEffect(() => {
    if (publicKey && serverUrl && communityId) {
      dispatch(fetchUserBalance({
        serverUrl,
        publicKey,
        contractId: communityId,
      }));
    }
  }, [communityId, publicKey, serverUrl, dispatch]);

  // Reset allocation init flag when community changes
  useEffect(() => {
    myAllocationInitialized.current = false;
    setAllocationLoading(true);
  }, [communityId]);

  const loadAllocationData = useCallback(async () => {
    if (!publicKey || !serverUrl || !communityId) return;
    try {
      const [details, allAllocs, status] = await Promise.all([
        getAccountDetails(serverUrl, publicKey, communityId),
        getAllAllocations(serverUrl, publicKey, communityId),
        getDistributionStatus(serverUrl, publicKey, communityId),
      ]);
      setAccountDetails(details);
      setAllAllocations(allAllocs);
      setDistributionStatus(status);
      if (!myAllocationInitialized.current) {
        setMyAllocation(allAllocs[publicKey] ?? {});
        myAllocationInitialized.current = true;
      }
    } catch (e) {
      console.error('Failed to load allocation data:', e);
    } finally {
      setAllocationLoading(false);
    }
  }, [publicKey, serverUrl, communityId]);

  useEffect(() => { void loadAllocationData(); }, [loadAllocationData]);

  useEventStream('contract_write', useCallback((event) => {
    if (event.contract === communityId) void loadAllocationData();
  }, [communityId, loadAllocationData]));

  const handlePayment = async () => {
    console.log('handlePayment', selectedMember, amount);
    if (!selectedMember || !amount || parseFloat(amount) <= 0) return;
    
    const paymentAmount = parseFloat(amount);
    if (userBalance !== null && paymentAmount > userBalance) {
      alert('Insufficient balance');
      return;
    }

    if(serverUrl && publicKey && communityId) {
      await transfer(
        serverUrl,
        publicKey,
        communityId,
        selectedMember,
        paymentAmount,
      );
    }

    setAmount('');
    setSelectedMember('');
  };

  const handleUpdatePreferences = async () => {
    if (!serverUrl || !publicKey || !communityId) return;
    
    // Use current values or fall back to stored values if input is empty
    const mintValue        = mintPreference        !== '' ? parseFloat(mintPreference)        : userMintPreference;
    const burnValue        = burnPreference        !== '' ? parseFloat(burnPreference)        : userBurnPreference;
    const commonsMintValue = commonsMintPreference !== '' ? parseFloat(commonsMintPreference) : userCommonsMintPreference;

    // Validate that the parsed values are valid numbers
    if (isNaN(mintValue) || isNaN(burnValue) || isNaN(commonsMintValue)) {
      alert('Please enter valid numbers for mint, burn, and commons mint rates.');
      return;
    }

    try {
      await setParameters(
        serverUrl,
        publicKey,
        communityId,
        mintValue,
        burnValue,
        commonsMintValue
      );

    } catch (error) {
      console.error('Failed to update parameters:', error);
      alert('Failed to update parameters. Please try again.');
    }
  };

  // Collective percentages across all members
  const collectivePercentages = useMemo(() => {
    const totals: Record<string, number> = {};
    let grandTotal = 0;
    for (const memberAlloc of Object.values(allAllocations)) {
      for (const [account, points] of Object.entries(memberAlloc)) {
        totals[account] = (totals[account] ?? 0) + points;
        grandTotal += points;
      }
    }
    if (grandTotal === 0) return {} as Record<string, number>;
    return Object.fromEntries(
      Object.entries(totals).map(([acc, pts]) => [acc, (pts / grandTotal) * 100])
    );
  }, [allAllocations]);

  const totalAllocated = useMemo(
    () => Object.values(myAllocation).reduce((s, v) => s + v, 0),
    [myAllocation]
  );

  const fundAccounts = useMemo(
    () => Object.entries(accountDetails)
      .filter(([, info]) => info.type === 'fund')
      .map(([name, info]) => ({ name, ...info })),
    [accountDetails]
  );

  const handleSetAccountPoints = (account: string, raw: string) => {
    const points = Math.max(0, Math.round(Number(raw) || 0));
    setMyAllocation(prev => ({ ...prev, [account]: points }));
  };

  const handleSaveAllocation = useCallback(async () => {
    if (!publicKey || !serverUrl || !communityId) return;
    setAllocationSaving(true);
    try {
      await setAllocation(serverUrl, publicKey, communityId, myAllocationRef.current);
    } catch (e) {
      console.error('Failed to save allocation:', e);
    } finally {
      setAllocationSaving(false);
    }
  }, [publicKey, serverUrl, communityId]);

  const handleDistribute = async () => {
    if (!publicKey || !serverUrl || !communityId) return;
    setDistributing(true);
    try {
      await distributeCommons(serverUrl, publicKey, communityId);
    } catch (e) {
      console.error('Failed to distribute:', e);
    } finally {
      setDistributing(false);
    }
  };

  const handleRevertPreferences = () => {
    setMintPreference('');
    setBurnPreference('');
    setCommonsMintPreference('');
    setMintFocused(false);
    setBurnFocused(false);
    setCommonsMintFocused(false);
  };

  if (isMembersLoading || balanceLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Community Currency</h2>
          <p>{isMembersLoading ? 'Loading community members...' : 'Loading balance...'}</p>
        </div>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Community Currency</h2>
          <p>You are not yet a member of this community.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Community Currency</h2>
        <p>Manage your community currency and transactions</p>
      </div>

      <div className={styles.content}>
        <div className={styles.balanceSection}>
          <div className={styles.balanceCard}>
            <div className={styles.balanceHeader}>
              <Coins size={24} />
              <h3>Your Balance</h3>
            </div>
            <div className={styles.balanceAmount}>
              <span className={styles.amount}>{userBalance !== null ? userBalance : '-'}</span>
              <span className={styles.currency}>{currency.symbol}</span>
            </div>
            <div className={styles.balanceStats}>
              <div className={styles.statRow}>
                <div className={styles.stat}>
                  <span className={styles.label}>Median Mint Rate:</span>
                  <span className={styles.value}>{medianMintRate} credits/day</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.label}>Median Burn Rate:</span>
                  <span className={styles.value}>{medianBurnRate}% per day</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.label}>Median Commons Mint:</span>
                  <span className={styles.value}>{medianCommonsMintRate} credits/day</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actionsSection}>
          <div className={styles.actionCard}>
            <h3>Send Payment</h3>
            <div className={styles.paymentForm}>
              <div className="form-group">
                <label htmlFor="memberSelect">Select Member</label>
                <select
                  id="memberSelect"
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="input-field"
                >
                  <option value="">Choose a member...</option>
                  {allMembers
                    .filter(member => member !== publicKey) // Exclude current user
                    .map((member, index) => (
                      <option key={member} value={member}>
                        Member {index + 1} ({member.slice(0, 8)}...)
                      </option>
                    ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="paymentAmount">Amount (credits)</label>
                <input
                  id="paymentAmount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="input-field"
                  min="1"
                  max={userBalance || undefined}
                />
                <div className={styles.balanceInfo}>
                  <span>Available: {userBalance !== null ? userBalance : '-'} credits</span>
                </div>
              </div>
              <div className="form-actions">
                <button onClick={handlePayment} className={`send-button ${styles.sendButton}`}>
                  <Send size={16} />
                  Send Payment
                </button>
              </div>
            </div>
          </div>

          <div className={styles.actionCard}>
            <h3>Your Stored Parameters</h3>
            <div className={styles.preferences}>
              <div className={styles.preferenceItem}>
                <label htmlFor="mintPreference">Mint Rate (credits/day)</label>
                <input
                  id="mintPreference"
                  type="number"
                  value={mintPreference}
                  onChange={(e) => setMintPreference(e.target.value)}
                  onFocus={() => setMintFocused(true)}
                  onBlur={() => setMintFocused(false)}
                  placeholder={!mintFocused && mintPreference === '' ? userMintPreference.toString() : ''}
                  className={`input-field ${styles.inputField}`}
                  min="0"
                  step="any"
                />
                <TrendingUp size={16} className={styles.mintIcon} />
              </div>
              <div className={styles.preferenceItem}>
                <label htmlFor="burnPreference">Burn Rate (% per day)</label>
                <input
                  id="burnPreference"
                  type="number"
                  value={burnPreference}
                  onChange={(e) => setBurnPreference(e.target.value)}
                  onFocus={() => setBurnFocused(true)}
                  onBlur={() => setBurnFocused(false)}
                  placeholder={!burnFocused && burnPreference === '' ? userBurnPreference.toString() : ''}
                  className={`input-field ${styles.inputField}`}
                  min="0"
                  max="100"
                  step="any"
                />
                <TrendingDown size={16} className={styles.burnIcon} />
              </div>
              <div className={styles.preferenceItem}>
                <label htmlFor="commonsMintPreference">Commons Minting (credits/day)</label>
                <input
                  id="commonsMintPreference"
                  type="number"
                  value={commonsMintPreference}
                  onChange={(e) => setCommonsMintPreference(e.target.value)}
                  onFocus={() => setCommonsMintFocused(true)}
                  onBlur={() => setCommonsMintFocused(false)}
                  placeholder={!commonsMintFocused && commonsMintPreference === '' ? userCommonsMintPreference.toString() : ''}
                  className={`input-field ${styles.inputField}`}
                  min="0"
                  step="any"
                />
                <TrendingUp size={16} className={styles.mintIcon} />
              </div>
            </div>
            <div className={styles.preferenceActions}>
              <button
                onClick={handleUpdatePreferences}
                disabled={!hasChanges}
                className={`${styles.updateButton} ${!hasChanges ? styles.disabled : ''}`}
              >
                Update Parameters
              </button>
              <button
                onClick={handleRevertPreferences}
                disabled={!hasChanges}
                className={`${styles.revertButton} ${!hasChanges ? styles.disabled : ''}`}
              >
                Revert Changes
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── Budget Allocation ─────────────────────────────────────────── */}
      <div className={styles.allocationCard}>
        <div className={styles.allocationHeader}>
          <h3>Budget Allocation</h3>
          {distributionStatus && (
            <div className={styles.distributionStatus}>
              <span className={styles.statusText}>
                Day {distributionStatus.days_since_creation} · {distributionStatus.payment_count} payment{distributionStatus.payment_count !== 1 ? 's' : ''} made
              </span>
              <button
                className={`${styles.distributeBtn} ${!distributionStatus.can_distribute || distributing ? styles.distributeBtnDisabled : ''}`}
                onClick={handleDistribute}
                disabled={!distributionStatus.can_distribute || distributing}
                title={distributionStatus.can_distribute ? 'Distribute commons balance to funds' : 'No new payment available today'}
              >
                {distributing ? 'Paying…' : 'Pay to Funds'}
              </button>
            </div>
          )}
        </div>

        <p className={styles.allocationSubtitle}>
          Allocate 1000 points among funds. The community's collective allocation determines what share of the commons each fund receives each day.
        </p>

        {allocationLoading ? (
          <p className={styles.allocationLoading}>Loading accounts…</p>
        ) : (
          <>
            <div className={`${styles.allocationRow} ${styles.allocationHeadings}`}>
              <span className={styles.colAccount}>Account</span>
              <span className={styles.colPct}>Community %</span>
              <span className={styles.colPts}>My points</span>
            </div>

            {/* Commons (treasury) row — top, marked uniquely */}
            <div className={`${styles.allocationRow} ${styles.allocationRowCommons}`}>
              <span className={styles.colAccount}>
                <Star size={13} className={styles.commonsIcon} />
                Commons Treasury
              </span>
              <span className={styles.colPct}>
                {(collectivePercentages['centralAccount'] ?? 0).toFixed(1)}%
              </span>
              <input
                type="number"
                className={styles.colPts}
                value={myAllocation['centralAccount'] ?? 0}
                onChange={e => handleSetAccountPoints('centralAccount', e.target.value)}
                min={0}
                max={1000}
              />
            </div>

            {/* Fund rows */}
            {fundAccounts.length === 0 ? (
              <p className={styles.noFunds}>No fund accounts yet. Create a funding flow to add funds.</p>
            ) : (
              fundAccounts.map(fund => (
                <div key={fund.name} className={styles.allocationRow}>
                  <span className={styles.colAccount} title={fund.name}>{fund.name}</span>
                  <span className={styles.colPct}>
                    {(collectivePercentages[fund.name] ?? 0).toFixed(1)}%
                  </span>
                  <input
                    type="number"
                    className={styles.colPts}
                    value={myAllocation[fund.name] ?? 0}
                    onChange={e => handleSetAccountPoints(fund.name, e.target.value)}
                    min={0}
                    max={1000}
                  />
                </div>
              ))
            )}

            <div className={styles.allocationFooter}>
              <span className={`${styles.allocationTotal} ${totalAllocated > 1000 ? styles.allocationTotalOver : ''}`}>
                {totalAllocated} / 1000 points
              </span>
              <button
                className={`${styles.updateButton} ${allocationSaving || totalAllocated > 1000 ? styles.disabled : ''}`}
                onClick={handleSaveAllocation}
                disabled={allocationSaving || totalAllocated > 1000}
              >
                {allocationSaving ? 'Saving…' : 'Save My Allocation'}
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
};

export default Currency;