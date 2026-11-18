// The browser side of the e2e test: users with their own browser profile and
// passkey, the node's approval window, and small helpers to act on the app.
import puppeteer from 'puppeteer-core';

export const NODE_URL = process.env.NODE_URL;
export const APP_URL = process.env.APP_URL;
const SHOTS = process.env.SHOTS ? new URL('../../docs/screenshots/', import.meta.url) : null;
const PHONE = { width: 434, height: 935 }; // the docs' screenshots are phone-sized

export const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? '/usr/bin/google-chrome',
  headless: true,
  args: ['--no-sandbox'],
});

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

let failures = 0;
export function check(what, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${!ok && detail ? `: ${detail}` : ''}`);
  if (!ok) failures++;
}
export const failed = () => failures;

const users = [];
const DEBUG = process.env.E2E_DEBUG; // a directory for screenshots of a failed step

/** Runs a step; a step that throws fails, and stops the test (what follows needs it). */
export async function step(what, fn) {
  try {
    await fn();
  } catch (e) {
    check(what, false, e.message.split('\n')[0]);
    if (DEBUG) {
      for (const user of users) {
        await user.page.screenshot({ path: `${DEBUG}/${user.name}.png`, fullPage: true }).catch(() => {});
      }
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** Gives a page a virtual authenticator: the user's phone, which approves every request. */
async function addAuthenticator(page) {
  const cdp = await page.createCDPSession();
  await cdp.send('WebAuthn.enable', { enableUI: false });
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true,
      isUserVerified: true, automaticPresenceSimulation: true,
    },
  });
  return { cdp, authenticatorId };
}

function watch(page, name) {
  page.on('pageerror', (e) => console.log(`  [${name}] page error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) console.log(`  [${name}] console: ${m.text()}`);
  });
}

/**
 * A user: their own browser profile (the app's key, the node's session), the
 * app's page, and a passkey shared by every page of theirs (a synced phone).
 */
export async function newUser(name) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport(PHONE);
  watch(page, name);
  const passkey = await addAuthenticator(page);
  const user = { name, context, page, passkey, popups: new Set() };
  users.push(user);
  return user;
}

/** Copies the user's passkeys to another page's authenticator. */
async function syncPasskeys(from, to) {
  const { credentials } = await from.cdp.send('WebAuthn.getCredentials', { authenticatorId: from.authenticatorId });
  for (const credential of credentials) await to.cdp.send('WebAuthn.addCredential', { authenticatorId: to.authenticatorId, credential });
}

// ---------------------------------------------------------------------------
// The node's approval window
// ---------------------------------------------------------------------------

/**
 * Clicks something that opens the node's approval window, and approves there:
 * creating the user's identity the first time (create: their name), signing
 * in otherwise. allow: functions to let the app call silently.
 */
export async function approving(user, click, options = {}) {
  const t = await clickOpening(user, click, 30000);
  if (!t) throw new Error('the approval window did not open');
  return await approveIn(user, t, options);
}

/**
 * Clicks, and approves on the node's approval window if it opens (an action
 * the user did not let the app make silently). Then waits for until(), if given.
 */
export async function act(user, click, { until = null, ...options } = {}) {
  const t = await clickOpening(user, click, 4000);
  if (t) await approveIn(user, t, options);
  if (until) await until();
  return !!t;
}

/** Clicks, and resolves with the approval window it opened, or null if none opened in time. */
async function clickOpening(user, click, timeout) {
  const target = browser.waitForTarget(
    (t) => t.browserContext() === user.context && t.url().includes('/approve.html') && !user.popups.has(t),
    { timeout }).catch(() => null);
  await click();
  const t = await target;
  if (t) user.popups.add(t);
  return t;
}

async function approveIn(user, t, { create = null, allow = [], shot = null } = {}) {
  const popup = await t.page();
  watch(popup, `${user.name}'s approval`);
  const passkey = await addAuthenticator(popup);
  await syncPasskeys(user.passkey, passkey);
  const shown = (sel) => `!document.querySelector('${sel}').classList.contains('hidden')`;
  await popup.waitForFunction(`${shown('#buttons')} || ${shown('#sign-in-box')} || ${shown('#renew-box')}`, { timeout: 90000 });
  if (await popup.$eval('#sign-in-box', (b) => !b.classList.contains('hidden'))) {
    if (create) {
      await popup.type('#new-name', create);
      await popup.click('#create-identity');
    } else {
      await popup.click('#sign-in');
    }
    await popup.waitForSelector('#buttons:not(.hidden)', { timeout: 90000 });
    if (create) await syncPasskeys(passkey, user.passkey);
  }
  for (const fn of allow) {
    const box = await popup.$(`#perm-writes input[value^="${fn}("]`);
    if (box && !(await box.evaluate((b) => b.checked))) await box.click();
  }
  const title = await popup.$eval('#title', (n) => n.textContent);
  if (shot) await shoot(popup, shot);
  await popup.click('#approve');
  return title;
}

// ---------------------------------------------------------------------------
// Acting on the app
// ---------------------------------------------------------------------------

/** An element by its text (and an optional CSS selector), once it shows. */
export async function find(page, text, { selector = '*', timeout = 30000 } = {}) {
  return await page.waitForSelector(`${selector}::-p-text(${text})`, { visible: true, timeout });
}

/** Clicks the button (or link) whose text has this, once it shows and is enabled. */
export async function click(page, text, { selector = 'button', timeout = 30000 } = {}) {
  // React may re-render the element between finding it and clicking it: find it again.
  for (let attempt = 1; ; attempt++) {
    const handle = await page.waitForSelector(`${selector}:not([disabled])::-p-text(${text})`, { visible: true, timeout });
    try {
      await handle.click();
      return;
    } catch (e) {
      if (attempt === 3 || !/detached|not clickable|not an Element/.test(e.message)) throw e;
    }
  }
}

/** Types into a field, replacing what it had. */
export async function fill(page, selector, value) {
  const field = await page.waitForSelector(selector, { visible: true });
  await field.click({ clickCount: 3 });
  await field.press('Backspace');
  await field.type(String(value));
}

/** Waits until the page shows this text. */
export async function sees(page, text, timeout = 60000) {
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text);
  return true;
}

/** Saves a screenshot for the docs, when SHOTS is set. */
export async function shoot(page, name, clip = null) {
  if (!SHOTS) return;
  await new Promise((resolve) => setTimeout(resolve, 300)); // let transitions settle
  await page.screenshot({ path: new URL(`${name}.png`, SHOTS).pathname, ...(clip ? { clip } : {}) });
}
