import React, { useState } from 'react';
import { Coins, Send, TrendingUp, TrendingDown } from 'lucide-react';
import './Currency.scss';

interface CurrencyProps {
  communityId: string;
}

const Currency: React.FC<CurrencyProps> = () => {
  const [balance, setBalance] = useState(1250);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [mintPreference, setMintPreference] = useState(100);
  const [burnPreference, setBurnPreference] = useState(50);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const handlePayment = async () => {
    if (!recipient || !amount || parseFloat(amount) <= 0) return;
    
    const paymentAmount = parseFloat(amount);
    if (paymentAmount > balance) {
      alert('Insufficient balance');
      return;
    }

    setBalance(balance - paymentAmount);
    setAmount('');
    setRecipient('');
    setShowPaymentForm(false);
  };

  return (
    <div className="currency-container">
      <div className="currency-header">
        <h2>Community Currency</h2>
        <p>Manage your community currency and transactions</p>
      </div>

      <div className="currency-content">
        <div className="balance-section">
          <div className="balance-card">
            <div className="balance-header">
              <Coins size={24} />
              <h3>Your Balance</h3>
            </div>
            <div className="balance-amount">
              <span className="amount">{balance}</span>
              <span className="currency">credits</span>
            </div>
            <div className="balance-stats">
              <div className="stat">
                <span className="label">Community Median:</span>
                <span className="value">980 credits</span>
              </div>
            </div>
          </div>
        </div>

        <div className="actions-section">
          <div className="action-card">
            <h3>Send Payment</h3>
            <button
              onClick={() => setShowPaymentForm(true)}
              className="action-button"
            >
              <Send size={20} />
              Send Credits
            </button>
          </div>

          <div className="action-card">
            <h3>Preferences</h3>
            <div className="preferences">
              <div className="preference-item">
                <label htmlFor="mintPreference">Mint Rate (credits/day)</label>
                <input
                  id="mintPreference"
                  type="number"
                  value={mintPreference}
                  onChange={(e) => setMintPreference(parseInt(e.target.value) || 0)}
                  className="input-field"
                  min="0"
                />
                <TrendingUp size={16} className="mint-icon" />
              </div>
              <div className="preference-item">
                <label htmlFor="burnPreference">Burn Rate (credits/day)</label>
                <input
                  id="burnPreference"
                  type="number"
                  value={burnPreference}
                  onChange={(e) => setBurnPreference(parseInt(e.target.value) || 0)}
                  className="input-field"
                  min="0"
                />
                <TrendingDown size={16} className="burn-icon" />
              </div>
            </div>
          </div>
        </div>

        {showPaymentForm && (
          <div className="payment-form-overlay">
            <div className="payment-form">
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
                  max={balance}
                />
              </div>
              <div className="form-actions">
                <button onClick={handlePayment} className="send-button">
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