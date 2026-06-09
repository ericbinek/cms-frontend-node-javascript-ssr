import { layout, escapeHtml, displayName, formatValue } from '../layout.mjs';
import { api } from '../../api-client.mjs';

const ENTITY = "ImageObject";
const BASE = "/image-objects";
const PROPERTIES = [
  { name: "name", kind: 'InlineScalar', use: "Text", cardinality: "one", required: false },
  { name: "caption", kind: 'InlineScalar', use: "Text", cardinality: "one", required: false },
  { name: "description", kind: 'InlineScalar', use: "Text", cardinality: "one", required: false },
  { name: "contentUrl", kind: 'InlineScalar', use: "URL", cardinality: "one", required: true },
  { name: "encodingFormat", kind: 'InlineScalar', use: "Text", cardinality: "one", required: false },
  { name: "uploadDate", kind: 'InlineScalar', use: "DateTime", cardinality: "one", required: false },
  { name: "creator", kind: 'Ref', targets: ["Person"], cardinality: "one", required: false },
  { name: "license", kind: 'InlineScalar', use: "URL", cardinality: "one", required: false },
];
const EXTRA_COLS = ["contentUrl"];

export async function render({ url }) {
  const sp = url.searchParams;
  const query = {};
  for (const k of ['limit', 'offset', 'sort', 'order']) {
    const v = sp.get(k);
    if (v !== null) query[k] = v;
  }
  const { status, body } = await api.list(ENTITY, query);
  if (status !== 200) {
    return {
      status,
      html: layout({
        title: ENTITY + 's',
        currentEntity: ENTITY,
        body: `<p role="alert">Failed to load: ${escapeHtml(body?.message || 'unknown error')}</p>`,
      }),
    };
  }
  const headers = ['Name', 'Created', ...EXTRA_COLS, 'Actions']
    .map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join('');
  const rows = body.items.map((item) => {
    const extras = EXTRA_COLS.map((col) => {
      const prop = PROPERTIES.find((p) => p.name === col);
      return `<td>${prop ? formatValue(item[col], prop) : escapeHtml(String(item[col] ?? ''))}</td>`;
    }).join('');
    return `<tr>
<td><a href="${BASE}/${escapeHtml(item.id)}">${escapeHtml(displayName(item, ENTITY))}</a></td>
<td><time datetime="${escapeHtml(item.dateCreated || '')}">${escapeHtml(item.dateCreated || '')}</time></td>
${extras}
<td><a href="${BASE}/${escapeHtml(item.id)}/edit">Edit</a> · <a href="${BASE}/${escapeHtml(item.id)}/delete">Delete</a></td>
</tr>`;
  }).join('');
  const empty = '<tr><td colspan="' + (3 + EXTRA_COLS.length) + '"><em>No items.</em></td></tr>';
  return {
    status: 200,
    html: layout({
      title: ENTITY + 's',
      currentEntity: ENTITY,
      body: `
<p><a href="${BASE}/new">New ${escapeHtml(ENTITY)}</a></p>
<p>Showing ${body.items.length} of ${body.total}.</p>
<table>
<caption>${escapeHtml(ENTITY)} list</caption>
<thead><tr>${headers}</tr></thead>
<tbody>${rows || empty}</tbody>
</table>`,
    }),
  };
}
