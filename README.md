# Communities — A Platform for Decentralized Governance

**Communities is an open-source platform that helps communities forge agreements, manage shared resources, and act together — without relying on a central authority.**

Every human community — from a building's residents' committee to humanity as a whole — needs tools for building agreements, managing shared resources, and acting together. The time has come for such tools, where control remains entirely in the hands of the community itself.

Communities is a platform that lets any community govern itself — from member onboarding to forging agreements, legislation, and budgets — with no need for a central authority.

**Who is it for?** Any group that needs to coordinate: a residents' committee, a housing cooperative, a non-profit, a local community group, a workers' collective, a neighborhood council — or a network of any of these, operating at scale.

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

---

## Why This Is Different

Existing platforms for coordination all fall short in one way or another:

- **It is not a social network.** The community is not a product. No company owns the data, the relationships, or the rules. Everything lives on the members' own agents.
- **It is not a voting tool.** Reducing governance to binary yes/no votes misses most of what communities actually do — deliberation, resource allocation, gradual trust-building, ongoing agreements. Communities is built for the full picture.
- **It is not a classic DAO.** Blockchain-based DAOs put the infrastructure in the user's hands: tokens, gas fees, on-chain mechanics. In Communities, the blockchain is an implementation detail; members interact with their community, not a ledger. It is designed for ordinary people and non-technical groups.

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

## Get in Touch

Whether you're curious about the project, thinking about using it for your community, want to contribute, or just want to say hello — we'd love to hear from you.

Open a thread in the [Discussions](../../discussions) tab. Ask a question, share an idea, or just introduce yourself. No agenda required.

---

## License

MIT
