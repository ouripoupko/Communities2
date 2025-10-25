import React, { useState, useEffect } from 'react';
import { Coins, Send, TrendingUp, TrendingDown } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchUserBalance } from '../../store/slices/currencySlice';
import styles from './Currency.module.scss';
import { transfer } from '../../services/contracts/community';

interface CurrencyProps {
  communityId: string;
}

const Currency: React.FC<CurrencyProps> = ({ communityId }) => {
  const dispatch = useAppDispatch();
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { communityMembers, membersLoading } = useAppSelector((state) => state.communities);
  const { userBalance, loading: balanceLoading } = useAppSelector((state) => state.currency);
  
  // Hardcoded mock data for other values
  const currency = {
    id: communityId,
    name: 'Community Credits',
    symbol: 'credits',
    totalSupply: 1000000,
    circulatingSupply: 750000,
    decimals: 2
  };
  
  const mintRate = 120; // Mock mint rate
  const burnRate = 85; // Mock burn rate

  // Check if user is a member of the community
  const allMembers: string[] = Array.isArray(communityMembers[communityId]) ? communityMembers[communityId] : [];
  const isMember = publicKey && allMembers.includes(publicKey);
  const isMembersLoading = membersLoading[communityId] || false;
  
  const [selectedMember, setSelectedMember] = useState('');
  const [amount, setAmount] = useState('');
  const [mintPreference, setMintPreference] = useState(100);
  const [burnPreference, setBurnPreference] = useState(50);
  
  // Stored preferences (mock data for now)
  const storedMintPreference = 100;
  const storedBurnPreference = 50;
  
  // Check if preferences have changed
  const hasChanges = mintPreference !== storedMintPreference || burnPreference !== storedBurnPreference;

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

  const handlePayment = async () => {
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

  const handleUpdatePreferences = () => {
    // TODO: Implement actual preference update logic
    console.log('Updating preferences:', { mintPreference, burnPreference });
    alert('Preferences updated successfully!');
  };

  const handleRevertPreferences = () => {
    setMintPreference(storedMintPreference);
    setBurnPreference(storedBurnPreference);
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
                  <span className={styles.label}>Mint Rate:</span>
                  <span className={styles.value}>{mintRate} credits/day</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.label}>Burn Rate:</span>
                  <span className={styles.value}>{burnRate} credits/day</span>
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
            <h3>Your Preferences</h3>
            <div className={styles.preferences}>
              <div className={styles.preferenceItem}>
                <label htmlFor="mintPreference">Mint Rate (credits/day)</label>
                <input
                  id="mintPreference"
                  type="number"
                  value={mintPreference}
                  onChange={(e) => setMintPreference(parseInt(e.target.value) || 0)}
                  className={`input-field ${styles.inputField}`}
                  min="0"
                />
                <TrendingUp size={16} className={styles.mintIcon} />
              </div>
              <div className={styles.preferenceItem}>
                <label htmlFor="burnPreference">Burn Rate (credits/day)</label>
                <input
                  id="burnPreference"
                  type="number"
                  value={burnPreference}
                  onChange={(e) => setBurnPreference(parseInt(e.target.value) || 0)}
                  className={`input-field ${styles.inputField}`}
                  min="0"
                />
                <TrendingDown size={16} className={styles.burnIcon} />
              </div>
            </div>
            <div className={styles.preferenceActions}>
              <button
                onClick={handleUpdatePreferences}
                disabled={!hasChanges}
                className={`${styles.updateButton} ${!hasChanges ? styles.disabled : ''}`}
              >
                Update Preferences
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
    </div>
  );
};

export default Currency; 