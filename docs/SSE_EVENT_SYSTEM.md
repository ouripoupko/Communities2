# Event Stream

## Overview

The app gets live updates from the user's own ibc node through the `@ouripoupko/ibc` library's event stream. The stream is signed by the app's key, and reconnects by itself when it breaks. It carries the events of every contract the app may read, including the contracts the user is a guest of. The app opens one stream per session; there are no per-contract or per-agent connections.

## Architecture

### 1. `EventStreamService` (`src/services/eventStream.ts`)

A singleton, `eventStreamService`:

- `connect(app)` subscribes to `app.onEvent` and `app.onStatus`. `AuthContext` calls it when a session starts.
- `disconnect()` unsubscribes. `AuthContext` calls it when the session ends.
- `addEventListener(type, listener)` and `removeEventListener(type, listener)` manage listeners for one event type.
- `addConnectionListener(listener)` and `isConnectedToStream()` report the status. Connected means the library reports the stream `open`.

The service dispatches each event to the listeners of its `action`. An error in one listener is logged and doesn't stop the others.

### 2. React hooks (`src/hooks/useEventStream.ts`)

- `useEventStream(eventType, listener)` subscribes while the component is mounted. Pass a stable listener (wrapped in `useCallback`): a new listener re-subscribes.
- `useEventStreamConnection()` returns `{ isConnected }`, which the Profile page shows as "SSE Connected" or "SSE Disconnected".

## Event types

| `action` | When | Used by |
|----------|------|---------|
| `contract_write` | A write to a contract the app may read was agreed on (by the user or anyone else) | Flows, Profile, communities and currency, to refetch |
| `deploy_contract` | The user deployed a contract | Communities list, user contracts |
| `join_contract` | A join the user requested finished | `joinAndWait` in `services/ibc.ts` |

## Event data

```typescript
export interface BlockchainEvent {
  action: string;          // one of the types above
  contract?: string;       // the contract's id
  request?: string;        // join_contract: the id that app.join() returned
  reply?: unknown;         // join_contract: true when the contract accepted the user
  error?: string;          // a write that failed
  source_check?: string;   // join_contract: 'verified', 'unchecked' or 'mismatch'
  reason?: string;         // join_contract: why it failed, or why the source is unchecked
}
```

## Usage

### Refetch when a contract changes

```typescript
useEventStream('contract_write', useCallback((event) => {
  if (event.contract === instanceId) void load();
}, [instanceId, load]));
```

### Waiting for a join

`app.join()` resolves with a request id, and the outcome arrives later as a `join_contract` event with that `request`. The outcome can arrive before `join()` resolves, so `joinAndWait` starts listening before it calls `join()`, keeps the events it sees meanwhile, and then matches them by id. It gives up after 5 minutes: joining can take that long when the node first downloads a compiler to check the source.

## Debugging

Every event received is traced to the console as `[event] …` (on in development; in a build, after `localStorage.setItem('trace', '1')` and a reload). Stream status changes with an error are logged as `Event stream <status>: …`.
