import { useCallback, useEffect, useRef, useState } from 'react';
import { useEventStream } from '../../../hooks/useEventStream';

export interface FlowDataOptions<T> {
  /**
   * Another contract whose writes change what the flow shows, as the loaded
   * data names it (funding: its community, where its money is).
   */
  alsoWatch?: (data: T) => string | null;
  /**
   * Hold reloads while the participant edits a draft that a reload would
   * reshuffle; pendingUpdates counts the updates that arrived meanwhile.
   */
  paused?: boolean;
}

export interface FlowData<T> {
  /** What the flow's contract holds; undefined until the first load. */
  data: T | undefined;
  /** True on the first load and on a retry only: reloads update in place. */
  loading: boolean;
  error: string | null;
  /** Shows the spinner and loads again (for FlowError's Retry). */
  retry: () => void;
  /** Loads again in place, e.g. when the participant ends a paused edit. */
  reload: () => Promise<void>;
  /** Updates that arrived while paused: the next reload brings them in. */
  pendingUpdates: number;
}

/**
 * The state of a flow: its contract (instanceId), read with load. A flow's
 * writes come back as contract_write events on its contract, which reload it,
 * so a flow's actions only write and its view follows. Only the first load
 * shows a spinner; later ones update in place, so what a participant is
 * typing is not lost. Pass a stable load (a module function, or memoized).
 */
export function useFlowData<T>(
  instanceId: string,
  load: (instanceId: string) => Promise<T>,
  { alsoWatch, paused = false }: FlowDataOptions<T> = {},
): FlowData<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState(0);

  // Another flow starts afresh.
  const [shownId, setShownId] = useState(instanceId);
  if (instanceId !== shownId) {
    setShownId(instanceId);
    setData(undefined);
    setLoading(true);
    setError(null);
    setPendingUpdates(0);
  }

  // Events can start reloads that overlap: only the latest one's reply counts.
  const latest = useRef(0);
  const reload = useCallback(() => {
    const call = ++latest.current;
    return load(instanceId).then(
      (loaded) => {
        if (call !== latest.current) return;
        setData(loaded);
        setError(null);
        setPendingUpdates(0);
      },
      (e) => {
        if (call !== latest.current) return;
        setError(e instanceof Error ? e.message : String(e));
      },
    ).finally(() => {
      if (call === latest.current) setLoading(false);
    });
  }, [instanceId, load]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    void reload();
  }, [reload]);

  useEffect(() => { void reload(); }, [reload]);

  const watched = data !== undefined && alsoWatch ? alsoWatch(data) : null;
  useEventStream('contract_write', useCallback((event) => {
    if (event.contract !== instanceId && (!watched || event.contract !== watched)) return;
    if (paused) setPendingUpdates((n) => n + 1);
    else void reload();
  }, [instanceId, watched, paused, reload]));

  return { data, loading, error, retry, reload, pendingUpdates };
}
