import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Lock, TrendingUp } from 'lucide-react';
import { useFlowContract } from '../shared/useFlowContract';
import * as api from './convictionApi';
import { useAppSelector } from '../../../../store/hooks';
import { getCountryColor, getCountryName, getCountryFlag } from '../../../../utils/countries';
import convictionCode from '../../../../assets/contracts/conviction_contract.py?raw';
import type { FlowProps } from '../types';
import styles from './ConvictionStaking.module.scss';

interface ConvictionStakingProps extends Pick<FlowProps, 'instanceId' | 'parentContractId' | 'stageKey'> {
  compact?: boolean;
}

interface StakeRecord {
  amount: number;
  duration: string;
  timestamp: string;
  country: string;
  voter: string;
}

const DURATIONS = [
  { value: '1w', label: '1 Week', multiplier: 1 },
  { value: '1m', label: '1 Month', multiplier: 2 },
  { value: '3m', label: '3 Months', multiplier: 4 },
  { value: '6m', label: '6 Months', multiplier: 7 },
  { value: '1y', label: '1 Year', multiplier: 12 },
];

const ConvictionStaking: React.FC<ConvictionStakingProps> = ({
  instanceId, parentContractId, stageKey, compact = false,
}) => {
  const { contractId, isReady, isDeploying, hasError, errorMessage, statusMessage, retry } = useFlowContract(
    instanceId, 'conviction_staking', 'conviction_contract.py', convictionCode, parentContractId, stageKey,
  );
  const serverUrl = useAppSelector((s) => s.user.serverUrl);
  const publicKey = useAppSelector((s) => s.user.publicKey);
  const profiles = useAppSelector((s) => s.communities.profiles);
  const myCountry = publicKey && profiles[publicKey]?.country ? profiles[publicKey].country : 'OTHER';

  const [myStake, setMyStake] = useState<StakeRecord | null>(null);
  const [totalConviction, setTotalConviction] = useState<{ total: number; count: number }>({ total: 0, count: 0 });
  const [countryBreakdown, setCountryBreakdown] = useState<Record<string, number>>({});
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('1m');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!serverUrl || !publicKey || !contractId) return;
    try {
      const [stake, total, byCountry] = await Promise.all([
        api.getMyStake(serverUrl, publicKey, contractId),
        api.getTotalConviction(serverUrl, publicKey, contractId),
        api.getConvictionByCountry(serverUrl, publicKey, contractId),
      ]);
      setMyStake((stake as StakeRecord) || null);
      setTotalConviction((total as { total: number; count: number }) || { total: 0, count: 0 });
      setCountryBreakdown((byCountry as Record<string, number>) || {});
    } catch (err) {
      console.error('Failed to fetch conviction data:', err);
    }
  }, [serverUrl, publicKey, contractId]);

  useEffect(() => {
    if (isReady) fetchData();
  }, [isReady, fetchData]);

  const selectedDuration = DURATIONS.find((d) => d.value === duration) || DURATIONS[1];
  const previewWeight = Number(amount) * selectedDuration.multiplier;

  // Precompute myStake-derived values once per stake/total change so the two
  // duplicate DURATIONS lookups (label + multiplier) collapse to one pass.
  const myStakeInfo = useMemo(() => {
    if (!myStake) return null;
    const matched = DURATIONS.find((d) => d.value === myStake.duration);
    const multiplier = matched?.multiplier ?? 1;
    const label = matched?.label ?? myStake.duration;
    const weight = myStake.amount * multiplier;
    const share = totalConviction.total > 0 ? (weight / totalConviction.total) * 100 : 0;
    return { label, multiplier, weight, share };
  }, [myStake, totalConviction.total]);

  const handleStake = async () => {
    const numAmount = Number(amount);
    if (!serverUrl || !publicKey || !contractId || !numAmount || numAmount <= 0) return;
    setSubmitting(true);
    try {
      await api.stake(serverUrl, publicKey, contractId, numAmount, duration, myCountry);
      setAmount('');
      await fetchData();
    } catch (err) {
      console.error('Failed to stake:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (hasError) return (
    <div className={styles.loading}>
      <p>{errorMessage || 'Failed to set up conviction staking.'}</p>
      <button onClick={retry} className={styles.retryBtn}>Retry</button>
    </div>
  );
  if (isDeploying || !isReady) return (
    <div className={styles.loading}>
      <div className={styles.spinner} />
      <p>{statusMessage || 'Setting up conviction staking...'}</p>
    </div>
  );

  const maxConviction = Math.max(...Object.values(countryBreakdown), 1);

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      {/* Staking input */}
      <div className={styles.stakeForm}>
        <h4 className={styles.sectionTitle}>
          <Lock size={16} /> Stake Your Conviction
        </h4>
        <div className={styles.inputRow}>
          <input
            className={styles.amountInput}
            type="number"
            min="1"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
          />
          <select
            className={styles.durationSelect}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            disabled={submitting}
          >
            {DURATIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label} ({d.multiplier}x)
              </option>
            ))}
          </select>
        </div>
        {Number(amount) > 0 && (
          <div className={styles.preview}>
            Your conviction weight: <strong>{previewWeight}</strong>
          </div>
        )}
        <button
          className={styles.stakeBtn}
          onClick={handleStake}
          disabled={submitting || !Number(amount)}
        >
          {submitting ? 'Staking...' : 'Stake'}
        </button>
      </div>

      {/* Active stake */}
      {myStake && myStakeInfo && (
        <div className={styles.myStake}>
          <h4 className={styles.sectionTitle}>Your Active Stake</h4>
          <div className={styles.stakeDetails}>
            <span>Amount: <strong>{myStake.amount}</strong></span>
            <span>Duration: <strong>{myStakeInfo.label}</strong></span>
            <span>Weight: <strong>{myStakeInfo.weight}</strong></span>
            {totalConviction.total > 0 && (
              <span>Share: <strong>{myStakeInfo.share.toFixed(1)}%</strong></span>
            )}
          </div>
        </div>
      )}

      {/* Community aggregate */}
      <div className={styles.aggregate}>
        <h4 className={styles.sectionTitle}>
          <TrendingUp size={16} /> Community Conviction
        </h4>
        <div className={styles.aggregateStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{totalConviction.total}</span>
            <span className={styles.statLabel}>Total Weight</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{totalConviction.count}</span>
            <span className={styles.statLabel}>Stakers</span>
          </div>
        </div>

        {/* Country breakdown */}
        {Object.keys(countryBreakdown).length > 0 && (
          <div className={styles.countryBreakdown}>
            {Object.entries(countryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([country, weight]) => (
                <div key={country} className={styles.countryRow}>
                  <span className={styles.countryName}>
                    <span className={styles.countryFlag} aria-hidden="true">{getCountryFlag(country)}</span>
                    {getCountryName(country)}
                  </span>
                  <div className={styles.countryBar}>
                    <div
                      className={styles.countryFill}
                      style={{
                        width: `${(weight / maxConviction) * 100}%`,
                        backgroundColor: getCountryColor(country),
                      }}
                    />
                  </div>
                  <span className={styles.countryWeight}>{weight}</span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConvictionStaking;
