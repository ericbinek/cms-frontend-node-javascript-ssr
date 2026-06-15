// Shared layout, escaping, and formatting helpers.
// Imported by every view module. Has no runtime dependencies on the API
// — the views call the api-client themselves and pass values in.

const ENTITIES = ["BlogPosting","Person","WebPage","ImageObject","CategoryCode","CategoryCodeSet","DefinedTerm","DefinedTermSet","Comment","WebSite"];
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
const DISPLAY_KEYS = {
  "BlogPosting": ["headline","alternativeHeadline"],
  "Person": ["name","givenName","familyName"],
  "WebPage": ["headline"],
  "ImageObject": ["name","caption","contentUrl"],
  "CategoryCode": ["name","codeValue"],
  "CategoryCodeSet": ["name"],
  "DefinedTerm": ["name","termCode"],
  "DefinedTermSet": ["name"],
  "Comment": ["text"],
  "WebSite": ["name"],
};

export function pluralOf(entity) {
  return PLURALS[entity];
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// Only http(s), mailto and site-relative values may become clickable links.
// A stored "javascript:" or "data:" URL is rendered as inert escaped text, so a
// bad value in the data store cannot turn into stored XSS when a user clicks it.
function isSafeHref(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('mailto:') || v.startsWith('/');
}

export function layout({ title, body, currentEntity, flash }) {
  const nav = ENTITIES.map((e) => {
    const current = e === currentEntity ? ' aria-current="page"' : '';
    return `<li><a href="/${PLURALS[e]}"${current}>${escapeHtml(e)}</a></li>`;
  }).join('');
  const flashEl = flash ? `<p role="status">${escapeHtml(flash)}</p>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — CMS</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<header>
<nav aria-label="Primary">
<ul>${nav}</ul>
</nav>
</header>
<main>
<h1>${escapeHtml(title)}</h1>
${flashEl}
${body}
</main>
</body>
</html>
`;
}

export function displayName(item, entity) {
  if (!item) return '';
  const keys = DISPLAY_KEYS[entity] || ['name', 'headline'];
  for (const k of keys) {
    if (typeof item[k] === 'string' && item[k]) return item[k];
  }
  return item.id || '';
}

export function errorPage(status, message) {
  return {
    status,
    html: layout({
      title: status === 404 ? 'Not Found' : 'Error',
      body: `<p role="alert">${escapeHtml(message)}</p>`,
    }),
  };
}

function formatScalar(value, use) {
  if (use === 'URL') {
    if (!isSafeHref(value)) return escapeHtml(value);
    return `<a href="${escapeHtml(value)}" rel="noopener noreferrer">${escapeHtml(value)}</a>`;
  }
  if (use === 'DateTime' || use === 'Date' || use === 'Time') {
    return `<time datetime="${escapeHtml(value)}">${escapeHtml(value)}</time>`;
  }
  if (use === 'Boolean') return value ? 'Yes' : 'No';
  return escapeHtml(String(value));
}

export function formatValue(value, prop) {
  if (value === null || value === undefined || value === '') return '<em>—</em>';
  if (Array.isArray(value)) {
    if (!value.length) return '<em>—</em>';
    return `<ul>${value.map((v) => `<li>${formatValue(v, { ...prop, cardinality: 'one' })}</li>`).join('')}</ul>`;
  }
  if (prop.kind === 'Ref') {
    const target = prop.targets[0];
    const plural = PLURALS[target] || target.toLowerCase() + 's';
    return `<a href="/${plural}/${escapeHtml(value)}">${escapeHtml(target)}: ${escapeHtml(value)}</a>`;
  }
  if (prop.kind === 'Embed') {
    if (prop.use === 'Language' && typeof value === 'object') {
      const code = value.alternateName || value.name || '';
      return `<span lang="${escapeHtml(code)}">${escapeHtml(code)}</span>`;
    }
    return `<code>${escapeHtml(JSON.stringify(value))}</code>`;
  }
  if (prop.kind === 'Enum') return escapeHtml(String(value));
  return formatScalar(value, prop.use);
}
