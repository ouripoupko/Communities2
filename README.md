# Communities — A Platform for Decentralized Governance

Every human community — from a building's residents' committee to humanity as a whole — needs tools for building agreements, managing shared resources, and acting together. The time has come for such tools, where control remains entirely in the hands of the community itself.

**Communities** is a platform that lets any community govern itself — from member onboarding to forging agreements, legislation, and budgets — with no need for a central authority.

---

## How It Works

### Personal Digital Agents

Every person has a **Personal Digital Agent (PDA)** — a small server that represents them on the network and holds their profile, their history, and their resources. A community is built as a smart contract between the agents of its members. All data stays in the hands of the members themselves, distributed across their personal agents. There is no central database. There is no platform that can be shut down or sold.

### Joining a Community

Joining is a collaborative, decentralized process: anyone seeking to join is verified by several existing members, and simultaneously verifies them in return. Trust is built gradually and organically. Every member is a full partner in the admission process — not an administrator, not a gatekeeper.

### Internal Currency

Each community has an internal currency, managed jointly. Every member voices their position on the rate of issuance, the distribution of resources, and the size of the public treasury — and the contract acts according to the **median**. Agreement, rather than majority rule.

### Collaborative Governance

Above all of these sits a rich interface for:

- **Initiatives** — proposing and deliberating on community projects
- **Collaborations** — structured workflows for working together (discussions, task boards, rankings, scoring, scheduling, Q&A, and more)
- **Budgets** — funding and managing shared resources
- **Agreements** — persistent, versioned documents the community maintains together

---

## Why It Matters

The system is designed to operate at any scale — from a residents' committee, to a network of neighborhoods, a city, and on up to the scale of a nation and of humanity as a whole. Not as a hierarchy imposed from above, but as a **network that grows from below**, out of real agreements between real people.

Existing platforms for coordination — whether social networks, voting tools, or DAOs — either centralize power in a company, reduce governance to binary yes/no votes, or require technical expertise to participate. Communities is designed to be none of these things: it is a general-purpose civic layer for the internet age.

---

## Technical Overview

The frontend is a **React 19 / TypeScript** single-page application built with Vite. State is managed via Redux Toolkit. Smart contracts are written in **Python** and run on each member's personal agent.

**Stack:**
- React 19, TypeScript, Vite
- Redux Toolkit, React Router v7
- SCSS modules
- Python smart contracts (deployed per-member on their PDA)

### Getting Started

```bash
npm install
npm run dev
```

The app connects to a Personal Digital Agent server. Each user runs their own agent — see the [agent repository](https://github.com/ouripoupko/ibc) for setup instructions.

---

## Project Status

Active development. Core flows — identity, community creation, member onboarding, currency, collaborations, and fundraising — are implemented and undergoing QA.

---

## License

MIT
