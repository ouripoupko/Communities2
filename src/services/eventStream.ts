import type { IbcApp } from './ibc';
import { trace } from './trace';

export interface BlockchainEvent {
  action: 'contract_write' | 'deploy_contract' | 'join_contract' | string;
  contract?: string | null;
  request?: string;
  reply?: unknown;
  // Set when the transaction failed (a revert, a wrong argument, an unknown
  // function), to the same text as reply.
  error?: string;
  // join_contract only: the user's node's check of the contract's source
  // against its code ('verified', 'unchecked' or 'mismatch'), and why.
  source_check?: string;
  reason?: string;
}

export type EventListener = (event: BlockchainEvent) => void;

export type EventType = 'contract_write' | 'deploy_contract' | 'join_contract';

/**
 * The user's event stream, through the ibc app's signed stream on their own
 * node, which reopens by itself when it breaks. It carries the events of
 * every contract the app may read, including the ones the user is a guest
 * of. AuthContext opens it on login and closes it on logout; its status
 * drives the "connected" indicator on the profile page.
 */
class EventStreamService {
  private isConnected = false;
  private stop: (() => void) | null = null;
  private listeners: Map<EventType, Set<EventListener>> = new Map();
  private connectionListeners: Set<(isConnected: boolean) => void> = new Set();

  private notifyConnectionListeners() {
    this.connectionListeners.forEach(listener => {
      try {
        listener(this.isConnected);
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

  connect(app: IbcApp) {
    this.close();
    const stopStatus = app.onStatus((status, error) => {
      if (error) console.error(`Event stream ${status}:`, error);
      const isConnected = status === 'open';
      if (this.isConnected !== isConnected) {
        this.isConnected = isConnected;
        this.notifyConnectionListeners();
      }
    });
    const stopEvents = app.onEvent((event) => this.dispatch(event));
    this.stop = () => {
      stopEvents();
      stopStatus();
    };
  }

  disconnect() {
    trace('event', 'stream closed');
    this.close();
    this.notifyConnectionListeners();
  }

  isConnectedToStream(): boolean {
    return this.isConnected;
  }

  addEventListener(eventType: EventType, listener: EventListener) {
    if (!this.listeners.has(eventType)) this.listeners.set(eventType, new Set());
    this.listeners.get(eventType)!.add(listener);
  }

  removeEventListener(eventType: EventType, listener: EventListener) {
    const listeners = this.listeners.get(eventType);
    if (!listeners) return;
    listeners.delete(listener);
    if (listeners.size === 0) this.listeners.delete(eventType);
  }

  private dispatch(data: BlockchainEvent) {
    trace('event', data);
    if (!data.action) return;
    this.listeners.get(data.action as EventType)?.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  private close() {
    this.stop?.();
    this.stop = null;
    this.isConnected = false;
  }
}

// Export a singleton instance
export const eventStreamService = new EventStreamService();
