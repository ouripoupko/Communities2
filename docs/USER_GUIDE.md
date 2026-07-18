# Communities — User Guide

Communities is a place for a group of people to govern themselves together — collaborate, manage shared money, run projects, and build agreements — without a company or admin in the middle. Everything you do here happens directly between you and the other members.

This guide walks through everything you can do in the app, tab by tab. Screenshots are from the mobile app, so each one is paired with its description in a column to the side of it.

---

## Table of Contents

1. [Key Concepts](#1-key-concepts)
2. [Logging In](#2-logging-in)
3. [Your Profile](#3-your-profile)
4. [Communities](#4-communities)
5. [Joining a Community](#5-joining-a-community)
6. [Inside a Community](#6-inside-a-community)
7. [Collaborations: Initiatives, Wishes, and Agreements](#7-collaborations-initiatives-wishes-and-agreements)
8. [Collaboration Tools](#8-collaboration-tools)
9. [Money: Policies and Wallet](#9-money-policies-and-wallet)
10. [Staying in Sync](#10-staying-in-sync)
11. [Quick Reference](#11-quick-reference)

---

## 1. Key Concepts

Before diving in, two ideas make everything else make sense:

- **Your identity is a key, not a password.** You don't have a username/password login. You have a unique cryptographic **public key** that *is* your identity across every community you belong to.
- **Your data lives on your own agent, not on a central server.** Every person connects through a **Personal Digital Agent** — a server address you provide when you log in. There's no single company or database that owns your community's information; it's distributed across the members' own agents.

You don't need to understand the technical details of either to use the app — just know that "your key" is *you*, and "your server" is *where your data lives*.

---

## 2. Logging In

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/login-screen.png" width="220" alt="The login screen, with fields for a public key and a Personal Digital Agent server URL, plus a button to generate a new random key">

</td>
<td valign="top">

The login screen asks for two things:

- **Public Key** — your identity. If you're brand new, use the "generate a random key" option to create one. **Save it somewhere safe** — if you lose it, you lose access to your identity and everything tied to it.
- **Server URL** — the address of your Personal Digital Agent. The app remembers servers you've used before so you can pick from your history.

There's no password to forget and no email verification — possession of your key *is* your login.

</td>
</tr>
</table>

---

## 3. Your Profile

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/profile-tab-edit-mode.png" width="220" alt="The Profile tab in edit mode, showing name fields, a profile photo upload, and read-only public key / server URL fields with Copy buttons">

</td>
<td valign="top">

Once logged in, the **Profile** tab (under "My Identity") lets you manage your personal details:

- First and last name
- A profile photo (uploaded and automatically resized)
- Your public key and server URL, shown read-only with one-click **Copy** buttons for sharing

Click **Edit Profile** to make changes, then **Save**. Changes sync to everyone who can see your profile automatically — you don't need to refresh.

</td>
</tr>
</table>

---

## 4. Communities

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/communities-list-tab.png" width="220" alt="The Communities tab, showing a grid of community cards and a Create Community button">

</td>
<td valign="top">

The **Communities** tab (under "My Identity") lists every community you belong to. From here you can:

- Open any community you're already in
- Click **Create Community** to start a new one

</td>
</tr>
</table>

### Creating a Community

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/create-community-dialog.png" width="220" alt="The Create Community dialog, with fields for name, description, starting balance, join-policy dropdown, and a starter-policies checkbox">

</td>
<td valign="top">

When you create a community, you choose:

- **Community Name** and **Description**
- **Starting balance for new members** — how much internal currency every new member receives when they join (defaults to 1000, but you can set any amount)
- **How can new members join?**
  - **Web of trust** — existing members must approve each new person (see [Joining a Community](#5-joining-a-community))
  - **Open** — anyone with an invite can join instantly, no approval needed
- **Starter policies** — an optional checkbox that sets up two ready-made monetary policies for you: a "Personal Minting" policy (issues new currency to members) and a "Demurrage" policy (gradually reclaims a share of balances). You can always add, change, or remove policies later — see [Money: Policies and Wallet](#9-money-policies-and-wallet).

The community is created instantly in the interface; give it a few moments to finish deploying across the network before other members can join.

</td>
</tr>
</table>

---

## 5. Joining a Community

Joining is a two-step process:

### Step 1 — Connect to the community

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/share-tab-qr-code.png" width="220" alt="The Share tab, showing a large QR code and a block of text credentials below it, ready to be scanned or copied">

</td>
<td valign="top">

Someone already in the community needs to invite you. From their side, they open the community's **Share** tab, which shows a QR code and a block of text credentials. You can join either by:

- Scanning their QR code from the **Join Community** tab (under "My Identity"), or
- Pasting the credentials text manually

</td>
</tr>
</table>

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/join-community-scan-tab.png" width="220" alt="The Join Community tab, showing the camera QR scanner open and a manual paste-credentials text box below it">

</td>
<td valign="top">

This step connects your agent to the community's network and adds it to your **Communities** list — but you're not a member yet.

</td>
</tr>
</table>

### Step 2 — Become a member

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/members-tab-pending-approval.png" width="220" alt="The Members tab of a web-of-trust community, showing the current user's own pending request at the top and an Approve button next to another pending member's name">

</td>
<td valign="top">

Open the community and go to the **Members** tab. If you're not yet a member, you'll see a **Join Community** button there.

- If the community uses **open membership**, clicking it makes you a member immediately.
- If the community uses **web of trust**, clicking it submits a join request. You'll appear in the Members list as **pending** until enough existing members click **Approve** next to your name. This is intentional — it's how the community builds trust organically instead of relying on a gatekeeper.

</td>
</tr>
</table>

---

## 6. Inside a Community

![A community's page showing the full tab bar (Collaborations, Members, Policies, Wallet, Share) and the ID Card / Scan buttons in the header](screenshots/community-tab-bar-overview.png)

Once you're in a community, five tabs plus two header buttons give you everything you need:

- **Collaborations** — the community's projects, wishes, and agreements — see [section 7](#7-collaborations-initiatives-wishes-and-agreements).
- **Members** — everyone in the community, plus the join/approve flow described above.
- **Policies** — the community's shared monetary rules — see [section 9](#9-money-policies-and-wallet).
- **Wallet** — your personal balance and payments — see [section 9](#9-money-policies-and-wallet).
- **Share** — a QR code and credentials for inviting new people (see above).

Two buttons also live in the community header:

- **ID Card** — shows your own identity card and QR code *for this specific community*, so someone can quickly scan and recognize you.
- **Scan** — opens your camera to scan someone else's QR code (for example, to verify another member's ID card).

---

## 7. Collaborations: Initiatives, Wishes, and Agreements

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/collaborations-tab-list.png" width="220" alt="The Collaborations tab, showing the three create buttons (Start Initiative, Make a Wish, Propose Agreement) above a grid of existing collaboration cards">

</td>
<td valign="top">

The **Collaborations** tab is where a community actually gets things done. Every item in the list is one of three types, created with its own button at the top of the tab:

- **⚡ Start Initiative** — a concrete project or effort the community is taking on. Give it a **Title** and a **Description** of the action.
- **♥ Make a Wish** — a lighter-weight way to float an idea before committing to it. Give it a **Title** and describe the **Dream / Need** behind it — what you're hoping for.
- **🛡 Propose Agreement** — a rule or commitment for the community. State the **Rule** itself and the **Protection** it provides — what harm or problem it prevents.

</td>
</tr>
</table>

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/create-initiative-dialog.png" width="220" alt="The Start Initiative dialog, with Title and Description fields and a submit button">

</td>
<td valign="top">

Click any card in the list to open it. Every Initiative, Wish, and Agreement is a blank canvas that starts with nothing but a title — you build it out using **Collaboration Tools**.

</td>
</tr>
</table>

---

## 8. Collaboration Tools

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/add-collaboration-tool-menu.png" width="220" alt="An open Initiative with the + Add menu expanded, showing the four tool categories (Decision Making, Planning & Execution, Governance & Finance, Communication) and their tools listed underneath each">

</td>
<td valign="top">

Open any Initiative, Wish, or Agreement and click **+ Add** to attach a tool as a new tab. You can add as many as the work needs, and every member with access can see and use them. Tools are grouped into four categories, covered below.

</td>
</tr>
</table>

### Decision Making

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/ranking-vote-tool.png" width="220" alt="The Ranking Vote tool tab, showing a drag-to-reorder list of proposals and the combined group ranking below it">

</td>
<td valign="top">

- **Ranking Vote** — members rank a list of options in their own order of preference; the app combines everyone's rankings into a group result.
- **Scoring Vote** — members give each option a personal score; scores are averaged into a group result.
- **Concern Resolution** — members raise concerns or objections, and others can add their support behind the ones that matter most to them, surfacing the concerns with the most backing.

</td>
</tr>
</table>

### Planning & Execution

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/task-board-tool.png" width="220" alt="The Task Board tool tab, showing Unassigned, In Progress, and Done columns with several task cards">

</td>
<td valign="top">

- **Scheduling** — propose a date/time range and let members mark their availability, useful for finding a time for a meeting or event.
- **Task Board** — a simple to-do / in-progress / done board. Tasks start in an "Unassigned" column until someone claims them.
- **Role Nomination** — propose a named role (e.g. "Treasurer") and let members nominate and approve or reject candidates for it.

</td>
</tr>
</table>

### Governance & Finance

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/funding-tool.png" width="220" alt="The Funding tool tab, showing a fundraising goal, a progress bar toward it, and a list of individual contributions">

</td>
<td valign="top">

- **Funding** — set a fundraising goal and description, then track contributions toward it. This is tied directly into the community Wallet, so real contributions actually move money.

</td>
</tr>
</table>

### Communication

- **Discussion** — an open, threaded comment area for general conversation.
- **Q&A** — members post questions, others post answers.
- **Document** — a shared, living document. Members propose edits or additions, which others can review and approve before they're merged in.

---

## 9. Money: Policies and Wallet

Every community has its own internal currency, governed jointly by its members through the **Policies** tab, and spent through the **Wallet** tab.

### How Policies work

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/policies-tab.png" width="220" alt="The Policies tab, showing a grid of policy cards each labeled Policy or Commitment, with their current rate displayed">

</td>
<td valign="top">

A policy is a rule that moves currency automatically, on a repeating basis (a "tick"). Every policy you create from this tab has:

- A **source** — where the money comes from: nowhere (minted from thin air), a specific account, every member's personal account, or every account in the community
- A **destination** — where it goes: burned (destroyed), a specific account, every member's personal account, or every account
- A **mode** — either a fixed number of **units** per tick, or a **percentage** of the source's balance per tick

You don't set a rate when creating a policy. Every policy created here is **community-governed** — its actual rate comes from the members, not from a number you type in (see below for how).

Two starter policies are commonly used: **Personal Minting** (issues new currency into every member's account) and **Demurrage** (gradually reclaims a share of every balance, encouraging money to keep moving rather than sit idle).

</td>
</tr>
</table>

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/policy-detail-page.png" width="220" alt="A policy detail page, showing the live median rate at the top and an input below it for the current member's own preference">

</td>
<td valign="top">

Open any policy to see its detail page. This is where you set **your own preference** for its rate — a standing input, not a one-time vote, which you can change any time.

The policy doesn't run on your number alone: it runs on the **live median** of every member's preference. As people set or update their own preference, the median — and so the policy's actual rate — updates automatically. This median is always visible in two places: on the policy's card in the **Policies** tab, and at the top of its own detail page. A policy can't be deleted while its median rate is still above zero.

Personal commitments work differently — you set a fixed rate yourself, and it isn't governed by a median. They're created and managed from the **Wallet** tab, not from here (see below).

</td>
</tr>
</table>

### How the Wallet works

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/wallet-tab.png" width="220" alt="The Wallet tab, showing the My Account balance with a Send button, and a My Commitments list below it">

</td>
<td valign="top">

The **Wallet** tab is where you handle your own money:

- **My Account** shows your personal balance and a **Send** button for paying anyone — another member, or an account tied to a policy — instantly.
- **My Commitments** lists the personal, self-set payments you've created — this is where you set a fixed rate yourself (see above), with a button to create a new one.

</td>
</tr>
</table>

<table>
<tr>
<td width="240" valign="top">

<img src="screenshots/send-payment-dialog.png" width="220" alt="The Send Payment dialog, with a recipient picker, an amount field, and a Send Payment button">

</td>
<td valign="top">

You'll see right away whether the payment completed or failed.

</td>
</tr>
</table>

---

## 10. Staying in Sync

You never need to manually refresh the app. Whenever anyone in your community writes a change — a payment, a vote, a new comment, an approval — everyone else's screen updates automatically within moments, because every client is always listening for live updates from the network. If you ever see a "Connected" indicator, that's confirming this live link is active.

---

## 11. Quick Reference

| I want to... | Go to... |
|---|---|
| Log in for the first time | [Login screen → generate a key, enter a server](#2-logging-in) |
| Update my name or photo | [My Identity → Profile](#3-your-profile) |
| See or start a community | [My Identity → Communities](#4-communities) |
| Join a community I was invited to | [My Identity → Join Community (scan/paste), then that community's Members tab](#5-joining-a-community) |
| Invite someone to my community | [Community → Share](#6-inside-a-community) |
| Show or check someone's identity | [Community header → ID Card / Scan](#6-inside-a-community) |
| See who's in a community, or approve a pending member | [Community → Members](#5-joining-a-community) |
| Start a project, idea, or rule | [Community → Collaborations → Start Initiative / Make a Wish / Propose Agreement](#7-collaborations-initiatives-wishes-and-agreements) |
| Vote, schedule, track tasks, discuss, etc. on a collaboration | [Open the collaboration → **+ Add**](#8-collaboration-tools) |
| Set or vote on a community-wide monetary rate | [Community → Policies](#9-money-policies-and-wallet) |
| Send money or set up a personal recurring payment | [Community → Wallet](#9-money-policies-and-wallet) |
