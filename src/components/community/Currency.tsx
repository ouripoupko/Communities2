import React, { useState, useEffect } from 'react';
import { Coins, Send, TrendingUp, TrendingDown } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { fetchCommunityCurrency, fetchCurrencyBalances } from '../../store/slices/currencySlice';
import styles from './Currency.module.scss';

interface CurrencyProps {
  communityId: string;
}

const Currency: React.FC<CurrencyProps> = ({ communityId }) => {
  const dispatch = useAppDispatch();
  const { publicKey, serverUrl } = useAppSelector((state) => state.user);
  const { communityCurrencies, currencyBalances } = useAppSelector((state) => state.currency);
  
  const currency = communityCurrencies[communityId];
  const balances = currencyBalances[communityId] || {};
  const userBalance = balances[publicKey || ''] || 0;
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [mintPreference, setMintPreference] = useState(100);
  const [burnPreference, setBurnPreference] = useState(50);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Fetch currency data when component mounts
  useEffect(() => {
    if (publicKey && serverUrl && communityId) {
      if (!currency) {
        dispatch(fetchCommunityCurrency({
          serverUrl,
          publicKey,
          contractId: communityId,
        }));
      }
      if (!balances || Object.keys(balances).length === 0) {
        dispatch(fetchCurrencyBalances({
          serverUrl,
          publicKey,
          contractId: communityId,
        }));
      }
    }
  }, [communityId, publicKey, serverUrl, currency, balances, dispatch]);

  const handlePayment = async () => {
    if (!recipient || !amount || parseFloat(amount) <= 0) return;
    
    const paymentAmount = parseFloat(amount);
    if (paymentAmount > userBalance) {
      alert('Insufficient balance');
      return;
    }

    // TODO: Implement actual payment logic
    setAmount('');
    setRecipient('');
    setShowPaymentForm(false);
  };

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
              <span className={styles.amount}>{userBalance}</span>
              <span className={styles.currency}>{currency?.symbol || 'credits'}</span>
            </div>
            <div className={styles.balanceStats}>
              <div className={styles.stat}>
                <span className={styles.label}>Community Median:</span>
                <span className={styles.value}>980 credits</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.actionsSection}>
          <div className={styles.actionCard}>
            <h3>Send Payment</h3>
            <button
              onClick={() => setShowPaymentForm(true)}
              className={styles.actionButton}
            >
              <Send size={20} />
              Send Credits
            </button>
          </div>

          <div className={styles.actionCard}>
            <h3>Preferences</h3>
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
          </div>
        </div>

        {showPaymentForm && (
          <div className={styles.paymentFormOverlay}>
            <div className={styles.paymentForm}>
              <h3>Send Payment</h3>
              <div className="form-group">
                <label htmlFor="recipient">Recipient (Public Key)</label>
                <input
                  id="recipient"
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter recipient's public key"
                  className="input-field"
                />
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
                  max={userBalance}
                />
              </div>
              <div className="form-actions">
                <button onClick={handlePayment} className={`send-button ${styles.sendButton}`}>
                  <Send size={16} />
                  Send Payment
                </button>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Currency; 