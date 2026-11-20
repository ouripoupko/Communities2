# Testing Guide

How to check the app against a real ibc-go node. There's no mock server: every test runs against a node.

## Setup

1. Run an ibc-go node (by default at `http://localhost:2611`).
2. Install and start the app (the client library, `@ouripoupko/ibc`, comes from npm):

   ```bash
   npm install
   npm run dev
   ```

3. For tests with more than one person, use one browser profile per person (each browser profile has its own app key and passkey). They can all be agents on the same node, or on different nodes.

Before testing, check that the code builds, and run the automated tests:

```bash
npm run build            # type check (tsc -b) and production build
npm run lint             # ESLint
npm run test:contracts   # the contracts, on a throwaway ibc node
npm run test:e2e         # the app in a browser, as two people use it
```

## Automated contract tests

`tests/contracts/` tests every contract the app deploys, on a real ibc node, with the same sources the app sends: the community (its root and parts: properties, members, the web of trust, open join, collaborations, accounts, funds, payments, policies, and who may do what), the profile, a collaboration (its flow tree, its bin, and a guest adding to it), and each flow. They use Node's test runner, and agents with their own keys (no browser, no approval page).

`npm run test:contracts` starts a throwaway node from `../ibc-go/ibc` on port 2799, with a temporary data directory, runs the tests, then stops the node and deletes the directory: no node's data is touched. It copies the compiler from `~/ibc-data/solc` if it is there (else the node downloads it). Options:

| Variable | Meaning |
|---|---|
| `IBC_BIN` | Another node binary |
| `IBC_PORT` | Another port for the throwaway node |
| `IBC_SOLC_DIR` | Where to copy the compiler from |
| `IBC_URL` | Run on this running node instead (its data keeps the test agents and contracts) |

## Automated browser test

`tests/e2e/` runs the app as two people use it, Alice and Bob, each in their own browser profile with their own passkey (Chrome's virtual authenticator, which approves every request), approving on the node's approval window as a user would. It walks through: logging in (creating an identity), profiles, creating a community, sharing its invitation, joining it, the web of trust (each approving the other), a payment, a policy preference, starting and listing an initiative, adding a fund, a ranking vote and a task board to it, the bin, and Bob joining the initiative as a guest and contributing to its fund. Each step checks what the page shows.

`npm run test:e2e` starts a throwaway node (as the contract tests do, on port 2798) and the app's dev server (port 5198), both on `localhost` (passkeys need a host name), and runs headless Chrome with `puppeteer-core`. Set `CHROME` if Chrome is not at `/usr/bin/google-chrome`, and `E2E_DEBUG` to a directory to get a screenshot of each user's page when a step fails.

**Screenshots.** `SHOTS=1 npm run test:e2e` also saves the documentation's screenshots in `docs/screenshots/`, phone-sized (434 × 935), at the steps that show them.

The scenarios below are for what the automated tests do not check: how the app looks and feels, other browsers and devices, and what the browser test does not walk through (wishes and agreements, the other flows, scanning an identity card, the identity card's PDF).

## Test Scenarios

### 1. Login and session

- [ ] The login page's node field starts empty (or with the node of a session that ended), and its list offers the node URLs used before.
- [ ] A URL with an IP address (`http://127.0.0.1:2611`) is refused with an explanation.
- [ ] **Connect** opens the node's approval page. After approving with a passkey, the app opens My Identity.
- [ ] Reloading the page keeps the session, without asking again.
- [ ] After disconnecting the app on the node's page (or resetting the node), reloading returns to the login page.
- [ ] Logging out, then logging in again, asks for approval again.
- [ ] With the node down, the app shows an error with a retry, not a blank page.

### 2. Profile

- [ ] A new agent sees "You have no profile on your node yet", and **Create my profile** deploys one (one approval).
- [ ] Editing the name and photo and saving shows the change after a reload.
- [ ] The profile is private until **Make it public**. After it, another member sees the name and photo in the community's Members tab.
- [ ] The profile shows "SSE Connected" while the node's event stream is open, and "SSE Disconnected" when it is not.

### 3. Communities

- [ ] Creating a community (one approval) adds it to the Communities list, with the creator as its only member.
- [ ] The starting balance, join policy and starter policies chosen in the dialog appear in the Wallet, Members and Policies tabs.

### 4. Joining

With person A in a community, and person B not:

- [ ] A's Share tab shows a QR code and credentials. B pastes them in Join Community.
- [ ] **Join Community** asks B for one approval, then opens the community's Members tab.
- [ ] **Open community:** B is a member right away.
- [ ] Joining as a guest works the same way, and B's node keeps no copy (check on B's node's page).
- [ ] Joining a community B already joined opens it, without asking again.
- [ ] If the app couldn't ask to become a member silently, the Members tab shows **Become a Member** / **Ask to Join**, and it works.

### 5. Web of trust

- [ ] **Fewer than 5 members:** a nominee needs every member. Each member approves the nominee, and the nominee approves each member. After the last approval, the nominee is a member.
- [ ] Only one nomination is open at a time; a second person asking to join is told to wait.
- [ ] **5 members or more:** a nominee gets 4 vouchers. After all mutual approvals, the nominee is a member, and every member still has 4 links.
- [ ] The nominee, or a voucher, can turn the nomination down; anyone else can't.

### 6. Currency

- [ ] **Send** pays another member; both balances change.
- [ ] A payment of more than the balance fails with a clear message.
- [ ] Setting preferences on a community-governed policy changes its median (shown on its card and its page).
- [ ] A commitment from the Wallet pays from the creator's account, at the rate they set.
- [ ] "Balances calculated up to …" shows a time with its time zone (e.g. "GMT+2"); **Update balances** brings it to now, and the balances reflect the days that passed.
- [ ] A policy can't be deleted while its median rate is above zero.

### 7. Collaborations and flows

- [ ] Creating an initiative, a wish and an agreement lists each in the Collaborations tab, filterable by type.
- [ ] Another member opening it is offered **Join** (one approval), then sees its flows.
- [ ] **Add flow** at the top level and under a flow; the tree shows both, in order.
- [ ] Flow types with a setup dialog (Ranking, Scoring, Scheduling, Funding) ask for it under **Next**; cancelling it creates nothing.
- [ ] If adding to the tree needs approval, the "… is created on your node" banner appears, and **Add it** adds it.
- [ ] **Move to bin** on a flow with flows under it moves the whole branch. Only the flow's adder or the collaboration's creator sees the button.
- [ ] The Add flow dialog lists the bin; **Put it here** restores the branch under the chosen place.
- [ ] On a phone-width window (≤ 640px), the tree shows one level at a time, and the back button goes up a level.
- [ ] Each flow page has a breadcrumb of where it is.

### 8. Each flow

For each flow type, with two people:

- [ ] The second person joins the flow (one approval) and sees the first person's data.
- [ ] Each person's changes appear on the other's screen without a refresh.
- [ ] Rules hold: for example, only a task's owner advances it; only an element's owner edits it in a Document; a Document proposal applies after 3 supporters.
- [ ] Funding: contributing pays into the fund's account in the community; the contribution appears in the fund and in the payer's balance.

## Recording results

| Area | Pass/Fail | Notes |
|------|-----------|-------|
| Login and session | | |
| Profile | | |
| Communities | | |
| Joining | | |
| Web of trust | | |
| Currency | | |
| Collaborations and flows | | |
| Each flow | | |

## Notes

- The manual tests leave agents and contracts on the node they run on. Use a node you can reset (the automated tests use a throwaway node).
- In development, the browser console traces every write and deploy (`[write]`, `[deploy]`) and every event received (`[event]`), which helps to see where a step stopped. Reads (`[read]` with its reply) are left out, since the app reads all the time: to see them, run `localStorage.setItem('trace', 'all')` and reload. In a build, turn the default tracing on with `localStorage.setItem('trace', '1')`; `'0'` turns it off.
