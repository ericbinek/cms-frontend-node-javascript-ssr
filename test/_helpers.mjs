import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMockApi } from './_mock-api.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

export const PLURALS = {
  "BlogPosting": "blog-postings",
  "Person": "persons",
  "WebPage": "web-pages",
  "ImageObject": "image-objects",
  "CategoryCode": "category-codes",
  "CategoryCodeSet": "category-code-sets",
  "DefinedTerm": "defined-terms",
  "DefinedTermSet": "defined-term-sets",
  "Comment": "comments",
  "WebSite": "web-sites"
};
export const SAMPLES = {
  "BlogPosting": {
    "headline": "sample",
    "articleBody": "sample",
    "author": {
      "__ref": "Person"
    }
  },
  "Person": {
    "name": "sample"
  },
  "WebPage": {
    "headline": "sample"
  },
  "ImageObject": {
    "contentUrl": "https://example.com/x"
  },
  "CategoryCode": {
    "name": "sample",
    "codeValue": "sample",
    "inCodeSet": {
      "__ref": "CategoryCodeSet"
    }
  },
  "CategoryCodeSet": {
    "name": "sample"
  },
  "DefinedTerm": {
    "name": "sample",
    "termCode": "sample",
    "inDefinedTermSet": {
      "__ref": "DefinedTermSet"
    }
  },
  "DefinedTermSet": {
    "name": "sample"
  },
  "Comment": {
    "text": "sample",
    "author": {
      "__ref": "Person"
    },
    "about": {
      "__ref": "BlogPosting"
    }
  },
  "WebSite": {
    "name": "sample",
    "url": "https://example.com/x"
  }
};

let portCounter = 14000 + Math.floor(Math.random() * 1000);

export async function startFrontend({ apiBaseUrl }) {
  const port = portCounter++;
  const child = spawn(process.execPath, ['src/server.mjs'], {
    cwd: REPO_ROOT,
    env: { ...process.env, PORT: String(port), API_BASE_URL: apiBaseUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stderr.on('data', () => {});
  const baseUrl = 'http://127.0.0.1:' + port;
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(baseUrl + '/health');
      if (r.ok) {
        return {
          baseUrl,
          async stop() {
            child.kill('SIGTERM');
            await new Promise((res) => child.on('exit', res));
          },
        };
      }
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 50));
  }
  child.kill('SIGTERM');
  throw new Error('Frontend did not start within 5 seconds');
}

export async function startStack() {
  const mock = await startMockApi();
  const frontend = await startFrontend({ apiBaseUrl: mock.baseUrl });
  return {
    apiBaseUrl: mock.baseUrl,
    frontendBaseUrl: frontend.baseUrl,
    async stop() {
      await frontend.stop();
      await mock.stop();
    },
  };
}

function encodeOne(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if (value.__ref) return '__needs_resolve__';
    if (value['@type'] === 'Language') return String(value.alternateName || '');
    return JSON.stringify(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

async function resolveRefs(stack, sample) {
  const resolved = {};
  for (const [key, value] of Object.entries(sample)) {
    if (Array.isArray(value)) {
      const out = [];
      for (const v of value) {
        if (v && typeof v === 'object' && v.__ref) {
          out.push(await ensureEntity(stack, v.__ref));
        } else {
          out.push(v);
        }
      }
      resolved[key] = out;
    } else if (value && typeof value === 'object' && value.__ref) {
      resolved[key] = await ensureEntity(stack, value.__ref);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

const seededIds = new Map();

export async function ensureEntity(stack, entityName) {
  if (seededIds.has(entityName)) return seededIds.get(entityName);
  const sample = await resolveRefs(stack, SAMPLES[entityName]);
  // Post directly to mock API to seed; bypassing the frontend keeps test setup deterministic.
  const r = await fetch(stack.apiBaseUrl + '/' + PLURALS[entityName], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sample),
  });
  if (r.status !== 201) {
    const text = await r.text();
    throw new Error('ensureEntity(' + entityName + ') failed: ' + r.status + ' ' + text);
  }
  const item = await r.json();
  seededIds.set(entityName, item.id);
  return item.id;
}

export function resetSeedCache() {
  seededIds.clear();
}

// Seed one fresh entity with chosen field overrides, bypassing the seed cache.
// Used to plant a hostile field value (e.g. a "javascript:" URL) and check how
// the frontend renders it back.
export async function seedWith(stack, entityName, overrides) {
  const sample = await resolveRefs(stack, SAMPLES[entityName]);
  const r = await fetch(stack.apiBaseUrl + '/' + PLURALS[entityName], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...sample, ...overrides }),
  });
  if (r.status !== 201) {
    const text = await r.text();
    throw new Error('seedWith(' + entityName + ') failed: ' + r.status + ' ' + text);
  }
  return (await r.json()).id;
}

export async function formBodyFor(stack, entityName) {
  const sample = await resolveRefs(stack, SAMPLES[entityName]);
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(sample)) {
    if (Array.isArray(value)) {
      for (const v of value) sp.append(key, encodeOne(v));
    } else {
      sp.append(key, encodeOne(value));
    }
  }
  return sp.toString();
}

export async function frontendPostForm(stack, path, body) {
  const r = await fetch(stack.frontendBaseUrl + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    redirect: 'manual',
  });
  return r;
}

export async function frontendGet(stack, path) {
  return fetch(stack.frontendBaseUrl + path, { redirect: 'manual' });
}

export const ENTITIES = ["BlogPosting","Person","WebPage","ImageObject","CategoryCode","CategoryCodeSet","DefinedTerm","DefinedTermSet","Comment","WebSite"];
