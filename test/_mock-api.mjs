// Tiny in-memory mock of the CMS API for frontend conformance tests.
// Implements the same wire envelope ({ items, total }, { id, ...item },
// { status, error, message, details }) as the real cms-api-node target,
// but with a minimal validator (required-field check only) — enough to
// exercise the frontend's happy and error paths.

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const SCHEMAS = {
  "BlogPosting": {
    "plural": "blog-postings",
    "required": [
      "headline",
      "articleBody",
      "author"
    ]
  },
  "Person": {
    "plural": "persons",
    "required": [
      "name"
    ]
  },
  "Organization": {
    "plural": "organizations",
    "required": [
      "name"
    ]
  },
  "WebPage": {
    "plural": "web-pages",
    "required": [
      "headline"
    ]
  },
  "ImageObject": {
    "plural": "image-objects",
    "required": [
      "contentUrl"
    ]
  },
  "VideoObject": {
    "plural": "video-objects",
    "required": [
      "contentUrl"
    ]
  },
  "AudioObject": {
    "plural": "audio-objects",
    "required": [
      "contentUrl"
    ]
  },
  "CategoryCode": {
    "plural": "category-codes",
    "required": [
      "name",
      "codeValue",
      "inCodeSet"
    ]
  },
  "CategoryCodeSet": {
    "plural": "category-code-sets",
    "required": [
      "name"
    ]
  },
  "DefinedTerm": {
    "plural": "defined-terms",
    "required": [
      "name",
      "termCode",
      "inDefinedTermSet"
    ]
  },
  "DefinedTermSet": {
    "plural": "defined-term-sets",
    "required": [
      "name"
    ]
  },
  "Comment": {
    "plural": "comments",
    "required": [
      "text",
      "author",
      "about"
    ]
  },
  "WebSite": {
    "plural": "web-sites",
    "required": [
      "name",
      "url"
    ]
  },
  "SiteNavigationElement": {
    "plural": "site-navigation-elements",
    "required": [
      "name",
      "url"
    ]
  }
};
const ENTITY_BY_PLURAL = Object.fromEntries(
  Object.entries(SCHEMAS).map(([name, s]) => [s.plural, name])
);

function jsonResponse(res, status, payload) {
  if (status === 204) {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
    res.end();
    return;
  }
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function errorResponse(status, error, message, details = [], path = '') {
  return { status, error, message, details, path };
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { const e = new Error('Invalid JSON'); e.code = 'INVALID_JSON'; throw e; }
}

function validateRequired(entity, data, partial) {
  if (partial) return [];
  const missing = [];
  for (const field of SCHEMAS[entity].required) {
    const v = data[field];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (empty) missing.push(`Field "${field}" is required.`);
  }
  return missing;
}

export function createMockApi() {
  const store = Object.fromEntries(Object.keys(SCHEMAS).map((name) => [name, new Map()]));

  async function handle(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const { pathname } = url;
    const method = req.method;
    const requestPath = `${method} ${pathname}`;

    try {
      if (method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
      }
      if (method === 'GET' && pathname === '/health') {
        return jsonResponse(res, 200, { status: 'ok' });
      }

      const seg = pathname.split('/').filter(Boolean);
      if (seg.length < 1 || seg.length > 2) {
        return jsonResponse(res, 404, errorResponse(404, 'ROUTE_NOT_FOUND', 'No route matches this request.', [], requestPath));
      }
      const entity = ENTITY_BY_PLURAL[seg[0]];
      if (!entity) {
        return jsonResponse(res, 404, errorResponse(404, 'ROUTE_NOT_FOUND', 'No route matches this request.', [], requestPath));
      }

      const collection = store[entity];

      if (seg.length === 1) {
        if (method === 'GET') {
          let items = [...collection.values()];
          const sort = url.searchParams.get('sort') || 'dateCreated';
          const order = url.searchParams.get('order') === 'asc' ? 1 : -1;
          items.sort((a, b) => {
            const va = a[sort] ?? ''; const vb = b[sort] ?? '';
            return va < vb ? -1 * order : va > vb ? 1 * order : 0;
          });
          const total = items.length;
          const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
          const offset = parseInt(url.searchParams.get('offset') || '0', 10);
          return jsonResponse(res, 200, { items: items.slice(offset, offset + limit), total });
        }
        if (method === 'POST') {
          const data = await readJsonBody(req);
          const errors = validateRequired(entity, data, false);
          if (errors.length) return jsonResponse(res, 400, errorResponse(400, 'VALIDATION_ERROR', 'Invalid request data.', errors, requestPath));
          const now = new Date().toISOString();
          const item = {
            '@context': 'https://schema.org',
            '@type': entity,
            ...data,
            id: randomUUID(),
            dateCreated: now,
            dateModified: now,
          };
          collection.set(item.id, item);
          return jsonResponse(res, 201, item);
        }
        return jsonResponse(res, 405, errorResponse(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', [], requestPath));
      }

      const id = seg[1].toLowerCase();
      const current = collection.get(id);

      if (method === 'GET') {
        if (!current) return jsonResponse(res, 404, errorResponse(404, 'NOT_FOUND', entity + ' not found.', [], requestPath));
        return jsonResponse(res, 200, current);
      }
      if (method === 'PUT') {
        if (!current) return jsonResponse(res, 404, errorResponse(404, 'NOT_FOUND', entity + ' not found.', [], requestPath));
        const data = await readJsonBody(req);
        const errors = validateRequired(entity, data, true);
        if (errors.length) return jsonResponse(res, 400, errorResponse(400, 'VALIDATION_ERROR', 'Invalid request data.', errors, requestPath));
        const updated = { ...current, ...data, id: current.id, dateCreated: current.dateCreated, dateModified: new Date().toISOString(), '@context': current['@context'], '@type': current['@type'] };
        collection.set(id, updated);
        return jsonResponse(res, 200, updated);
      }
      if (method === 'DELETE') {
        if (!current) return jsonResponse(res, 404, errorResponse(404, 'NOT_FOUND', entity + ' not found.', [], requestPath));
        collection.delete(id);
        return jsonResponse(res, 204);
      }
      return jsonResponse(res, 405, errorResponse(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', [], requestPath));
    } catch (error) {
      if (error.code === 'INVALID_JSON') {
        return jsonResponse(res, 400, errorResponse(400, 'INVALID_JSON', 'Request body is not valid JSON.', [], requestPath));
      }
      return jsonResponse(res, 500, errorResponse(500, 'INTERNAL_ERROR', 'Internal server error.', [], requestPath));
    }
  }

  const server = createServer(handle);
  return server;
}

export async function startMockApi() {
  const server = createMockApi();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    baseUrl: 'http://127.0.0.1:' + port,
    async stop() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
