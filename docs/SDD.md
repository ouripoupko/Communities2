# Software Description Document
## Communities — Decentralized Community Self-Governance

**Version:** 2.0
**Date:** November 2026
**Stack:** React 19 · TypeScript 6 · Redux Toolkit · Vite 8 · Solidity contracts on the ibc-go node · `@ouripoupko/ibc`

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Directory Structure](#3-directory-structure)
4. [The ibc Node and Its Client Library](#4-the-ibc-node-and-its-client-library)
5. [Services Layer](#5-services-layer)
6. [Smart Contracts](#6-smart-contracts)
7. [Collaborations and Flows](#7-collaborations-and-flows)
8. [Currency](#8-currency)
9. [Membership and the Web of Trust](#9-membership-and-the-web-of-trust)
10. [Real-Time Events](#10-real-time-events)
11. [Authentication and Session](#11-authentication-and-session)
12. [State Management](#12-state-management)
13. [Routing and Navigation](#13-routing-and-navigation)
14. [UI Patterns and Component Design](#14-ui-patterns-and-component-design)
15. [Build and Configuration](#15-build-and-configuration)

---

## 1. System Overview

Communities is a **decentralized community self-governance application**, a single-page React app with no backend of its own. All persistent data lives in **Solidity contracts** that users deploy on their own **ibc-go nodes**. Each contract has its own EVM state, replicated among its partners' nodes and agreed on by consensus (Cordial Miners).

The app is organized around three areas:

- **My Identity:** the user's profile, their communities, and joining a community.
- **A community:** its members, its collaborations, its currency (policies and wallet), and sharing an invitation.
- **A collaboration** (an initiative, a wish or an agreement): a tree of **flows** (voting, scheduling, task board, discussion, funding, and more), each its own contract.

The app never holds the user's keys. It talks to the user's node through the `@ouripoupko/ibc` library, which gives the app a browser key of its own (an *app key*). Anything the user has not let the app do silently goes through the node's **approval page**, where the user confirms with their passkey.

---

## 2. Architecture

### 2.1 Layers

```
┌───────────────────────────────────────────────────────────┐
│  Pages and components (React, CSS modules)                │
├───────────────────────────────────────────────────────────┤
│  Redux slices (user, communities, currency) · hooks       │
├───────────────────────────────────────────────────────────┤
│  services/contracts/* (profile, community, flows)         │
│  flows/*/…Api.ts (one per flow type)                      │
├───────────────────────────────────────────────────────────┤
│  services/ibc.ts · services/eventStream.ts                │
├───────────────────────────────────────────────────────────┤
│  @ouripoupko/ibc  (IbcApp: app key, approval popup,       │
│                    reads, writes, deploys, joins, events) │
└────────────────────────────┬──────────────────────────────┘
                             │ HTTPS, signed by the app key
                 ┌───────────▼───────────┐       ┌──────────────┐
                 │  The user's ibc node  │◄─────►│ Other nodes  │
                 │  (EVM per contract)   │       │ (partners)   │
                 └───────────────────────┘       └──────────────┘
```

### 2.2 Where data lives

| Data | Contract | Hosted on |
|------|----------|-----------|
| A user's name and photo | `Profile` | The user's node (public reads, so other members can read it) |
| A community: properties, members, nominations, collaborations list, accounts, policies | `Community` (one ibc contract; its parts `Membership`, `Collaborations` and `Currency` are contracts it creates) | Every member who joined as a partner |
| A collaboration: kind, title, community, flow tree | `Collaboration` | Its creator's node; others are guests |
| A flow's data | One contract per flow (`RankingFlow`, …) | The node of whoever added it; others are guests |

### 2.3 Reference chain

```
User's node
 └── Profile (found by its name, communities-profile)
 └── Community (found by its name, communities-community)
      ├── members[]           → each member's node, agent, profile contract id
      ├── collaborations[]    → Collaboration contract id + its host's node and agent
      │    └── Collaboration.getFlows() → each flow's contract id, type, host, parent
      └── accounts[]          → a fund account's id is its Funding flow's contract id
```

---

## 3. Directory Structure

```
src/
├── App.tsx                     Routes, AuthProvider, store Provider
├── assets/contracts/           Solidity sources, deployed and joined by the app (services/contracts/sources.ts)
│   ├── Profile.sol
│   ├── community/              the community's source, several files (§6.3)
│   │   ├── Community.sol       the root ibc deploys: properties, join hooks, creates the parts
│   │   ├── Membership.sol      members and the web of trust
│   │   ├── Collaborations.sol  the collaborations list
│   │   └── Currency.sol        accounts, payments, funds, policies, settlement
│   ├── Collaboration.sol
│   └── *Flow.sol               one per flow type
├── contexts/AuthContext.tsx    login, session restore, logout
├── services/
│   ├── ibc.ts                  the IbcApp connection and its helpers
│   ├── trace.ts                tracing calls and events to the console
│   ├── eventStream.ts          one event stream, listeners by event type
│   ├── encodeDecode.ts         community invitation encoding (QR / text)
│   ├── interfaces.ts           IProfile, shared types
│   └── contracts/
│       ├── sources.ts          the contracts' sources, as files by path
│       ├── profile.ts
│       ├── community.ts        members, collaborations, web of trust, currency
│       └── flows.ts            collaboration tree, deploying and joining flows
├── hooks/
│   ├── useEventStream.ts
│   ├── useCurrency.ts
│   └── useMediaQuery.ts
├── store/slices/               userSlice, communitiesSlice, currencySlice
├── pages/
│   ├── LoginPage.tsx
│   ├── IdentityView.tsx        profile · communities · join
│   ├── CommunityView.tsx       collaborations · members · policies · wallet · share
│   ├── PolicyDetailPage.tsx
│   └── collaboration/
│       ├── CollaborationView.tsx   a collaboration's route: its kind's page
│       ├── CollaborationPage.tsx   the flow tree (or drill-down on phones)
│       └── FlowPage.tsx            one flow, with its breadcrumb and bin action
├── components/
│   ├── AllowAccess.tsx         "Allow Access" (permit) banner
│   ├── PageHeader.tsx
│   ├── Modal.tsx               the frame every dialog shares (+ dialogForm.module.scss)
│   ├── identity/               Profile, Communities, JoinCommunity, …
│   ├── community/              Members, Collaborations, Policies, Wallet, Share,
│   │                           BalancesStatus, AccountPicker, dialogs/, policies/
│   └── collaboration/
│       ├── kinds/              initiative, wish, agreement: what sets each kind apart
│       ├── ContractGate.tsx    join / allow access before showing a contract
│       ├── FlowTreeList.tsx    the whole tree (wide screens)
│       ├── FlowDrillDown.tsx   one level at a time (phones)
│       ├── AddFlowDialog.tsx   new flow, or restore one from the bin
│       ├── flowTree.ts         buildTree, ancestorsOf, countUnder
│       └── flows/              registry.ts, types.ts, one folder per flow type
└── styles/                     variables.scss and globals
```

Beside `src/`, `tests/contracts/` holds the contract tests (Node's test runner), which `npm run test:contracts` runs on a throwaway ibc node, and `tests/e2e/` the browser test of the app (`npm run test:e2e`).

---

## 4. The ibc Node and Its Client Library

The node is ibc-go (`../ibc-go`, documentation in its `docs/`). The app uses its JavaScript client, `@ouripoupko/ibc`, installed from `../ibc-go/js`.

### 4.1 Concepts the app relies on

- **Agent:** the user's identity on their node, rooted in a passkey. The app knows it by its address (`state.user.publicKey`).
- **App key:** `IbcApp.open(node)` creates or loads a browser key for the app (kept in the IndexedDB database `ibc-app`). `app.connect()` asks the user, on the approval page, to connect it to their agent.
- **Approval page:** a popup on the node. It opens for `connect`, `deploy`, `permit`, `join`, and for reads and writes the user has not allowed silently. Browsers only allow popups from a click, so every call that may open it starts from a click.
- **Consents:** when the user approves, they can let the app read a contract, and call some of its methods, silently. Consents are per **source hash**: approving one Community contract covers every contract with the same source.
- **Partners and guests:** a partner's node keeps a copy of the contract and takes part in consensus. A guest's node keeps no copy and uses a host's copy, which the guest trusts with their reads and transactions. A contract decides who may join with `approve_partner(address)` and `approve_guest(address)`.
- **Sources are files:** a contract's source is its Solidity files by path (`Sources`, `{ 'Community.sol': '…', 'Currency.sol': '…' }`), which import each other by those paths and are all the compiler gets. The source hash covers every file and its path, so a joiner must send the same files, under the same paths, as the deploy.
- **One-step join:** `app.join(contract, memberNode, memberAgent, { source, guest, contractName })` sends the join, together with the source the user approved, and resolves with a request id. The outcome arrives later as a `join_contract` event with `reply` (accepted or not), `source_check` (`verified`, `unchecked` or `mismatch`) and `reason`.
- **Public reads:** a contract deployed or permitted with `public: true` can be read by anyone with `Ibc.publicRead(node, agent, contract, method)`. Profiles use this so members can see each other's names and photos.
- **Errors:** the library throws `IbcError` for contract errors (a failed `require` shows its message). `needsApproval(error)` tells an error that only needs the user's approval.

### 4.2 Source check

When a node joins a contract with a source, it compiles the source (its files, and nothing else) with the deploy's compiler and compares the result with the code the contract runs; the join's `join_contract` event reports `verified`, `unchecked` or `mismatch`. A source with several deployable contracts (the community's: `Community` and its parts) names the one it is about: `contract: 'Community'` on deploy, and `contractName: 'Community'` on join, for the approval page to show its functions (`COMMUNITY_CONTRACT` in `sources.ts`).

---

## 5. Services Layer

### 5.1 `services/ibc.ts`

| Function | What it does |
|----------|--------------|
| `openApp(nodeUrl)` / `getApp()` | Opens, or returns, the one `IbcApp` |
| `readSilently(contract, method, values)` | Reads without ever opening the approval page. Fails with an error for which `needsAccess()` is true if the app may not read the contract |
| `writeSilently(contract, method, values)` | The same for writes: for calls that do not start from a click |
| `write(contract, method, values)` / `deploy(input)` | A write or a deploy that may open the approval page: call them from a click |
| `{ at }` | The last argument of `readSilently`, `writeSilently` and `write`: another contract of the agreement, by address (a community's parts) |
| `needsAccess(error)` | The error only needs the user's approval |
| `isSessionGone(error)` | The node no longer knows this app or agent (the user disconnected the app, or the node lost its data) |
| `allowAccess(contract)` | `permit`: asks the user to let the app read the contract (from a click) |
| `contractAccess(contract)` | `'none'` (not joined), `'joined'` (not readable by the app yet) or `'readable'` |
| `hasContract(contract)` | Joined, readable or not |
| `joinAndWait(contract, node, agent, source, guest)` | One-step join; waits for the `join_contract` event of that request (up to 5 minutes, since the node may download a compiler). Keeps events that arrive before the request id |
| `joinFailure(outcome)` | The message for a rejected join |
| `forgetApp()` | Deletes the app key from the browser, so the next login asks again |

**Tracing.** These four (`readSilently`, `writeSilently`, `write`, `deploy`) are the only way the app calls a contract, and each logs the call through `services/trace.ts` (a read also logs its reply); the event stream logs each event the same way. Tracing is on in development; in a build, run `localStorage.setItem('trace', '1')` in the console and reload.

**Silent-or-banner pattern.** A step that follows an await (for example, adding a flow to the tree after deploying it) can no longer open a popup. The app tries it with `writeSilently`. If that fails with `needsAccess`, it shows a banner with a button ("Add it", "Allow Access", "Become a Member"), whose click makes the call that may ask.

### 5.2 `services/contracts/`

A contract's TypeScript wrapper lives with what uses it: the contracts the app shares (profile, community, collaboration) in `services/contracts/`; a flow's contract next to its flow, as its `*Api.ts` (§5.3).

- **`profile.ts`:** `deployProfile` (named `communities-profile`), `makeProfilePublic`, `getProfile`, `getPublicProfile(node, agent, contract)`, `setProfile`.
- **`community.ts`:**
  - `createCommunity` deploys the community's source (`communitySource`, the files of `contracts/community/`) with `contract: 'Community'`, name `communities-community`, and the constructor's name, description, node, profile, starting balance, starter policies and join policy.
  - `joinCommunityContract` (the ibc join, with `contractName: 'Community'`) and `joinCommunity` (the contract's `join()`, becoming a member).
  - Members and collaborations: `getProperties`, `getMembers`, `deployCollaboration`, `listCollaboration`, `getCollaborations`.
  - Web of trust: `getNominations`, `approveAgent`, `disapproveAgent`.
  - Currency: `getAccounts`, `pay`, `createFundAccount`, `getContributions`, `getCurrency`, `updateBalances`, `getPolicies`, `createPolicy`, `setPolicyPreference`, `setCommitmentRate`, `setPolicyDetails`, `deletePolicy`. Also `toUnits`/`fromUnits` (the contract counts millionths).
- **`flows.ts`:** `getFlows`, `getCollaborationInfo`, `joinCollaboration`, `deployFlow`, `addFlow`, `removeFlow`, `restoreFlow`, `joinFlow`.

### 5.3 Flow API modules

Each flow folder has an `*Api.ts` that maps the flow component's operations to its contract's methods with `readSilently` and `write`, and converts the contract's structs to the component's types. Flows with a setup dialog also export a `*Constructor(config, context)` that builds the constructor arguments.

---

## 6. Smart Contracts

All contracts are in `src/assets/contracts/`. `services/contracts/sources.ts` reads them with Vite's `import.meta.glob` and gives them as ibc takes them, files by path: `sourceOf('Profile.sol')` for a one-file contract, `communitySource` for the community's files.

### 6.1 Conventions

- **The caller is `msg.sender`:** the agent that signed the transaction. Contracts record agents as `address`.
- **Who may join:** every contract has `approve_partner(address)` and `approve_guest(address)`. Today all return `true`: who can find the contract id may join, and membership is enforced by the contract's own rules (for example, `onlyMember` in `Community`).
- **String ids:** items get ids from a counter, as decimal strings (`decimal()`), so the UI can use them as keys.
- **Errors:** `require` messages are written for the user, since the UI shows them as they are.
- **Compiler limits we design around:**
  - Calldata arrays of strings are copied element by element, since nested calldata copies are not supported.
  - Functions with many string parameters take them as `memory`, to avoid "stack too deep" (`SchedulingFlow.setRange`).
  - The EVM's limits on code (the node runs every fork through Osaka): 24,576 bytes of runtime code per contract, and 49,152 bytes of creation code per deploy, which for `Community` includes the parts it creates (see 6.3).
  - Names that are reserved words (`apply`) are avoided.

### 6.2 `Profile.sol`

`setProfile(firstName, lastName, userPhoto)` and `getProfile()`. Deployed by the user on their node. "Make it public" permits it with `public: true`, so members can read it with public reads.

### 6.3 The community (`contracts/community/`)

A community is one ibc **agreement**: one deploy, one join, one approval, one group of partners, and its own EVM world. The contract ibc deploys is its root, which creates the others; members call any of them directly, by address (`at` in the client), and each sees `msg.sender` as the member who signed. Its parts act together in one transaction: a member admitted gets their account in the same step. Its source is several files, one contract each:

- **`Community.sol`**, the root: the community's properties (`getProperties()`), the ibc join hooks (`approve_partner`, `approve_guest`: anyone may join the agreement, and then asks to become a member), and `getParts()`, the parts' addresses. Its constructor creates the parts, connects them, and makes its deployer the first member.
- **`Membership.sol`**: the members, and the web of trust (nominations, vouchers, approvals, the drawing and rewiring of the graph). In an open community, `join` makes a member at once. Admitting a member opens their personal account in `Currency`.
- **`Collaborations.sol`**: the collaborations list; members only (it asks `Membership.isMember`).
- **`Currency.sol`**: accounts, payments and fund contributions, policies and preferences, and the settlement of balances. Its members are the owners of the personal accounts (each member has one, and only `Membership` opens them), so it checks membership, and takes the median of the members' preferences, without asking `Membership`.

Each part keeps its own storage and checks who may call it. The calls among them are few and fixed at creation: the root adds the founder (`Membership.addFounder`) and tells `Currency` which `Membership` opens accounts (`setMembership`, once).

A function's signature means one function in the whole source (the node refuses a source where it does not), so the parts' functions have distinct names.

**Size.** The root's creation code includes the parts' (it creates them), and must stay under 49,152 bytes: it is about 34,000. Each part's runtime code is well under 24,576 bytes (`Currency`, the largest, about 15,500). A part that grows much needs splitting again.

| Part | Methods |
|------|---------|
| `Community` (the root) | `getProperties()`, `getParts()` |
| `Membership` | `join(node, profile)`, `approve(other)`, `disapprove(other)`, `isMember(agent)`, `getMembers()`, `getNominations()` |
| `Collaborations` | `addCollaboration(id, kind, title, description, detail, node)`, `getCollaborations()` |
| `Currency` | Accounts: `getAccounts()`, `createFundAccount(id, name, owner)`, `getContributions(fundId)`, `pay(to, amount)`. Policies: `createPolicy(…)`, `setPolicyPreference(policyId, value)`, `setCommitmentRate(policyId, value)`, `setPolicyDetails(policyId, name, description)`, `deletePolicy(policyId)`, `getPolicies()`. Settlement: `getCurrency()`, `updateBalances()` |

The root's constructor takes `name, description, node, profile, initialBalance, starterPolicies, openJoin`.

`community.ts` reads a community's parts once (`getParts`, cached) and sends each call to its part.

### 6.4 `Collaboration.sol`

Kind (initiative, wish, agreement), title, community id and creator, and the flow tree:

```solidity
struct Flow {
    string id;        // the flow's contract
    string flowType;  // e.g. "ranking"
    string title;
    string node;      // its host's node
    address agent;    // its host: whoever added it
    string parent;    // its parent flow's id, or "" at the top level
    uint64 position;  // orders siblings: later is lower
    bool binned;      // its branch is in the bin
}
```

- `addFlow(id, flowType, flowTitle, node, parent)` adds a flow the caller deployed.
- `removeFlow(id)` moves the flow's branch to the bin. Only the flow's host or the collaboration's creator may call it.
- `restoreFlow(id, parent)` puts a binned branch back under any flow in the tree.
- `getFlows()` returns every flow: the client builds the tree, and the bin.

A flow is in the bin if it, or one of its ancestors, is binned. Its children stay under it, so a branch is restored whole.

### 6.5 Flow contracts

| Contract | Main methods |
|----------|--------------|
| `RankingFlow` | `addProposal`, `setMyRanking(order)`, `getTopic`, `getProposals`, `getRankings` |
| `ScoringFlow` | `addOption`, `setMyScores(optionIds, values)`, `getTopic`, `getOptions`, `getScores` |
| `ConcernsFlow` | `addConcern`, `vote(concernId, value)`, `getConcerns` |
| `SchedulingFlow` | `setRange(…)`, `setMySelection(slots)`, `getRange`, `getSelections` |
| `TaskBoardFlow` | `addTask`, `claimTask`, `releaseTask`, `advanceTask`, `revertTask`, `deleteTask`, `getTasks` |
| `RolesFlow` | `addRole`, `joinRole`, `leaveRole`, `deleteRole`, `setPurpose`, `setSection`, `vote`, `getRoles` |
| `FundingFlow` | `addItem`, `setMyAllocation(itemIds, points)`, `getFund`, `getItems`, `getAllocations` |
| `DiscussionFlow` | `addComment(text, parent)`, `deleteComment`, `getComments` |
| `QAFlow` | `addQuestion`, `deleteQuestion`, `addAnswer`, `editAnswer`, `deleteAnswer`, `vote`, `getQuestions`, `getAnswers` |
| `DocumentFlow` | `addElement`, `editElement`, `deleteElement`, `proposeEdit`, `proposeDelete`, `voteProposal`, `getElements`, `getProposals` |

The rules are in the contracts: for example, a participant edits only their own items, and a document proposal is applied when 3 participants support it (`MAJORITY`), or discarded when 3 reject it. The UI only reflects them.

---

## 7. Collaborations and Flows

### 7.0 Kinds of collaboration

Initiatives, wishes and agreements share one contract and one page today, and are expected to grow apart. Each kind is a definition in `components/collaboration/kinds/` (`initiative.ts`, `wish.ts`, `agreement.ts`), made with `defineKind`, which fills in the defaults; a kind sets only how it differs:

- its label, icon and create button (`createLabel`, `submitLabel`);
- `fields`: what the create dialog asks for, and which of the collaboration's three texts (`title`, `description`, `detail`) each fills (an agreement's title is its rule, its detail the harm it prevents);
- `summary` (the card's line; default: the description) and `subtitle` (the page's line; a wish shows its author);
- `Page`: its own page, when it needs more than the generic `CollaborationPage`.

The create dialog, the card, the filter and create buttons, and the routes are generic: they read `COLLABORATION_KINDS` and `kindOf(type)`.

### 7.1 Creating a collaboration

1. `deployCollaboration` deploys `Collaboration.sol` on the creator's node (from the dialog's click).
2. `listCollaboration` adds it to the community with `addCollaboration`, silently. If the app may not call it silently, a banner asks the user to approve it.

### 7.2 Opening a collaboration

`CollaborationPage` wraps its content in a `ContractGate` (keyed by the contract id):

- If the user has not joined the collaboration, the gate offers **Join**, which joins it as a guest through its host (`joinCollaboration`).
- If the app may not read it, the gate shows **Allow Access**.
- Once it is readable, the gate calls `onReady`, and the page loads `getFlows()`.

Each flow page has its own `ContractGate` for the flow's contract, joined as a guest through the flow's host (`joinFlow`).

### 7.3 The flow tree

`flowTree.ts` builds the tree from `getFlows()`: children by `parent`, siblings by `position`, and binned branches apart.

- **Wide screens:** `FlowTreeList` shows the whole tree, with folding and an "Add a flow under …" button on each flow.
- **Phones** (`useMediaQuery('(max-width: 640px)')`): `FlowDrillDown` shows one level at a time, with a breadcrumb. The level is in the URL (`?in=<flowId>`), so the back button goes up a level.
- **Flow pages:** each flow is a page at `flow/:flowId` (`FlowPage`), with its breadcrumb and a **Move to bin** button for the flow's host or the collaboration's creator.

### 7.4 Adding a flow

`AddFlowDialog` asks for a title and a flow type (grouped as in `FLOW_GROUPS`), or offers to restore a branch from the bin ("Put it here").

1. If the flow type has a `setupComponent`, its dialog collects the config.
2. `deployFlow` deploys the flow's source with `constructorArgs(config, { title, communityId })`.
3. `addFlow` adds it to the tree, silently. If that fails with `needsAccess`, the page shows "… is created on your node. Approve adding it to the collaboration." with an **Add it** button.

### 7.5 The flow registry

```typescript
export interface FlowDefinition {
  id: string;                         // e.g. 'ranking', stored as flowType
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  component: React.ComponentType<FlowProps>;
  group?: string;                     // section in the Add flow dialog
  setupComponent?: React.ComponentType<{ onDone: (config) => void; onCancel: () => void }>;
  source?: string;                    // the contract's Solidity source
  constructorArgs?: (config, context: FlowContext) => Record<string, unknown>;
}

export interface FlowProps {
  instanceId: string;                 // the flow's contract id
  flowAgent: string;                  // its host
  currentUser: string;                // the user's agent address
}
```

To add a flow type: write its contract, its `*Api.ts`, its component (and setup dialog if needed), and its registry entry. No other change is needed.

Two hooks give every flow what flows share:

- **`useFlowData(instanceId, load, { alsoWatch?, paused? })`** reads the flow's contract with `load`, and reloads it on that contract's `contract_write` events. Only the first load (and a retry) shows the spinner; later ones update in place. Of overlapping reloads, only the latest one's reply counts. `alsoWatch` names another contract from the loaded data (funding: its community); `paused` holds reloads while a participant edits a draft (ranking), counting the updates meanwhile in `pendingUpdates`. A flow's actions only write; its view follows the events.
- **`useParticipants(currentUser)`** names participants: `nameOf(agent)` ("You", the member's profile name, or a short address), `byline(agent)` ("by you", "by Dana Levi") and `isMe(agent)`, comparing addresses whatever their case. The profiles are the community members' in the store; the collaboration page loads them when the community page has not.

### 7.6 Funding and the community fund

A Funding flow holds the fund's description, goal and budget allocation. The money is in the community: the flow creates a **fund account** in the community whose id is the flow's contract id (`createFundAccount`). Contributions are community payments into it (`pay`), recorded by the community (`getContributions`).

---

## 8. Currency

All amounts are in millionths: `UNIT = 1e6`. The app converts them with `toUnits` and `fromUnits`.

- **Accounts:** each member has a personal account (`personalAccountId(agent)`). Funds have accounts of their own. A new member gets the community's starting balance.
- **Policies** move currency once a day, a **tick** counted from the community's creation:
  - Each has a source (void = mint, an account, every personal account, or every account) and a destination (void = burn, or the same choices).
  - Its mode is units per tick, or a percentage of the source's balance per tick.
  - A **community-governed** policy's rate is the median of the members' preferences. A **commitment** (self-set) is created from the creator's own account, and the creator sets its rate.
- **Settlement:** balances are calculated up to a tick (`settledTick`).
  - `updateBalances()`, and every write that depends on balances (the `upToDate` modifier), settle up to `MAX_TICKS_PER_UPDATE` (366) ticks at a time.
  - Ticks are applied one at a time, every policy in turn on the same tick's balances. Each tick, a policy mints its rate into each destination (units only), or takes its rate (units, or a percentage of the balance) from each source and burns it or splits it equally among the destinations.
  - A write that is more than a year behind fails, and asks to update the balances first.
- **No live projection:** the UI shows the contract's balances and "Balances calculated up to …" (`BalancesStatus`) with an **Update balances** button. It doesn't estimate balances itself.
- `useCurrency(communityId)` loads accounts, policies and currency state into `currencySlice` and refreshes them on the community's `contract_write` events.

---

## 9. Membership and the Web of Trust

Every community chooses its join policy when created (`openJoin`).

- **Open:** `join(node, profile)` makes the caller a member at once.
- **Web of trust:** `join` nominates the caller, who becomes a member when they and their vouchers have approved each other (`approve(other)` from both sides).
  - **Fewer than 5 members:** the nominee is vouched for by every member. One nomination is open at a time.
  - **5 members or more:** the contract draws two random, disjoint edges of the trust graph (pseudo-random from `keccak256(block.timestamp, block.number, sender, salt)`). Their four ends are the vouchers. Once all approvals are in, the nominee is linked to the four vouchers and the two edges are removed, so the graph stays 4-regular (`TRUST_DEGREE = 4`).
  - **Cancelling:** `disapprove(other)` cancels a nomination. Only the nominee or one of their vouchers may.
- **In the app:**
  - `JoinCommunity` makes one approval on the node: the ibc join of the Community contract (as a partner or as a guest) and the app's permissions for its source. It then calls `join()` silently, and opens the Members page.
  - If the silent call is not allowed, the Members page shows **Become a Member** (open) or **Ask to Join** (web of trust).
  - The Members page also lists nominations. The user's own tasks (whom to approve) come from `tasksOf(nominations, me)`, and `ApprovalDialog` approves or disapproves.

---

## 10. Real-Time Events

See [SSE_EVENT_SYSTEM.md](SSE_EVENT_SYSTEM.md) for details.

- `eventStreamService` uses the library's signed stream (`app.onEvent`, `app.onStatus`), which reconnects by itself. It carries events of every contract the app may read, including those the user is a guest of.
- Event types: `contract_write`, `deploy_contract`, `join_contract`.
- `useEventStream(type, listener)` subscribes a component. Flow components refetch when a `contract_write` event names their contract. `Communities` refreshes the contract list on `deploy_contract`. `joinAndWait` listens for `join_contract`.

---

## 11. Authentication and Session

`AuthContext` (`contexts/AuthContext.tsx`):

- **`login(serverUrl)`:** `openApp(serverUrl)`, then `app.connect()` (the approval page, from the Connect click), then starts the session: loads the user's agent and contracts, opens the event stream, and stores `{ serverUrl }` in `localStorage` (`user`).
- **`restoreSession()`:** on reload, reopens the app from the stored node URL. If `isSessionGone`, it ends the session and shows the login page. Any other error shows a boot error with a retry.
- **`logout()`:** closes the event stream, clears the stored session and calls `forgetApp()`.

`LoginPage` asks only for the node URL. The field starts empty, or with the node of a session that ended (to connect again with one click); a list offers the URLs used before. It rejects IP addresses, since passkeys need a host name. It opens the app ahead of the click, so the click can open the popup at once.

---

## 12. State Management

| Slice | Holds |
|-------|-------|
| `userSlice` | `serverUrl`, `publicKey` (the agent's address), the user's contracts, `profileContractId`, the profile and whether it is public |
| `communitiesSlice` | Per community: properties, members, member profiles (read with public reads, four at a time), nominations, `accessNeeded` |
| `currencySlice` | Per community: accounts, policies, currency state (`fetchCurrency`) |

Thunks call the services and store the results. Components keep UI state (dialogs, edits, busy flags) locally.

---

## 13. Routing and Navigation

```
/                                                   → /identity
/identity/{profile|communities|join}                IdentityView
/community/:communityId/{collaborations|members|policies|wallet|share}
/community/:communityId/policy/:policyId            PolicyDetailPage
/{initiative|wish|agreement}/:hostServer/:hostAgent/:collaborationId/*
                                                    CollaborationView → the kind's page (CollaborationPage)
   …/flow/:flowId                                   FlowPage
   …?in=:flowId                                     drill-down level (phones)
```

Every collaboration's path holds its host, so a link to it works on its own; the community's list also passes the listed collaboration in navigation state, to show its title at once. `CollaborationView` keys the page by the collaboration id, so each collaboration starts with fresh state.

---

## 14. UI Patterns and Component Design

### 14.1 Design Tokens

Visual constants are in `styles/variables.scss`, imported into component SCSS files with `@use '…/styles/variables' as *`:

- **Spacing:** `$spacing-xs` … `$spacing-3xl`
- **Typography:** `$text-xs` … `$text-2xl`, `$font-normal` … `$font-bold`
- **Shape:** `$radius-sm` … `$radius-full`
- **Effects:** `$shadow-sm`, `$shadow-base`, `$shadow-lg`, `$transition-base`
- **Colors:** CSS variables (`var(--color-…)`)

### 14.2 Approval-aware actions

Every button whose call may open the node's approval page shows "Approve on your node…" while it waits. Steps that come after an await use the silent-or-banner pattern (5.1). `ContractGate` and `AllowAccess` are the shared components for "join this contract" and "let the app read it".

### 14.3 Modal Dialog Pattern

Every dialog renders its content in `Modal` (`components/Modal.tsx`), and only while it is open:

```tsx
<Modal title="Send Payment" onClose={onClose} locked={isSending} actions={<>Cancel, Send</>}>
  …fields…
</Modal>
```

- The frame: an overlay, a header (title and ×), a body that scrolls, and a footer with the actions (Cancel first, the main action last, right-aligned; stacked on phones). Sizes: `small`, `medium` (default), `large`.
- It closes on ×, an outside click and Escape; `locked` (an action in progress) holds it open, and `closable={false}` makes a dialog that only its actions close (the web-of-trust approval).
- While open it takes the keyboard focus (and gives it back), and stops the page behind from scrolling.
- `dialogForm.module.scss` styles the body: `field`, `label`, `input` (inputs, selects and text areas), `radioGroup`/`radioOption`, `hint`, `error`, and the `primaryButton`, `secondaryButton` and `dangerButton`. A dialog's own stylesheet keeps only what is its own.
- Dialogs with a form mount it only while open (a wrapper renders it when visible), so each opening starts empty.

### 14.4 Flow Card Pattern

Many flows (Roles, Task Board, Concerns) use cards: a `.card` with a `.cardHeader` (expand toggle, title, actions) and a collapsible `.cardBody`. Role cards keep their five sections collapsed until expanded. Votes on assignees show only when expanded, and not to the role's holders.

### 14.5 Inline Edit Pattern

List items use an `editId` / `editText` pair: Enter or ✓ commits, and Escape or × cancels.

### 14.6 Refetch after writes

Flows write, then refetch, and also refetch on the contract's `contract_write` events, so other participants' changes appear too. Lists that the user is building (such as ranking items) keep the local edit while a refetch is in flight.

### 14.7 Drag-to-Select (Scheduling Heatmap)

The scheduling grid selects with `mousedown`, `mouseenter` and a global `mouseup`. The drag state is kept in refs (`dragModeRef`, `draggedRef`, `persistedRef`), so dragging doesn't re-render. At the end of each drag, one state update commits the selection to the UI and the contract (`setMySelection`).

---

## 15. Build and Configuration

### 15.1 Vite

Contract sources are read with `import.meta.glob` (as raw text) in `services/contracts/sources.ts`, and given as ibc takes them, files by path:

```typescript
source: sourceOf('RankingFlow.sol')   // { 'RankingFlow.sol': '…' }
source: communitySource               // { 'Community.sol': '…', 'Currency.sol': '…', … }
```

The app deploys these sources itself, and nodes that join compile them to check them against the running code.

### 15.2 Dependencies

`@ouripoupko/ibc` is installed from the sibling repository: `"@ouripoupko/ibc": "file:../ibc-go/js"`. Build the library in `../ibc-go/js` before `npm install`.

### 15.3 NPM Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type check (`tsc -b`) and production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint |
| `npm run test:contracts` | The contract tests, on a throwaway ibc node (see the testing guide) |
| `npm run test:e2e` | The browser test of the app, on a throwaway node; `SHOTS=1` also saves the docs' screenshots |

### 15.4 Environment

No `.env` is needed. The node URL is given at login and stored in `localStorage`. The node must allow the app's origin, and be reached by host name (not IP) for passkeys.
