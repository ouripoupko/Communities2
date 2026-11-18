/**
 * Tracing for debugging: what the app asks the node, what it answers, and
 * the events it sends. On in development; in a build, run
 * localStorage.setItem('trace', '1') in the console and reload.
 */
function enabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem('trace') === '1';
  } catch {
    return false;
  }
}

const on = enabled();

/** Logs under a topic ('read', 'write', 'event', …), when tracing is on. */
export function trace(topic: string, ...details: unknown[]): void {
  if (on) console.log(`[${topic}]`, ...details);
}
