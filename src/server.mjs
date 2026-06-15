import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layout, escapeHtml } from './views/layout.mjs';
import * as BlogPostingList from './views/blog-posting/list.mjs';
import * as BlogPostingDetail from './views/blog-posting/detail.mjs';
import * as PersonList from './views/person/list.mjs';
import * as PersonDetail from './views/person/detail.mjs';
import * as WebPageList from './views/web-page/list.mjs';
import * as WebPageDetail from './views/web-page/detail.mjs';
import * as ImageObjectList from './views/image-object/list.mjs';
import * as ImageObjectDetail from './views/image-object/detail.mjs';
import * as CategoryCodeList from './views/category-code/list.mjs';
import * as CategoryCodeDetail from './views/category-code/detail.mjs';
import * as CategoryCodeSetList from './views/category-code-set/list.mjs';
import * as CategoryCodeSetDetail from './views/category-code-set/detail.mjs';
import * as DefinedTermList from './views/defined-term/list.mjs';
import * as DefinedTermDetail from './views/defined-term/detail.mjs';
import * as DefinedTermSetList from './views/defined-term-set/list.mjs';
import * as DefinedTermSetDetail from './views/defined-term-set/detail.mjs';
import * as CommentList from './views/comment/list.mjs';
import * as CommentDetail from './views/comment/detail.mjs';
import * as WebSiteList from './views/web-site/list.mjs';
import * as WebSiteDetail from './views/web-site/detail.mjs';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public');

const ENTITY_ROUTES = [
  { entity: "BlogPosting", plural: "blog-postings",
    views: { list: BlogPostingList, detail: BlogPostingDetail } },
  { entity: "Person", plural: "persons",
    views: { list: PersonList, detail: PersonDetail } },
  { entity: "WebPage", plural: "web-pages",
    views: { list: WebPageList, detail: WebPageDetail } },
  { entity: "ImageObject", plural: "image-objects",
    views: { list: ImageObjectList, detail: ImageObjectDetail } },
  { entity: "CategoryCode", plural: "category-codes",
    views: { list: CategoryCodeList, detail: CategoryCodeDetail } },
  { entity: "CategoryCodeSet", plural: "category-code-sets",
    views: { list: CategoryCodeSetList, detail: CategoryCodeSetDetail } },
  { entity: "DefinedTerm", plural: "defined-terms",
    views: { list: DefinedTermList, detail: DefinedTermDetail } },
  { entity: "DefinedTermSet", plural: "defined-term-sets",
    views: { list: DefinedTermSetList, detail: DefinedTermSetDetail } },
  { entity: "Comment", plural: "comments",
    views: { list: CommentList, detail: CommentDetail } },
  { entity: "WebSite", plural: "web-sites",
    views: { list: WebSiteList, detail: WebSiteDetail } },
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

function notFoundResponse() {
  return {
    status: 404,
    html: layout({ title: 'Not Found', body: '<p role="alert">Page not found.</p>' }),
  };
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
    const m = pathname.match(new RegExp('^' + base.replace(/[/\\\-]/g, (c) => '\\' + c) + '/([^/]+)$'));
    if (m) {
      return { route: r, kind: 'detail', id: m[1] };
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
    if (method !== 'GET' && method !== 'HEAD') {
      sendHtml(res, notFoundResponse());
      return;
    }
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"status":"ok"}');
      return;
    }
    if (pathname === '/style.css') {
      await serveStatic(res, 'style.css', 'text/css; charset=utf-8');
      return;
    }
    if (pathname === '/') {
      sendHtml(res, { status: 200, html: indexPage() });
      return;
    }

    const match = matchEntityRoute(pathname);
    if (!match) {
      sendHtml(res, notFoundResponse());
      return;
    }
    const { route, kind, id } = match;

    if (kind === 'list') {
      sendHtml(res, await route.views.list.render({ url }));
      return;
    }
    if (kind === 'detail') {
      if (!UUID_PATTERN.test(id)) {
        sendHtml(res, { status: 400, html: layout({ title: 'Invalid ID', body: '<p role="alert">ID must be a valid UUID.</p>' }) });
        return;
      }
      sendHtml(res, await route.views.detail.render({ id }));
      return;
    }

    sendHtml(res, notFoundResponse());
  } catch (error) {
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
