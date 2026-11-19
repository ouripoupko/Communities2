# Program Requirements Document
## Communities — Decentralized Community Self-Governance

**Version:** 2.0
**Date:** November 2026

---

## 1. Product Overview

### 1.1 Vision

Communities is a decentralized self-governance application that gives groups of people the tools to organize, make decisions, and coordinate action without relying on a central authority or platform owner. Every participant hosts their own data; the application aggregates it into a shared, real-time collaborative experience.

### 1.2 Application Structure

The application is organized around three primary areas:

1. **My Identity** — Users manage their profile (name and photo), see their communities, and join new ones. This is the entry point to the application.
2. **Communities** — Users create and join communities. A community is the top-level container for a group of people working together toward shared goals, with its own members, currency and collaborations.
3. **Collaboration** — Within a community, members create **initiatives** (active projects), **wishes** (ideas or requests), and **agreements** (formal commitments). Each of these holds a tree of **flows**: structured tools for voting, scheduling, funding, assigning roles, managing tasks, and more.

### 1.3 Technology Foundation

The application runs on **ibc-go** nodes. Each user has an identity (an *agent*) on a node they choose, protected by a passkey. All application data lives in **Solidity contracts** that users deploy on their nodes, replicated among the nodes of the contract's partners and agreed on by consensus. The React frontend is a view and interaction layer on top of them. It never holds the user's keys: the node asks the user, on its own approval page, for anything the app may not do by itself.

---

## 2. Users and Roles

### 2.1 User Identity

A user is an agent on their ibc node, identified by an address, and protected by a passkey. There are no usernames or passwords.

A user's profile (name, photo) is in a profile contract on their node. It is private until the user makes it public; then the members of their communities can read it.

### 2.2 Roles Within a Community

| Role | Description |
|------|-------------|
| **Creator** | Founded the community and was its first member. Chose its join policy and starting balance. |
| **Member** | Is in the community's member list. Can create collaborations, pay, create fund accounts, and set policy preferences. |
| **Nominee** | Asked to join a web-of-trust community, and waits for the approvals with their vouchers. |
| **Voucher** | A member drawn to approve a nominee (and be approved by them). |
| **Partner / Guest** | How the user's node holds the community's contract: a copy of its own (partner), or through the inviting member's node (guest). |

### 2.3 Roles Within a Collaboration

- **Creator:** created the collaboration and hosts its contract. Can move any flow to the bin.
- **Flow host:** added a flow and hosts its contract. Can move that flow to the bin.
- **Participant:** anyone who opens the collaboration; others' collaborations and flows are used as guests, through their hosts' nodes.

Within a flow, roles are contextual:

- **Role Holder** (Roles flow): A participant assigned to a named role. Can edit role definition fields.
- **Organizer** (Scheduling): The participant who created and configured the scheduling range.
- **Contributor** (Funding): Any member who has paid into the fund.

---

## 3. Core Domain Concepts

### 3.1 Community

A community is the top-level container. It holds:
- A name, description, and creation date
- Its join policy (open, or web of trust) and members
- A community currency: accounts, payments and monetary policies
- A list of collaborations (wishes, initiatives, agreements)

A community is referenced by its contract id. To join, a user scans a member's invitation QR code (or pastes its text), which names the community and the inviting member's node.

### 3.2 Collaboration Types

There are three collaboration types. All three share the same structure: a title, the community they belong to, their creator (who hosts their contract), and a tree of flows.

| Type | Description |
|------|-------------|
| **Wish** | A desire or request expressed by a community member (a title and the dream or need). The starting point for collaboration. |
| **Initiative** | An active project with momentum (a title and a description). Often emerges from a wish. |
| **Agreement** | A formal commitment (a rule and the protection it provides). |

### 3.3 Flows

A **flow** is a modular, composable collaboration tool. Each flow has a title, is backed by its own contract, and can have child flows, without limit: a collaboration's flows form a tree. Removing a flow moves its branch to the collaboration's **bin**, from which it can be restored anywhere in the tree.

Flows are organized into four categories:

- **Decision Making** — tools for surfacing options and reaching consensus
- **Planning & Execution** — tools for coordinating work over time
- **Governance & Finance** — tools for managing resources and authority
- **Communication** — tools for structured conversation and documentation

---

## 4. Feature Requirements

### 4.1 Identity and Profile

**FR-ID-01** Users log in by giving their node's URL and approving the connection on the node's page with their passkey.
**FR-ID-02** The node URL must be a host name, not an IP address (passkeys require it). The app remembers node URLs used before.
**FR-ID-03** A user without a profile contract can create one. Users can set a first name, last name, and profile photo (auto-resized).
**FR-ID-04** A profile is private until the user makes it public; then other members can read it without joining it.
**FR-ID-05** The session persists across reloads. If the node no longer knows the app or the agent, the app returns to the login page.
**FR-ID-06** Users can view all communities they are part of.
**FR-ID-07** Users can join a community by scanning a QR code or pasting an invitation.

### 4.2 Community Management

**FR-CM-01** Users can create a community with a name, description, starting balance for new members, a join policy (open or web of trust), and optional starter policies.
**FR-CM-02** Joining takes one approval on the user's node: joining the community's contract (as a partner or as a guest) and the app's permissions. The app then asks to become a member without asking again, when allowed.
**FR-CM-03** With open join, asking makes the user a member at once. With web of trust, the user becomes a member once they and their vouchers approved each other (see 4.6).
**FR-CM-04** Members are listed with their public profiles. Nominations are listed with their approvals, and each user sees whom they need to approve.
**FR-CM-05** Communities can be shared via a QR code (the community, and the sharing member's node and agent).
**FR-CM-06** The community page provides tabs for Collaborations, Members, Policies, Wallet, and Share.

### 4.3 Collaborations

**FR-CO-01** Members can create wishes, initiatives, and agreements within a community. Each is a contract on its creator's node, listed in the community.
**FR-CO-02** All three collaboration types are listed in a unified Collaborations view, filtered by type and sorted by date.
**FR-CO-03** Opening another member's collaboration joins it as a guest (one approval), through its creator's node.
**FR-CO-04** A collaboration page is the tree of its flows. On wide screens it shows the whole tree, with folding; on phones it shows one level at a time, and the back button goes up a level.
**FR-CO-05** Each flow has its own page, with a breadcrumb of where it is in the tree.
**FR-CO-06** A flow is added at the top level or under any flow, with a title and a type chosen from a grouped list.
**FR-CO-07** Flows that require configuration (e.g., Ranking, Scoring, Scheduling, Funding) show a setup dialog before the flow is created. If the dialog is cancelled, no flow is created.
**FR-CO-08** Each flow is deployed as an independent contract on its creator's node. Others use it as guests, through that node.
**FR-CO-09** The flow's host, or the collaboration's creator, can move a flow and everything under it to the bin. A binned branch can be restored under any flow in the tree from the Add flow dialog.
**FR-CO-10** The URL for an initiative encodes the host node, host agent, and initiative id to support decentralized access.

### 4.4 Collaboration Flows

The rules of each flow (who may edit what, when a proposal passes) are enforced by its contract.

#### 4.4.1 Ranking Vote

**FR-FL-RK-01** Members can add proposals to be ranked.  
**FR-FL-RK-02** Each member independently ranks all proposals.  
**FR-FL-RK-03** The aggregate ranking is computed and displayed in real time.

#### 4.4.2 Scoring Vote

**FR-FL-SC-01** Members can add options to be scored.  
**FR-FL-SC-02** Each member assigns a numerical score to each option.  
**FR-FL-SC-03** Average scores are displayed alongside individual inputs.

#### 4.4.3 Concern Resolution

**FR-FL-CN-01** Members can submit concerns (blockers, objections, questions).  
**FR-FL-CN-02** Each concern can be voted on (approve / disapprove) by all members.  
**FR-FL-CN-03** Votes are stored per concern and displayed as counts.  
**FR-FL-CN-04** Members can change or clear their vote at any time.

#### 4.4.4 Scheduling

**FR-FL-SC-01** The organizer defines a date range, daily start/end hours, and slot duration (in minutes).  
**FR-FL-SC-02** The configuration is set via a dialog before the flow is created.  
**FR-FL-SC-03** Each member selects their available slots by dragging across a heatmap grid.  
**FR-FL-SC-04** The grid displays days as rows and time slots as columns.  
**FR-FL-SC-05** The heatmap aggregates all member selections: cells are shaded by number of available participants.  
**FR-FL-SC-06** The current user's selected slots are visually distinguished from the aggregate.  
**FR-FL-SC-07** The organizer can edit the configuration after creation.

#### 4.4.5 Task Board

**FR-FL-TB-01** Members can create tasks with a title and description.  
**FR-FL-TB-02** Tasks move through statuses: Backlog → In Progress → Done.  
**FR-FL-TB-03** Members can claim (assign to themselves) or release a task.  
**FR-FL-TB-04** Task status can be advanced or reverted individually.  
**FR-FL-TB-05** Tasks are displayed in columns by status (Kanban layout).

#### 4.4.6 Role Nomination

**FR-FL-RL-01** Members can define named roles within the collaboration.  
**FR-FL-RL-02** Any member can join a role to become a holder.  
**FR-FL-RL-03** Role cards are collapsible. In collapsed state they show the role name, current holders, and a join/leave button.  
**FR-FL-RL-04** In expanded state, the card shows five structured sections: Purpose, Responsibilities, Autonomy, Authorities, and Boundaries.  
**FR-FL-RL-05** Role holders can edit all sections. Non-holders have read-only access to sections.  
**FR-FL-RL-06** Purpose is a free-form paragraph; the other four sections are item lists.  
**FR-FL-RL-07** List items support inline add, edit, and delete (holders only).  
**FR-FL-RL-08** Non-holders can approve or disapprove each holder's name, the purpose text, and every individual list item.  
**FR-FL-RL-09** Vote buttons toggle: clicking an active vote clears it.  
**FR-FL-RL-10** Approve/disapprove counts are shown on each voteable element.

#### 4.4.7 Funding

**FR-FL-FN-01** A setup dialog (shown before the flow is created) collects: fund name (required), description (optional), and target goal (optional).
**FR-FL-FN-02** The fund's money is in the community: the flow creates a fund account in the community, and contributions are community payments into it.
**FR-FL-FN-03** The fund displays total raised, number of contributors, the target goal, and the current user's total contribution. A progress bar shows the percentage reached when a goal is set.
**FR-FL-FN-04** Any member can contribute any positive amount from their personal account.
**FR-FL-FN-05** All contributions are listed with contributor, amount, and time.
**FR-FL-FN-06** Participants define budget items, and each distributes 1000 points among them. The aggregated allocation is displayed.

#### 4.4.8 Discussion

**FR-FL-DS-01** Members can post comments.  
**FR-FL-DS-02** Comments can be replied to, forming a nested thread.  
**FR-FL-DS-03** The thread is displayed as a tree with visual indentation.  
**FR-FL-DS-04** Comments are stored flat (with a parentId reference) and rendered as a tree client-side.

#### 4.4.9 Q&A

**FR-FL-QA-01** Members can post questions.  
**FR-FL-QA-02** Members can post answers to any question.  
**FR-FL-QA-03** Questions and their answers are displayed together.  
**FR-FL-QA-04** Members can approve or disapprove answers, and edit or delete their own answers.

#### 4.4.10 Document

**FR-FL-DC-01** A collaborative document can be built from structured elements.  
**FR-FL-DC-02** Members can propose edits to document elements.  
**FR-FL-DC-03** Proposals can be voted on: 3 supporters apply a proposal, and 3 rejecters discard it.  
**FR-FL-DC-04** The document can be exported to PDF.

### 4.5 Currency

**FR-CU-01** Every member has a personal account, credited with the community's starting balance when they join.
**FR-CU-02** Members can pay any account: another member's, or a fund's.
**FR-CU-03** Monetary policies move currency once a day: they mint into accounts, burn from them, or transfer between them, in units or as a percentage of the balance.
**FR-CU-04** A community-governed policy's rate is the median of every member's preference; a member who has not set one counts as 0. Each member can set and change their preference at any time.
**FR-CU-05** A member can create commitments: policies paying from their own account, at a rate they set.
**FR-CU-06** Balances are calculated by the contract up to a given time, shown with that time. Any member can bring them up to date; writes that depend on balances do so first.

### 4.6 Web of Trust

**FR-WT-01** In a community with fewer than 5 members, a nominee is vouched for by every member, and one nomination is handled at a time.
**FR-WT-02** In a community with 5 members or more, a nominee gets 4 vouchers, drawn at random so that the trust graph stays one where every member has 4 links.
**FR-WT-03** The nominee and each voucher approve each other. Once all approvals are in, the nominee becomes a member.
**FR-WT-04** The nominee or any of their vouchers can cancel the nomination.

### 4.7 Real-Time Updates

**FR-RT-01** The application keeps one event stream to the user's node, which reconnects by itself.
**FR-RT-02** When anyone writes to a contract the user can read (including contracts they are a guest of), the user's app receives an event and refreshes the relevant data automatically.
**FR-RT-03** The outcome of a join (accepted or not, and the node's check of the contract's source) arrives as an event.

---

## 5. Smart Contract System

### 5.1 Overview

All persistent data lives in Solidity contracts deployed on users' ibc-go nodes, each with its own EVM state. The app ships the contracts' sources, deploys them, and passes the source when joining, so the joining node can compile it and check it against the code that runs. There is no centralized database.

### 5.2 Access

- A contract decides who may join it, as a partner or as a guest. Membership rules (such as "members only") are enforced by the contract's own code.
- The app reads and writes through the user's node, with the permissions the user gave it. The user can let the app read a contract, and call some of its methods, without asking each time.
- Calls that need the user's approval start from a click, since the node's approval page is a popup.

### 5.3 Contract Registry

| Contract | Purpose |
|----------|---------|
| `Profile.sol` | User profile: name and photo |
| `community/` | The community, one ibc agreement of several contracts: the root `Community` (properties, who may join), and the parts it creates, which members call directly: `Membership` (members, web of trust), `Collaborations` (the list) and `Currency` (accounts, payments, policies) |
| `Collaboration.sol` | An initiative, wish or agreement, and its flow tree and bin |
| `RankingFlow.sol` | Ranked-choice voting proposals and rankings |
| `ScoringFlow.sol` | Score-based voting options and scores |
| `ConcernsFlow.sol` | Concerns and votes |
| `SchedulingFlow.sol` | Range config and per-participant slot selections |
| `TaskBoardFlow.sol` | Tasks with owner and status |
| `RolesFlow.sol` | Roles with sections, holders, and votes |
| `FundingFlow.sol` | Fund description and goal, budget items, and allocations |
| `DiscussionFlow.sol` | Comments with parent ids for the thread tree |
| `QAFlow.sol` | Questions, answers and votes |
| `DocumentFlow.sol` | Document elements, proposals, and votes |

---

## 6. Navigation and URL Structure

| URL Pattern | Page |
|------------|------|
| `/identity/*` | Profile, communities, join |
| `/community/:communityId/*` | Community hub |
| `/community/:communityId/policy/:policyId` | Policy details |
| `/initiative/:hostServer/:hostAgent/:collaborationId/*` | Initiative page |
| `/wish/:hostServer/:hostAgent/:collaborationId/*` | Wish page |
| `/agreement/:hostServer/:hostAgent/:collaborationId/*` | Agreement page |
| `…/flow/:flowId` | A flow's page, within its collaboration |
| `…?in=:flowId` | A level of the tree, on phones |

Initiative URLs encode the host node and agent in the path to support cross-node navigation in the decentralized network.

---

## 7. Non-Functional Requirements

**NFR-01 Decentralization:** No application data is stored on a platform-owned server. All data lives in contracts on user-controlled nodes.

**NFR-02 Responsiveness:** The UI remains responsive during network operations, with loading states. Actions waiting for the user's approval say so ("Approve on your node…").

**NFR-03 Real-time Sync:** All participants viewing the same flow see updates within seconds of a contract write, through the event stream.

**NFR-04 Resilience:** The UI degrades gracefully when the node is unreachable, showing error states with retry options.

**NFR-05 Security:** The app never holds the user's keys. Identity is a passkey on the user's node; the app has a key of its own with the permissions the user gave it. Joining nodes verify contracts' code against their sources.

**NFR-06 Composability:** New flow types can be added without modifying existing flows or the collaboration page. Each flow is a self-contained component and contract pair registered in a central registry.

**NFR-07 Contract size:** Each contract stays within the EVM's code size limit (24,576 bytes); larger contracts split their code into helpers.

---

## 8. Technical Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 with TypeScript |
| Build tool | Vite |
| State management | Redux Toolkit |
| Routing | React Router 7 |
| Styling | SCSS Modules |
| Icons | Lucide React |
| QR codes | `qrcode.react`, `@yudiel/react-qr-scanner` |
| PDF export | jsPDF, svg2pdf.js |
| Drag and drop | react-dnd |
| Node client | `@ouripoupko/ibc` |
| Smart contracts | Solidity, on ibc-go nodes |
| Real-time events | The ibc node's signed event stream |

---

## 9. Out of Scope

The following are explicitly not part of the current version:

- Mobile native applications (iOS/Android)
- Email or push notifications
- Automated moderation or content filtering
- Integration with external identity providers (OAuth, SSO)
- Offline-first / local-first data sync
- Restricting who may join a collaboration or flow (today anyone with its id may)

---

## 10. Glossary

| Term | Definition |
|------|-----------|
| **Agent** | A user's identity on an ibc node, identified by an address and protected by a passkey |
| **App key** | The key the app holds in the browser, connected to the user's agent with the permissions they gave it |
| **Approval page** | The node's page where the user approves, with their passkey, what the app may not do by itself |
| **Contract** | A Solidity program deployed on an ibc node, with its own state |
| **Partner** | A node that keeps a copy of a contract and takes part in its consensus |
| **Guest** | A user whose node keeps no copy of a contract, and uses a host's copy |
| **Host** | The node and agent that deployed a contract others use as guests |
| **Flow** | A modular collaboration tool, backed by a contract, in a collaboration's tree |
| **Bin** | Where removed flows' branches are kept, until restored |
| **Tick** | One day, the period at which monetary policies apply |
| **Web of trust** | A join policy where a nominee and their vouchers approve each other |
| **Wish** | A user-expressed goal or desire, the primary unit of community intent |
| **Initiative** | An active collaborative project, often derived from a wish |
| **Agreement** | A formal mutual commitment, the output of a negotiation |
