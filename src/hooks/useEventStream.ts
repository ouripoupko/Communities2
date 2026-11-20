import { useEffect, useState } from 'react';
import { eventStreamService, type EventType, type EventListener } from '../services/eventStream';

/** Subscribes to the user's events of a type. Pass a stable (memoized) listener. */
export const useEventStream = (eventType: EventType, listener: EventListener) => {
  useEffect(() => {
    eventStreamService.addEventListener(eventType, listener);
    return () => eventStreamService.removeEventListener(eventType, listener);
  }, [eventType, listener]);
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