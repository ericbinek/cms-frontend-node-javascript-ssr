const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

const PLURALS = {
  "BlogPosting": "blog-postings",
  "Person": "persons",
  "WebPage": "web-pages",
  "ImageObject": "image-objects",
  "CategoryCode": "category-codes",
  "CategoryCodeSet": "category-code-sets",
  "DefinedTerm": "defined-terms",
  "DefinedTermSet": "defined-term-sets",
  "Comment": "comments",
  "WebSite": "web-sites",
};

export function pluralOf(entity) {
  if (PLURALS[entity]) return PLURALS[entity];
  throw new Error(`Unknown entity for plural lookup: ${entity}`);
}

async function request(method, path, body, headers = {}) {
  const url = new URL(path, API_BASE_URL);
  const init = { method, headers: { Accept: 'application/json', ...headers } };
  if (body !== undefined && body !== null) {
    init.body = JSON.stringify(body);
    init.headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let parsed = null;
  if (text) {
    try { parsed = JSON.parse(text); }
    catch { parsed = { raw: text }; }
  }
  return { status: res.status, body: parsed, etag: res.headers.get('etag') };
}

export const api = {
  list(entity, query = {}) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      sp.set(k, String(v));
    }
    const qs = sp.toString();
    return request('GET', `/${pluralOf(entity)}${qs ? '?' + qs : ''}`);
  },
  get(entity, id) {
    return request('GET', `/${pluralOf(entity)}/${encodeURIComponent(id)}`);
  },
  create(entity, payload) {
    return request('POST', `/${pluralOf(entity)}`, payload);
  },
  update(entity, id, payload) {
    return request('PUT', `/${pluralOf(entity)}/${encodeURIComponent(id)}`, payload);
  },
  remove(entity, id) {
    return request('DELETE', `/${pluralOf(entity)}/${encodeURIComponent(id)}`);
  },
};
