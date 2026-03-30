import React, { useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';
import { getCountryByCode, COUNTRY_COLORS } from '../../utils/countries';
import styles from './QVResults.module.scss';

interface QVResultsProps {
  qvContractId: string;
  issueId: string;
}

interface ProposalResult {
  id: string;
  title: string;
  totalVotes: number;
  totalCredits: number;
  voterCount: number;
  countryBreakdown: { code: string; name: string; flag: string; votes: number }[];
}

const QVResults: React.FC<QVResultsProps> = ({ qvContractId, issueId }) => {
  const proposals = useAppSelector((state) => state.issues.issueProposals[issueId] || []);
  const qvResults = useAppSelector((state) => state.qv.qvResults[qvContractId] || {});
  const qvAllocations = useAppSelector((state) => state.qv.qvAllocations[qvContractId] || {});
  const profiles = useAppSelector((state) => state.communities.profiles);

  const proposalResults: ProposalResult[] = useMemo(() => {
    return proposals.map((p: { id: string; title: string }) => {
      const totalVotes = Math.round((qvResults[p.id] || 0) * 100) / 100;

      let totalCredits = 0;
      let voterCount = 0;
      const countryMap = new Map<string, number>();

      for (const [voter, alloc] of Object.entries(qvAllocations)) {
        const credits = alloc[p.id];
        if (credits && credits > 0) {
          voterCount++;
          totalCredits += credits;
          const countryCode = profiles[voter]?.country || 'OTHER';
          const votes = Math.sqrt(credits);
          countryMap.set(countryCode, (countryMap.get(countryCode) || 0) + votes);
        }
      }

      const countryBreakdown = Array.from(countryMap.entries())
        .map(([code, votes]) => {
          const info = getCountryByCode(code);
          return { code, name: info.name, flag: info.flag, votes: Math.round(votes * 100) / 100 };
        })
        .sort((a, b) => b.votes - a.votes);

      return { id: p.id, title: p.title, totalVotes, totalCredits, voterCount, countryBreakdown };
    }).sort((a, b) => b.totalVotes - a.totalVotes);
  }, [proposals, qvResults, qvAllocations, profiles]);

  // Overall participation summary
  const participationSummary = useMemo(() => {
    const voterCountries = new Map<string, number>();
    const uniqueVoters = new Set<string>();

    for (const voter of Object.keys(qvAllocations)) {
      const alloc = qvAllocations[voter];
      const hasAllocated = Object.values(alloc).some((v) => v > 0);
      if (hasAllocated) {
        uniqueVoters.add(voter);
        const countryCode = profiles[voter]?.country || 'OTHER';
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
  }, [qvAllocations, profiles]);

  if (proposalResults.length === 0) {
    return (
      <div className={styles.container}>
        <p>No results available yet.</p>
      </div>
    );
  }

  const maxVotes = proposalResults[0]?.totalVotes || 1;

  return (
    <div className={styles.container}>
      {participationSummary.totalVoters > 0 && (
        <div className={styles.participationSummary}>
          <span className={styles.summaryLabel}>
            {participationSummary.totalVoters} voter{participationSummary.totalVoters !== 1 ? 's' : ''} from{' '}
            {participationSummary.countries.length} countr{participationSummary.countries.length !== 1 ? 'ies' : 'y'}
          </span>
          <div className={styles.countryBadges}>
            {participationSummary.countries.map((c) => (
              <span key={c.code} className={styles.badge}>
                {c.flag} {c.name}: {c.count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.resultsList}>
        {proposalResults.map((result, index) => (
          <div key={result.id} className={styles.resultItem}>
            <div className={styles.resultHeader}>
              <span className={styles.rank}>#{index + 1}</span>
              <span className={styles.proposalTitle}>{result.title}</span>
              <span className={styles.totalVotes}>{result.totalVotes} votes</span>
            </div>
            <div className={styles.resultMeta}>
              <span>{result.totalCredits} credits from {result.voterCount} voter{result.voterCount !== 1 ? 's' : ''}</span>
            </div>
            {result.totalVotes > 0 && (
              <div className={styles.barContainer}>
                <div className={styles.stackedBar} style={{ width: `${(result.totalVotes / maxVotes) * 100}%` }}>
                  {result.countryBreakdown.map((c) => (
                    <div
                      key={c.code}
                      className={styles.barSegment}
                      style={{
                        width: `${(c.votes / result.totalVotes) * 100}%`,
                        backgroundColor: COUNTRY_COLORS[c.code] || COUNTRY_COLORS.OTHER,
                      }}
                      title={`${c.flag} ${c.name}: ${c.votes} votes`}
                    />
                  ))}
                </div>
                <div className={styles.barLabels}>
                  {result.countryBreakdown.map((c) => (
                    <span key={c.code} className={styles.barLabel}>
                      {c.flag} {c.votes}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.explainer}>
        <details>
          <summary>How Quadratic Voting works</summary>
          <p>
            Each voter receives a fixed budget of credits (default: 100). You can spread credits across proposals as you choose.
            The number of effective votes equals the square root of credits allocated. This means:
          </p>
          <ul>
            <li>1 credit = 1 vote</li>
            <li>4 credits = 2 votes</li>
            <li>9 credits = 3 votes</li>
            <li>25 credits = 5 votes</li>
          </ul>
          <p>
            This encourages voters to express the intensity of their preferences while making it costly to concentrate all power on a single option.
          </p>
        </details>
      </div>
    </div>
  );
};

export default QVResults;
