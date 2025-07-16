import { useEffect, useCallback, useState } from 'react';
import { eventStreamService, type EventType, type EventListener, type BlockchainEvent } from '../services/eventStream';

export const useEventStream = (eventType: EventType, listener: EventListener) => {
  const memoizedListener = useCallback(listener, [listener]);

  useEffect(() => {
    eventStreamService.addEventListener(eventType, memoizedListener);
    
    return () => {
      eventStreamService.removeEventListener(eventType, memoizedListener);
    };
  }, [eventType, memoizedListener]);
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