/**
 * Tracing for debugging: what the app asks the node, what it answers, and
 * the events it sends, by topic ('read', 'write', 'deploy', 'event').
 *
 * In development it traces every topic but reads, which the app makes all
 * the time. The localStorage key 'trace' chooses otherwise (set it in the
 * console and reload): '1' for the default topics (also in a build), 'all'
 * for every topic, or a list such as 'read,write'. '0' turns tracing off.
 */
const DEFAULT_TOPICS = ['write', 'deploy', 'event'];

function setting(): string | null {
  try {
    return localStorage.getItem('trace');
  } catch {
    return null;
  }
}

function topics(): Set<string> | 'all' {
  const value = setting() ?? (import.meta.env.DEV ? '1' : '0');
  if (value === 'all') return 'all';
  if (value === '0') return new Set();
  if (value === '1') return new Set(DEFAULT_TOPICS);
  return new Set(value.split(',').map((t) => t.trim()).filter(Boolean));
}

const traced = topics();

/** Logs under a topic, when that topic is traced. */
export function trace(topic: string, ...details: unknown[]): void {
  if (traced === 'all' || traced.has(topic)) console.log(`[${topic}]`, ...details);
}
