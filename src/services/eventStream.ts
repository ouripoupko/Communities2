export interface BlockchainEvent {
  action: 'contract_write' | 'deploy_contract' | 'a2a_connect' | string;
  contract?: string;
  [key: string]: unknown;
}

export type EventListener = (event: BlockchainEvent) => void;

export type EventType = 'contract_write' | 'deploy_contract' | 'a2a_connect';

const MAX_RECONNECT_ATTEMPTS = 5;

interface StreamConnection {
  eventSource: EventSource | null;
  isConnected: boolean;
  reconnectAttempts: number;
  listeners: Map<EventType, Set<EventListener>>;
}

function createConnection(): StreamConnection {
  return { eventSource: null, isConnected: false, reconnectAttempts: 0, listeners: new Map() };
}

function agentKey(serverUrl: string, agent: string): string {
  return `${serverUrl}::${agent}`;
}

class EventStreamService {
  // The current user's own connection, opened/closed explicitly by
  // AuthContext on login/logout. It stays open independent of whether
  // anything is currently listening on it, and its status drives the
  // "SSE Connected" indicator on the profile page.
  private main: StreamConnection = createConnection();
  private connectionListeners: Set<(isConnected: boolean) => void> = new Set();

  // On-demand connections to other agents (e.g. the owner of a
  // collaboration flow being viewed), keyed by "serverUrl::agent". Each is
  // opened lazily on its first listener and closed once its last listener
  // is removed.
  private connections: Map<string, StreamConnection> = new Map();

  private notifyConnectionListeners() {
    this.connectionListeners.forEach(listener => {
      try {
        listener(this.main.isConnected);
      } catch (e) {
        console.error('Error in connection status listener:', e);
      }
    });
  }

  addConnectionListener(listener: (isConnected: boolean) => void) {
    this.connectionListeners.add(listener);
  }

  removeConnectionListener(listener: (isConnected: boolean) => void) {
    this.connectionListeners.delete(listener);
  }

  // ---------------------------------------------------------------------
  // Main connection — the current user's own agent.
  // ---------------------------------------------------------------------
  connect(serverUrl: string, agent: string) {
    this.closeEventSource(this.main);
    this.openEventSource(this.main, serverUrl, agent, () => this.notifyConnectionListeners());
  }

  disconnect() {
    console.log('Disconnecting from SSE stream');
    this.closeEventSource(this.main);
    this.notifyConnectionListeners();
  }

  isConnectedToStream(): boolean {
    return this.main.isConnected;
  }

  // ---------------------------------------------------------------------
  // Listener registration. Omit serverUrl/agent to target the current
  // user's own (main) connection — this preserves all existing call sites.
  // Pass them to listen for events from another agent (e.g. a
  // collaboration flow's owner); a connection to that agent is opened
  // automatically on the first listener and closed once the last one for
  // it is removed.
  // ---------------------------------------------------------------------
  addEventListener(eventType: EventType, listener: EventListener, serverUrl?: string, agent?: string) {
    const conn = serverUrl && agent
      ? this.getOrCreateAgentConnection(serverUrl, agent)
      : this.main;

    if (!conn.listeners.has(eventType)) {
      conn.listeners.set(eventType, new Set());
    }
    conn.listeners.get(eventType)!.add(listener);
  }

  removeEventListener(eventType: EventType, listener: EventListener, serverUrl?: string, agent?: string) {
    const key = serverUrl && agent ? agentKey(serverUrl, agent) : null;
    const conn = key ? this.connections.get(key) : this.main;
    if (!conn) return;

    const listeners = conn.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        conn.listeners.delete(eventType);
      }
    }

    if (key) this.closeAgentConnectionIfIdle(key);
  }

  private getOrCreateAgentConnection(serverUrl: string, agent: string): StreamConnection {
    const key = agentKey(serverUrl, agent);
    let conn = this.connections.get(key);
    if (!conn) {
      conn = createConnection();
      this.connections.set(key, conn);
      this.openEventSource(conn, serverUrl, agent);
    }
    return conn;
  }

  private closeAgentConnectionIfIdle(key: string) {
    const conn = this.connections.get(key);
    if (!conn) return;
    const hasListeners = [...conn.listeners.values()].some(set => set.size > 0);
    if (!hasListeners) {
      this.closeEventSource(conn);
      this.connections.delete(key);
    }
  }

  // ---------------------------------------------------------------------
  // Shared EventSource plumbing, used by both the main and on-demand
  // connections.
  // ---------------------------------------------------------------------
  private openEventSource(conn: StreamConnection, serverUrl: string, agent: string, onStatusChange?: () => void) {
    const streamUrl = `${serverUrl}/stream?agent=${agent}&contract=`;
    console.log('Connecting to SSE stream:', streamUrl);

    try {
      conn.eventSource = new EventSource(streamUrl);
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      conn.isConnected = false;
      onStatusChange?.();
      return;
    }

    conn.eventSource.onopen = () => {
      console.log('SSE connection established:', streamUrl);
      conn.isConnected = true;
      conn.reconnectAttempts = 0;
      onStatusChange?.();
    };

    conn.eventSource.onmessage = (event) => {
      if (!event.data || event.data.trim() === "") {
        // Server sends an empty keep-alive message every 10s; not an error.
        return;
      }
      try {
        const data = JSON.parse(event.data) as BlockchainEvent;
        console.log('SSE Event received:', data);

        if (data.action) {
          const listeners = conn.listeners.get(data.action as EventType);
          listeners?.forEach(listener => {
            try {
              listener(data);
            } catch (error) {
              console.error('Error in event listener:', error);
            }
          });
        }
      } catch (error) {
        console.error('Failed to parse SSE event data:', error, 'Raw data:', event.data);
      }
    };

    // The browser's EventSource already retries the same connection on its
    // own (with Last-Event-ID resume support) unless we close() it — so we
    // only track/report state here and never touch conn.eventSource.
    conn.eventSource.onerror = () => {
      console.error('SSE connection error, browser will retry automatically:', streamUrl);
      conn.isConnected = false;
      onStatusChange?.();

      if (conn.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        conn.reconnectAttempts++;
      } else {
        console.error(`SSE connection degraded: ${MAX_RECONNECT_ATTEMPTS} consecutive errors, still retrying in background:`, streamUrl);
      }
    };
  }

  private closeEventSource(conn: StreamConnection) {
    if (conn.eventSource) {
      conn.eventSource.close();
      conn.eventSource = null;
    }
    conn.isConnected = false;
    conn.reconnectAttempts = 0;
  }
}

// Export a singleton instance
export const eventStreamService = new EventStreamService();
