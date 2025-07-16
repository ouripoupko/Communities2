import React, { useState } from 'react';
import { useEventStream, useEventStreamConnection } from '../../hooks/useEventStream';
import type { BlockchainEvent } from '../../services/eventStream';
import './EventTest.scss';

const EventTest: React.FC = () => {
  const [events, setEvents] = useState<BlockchainEvent[]>([]);
  const { isConnected } = useEventStreamConnection();

  // Listen for all three event types
  useEventStream('contract_write', (event) => {
    console.log('Contract write event received:', event);
    setEvents(prev => [...prev.slice(-9), { ...event, timestamp: new Date().toISOString() }]);
  });

  useEventStream('deploy_contract', (event) => {
    console.log('Deploy contract event received:', event);
    setEvents(prev => [...prev.slice(-9), { ...event, timestamp: new Date().toISOString() }]);
  });

  useEventStream('a2a_connect', (event) => {
    console.log('A2A connect event received:', event);
    setEvents(prev => [...prev.slice(-9), { ...event, timestamp: new Date().toISOString() }]);
  });

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <div className="event-test-container">
      <div className="event-test-header">
        <h3>SSE Event Test</h3>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </div>
      
      <div className="event-controls">
        <button onClick={clearEvents} className="clear-button">
          Clear Events
        </button>
        <span className="event-count">
          {events.length} events received
        </span>
      </div>

      <div className="events-list">
        {events.length === 0 ? (
          <div className="no-events">
            <p>No events received yet...</p>
            <p>Events will appear here when they are received from the blockchain.</p>
          </div>
        ) : (
          events.map((event, index) => (
            <div key={index} className="event-item">
              <div className="event-header">
                <span className="event-action">{event.action}</span>
                <span className="event-time">
                  {new Date(event.timestamp || Date.now()).toLocaleTimeString()}
                </span>
              </div>
              <div className="event-details">
                <pre>{JSON.stringify(event, null, 2)}</pre>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventTest; 