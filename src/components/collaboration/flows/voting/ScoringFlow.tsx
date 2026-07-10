import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BarChart2, List, Plus } from 'lucide-react';

import type { FlowProps } from '../types';
import { useEventStream } from '../../../../hooks/useEventStream';
import { FlowLoading, FlowError } from '../FlowShell';
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
                        // Remove score (set to NaN internally so it's not undefined)
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

const AggregatedTab: React.FC<{
  options: api.ScoringOption[];
  allScores: api.ParticipantScores[];
}> = ({ options, allScores }) => {
  const ranked = useMemo(() => {
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
  }, [options, allScores]);

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

const ScoringFlow: React.FC<FlowProps> = ({ instanceId, flowServer, flowAgent, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'scoring' | 'aggregated'>('scoring');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<api.ScoringOption[]>([]);
  const [myScores, setMyScores] = useState<Record<string, number>>({});
  const [allScores, setAllScores] = useState<api.ParticipantScores[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [loadedOptions, loadedMyScores, loadedAllScores] = await Promise.all([
        api.loadOptions(flowServer, flowAgent, instanceId),
        api.loadMyScores(flowServer, flowAgent, instanceId, currentUser),
        api.loadAllScores(flowServer, flowAgent, instanceId),
      ]);
      setOptions(loadedOptions);
      setMyScores(loadedMyScores);
      setAllScores(loadedAllScores);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load scoring data.');
    } finally {
      setLoading(false);
    }
  }, [instanceId, flowServer, flowAgent, currentUser]);

  useEffect(() => {
    void load();
  }, [load]);

  useEventStream('contract_write', useCallback((event) => {
    if (event.contract === instanceId) void load();
  }, [instanceId, load]));

  const handleAddOption = useCallback(async (text: string) => {
    try {
      await api.addOption(flowServer, flowAgent, instanceId, text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add option.');
    }
  }, [flowServer, flowAgent, instanceId]);

  const handleScore = useCallback(async (optionId: string, score: number) => {
    const updatedScores = { ...myScores, [optionId]: score };
    setMyScores(updatedScores);
    try {
      await api.saveMyScores(flowServer, flowAgent, instanceId, currentUser, updatedScores);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save scores.');
    }
  }, [flowServer, flowAgent, currentUser, instanceId, myScores]);

  if (loading) return <FlowLoading />;
  if (error) return <FlowError message={error} onRetry={load} />;

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

      {activeTab === 'aggregated' && (
        <AggregatedTab options={options} allScores={allScores} />
      )}
    </div>
  );
};

export default ScoringFlow;
