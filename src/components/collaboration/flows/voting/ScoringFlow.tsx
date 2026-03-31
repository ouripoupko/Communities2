import React, { useState, useCallback, useMemo } from 'react';
import { BarChart2, List, Plus } from 'lucide-react';

import type { FlowProps } from '../types';
import * as api from './scoringApi';
import styles from './ScoringFlow.module.scss';

// ---------------------------------------------------------------------------
// Scoring tab — add options and assign personal scores
// ---------------------------------------------------------------------------

const ScoringTab: React.FC<{
  options: api.ScoringOption[];
  myScores: Record<string, number>;
  onAddOption: (text: string) => void;
  onScore: (optionId: string, score: number) => void;
}> = ({ options, myScores, onAddOption, onScore }) => {
  const [inputText, setInputText] = useState('');

  const handleAdd = () => {
    const text = inputText.trim();
    if (!text) return;
    onAddOption(text);
    setInputText('');
  };

  return (
    <div className={styles.scoringTab}>
      <div className={styles.addForm}>
        <input
          className={styles.addInput}
          type="text"
          placeholder="Add a new option…"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        />
        <button className={styles.addBtn} onClick={handleAdd}>
          <Plus size={16} />
          Add
        </button>
      </div>

      <p className={styles.hint}>
        Score each option from 0 (worst) to 10 (best). Leave blank to abstain.
      </p>

      {options.length === 0 ? (
        <p className={styles.noData}>No options yet. Add one above.</p>
      ) : (
        <div className={styles.optionList}>
          {options.map((opt) => {
            const current = myScores[opt.id] ?? '';
            return (
              <div key={opt.id} className={styles.optionRow}>
                <span className={styles.optionText}>{opt.text}</span>
                <div className={styles.scoreControls}>
                  <input
                    className={styles.scoreInput}
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    placeholder="—"
                    value={current}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        // Remove score (set to 0 internally so it's not undefined)
                        onScore(opt.id, NaN);
                      } else {
                        const val = Math.max(0, Math.min(10, Number(raw)));
                        onScore(opt.id, val);
                      }
                    }}
                  />
                  <div className={styles.scoreSlider}>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={typeof current !== 'number' || isNaN(current) ? 0 : current}
                      onChange={(e) => onScore(opt.id, Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Aggregated tab — average scores, ranked top to bottom
// ---------------------------------------------------------------------------

const AggregatedTab: React.FC<{ options: api.ScoringOption[] }> = ({ options }) => {
  const ranked = useMemo(() => {
    const allScores = api.getAllScores();

    return options
      .map((opt) => {
        const values = allScores
          .map((p) => p.scores[opt.id])
          .filter((v) => v !== undefined && !isNaN(v));
        const avg = values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : null;
        return { opt, avg, count: values.length };
      })
      .sort((a, b) => {
        if (a.avg === null && b.avg === null) return 0;
        if (a.avg === null) return 1;
        if (b.avg === null) return -1;
        return b.avg - a.avg;
      });
  }, [options]);

  if (options.length === 0) {
    return <p className={styles.noData}>No options yet. Add some in the My Scores tab.</p>;
  }

  const maxAvg = ranked[0]?.avg ?? 10;

  return (
    <div className={styles.aggregatedTab}>
      <h3 className={styles.aggregatedTitle}>Aggregated Scores</h3>
      <p className={styles.aggregatedSubtitle}>
        Average score across all participants, highest first.
      </p>

      <div className={styles.rankedList}>
        {ranked.map(({ opt, avg, count }, idx) => (
          <div key={opt.id} className={styles.rankedRow}>
            <span className={styles.rank}>#{idx + 1}</span>
            <div className={styles.rankedInfo}>
              <span className={styles.rankedText}>{opt.text}</span>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: avg !== null ? `${(avg / Math.max(maxAvg, 1)) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <div className={styles.scoreDisplay}>
              {avg !== null ? (
                <>
                  <span className={styles.scoreValue}>{avg.toFixed(1)}</span>
                  <span className={styles.scoreVoters}>({count} vote{count !== 1 ? 's' : ''})</span>
                </>
              ) : (
                <span className={styles.noVotes}>no votes</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Root component
// ---------------------------------------------------------------------------

const ScoringFlow: React.FC<FlowProps> = () => {
  const [activeTab, setActiveTab] = useState<'scoring' | 'aggregated'>('scoring');
  const [options, setOptions] = useState(() => api.getOptions());
  const [myScores, setMyScores] = useState<Record<string, number>>(
    () => api.getMyScores().scores,
  );

  const handleAddOption = useCallback((text: string) => {
    api.addOption(text);
    setOptions(api.getOptions());
  }, []);

  const handleScore = useCallback((optionId: string, score: number) => {
    api.setScore(optionId, score);
    setMyScores({ ...api.getMyScores().scores });
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'scoring' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('scoring')}
        >
          <List size={16} />
          My Scores
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'aggregated' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('aggregated')}
        >
          <BarChart2 size={16} />
          Aggregated
        </button>
      </div>

      {activeTab === 'scoring' && (
        <ScoringTab
          options={options}
          myScores={myScores}
          onAddOption={handleAddOption}
          onScore={handleScore}
        />
      )}

      {activeTab === 'aggregated' && <AggregatedTab options={options} />}
    </div>
  );
};

export default ScoringFlow;
