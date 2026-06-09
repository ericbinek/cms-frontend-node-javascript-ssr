import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layout, escapeHtml } from './views/layout.mjs';
import * as BlogPostingList from './views/blog-posting/list.mjs';
import * as BlogPostingDetail from './views/blog-posting/detail.mjs';
import * as BlogPostingCreate from './views/blog-posting/create.mjs';
import * as BlogPostingEdit from './views/blog-posting/edit.mjs';
import * as BlogPostingDelete from './views/blog-posting/delete.mjs';
import * as PersonList from './views/person/list.mjs';
import * as PersonDetail from './views/person/detail.mjs';
import * as PersonCreate from './views/person/create.mjs';
import * as PersonEdit from './views/person/edit.mjs';
import * as PersonDelete from './views/person/delete.mjs';
import * as WebPageList from './views/web-page/list.mjs';
import * as WebPageDetail from './views/web-page/detail.mjs';
import * as WebPageCreate from './views/web-page/create.mjs';
import * as WebPageEdit from './views/web-page/edit.mjs';
import * as WebPageDelete from './views/web-page/delete.mjs';
import * as ImageObjectList from './views/image-object/list.mjs';
import * as ImageObjectDetail from './views/image-object/detail.mjs';
import * as ImageObjectCreate from './views/image-object/create.mjs';
import * as ImageObjectEdit from './views/image-object/edit.mjs';
import * as ImageObjectDelete from './views/image-object/delete.mjs';
import * as CategoryCodeList from './views/category-code/list.mjs';
import * as CategoryCodeDetail from './views/category-code/detail.mjs';
import * as CategoryCodeCreate from './views/category-code/create.mjs';
import * as CategoryCodeEdit from './views/category-code/edit.mjs';
import * as CategoryCodeDelete from './views/category-code/delete.mjs';
import * as CategoryCodeSetList from './views/category-code-set/list.mjs';
import * as CategoryCodeSetDetail from './views/category-code-set/detail.mjs';
import * as CategoryCodeSetCreate from './views/category-code-set/create.mjs';
import * as CategoryCodeSetEdit from './views/category-code-set/edit.mjs';
import * as CategoryCodeSetDelete from './views/category-code-set/delete.mjs';
import * as DefinedTermList from './views/defined-term/list.mjs';
import * as DefinedTermDetail from './views/defined-term/detail.mjs';
import * as DefinedTermCreate from './views/defined-term/create.mjs';
import * as DefinedTermEdit from './views/defined-term/edit.mjs';
import * as DefinedTermDelete from './views/defined-term/delete.mjs';
import * as DefinedTermSetList from './views/defined-term-set/list.mjs';
import * as DefinedTermSetDetail from './views/defined-term-set/detail.mjs';
import * as DefinedTermSetCreate from './views/defined-term-set/create.mjs';
import * as DefinedTermSetEdit from './views/defined-term-set/edit.mjs';
import * as DefinedTermSetDelete from './views/defined-term-set/delete.mjs';
import * as CommentList from './views/comment/list.mjs';
import * as CommentDetail from './views/comment/detail.mjs';
import * as CommentCreate from './views/comment/create.mjs';
import * as CommentEdit from './views/comment/edit.mjs';
import * as CommentDelete from './views/comment/delete.mjs';
import * as WebSiteList from './views/web-site/list.mjs';
import * as WebSiteDetail from './views/web-site/detail.mjs';
import * as WebSiteCreate from './views/web-site/create.mjs';
import * as WebSiteEdit from './views/web-site/edit.mjs';
import * as WebSiteDelete from './views/web-site/delete.mjs';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public');
const MAX_BODY_SIZE = 1024 * 1024;

const ENTITY_ROUTES = [
  { entity: "BlogPosting", plural: "blog-postings",
    views: { list: BlogPostingList, detail: BlogPostingDetail, create: BlogPostingCreate, edit: BlogPostingEdit, del: BlogPostingDelete } },
  { entity: "Person", plural: "persons",
    views: { list: PersonList, detail: PersonDetail, create: PersonCreate, edit: PersonEdit, del: PersonDelete } },
  { entity: "WebPage", plural: "web-pages",
    views: { list: WebPageList, detail: WebPageDetail, create: WebPageCreate, edit: WebPageEdit, del: WebPageDelete } },
  { entity: "ImageObject", plural: "image-objects",
    views: { list: ImageObjectList, detail: ImageObjectDetail, create: ImageObjectCreate, edit: ImageObjectEdit, del: ImageObjectDelete } },
  { entity: "CategoryCode", plural: "category-codes",
    views: { list: CategoryCodeList, detail: CategoryCodeDetail, create: CategoryCodeCreate, edit: CategoryCodeEdit, del: CategoryCodeDelete } },
  { entity: "CategoryCodeSet", plural: "category-code-sets",
    views: { list: CategoryCodeSetList, detail: CategoryCodeSetDetail, create: CategoryCodeSetCreate, edit: CategoryCodeSetEdit, del: CategoryCodeSetDelete } },
  { entity: "DefinedTerm", plural: "defined-terms",
    views: { list: DefinedTermList, detail: DefinedTermDetail, create: DefinedTermCreate, edit: DefinedTermEdit, del: DefinedTermDelete } },
  { entity: "DefinedTermSet", plural: "defined-term-sets",
    views: { list: DefinedTermSetList, detail: DefinedTermSetDetail, create: DefinedTermSetCreate, edit: DefinedTermSetEdit, del: DefinedTermSetDelete } },
  { entity: "Comment", plural: "comments",
    views: { list: CommentList, detail: CommentDetail, create: CommentCreate, edit: CommentEdit, del: CommentDelete } },
  { entity: "WebSite", plural: "web-sites",
    views: { list: WebSiteList, detail: WebSiteDetail, create: WebSiteCreate, edit: WebSiteEdit, del: WebSiteDelete } },
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function indexPage() {
  const items = ENTITY_ROUTES.map((r) =>
    `<li><a href="/${r.plural}">${escapeHtml(r.entity)}</a></li>`).join('');
  return layout({
    title: 'CMS',
    body: `<p>Schema.org-aligned CMS frontend.</p><ul>${items}</ul>`,
  });
}

function sendHtml(res, { status = 200, html }) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
  });
  res.end(html);
}

function sendRedirect(res, location, status = 303) {
  res.writeHead(status, { Location: location });
  res.end();
}

function notFoundResponse() {
  return {
    status: 404,
    html: layout({ title: 'Not Found', body: '<p role="alert">Page not found.</p>' }),
  };
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  let oversized = false;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_SIZE) {
      oversized = true;
      continue;
    }
    chunks.push(chunk);
  }
  if (oversized) {
    const err = new Error('Request body too large.');
    err.code = 'PAYLOAD_TOO_LARGE';
    throw err;
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function parseFormFromRequest(req) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.startsWith('application/x-www-form-urlencoded')) {
    return null;
  }
  const raw = await readBody(req);
  return new URLSearchParams(raw);
}

async function serveStatic(res, relPath, contentType) {
  try {
    const full = resolve(PUBLIC_DIR, relPath);
    if (!full.startsWith(PUBLIC_DIR)) {
      sendHtml(res, notFoundResponse());
      return;
    }
    const content = await readFile(full);
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=300' });
    res.end(content);
  } catch {
    sendHtml(res, notFoundResponse());
  }
}

function matchEntityRoute(pathname) {
  for (const r of ENTITY_ROUTES) {
    const base = '/' + r.plural;
    if (pathname === base) return { route: r, kind: 'list' };
    if (pathname === base + '/new') return { route: r, kind: 'new' };
    const m = pathname.match(new RegExp('^' + base.replace(/[/\\\-]/g, (c) => '\\' + c) + '/([^/]+)(?:/(edit|delete))?$'));
    if (m) {
      return { route: r, kind: m[2] || 'detail', id: m[1] };
    }
  }
  return null;
}

async function handleRequest(req, res) {
  const start = Date.now();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;
  const method = req.method;
  res.on('finish', () => {
    console.log(`${method} ${pathname} ${res.statusCode} ${Date.now() - start}ms`);
  });

  try {
    if (method === 'GET' && pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"status":"ok"}');
      return;
    }
    if (method === 'GET' && pathname === '/style.css') {
      await serveStatic(res, 'style.css', 'text/css; charset=utf-8');
      return;
    }
    if (method === 'GET' && pathname === '/') {
      sendHtml(res, { status: 200, html: indexPage() });
      return;
    }

    const match = matchEntityRoute(pathname);
    if (!match) {
      sendHtml(res, notFoundResponse());
      return;
    }
    const { route, kind, id } = match;
    const idValid = !id || UUID_PATTERN.test(id);

    if (kind === 'list' && method === 'GET') {
      sendHtml(res, await route.views.list.render({ url }));
      return;
    }
    if (kind === 'new') {
      if (method === 'GET') {
        sendHtml(res, await route.views.create.renderForm({}));
        return;
      }
      if (method === 'POST') {
        const form = await parseFormFromRequest(req);
        if (!form) { sendHtml(res, { status: 415, html: layout({ title: 'Unsupported', body: '<p role="alert">Form encoding required.</p>' }) }); return; }
        const result = await route.views.create.handleSubmit({ form });
        if (result.redirect) { sendRedirect(res, result.redirect, result.status || 303); return; }
        sendHtml(res, await route.views.create.renderForm({ errors: result.errors || [], fieldErrors: result.fieldErrors, values: result.values }));
        return;
      }
    }
    if (kind === 'detail' && method === 'GET') {
      if (!idValid) { sendHtml(res, { status: 400, html: layout({ title: 'Invalid ID', body: '<p role="alert">ID must be a valid UUID.</p>' }) }); return; }
      sendHtml(res, await route.views.detail.render({ id }));
      return;
    }
    if (kind === 'edit') {
      if (!idValid) { sendHtml(res, { status: 400, html: layout({ title: 'Invalid ID', body: '<p role="alert">ID must be a valid UUID.</p>' }) }); return; }
      if (method === 'GET') {
        sendHtml(res, await route.views.edit.renderForm({ id }));
        return;
      }
      if (method === 'POST') {
        const form = await parseFormFromRequest(req);
        if (!form) { sendHtml(res, { status: 415, html: layout({ title: 'Unsupported', body: '<p role="alert">Form encoding required.</p>' }) }); return; }
        const result = await route.views.edit.handleSubmit({ id, form });
        if (result.redirect) { sendRedirect(res, result.redirect, result.status || 303); return; }
        if (result.html) { sendHtml(res, result); return; }
        sendHtml(res, await route.views.edit.renderForm({ id, errors: result.errors || [], fieldErrors: result.fieldErrors, values: result.values }));
        return;
      }
    }
    if (kind === 'delete') {
      if (!idValid) { sendHtml(res, { status: 400, html: layout({ title: 'Invalid ID', body: '<p role="alert">ID must be a valid UUID.</p>' }) }); return; }
      if (method === 'GET') {
        sendHtml(res, await route.views.del.renderForm({ id }));
        return;
      }
      if (method === 'POST') {
        const result = await route.views.del.handleSubmit({ id });
        if (result.redirect) { sendRedirect(res, result.redirect, result.status || 303); return; }
        sendHtml(res, result);
        return;
      }
    }

    sendHtml(res, notFoundResponse());
  } catch (error) {
    if (error.code === 'PAYLOAD_TOO_LARGE') {
      sendHtml(res, { status: 413, html: layout({ title: 'Too Large', body: '<p role="alert">Request body too large.</p>' }) });
      return;
    }
    console.error(`[${method} ${pathname}] ${error.message}`);
    sendHtml(res, { status: 500, html: layout({ title: 'Error', body: '<p role="alert">Internal server error.</p>' }) });
  }
}

const server = createServer(handleRequest);
server.listen(PORT, HOST, () => {
  console.log(`CMS frontend running at http://${HOST}:${PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
