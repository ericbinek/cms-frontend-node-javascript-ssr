import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startStack,
  resetSeedCache,
  ensureEntity,
  frontendGet,
  seedWith,
  PLURALS,
} from './_helpers.mjs';

const ENTITY = "CategoryCode";
const BASE = "/category-codes";

let stack;
test.before(async () => {
  stack = await startStack();
});
test.after(async () => {
  await stack.stop();
});
test.beforeEach(() => {
  resetSeedCache();
});

test(`${ENTITY}: GET list renders semantic page`, async () => {
  await ensureEntity(stack, ENTITY);
  const r = await frontendGet(stack, BASE);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /<table\b/);
  assert.match(html, /<caption>/);
  assert.match(html, new RegExp(ENTITY));
});

test(`${ENTITY}: GET detail returns 200 with article markup`, async () => {
  const id = await ensureEntity(stack, ENTITY);
  const r = await frontendGet(stack, BASE + '/' + id);
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /<article\b/);
  assert.match(html, /<dl>/);
  assert.match(html, new RegExp(id));
});

test(`${ENTITY}: write routes are not exposed (read-only frontend)`, async () => {
  // create/edit/delete live in the admin layer; the public frontend has no forms.
  const id = await ensureEntity(stack, ENTITY);
  for (const p of [BASE + '/new', BASE + '/' + id + '/edit', BASE + '/' + id + '/delete']) {
    const r = await frontendGet(stack, p);
    assert.notEqual(r.status, 200, p + ' should not be a live page');
    const html = await r.text();
    assert.doesNotMatch(html, /<form/, p + ' should not render a form');
  }
});

test(`${ENTITY}: GET detail with non-UUID id returns 400 with alert`, async () => {
  const r = await frontendGet(stack, BASE + '/not-a-uuid');
  assert.equal(r.status, 400);
  const html = await r.text();
  assert.match(html, /role="alert"/);
});

test(`${ENTITY}: GET detail of missing id renders 404 page`, async () => {
  const r = await frontendGet(stack, BASE + '/00000000-0000-0000-0000-000000000000');
  assert.equal(r.status, 404);
  const html = await r.text();
  assert.match(html, /role="alert"/);
});

test(`${ENTITY}: navigation includes self link with aria-current`, async () => {
  await ensureEntity(stack, ENTITY);
  const r = await frontendGet(stack, BASE);
  const html = await r.text();
  assert.match(html, /aria-current="page"/);
});

test(`${ENTITY}: list view paginates with previous and next navigation`, async () => {
  await seedWith(stack, ENTITY, {});
  await seedWith(stack, ENTITY, {});
  await seedWith(stack, ENTITY, {});
  const first = await frontendGet(stack, BASE + '?limit=2&offset=0');
  assert.equal(first.status, 200);
  const firstHtml = await first.text();
  assert.match(firstHtml, /rel="next"/);
  assert.match(firstHtml, /offset=2/);
  assert.doesNotMatch(firstHtml, /rel="prev"/);

  const second = await frontendGet(stack, BASE + '?limit=2&offset=2');
  assert.equal(second.status, 200);
  const secondHtml = await second.text();
  assert.match(secondHtml, /rel="prev"/);
});

test(`${ENTITY}: stored javascript: and data: URLs render as inert text, never as links`, async () => {
  const jsId = await seedWith(stack, ENTITY, { "url": 'javascript:alert(1)' });
  const jsHtml = await (await frontendGet(stack, BASE + '/' + jsId)).text();
  assert.match(jsHtml, /javascript:alert\(1\)/);
  assert.doesNotMatch(jsHtml, /href="javascript:/i);

  const dataId = await seedWith(stack, ENTITY, { "url": 'data:text/html,x' });
  const dataHtml = await (await frontendGet(stack, BASE + '/' + dataId)).text();
  assert.match(dataHtml, /data:text\/html,x/);
  assert.doesNotMatch(dataHtml, /href="data:/i);
});

test(`${ENTITY}: stored http(s) URL renders as a clickable link`, async () => {
  const id = await seedWith(stack, ENTITY, { "url": 'https://example.com/profile' });
  const html = await (await frontendGet(stack, BASE + '/' + id)).text();
  assert.match(html, /href="https:\/\/example\.com\/profile"/);
});

void PLURALS;
