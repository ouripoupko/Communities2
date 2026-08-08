import { useEffect, useCallback, useState } from 'react';
import { eventStreamService, type EventType, type EventListener } from '../services/eventStream';

/**
 * Subscribes to SSE events. Omit serverUrl/agent to listen on the current
 * user's own connection; pass them to listen on another agent's stream
 * (e.g. a collaboration flow's owner) — that connection is opened on
 * demand and closed automatically once nothing else is listening on it.
 */
export const useEventStream = (
  eventType: EventType,
  listener: EventListener,
  serverUrl?: string,
  agent?: string,
) => {
  const memoizedListener = useCallback(listener, [listener]);

  useEffect(() => {
    eventStreamService.addEventListener(eventType, memoizedListener, serverUrl, agent);

    return () => {
      eventStreamService.removeEventListener(eventType, memoizedListener, serverUrl, agent);
    };
  }, [eventType, memoizedListener, serverUrl, agent]);
};

export const useEventStreamConnection = () => {
  const [isConnected, setIsConnected] = useState(eventStreamService.isConnectedToStream());

  useEffect(() => {
    const listener = (connected: boolean) => setIsConnected(connected);
    eventStreamService.addConnectionListener(listener);
    return () => {
      eventStreamService.removeConnectionListener(listener);
    };
  }, []);

  return {
    isConnected,
    connect: eventStreamService.connect.bind(eventStreamService),
    disconnect: eventStreamService.disconnect.bind(eventStreamService),
  };
}; 