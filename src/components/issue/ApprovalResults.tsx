import React, { useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';
import { getCountryByCode, COUNTRY_COLORS } from '../../utils/countries';
import styles from './ApprovalResults.module.scss';

interface Proposal {
  id: string;
  title: string;
  description: string;
  author: string;
}

interface ApprovalResultsProps {
  issueId: string;
}

interface CountryBreakdown {
  code: string;
  name: string;
  flag: string;
  count: number;
}

const ApprovalResults: React.FC<ApprovalResultsProps> = ({ issueId }) => {
  const proposals = useAppSelector((state) => state.issues.issueProposals[issueId] || []);
  const approvals = useAppSelector((state) => state.issues.issueApprovals[issueId] || {});
  const profiles = useAppSelector((state) => state.communities.profiles);

  // Build per-proposal approval breakdown by country
  const proposalResults = useMemo(() => {
    return proposals.map((proposal: Proposal) => {
      const countryMap = new Map<string, number>();
      let totalApprovals = 0;

      for (const [voterKey, voterApprovals] of Object.entries(approvals)) {
        if (voterApprovals[proposal.id]) {
          totalApprovals++;
          const countryCode = profiles[voterKey]?.country || 'OTHER';
          countryMap.set(countryCode, (countryMap.get(countryCode) || 0) + 1);
        }
      }

      const countryBreakdown: CountryBreakdown[] = Array.from(countryMap.entries())
        .map(([code, count]) => {
          const info = getCountryByCode(code);
          return { code, name: info.name, flag: info.flag, count };
        })
        .sort((a, b) => b.count - a.count);

      return { proposal, totalApprovals, countryBreakdown };
    }).sort((a, b) => b.totalApprovals - a.totalApprovals);
  }, [proposals, approvals, profiles]);

  // Overall participation summary
  const participationSummary = useMemo(() => {
    const voterCountries = new Map<string, number>();
    const uniqueVoters = new Set<string>();

    for (const [voterKey, voterApprovals] of Object.entries(approvals)) {
      const hasApproved = Object.values(voterApprovals).some(Boolean);
      if (hasApproved) {
        uniqueVoters.add(voterKey);
        const countryCode = profiles[voterKey]?.country || 'OTHER';
        voterCountries.set(countryCode, (voterCountries.get(countryCode) || 0) + 1);
      }
    }

    return {
      totalVoters: uniqueVoters.size,
      countries: Array.from(voterCountries.entries())
        .map(([code, count]) => {
          const info = getCountryByCode(code);
          return { code, name: info.name, flag: info.flag, count };
        })
        .sort((a, b) => b.count - a.count),
    };
  }, [approvals, profiles]);

  const totalApprovalsAcrossAll = proposalResults.reduce((sum, r) => sum + r.totalApprovals, 0);

  if (totalApprovalsAcrossAll === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Approval Results by Country</h3>
        <p>
          {participationSummary.totalVoters} participant{participationSummary.totalVoters !== 1 ? 's' : ''} from{' '}
          {participationSummary.countries.length} countr{participationSummary.countries.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      {participationSummary.countries.length > 0 && (
        <div className={styles.participationSummary}>
          {participationSummary.countries.map((c) => (
            <span key={c.code} className={styles.participantBadge}>
              {c.flag} {c.name}: {c.count}
            </span>
          ))}
        </div>
      )}

      <div className={styles.resultsList}>
        {proposalResults.map(({ proposal, totalApprovals, countryBreakdown }) => (
          <div key={proposal.id} className={styles.resultItem}>
            <div className={styles.resultHeader}>
              <span className={styles.proposalTitle}>{proposal.title}</span>
              <span className={styles.totalCount}>{totalApprovals}</span>
            </div>
            {totalApprovals > 0 && (
              <div className={styles.barContainer}>
                <div className={styles.stackedBar}>
                  {countryBreakdown.map((c) => (
                    <div
                      key={c.code}
                      className={styles.barSegment}
                      style={{
                        width: `${(c.count / totalApprovals) * 100}%`,
                        backgroundColor: COUNTRY_COLORS[c.code] || COUNTRY_COLORS.OTHER,
                      }}
                      title={`${c.flag} ${c.name}: ${c.count}`}
                    />
                  ))}
                </div>
                <div className={styles.barLabels}>
                  {countryBreakdown.map((c) => (
                    <span key={c.code} className={styles.barLabel}>
                      {c.flag} {c.count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApprovalResults;
