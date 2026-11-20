// The one-file contracts: the profile, a collaboration, and each flow. Each
// is deployed and used once; the collaboration is also joined as a guest,
// as the app joins collaborations and flows.
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { newAgent, sourceOf, deploy, joined, lower, url } from './lib.mjs';

let a, b;
before(async () => { [a, b] = await Promise.all([newAgent(), newAgent()]); });
after(() => { a?.close(); b?.close(); });

/** Deploys a one-file contract as a. */
const deployed = async (file, constructor = {}) => deploy(a, await sourceOf(file), { constructor });

describe('Profile', () => {
  it('keeps its owner\'s name and photo', async () => {
    const p = await deployed('Profile.sol');
    await a.write(p, 'setProfile', { firstName: 'Dana', lastName: 'Levi', userPhoto: 'data:,' });
    assert.deepEqual(await a.read(p, 'getProfile'), { firstName: 'Dana', lastName: 'Levi', userPhoto: 'data:,' });
  });
});

describe('Collaboration', () => {
  it('keeps a tree of flows that guests add to', async () => {
    const source = await sourceOf('Collaboration.sol');
    const c = await deploy(a, source, { constructor: { kind_: 0, title_: 'Garden', communityId_: '0xcommunity' } });
    await a.write(c, 'addFlow', { id: 'f1', flowType: 'discussion', flowTitle: 'Talk', node: url, parent: '' });
    await b.join(c, url, a.agent, { source, guest: true });
    assert.ok(await joined(b, c, 'getFlows'), 'b joined as a guest');
    await b.write(c, 'addFlow', { id: 'f2', flowType: 'qa', flowTitle: 'Questions', node: url, parent: 'f1' });
    const flows = await a.read(c, 'getFlows');
    assert.deepEqual(flows.map((f) => [f.id, f.parent]), [['f1', ''], ['f2', 'f1']]);
    // b neither added f1 nor created the collaboration.
    await assert.rejects(b.write(c, 'removeFlow', { id: 'f1' }), /only who added the flow/);
    // Removing a flow bins its branch: the flow is marked, and what is under it goes with it.
    await a.write(c, 'removeFlow', { id: 'f1' });
    const binned = Object.fromEntries((await a.read(c, 'getFlows')).map((f) => [f.id, f.binned]));
    assert.deepEqual(binned, { f1: true, f2: false });
    await assert.rejects(a.write(c, 'removeFlow', { id: 'f2' }), /in the bin already/);
    await a.write(c, 'restoreFlow', { id: 'f1', parent: '' });
    assert.ok((await a.read(c, 'getFlows')).every((f) => !f.binned));
  });
});

describe('flows', () => {
  it('ConcernsFlow: adds a concern and votes on it', async () => {
    const f = await deployed('ConcernsFlow.sol');
    const id = await a.write(f, 'addConcern', { title: 'Noise', description: 'At night' });
    await a.write(f, 'vote', { concernId: id, value: 1 });
    const [concern] = await a.read(f, 'getConcerns');
    assert.equal(concern.title, 'Noise');
    assert.deepEqual(concern.voters.map(lower), [lower(a.agent)]);
  });

  it('DiscussionFlow: adds a comment and a reply', async () => {
    const f = await deployed('DiscussionFlow.sol');
    const id = await a.write(f, 'addComment', { text: 'Hello', parent: '' });
    await a.write(f, 'addComment', { text: 'Hi', parent: id });
    const comments = await a.read(f, 'getComments');
    assert.deepEqual(comments.map((c) => c.parent), ['', id]);
    assert.equal(lower(comments[0].author), lower(a.agent));
  });

  it('DocumentFlow: adds an element', async () => {
    const f = await deployed('DocumentFlow.sol', { title: 'Charter' });
    await a.write(f, 'addElement', { elementType: 1, parent: '', text: 'Purpose' });
    assert.ok((await a.read(f, 'getElements')).some((e) => e.text === 'Purpose'));
  });

  it('FundingFlow: keeps its fund and budget items', async () => {
    const f = await deployed('FundingFlow.sol', { name: 'Garden', description: 'Seeds', goal: '500000000', communityId: '0xcommunity' });
    assert.equal((await a.read(f, 'getFund')).name, 'Garden');
    await a.write(f, 'addItem', { name: 'Tools' });
    assert.deepEqual((await a.read(f, 'getItems')).map((i) => i.name), ['Tools']);
  });

  it('QAFlow: adds a question and an answer', async () => {
    const f = await deployed('QAFlow.sol');
    const q = await a.write(f, 'addQuestion', { text: 'When?' });
    await a.write(f, 'addAnswer', { questionId: q, text: 'Monday' });
    assert.equal((await a.read(f, 'getQuestions')).length, 1);
    assert.equal((await a.read(f, 'getAnswers'))[0].text, 'Monday');
  });

  it('RankingFlow: ranks proposals', async () => {
    const f = await deployed('RankingFlow.sol', { topic_: 'Lunch', description: '' });
    const p1 = await a.write(f, 'addProposal', { text: 'Pizza' });
    const p2 = await a.write(f, 'addProposal', { text: 'Soup' });
    await a.write(f, 'setMyRanking', { order: [p2, p1] });
    assert.deepEqual((await a.read(f, 'getRankings'))[0].order, [p2, p1]);
    assert.equal((await a.read(f, 'getTopic')).topic, 'Lunch');
  });

  it('RolesFlow: adds a role and joins it', async () => {
    const f = await deployed('RolesFlow.sol');
    const id = await a.write(f, 'addRole', { name: 'Treasurer', description: '' });
    await a.write(f, 'joinRole', { roleId: id });
    const [role] = await a.read(f, 'getRoles');
    assert.equal(role.name, 'Treasurer');
  });

  it('SchedulingFlow: keeps each participant\'s slots', async () => {
    const f = await deployed('SchedulingFlow.sol', {
      title: 'Meeting', description: '', startDate: '2026-01-01', endDate: '2026-01-07',
      dailyStart: '09:00', dailyEnd: '18:00', slotMinutes: 30,
    });
    await a.write(f, 'setMySelection', { slots: [1, 2, 3] });
    const [selection] = await a.read(f, 'getSelections');
    assert.deepEqual(selection.slots.map(Number), [1, 2, 3]);
    assert.equal((await a.read(f, 'getRange')).title, 'Meeting');
  });

  it('ScoringFlow: scores options', async () => {
    const f = await deployed('ScoringFlow.sol', { topic_: 'Venue', description: '' });
    const id = await a.write(f, 'addOption', { text: 'Park' });
    await a.write(f, 'setMyScores', { optionIds: [id], values: [4] });
    const [scores] = await a.read(f, 'getScores');
    assert.deepEqual(scores.values.map(Number), [4]);
  });

  it('TaskBoardFlow: adds a task and claims it', async () => {
    const f = await deployed('TaskBoardFlow.sol');
    const id = await a.write(f, 'addTask', { title: 'Water', description: '' });
    await a.write(f, 'claimTask', { id });
    const [task] = await a.read(f, 'getTasks');
    assert.equal(lower(task.owner), lower(a.agent));
  });
});
