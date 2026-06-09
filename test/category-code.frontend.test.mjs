import test from 'node:test';
import assert from 'node:assert/strict';
import {
  startStack,
  resetSeedCache,
  ensureEntity,
  formBodyFor,
  frontendPostForm,
  frontendGet,
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

test(`${ENTITY}: GET /new renders a form`, async () => {
  const r = await frontendGet(stack, BASE + '/new');
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /<form[^>]+method="POST"/);
  assert.match(html, new RegExp('action="' + BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/new"'));
});

test(`${ENTITY}: POST /new with valid form redirects to detail`, async () => {
  const body = await formBodyFor(stack, ENTITY);
  const r = await frontendPostForm(stack, BASE + '/new', body);
  assert.equal(r.status, 303);
  const loc = r.headers.get('location');
  assert.ok(loc && loc.startsWith(BASE + '/'), 'expected redirect to ' + BASE + '/<id>, got ' + loc);
});

test(`${ENTITY}: POST /new with empty form returns 400 with role=alert`, async () => {
  const r = await frontendPostForm(stack, BASE + '/new', '');
  // Only assert error when the entity has required fields — otherwise an
  // empty POST is a perfectly valid create and the mock API returns 201.
  if (r.status === 303) return;
  assert.equal(r.status, 400);
  const html = await r.text();
  assert.match(html, /role="alert"/);
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

test(`${ENTITY}: GET edit renders pre-filled form`, async () => {
  const id = await ensureEntity(stack, ENTITY);
  const r = await frontendGet(stack, BASE + '/' + id + '/edit');
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /<form[^>]+method="POST"/);
});

test(`${ENTITY}: POST edit redirects back to detail`, async () => {
  const id = await ensureEntity(stack, ENTITY);
  const body = await formBodyFor(stack, ENTITY);
  const r = await frontendPostForm(stack, BASE + '/' + id + '/edit', body);
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), BASE + '/' + id);
});

test(`${ENTITY}: GET delete renders confirmation form`, async () => {
  const id = await ensureEntity(stack, ENTITY);
  const r = await frontendGet(stack, BASE + '/' + id + '/delete');
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /<form[^>]+method="POST"/);
  assert.match(html, /Confirm Delete/);
});

test(`${ENTITY}: POST delete redirects to list`, async () => {
  const id = await ensureEntity(stack, ENTITY);
  const r = await frontendPostForm(stack, BASE + '/' + id + '/delete', '');
  assert.equal(r.status, 303);
  assert.equal(r.headers.get('location'), BASE);
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

void PLURALS;
