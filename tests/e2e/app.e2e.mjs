// The app, end to end, as two people use it: Alice and Bob, each with their
// own browser and passkey, on one ibc node. Run it with run.mjs.
import { APP_URL, NODE_URL, browser, check, failed, newUser, approving, act, click, fill, sees, shoot, step } from './browser.mjs';

const alice = await newUser('Alice');
const bob = await newUser('Bob');

/**
 * Adds a flow at the top level of the open collaboration (the phone's list):
 * its kind and title, then its setup dialog if it has one (setup fills it and
 * names its button). Deploying it opens the approval window; adding it to
 * the tree, if not silent, the "Add it" banner.
 */
async function addFlow(user, kind, title, { setup = null, shot = null } = {}) {
  const { page } = user;
  await (await page.waitForSelector('[aria-label="Add a flow"]', { visible: true })).click();
  await fill(page, '#flowTitle', title);
  await click(page, kind, { selector: '[role=dialog] button' });
  if (shot) await shoot(page, shot);
  if (setup) {
    await click(page, 'Next', { selector: '[role=dialog] button' });
    await approving(user, () => setup(page));
  } else {
    await approving(user, () => click(page, 'Add', { selector: '[role=dialog] button' }));
  }
  if (await page.waitForSelector('button::-p-text(Add it)', { visible: true, timeout: 5000 }).catch(() => null)) {
    await act(user, () => click(page, 'Add it'));
  }
  await sees(page, title);
}

/** Opens a flow of the open collaboration, from the phone's list. */
async function openFlow(page, title) {
  await click(page, title, { selector: 'button[class*=itemMain]' });
}

/** Logs a user in, creating their identity on the node, and makes their public profile. */
async function logIn(user, firstName, lastName, { shots = false } = {}) {
  const { page } = user;
  await page.goto(APP_URL);
  await fill(page, '#serverUrl', NODE_URL);
  if (shots) await shoot(page, 'login-screen');
  await approving(user, () => click(page, 'Connect'), { create: firstName });
  await sees(page, 'My Identity');
  await act(user, () => click(page, 'Create my profile'), { until: () => sees(page, 'Edit Profile') });
  await click(page, 'Edit Profile');
  await fill(page, '#firstName', firstName);
  await fill(page, '#lastName', lastName);
  if (shots) await shoot(page, 'profile-tab-edit-mode');
  await act(user, () => click(page, 'Save'), { until: () => sees(page, 'Edit Profile') });
  // A profile is deployed public; an older one offers to make it public.
  if (await page.$('button::-p-text(Make it public)')) {
    await act(user, () => click(page, 'Make it public'), {
      until: () => page.waitForFunction(() => !document.body.innerText.includes('Make it public'), { timeout: 60000 }),
    });
  }
}

try {
  await step('Alice logs in, and makes her public profile', async () => {
    await logIn(alice, 'Alice', 'Cohen', { shots: true });
    check('Alice has a public profile', await sees(alice.page, 'Alice'));
  });

  await step('Alice creates a community', async () => {
    const { page } = alice;
    await click(page, 'Communities');
    await click(page, 'Create Community');
    await fill(page, '#communityName', 'Garden Club');
    await fill(page, '#communityDescription', 'Neighbours growing food together.');
    await shoot(page, 'create-community-dialog');
    await approving(alice, () => click(page, 'Create Community', { selector: '[role=dialog] button' }));
    await sees(page, 'Garden Club');
    check('the community is in Alice\'s list', true);
    await shoot(page, 'communities-list-tab');
  });

  let invitation;
  await step('Alice opens the community, and shares it', async () => {
    const { page } = alice;
    await click(page, 'Garden Club', { selector: '*' });
    await sees(page, 'Collaborations');
    await sees(page, '1 member');
    await shoot(page, 'community-tab-bar-overview', { x: 0, y: 0, width: 434, height: 217 });
    await click(page, 'Share');
    await sees(page, 'Community Credentials');
    invitation = await page.$eval('pre', (pre) => pre.textContent);
    check('the invitation names the node, the agent and the community', /"server"/.test(invitation) && /"contract"/.test(invitation));
    await shoot(page, 'share-tab-qr-code');
  });

  await step('Bob logs in, and joins the community by its invitation', async () => {
    await logIn(bob, 'Bob', 'Levi');
    const { page } = bob;
    await click(page, 'Join Community');
    await fill(page, '#qrData', invitation);
    await shoot(page, 'join-community-scan-tab');
    // The join's approval: Bob reads the source, and lets the app ask for membership at once.
    await approving(bob, () => click(page, 'Join Community', { selector: 'button[class*=joinButton]' }), { allow: ['join', 'approve'] });
    await sees(page, 'You asked to join', 120000);
    check('Bob is nominated, through the web of trust', true);
  });

  await step('Alice and Bob approve each other: Bob becomes a member', async () => {
    await alice.page.bringToFront();
    await click(alice.page, 'Members');
    await sees(alice.page, 'Bob Levi');
    await shoot(alice.page, 'members-tab-pending-approval');
    await click(alice.page, 'Approve', { selector: 'button[class*=pendingButton]' });
    await act(alice, () => click(alice.page, 'Approve', { selector: '[role=dialog] button' }), {
      until: () => sees(alice.page, 'Approved'),
    });
    await bob.page.bringToFront();
    await click(bob.page, 'Approve', { selector: 'button[class*=pendingButton]' });
    await act(bob, () => click(bob.page, 'Approve', { selector: '[role=dialog] button' }), {
      until: () => sees(bob.page, '2 members'),
    });
    check('Bob is a member', await sees(alice.page, '2 members'));
  });

  await step('Alice pays Bob from her wallet', async () => {
    const { page } = alice;
    await alice.page.bringToFront();
    await click(page, 'Wallet');
    await click(page, 'Send');
    const to = await page.waitForSelector('[role=dialog] input[type=text]:not([disabled])', { visible: true });
    await to.click();
    await to.type('Bob');
    await click(page, 'Bob Levi', { selector: '[role=dialog] button' });
    await fill(page, '#paymentAmount', 25);
    await shoot(page, 'send-payment-dialog');
    await act(alice, () => click(page, 'Send Payment', { selector: '[role=dialog] button' }), {
      until: () => page.waitForSelector('[role=dialog]', { hidden: true, timeout: 60000 }),
    });
    check('the payment went through', await sees(page, '975'));
    await shoot(page, 'wallet-tab');
  });

  await step('Alice sets her preference for a policy\'s rate', async () => {
    const { page } = alice;
    await click(page, 'Policies');
    await sees(page, 'Personal Minting');
    await shoot(page, 'policies-tab');
    await click(page, 'Personal Minting', { selector: 'h3' });
    await fill(page, '#rate', 10);
    await act(alice, () => click(page, 'Update Preference'), { until: () => sees(page, 'Community median: 10') });
    check('the community rate is the members\' median', true);
    await shoot(page, 'policy-detail-page');
    await click(page, 'Back');
  });

  await step('Alice starts an initiative, and lists it in the community', async () => {
    const { page } = alice;
    await click(page, 'Collaborations');
    await click(page, 'Start Initiative');
    await fill(page, '#initiative-title', 'Build raised beds');
    await fill(page, '#initiative-description', 'Six cedar beds by the fence, before spring.');
    await shoot(page, 'create-initiative-dialog');
    // Deploying the collaboration: Alice lets the app add flows to it without asking.
    await approving(alice, () => click(page, 'Start Initiative', { selector: '[role=dialog] button' }), { allow: ['addFlow'] });
    await act(alice, () => click(page, 'List it in the community'), { until: () => sees(page, 'Six cedar beds') });
    check('the initiative is listed', true);
    await shoot(page, 'collaborations-tab-list');
  });

  await step('Alice opens the initiative, and adds a fund to it', async () => {
    const { page } = alice;
    await click(page, 'Build raised beds', { selector: 'h3' });
    await sees(page, 'No flows yet');
    await addFlow(alice, 'Funding', 'Lumber fund', {
      shot: 'add-flow-dialog',
      setup: async (p) => {
        await fill(p, '#fund-name', 'Lumber fund');
        await fill(p, '#fund-desc', 'Untreated cedar boards and screws for six beds.');
        await fill(p, '#fund-goal', 300);
        await click(p, 'Launch Fund', { selector: '[role=dialog] button' });
      },
    });
    await openFlow(page, 'Lumber fund');
    await act(alice, () => click(page, 'Open the fund'), { until: () => sees(page, 'Contribute') });
    await fill(page, 'input[placeholder="Amount in credits"]', 40);
    await act(alice, () => click(page, 'Contribute'), { until: () => sees(page, 'Your contribution') });
    check('Alice contributed to the fund', await sees(page, '40'));
    await shoot(page, 'funding-tool');
  });

  await step('Alice adds a ranking vote, and ranks its proposals', async () => {
    const { page } = alice;
    await click(page, 'Build raised beds', { selector: 'nav button' });
    await addFlow(alice, 'Ranking Vote', 'Which beds first?', {
      setup: async (p) => {
        await fill(p, 'input[placeholder="What are people deciding on?"]', 'Which beds do we build first?');
        await click(p, 'Create', { selector: '[role=dialog] button' });
      },
    });
    await openFlow(page, 'Which beds first?');
    for (const proposal of ['Herbs by the gate', 'Tomatoes in the sun', 'Squash at the back']) {
      await fill(page, 'input[placeholder="Add a new proposal…"]', proposal);
      await act(alice, () => click(page, 'Add', { selector: 'button[class*=addBtn]' }), { until: () => sees(page, proposal) });
    }
    check('the proposals are listed', true);
    await shoot(page, 'ranking-vote-tool');
  });

  await step('Alice adds a task board, and a task she takes on', async () => {
    const { page } = alice;
    await click(page, 'Build raised beds', { selector: 'nav button' });
    await addFlow(alice, 'Task Board', 'Work days');
    await openFlow(page, 'Work days');
    await click(page, 'Add task');
    await fill(page, 'input[placeholder="Task title *"]', 'Buy cedar boards');
    await act(alice, () => click(page, 'Add', { selector: 'button[class*=btnConfirm]' }), { until: () => sees(page, 'Buy cedar boards') });
    await act(alice, () => click(page, 'Claim'), { until: () => sees(page, 'You') });
    check('the task is Alice\'s', true);
    await shoot(page, 'task-board-tool');
  });

  await step('The flow tree, and the bin', async () => {
    const { page } = alice;
    await click(page, 'Build raised beds', { selector: 'nav button' });
    await sees(page, 'Work days');
    await shoot(page, 'collaboration-flow-tree');
    await openFlow(page, 'Work days');
    await click(page, 'Move to bin');
    // The flow goes to the bin, and the app back to the list.
    await act(alice, () => click(page, 'Move to bin', { selector: '[role=dialog] button' }), {
      until: () => page.waitForFunction(() => !document.body.innerText.includes('Work days'), { timeout: 60000 }),
    });
    await (await page.waitForSelector('[aria-label="Add a flow"]', { visible: true })).click();
    await click(page, 'From the bin', { selector: '[role=dialog] button' });
    await sees(page, 'Put it here');
    await shoot(page, 'add-flow-bin');
    await act(alice, () => click(page, 'Put it here', { selector: '[role=dialog] button' }), {
      until: () => page.waitForSelector('[role=dialog]', { hidden: true, timeout: 60000 }),
    });
    check('a flow moved to the bin, and back', await sees(page, 'Work days'));
  });

  await step('Bob joins the initiative as a guest, and contributes to its fund', async () => {
    const { page } = bob;
    await bob.page.bringToFront();
    await click(page, 'Collaborations');
    await click(page, 'Build raised beds', { selector: 'h3' });
    await approving(bob, () => click(page, 'Join', { selector: 'button.edit-button' }));
    await sees(page, 'Lumber fund');
    await openFlow(page, 'Lumber fund');
    await approving(bob, () => click(page, 'Join', { selector: 'button.edit-button' }));
    await fill(page, 'input[placeholder="Amount in credits"]', 10);
    await act(bob, () => click(page, 'Contribute'), { until: () => sees(page, 'Your contribution') });
    check('Bob contributed: the fund has 50, from 2 contributors', await sees(page, '50'));
    await alice.page.bringToFront();
  });
} catch {
  // a failed step stops the test: what follows needs it
} finally {
  await browser.close();
}
console.log(failed() ? `${failed()} failed` : 'all passed');
process.exit(failed() ? 1 : 0);
