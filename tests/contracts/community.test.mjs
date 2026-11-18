// The community: Community (the root ibc deploys and joins) and its parts,
// which members call by address. Two agents: a creates, b joins.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { newAgent, communitySource, deploy, joined, lower, url } from './lib.mjs';

const UNIT = 1_000_000n; // the currency's amounts have six decimals
const n = (value) => BigInt(value);

async function createCommunity(agent, source, openJoin) {
  const c = await deploy(agent, source, {
    contract: 'Community',
    name: 'communities-community',
    constructor: {
      name: 'Test', description: 'A test community', node: url, profile: '0xprofile',
      initialBalance: String(1000n * UNIT), starterPolicies: true, openJoin,
    },
  });
  return { id: c, ...(await agent.read(c, 'getParts')) };
}

describe('a web-of-trust community', () => {
  let a, b, source, c;

  before(async () => {
    [a, b] = await Promise.all([newAgent(), newAgent()]);
    source = await communitySource();
    c = await createCommunity(a, source, false);
  });
  after(() => { a?.close(); b?.close(); });

  it('compiles, with the root deciding joins', async () => {
    const compiled = await a.compile(source, 'Community');
    assert.match(compiled.contract, /Community$/);
    assert.deepEqual([...compiled.membership].sort(), ['approve_guest', 'approve_partner']);
  });

  it('keeps its properties, and lists its parts', async () => {
    const props = await a.read(c.id, 'getProperties');
    assert.equal(props.name, 'Test');
    assert.equal(lower(props.creator), lower(a.agent));
    assert.equal(props.openJoin, false);
    for (const part of [c.membership, c.collaborations, c.currency]) assert.match(part, /^0x[0-9a-fA-F]{40}$/);
  });

  it('makes its creator the first member, with an account', async () => {
    const members = await a.read(c.id, 'getMembers', {}, { at: c.membership });
    assert.equal(members.length, 1);
    assert.equal(lower(members[0].agent), lower(a.agent));
    assert.equal(members[0].profile, '0xprofile');
    const accounts = await a.read(c.id, 'getAccounts', {}, { at: c.currency });
    assert.equal(accounts.length, 1);
    assert.equal(accounts[0].id, lower(a.agent));
    assert.equal(n(accounts[0].balance), 1000n * UNIT);
  });

  it('starts with the starter policies, and its settlement state', async () => {
    const policies = await a.read(c.id, 'getPolicies', {}, { at: c.currency });
    assert.deepEqual(policies.map((p) => p.name), ['Personal Minting', 'Demurrage']);
    const currency = await a.read(c.id, 'getCurrency', {}, { at: c.currency });
    assert.equal(Number(currency.tickSeconds), 86400);
    assert.equal(n(currency.initialBalance), 1000n * UNIT);
  });

  it('lists a member\'s collaboration, once', async () => {
    await a.write(c.id, 'addCollaboration', { id: 'collab1', kind: 2, title: 'A rule', description: '', detail: 'harm', node: url }, { at: c.collaborations });
    const list = await a.read(c.id, 'getCollaborations', {}, { at: c.collaborations });
    assert.equal(list.length, 1);
    assert.equal(lower(list[0].creator), lower(a.agent));
    assert.equal(list[0].detail, 'harm');
    await assert.rejects(
      a.write(c.id, 'addCollaboration', { id: 'collab1', kind: 0, title: 't', description: '', detail: '', node: url }, { at: c.collaborations }),
      /listed already/);
  });

  it('opens a fund, and records payments into it', async () => {
    assert.equal(await a.write(c.id, 'createFundAccount', { id: 'fund1', name: 'Garden', owner: a.agent }, { at: c.currency }), true);
    assert.equal(await a.write(c.id, 'createFundAccount', { id: 'fund1', name: 'Garden', owner: a.agent }, { at: c.currency }), false);
    await a.write(c.id, 'pay', { to: 'fund1', amount: String(250n * UNIT) }, { at: c.currency });
    const contributions = await a.read(c.id, 'getContributions', { fundId: 'fund1' }, { at: c.currency });
    assert.equal(contributions.length, 1);
    assert.equal(lower(contributions[0].from), lower(a.agent));
    const accounts = await a.read(c.id, 'getAccounts', {}, { at: c.currency });
    assert.equal(n(accounts[0].balance), 750n * UNIT);
    assert.equal(n(accounts[1].balance), 250n * UNIT);
    await assert.rejects(a.write(c.id, 'pay', { to: 'fund1', amount: String(9999n * UNIT) }, { at: c.currency }), /not enough balance/);
  });

  it('keeps commitments and the members\' preferences', async () => {
    const id = await a.write(c.id, 'createPolicy', {
      name: 'Gift', description: '', source: { kind: 1, account: lower(a.agent) }, destination: { kind: 1, account: 'fund1' },
      mode: 0, rateType: 1, selfRate: String(5n * UNIT),
    }, { at: c.currency });
    assert.equal(Number(id), 2);
    await assert.rejects(a.write(c.id, 'createPolicy', {
      name: 'Theft', description: '', source: { kind: 1, account: 'fund1' }, destination: { kind: 0, account: '' },
      mode: 0, rateType: 1, selfRate: '1',
    }, { at: c.currency }), /from your own account/);
    await a.write(c.id, 'setPolicyPreference', { policyId: 0, value: String(7n * UNIT) }, { at: c.currency });
    const minting = (await a.read(c.id, 'getPolicies', {}, { at: c.currency })).find((p) => Number(p.id) === 0);
    assert.equal(minting.hasMyPreference, true);
    assert.equal(n(minting.currentRate), 7n * UNIT);
    await a.write(c.id, 'setPolicyDetails', { policyId: 2, name: 'Gift 2', description: 'x' }, { at: c.currency });
    await a.write(c.id, 'setCommitmentRate', { policyId: 2, value: '1' }, { at: c.currency });
    await a.write(c.id, 'deletePolicy', { policyId: 2 }, { at: c.currency });
    assert.equal((await a.read(c.id, 'getPolicies', {}, { at: c.currency })).length, 2);
    await a.write(c.id, 'updateBalances', {}, { at: c.currency });
  });

  it('lets anyone join the agreement, as a guest', async () => {
    await b.join(c.id, url, a.agent, { source, guest: true, contractName: 'Community' });
    assert.ok(await joined(b, c.id, 'getProperties'), 'b can read the community');
  });

  it('keeps non-members out', async () => {
    await assert.rejects(b.write(c.id, 'pay', { to: 'fund1', amount: '1' }, { at: c.currency }), /members only/);
    await assert.rejects(b.write(c.id, 'createFundAccount', { id: 'f', name: 'F', owner: b.agent }, { at: c.currency }), /members only/);
    await assert.rejects(
      b.write(c.id, 'addCollaboration', { id: 'x', kind: 0, title: 't', description: '', detail: '', node: url }, { at: c.collaborations }),
      /members only/);
    await assert.rejects(b.write(c.id, 'openPersonalAccount', { agent: b.agent }, { at: c.currency }), /only the membership/);
    await assert.rejects(b.write(c.id, 'addFounder', { agent: b.agent, node: url, profile: '' }, { at: c.membership }), /only the community/);
  });

  it('admits a nominee once they and their vouchers approve each other', async () => {
    await b.write(c.id, 'join', { node: url, profile: '0xb' }, { at: c.membership });
    let nominations = await a.read(c.id, 'getNominations', {}, { at: c.membership });
    assert.equal(nominations.length, 1);
    assert.equal(lower(nominations[0].nominee), lower(b.agent));
    assert.deepEqual(nominations[0].vouchers.map(lower), [lower(a.agent)]);
    await a.write(c.id, 'approve', { other: b.agent }, { at: c.membership });
    nominations = await a.read(c.id, 'getNominations', {}, { at: c.membership });
    assert.deepEqual([nominations[0].vouchedFor[0], nominations[0].nomineeApproved[0]], [true, false]);
    await b.write(c.id, 'approve', { other: a.agent }, { at: c.membership });
    assert.equal((await a.read(c.id, 'getMembers', {}, { at: c.membership })).length, 2);
    assert.equal((await a.read(c.id, 'getNominations', {}, { at: c.membership })).length, 0);
    const accounts = await a.read(c.id, 'getAccounts', {}, { at: c.currency });
    assert.ok(accounts.some((x) => x.id === lower(b.agent) && n(x.balance) === 1000n * UNIT), 'b has an account');
    await b.write(c.id, 'pay', { to: lower(a.agent), amount: String(UNIT) }, { at: c.currency });
  });

  it('lets a nominee or a voucher cancel a nomination', async () => {
    const d = await newAgent();
    try {
      await d.join(c.id, url, a.agent, { source, guest: true, contractName: 'Community' });
      assert.ok(await joined(d, c.id, 'getProperties'));
      await d.write(c.id, 'join', { node: url, profile: '' }, { at: c.membership });
      await a.write(c.id, 'disapprove', { other: d.agent }, { at: c.membership });
      assert.equal((await a.read(c.id, 'getNominations', {}, { at: c.membership })).length, 0);
    } finally {
      d.close();
    }
  });
});

describe('an open community', () => {
  let a, b, source, c;

  before(async () => {
    [a, b] = await Promise.all([newAgent(), newAgent()]);
    source = await communitySource();
    c = await createCommunity(a, source, true);
  });
  after(() => { a?.close(); b?.close(); });

  it('makes whoever joins a member at once, with an account', async () => {
    await b.join(c.id, url, a.agent, { source, guest: true, contractName: 'Community' });
    assert.ok(await joined(b, c.id, 'getProperties'));
    await b.write(c.id, 'join', { node: url, profile: '0xb' }, { at: c.membership });
    assert.equal((await a.read(c.id, 'getMembers', {}, { at: c.membership })).length, 2);
    assert.equal((await a.read(c.id, 'getAccounts', {}, { at: c.currency })).length, 2);
    await assert.rejects(b.write(c.id, 'join', { node: url, profile: '0xb' }, { at: c.membership }), /already a member/);
  });
});
