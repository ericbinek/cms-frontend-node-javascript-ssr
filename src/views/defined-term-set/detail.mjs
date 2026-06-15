import { layout, escapeHtml, displayName, formatValue, errorPage } from '../layout.mjs';
import { api } from '../../api-client.mjs';

const ENTITY = "DefinedTermSet";
const BASE = "/defined-term-sets";
const PROPERTIES = [
  { name: "name", kind: 'InlineScalar', use: "Text", cardinality: "one", required: true },
  { name: "description", kind: 'InlineScalar', use: "Text", cardinality: "one", required: false },
  { name: "url", kind: 'InlineScalar', use: "URL", cardinality: "one", required: false },
];

export async function render({ id }) {
  const { status, body } = await api.get(ENTITY, id);
  if (status === 404) return errorPage(404, ENTITY + ' not found.');
  if (status !== 200) return errorPage(status, body?.message || 'Failed to load.');
  const item = body;
  const rows = PROPERTIES.map((p) =>
    `<dt>${escapeHtml(p.name)}</dt><dd>${formatValue(item[p.name], p)}</dd>`).join('');
  const meta = `<dt>id</dt><dd><code>${escapeHtml(item.id)}</code></dd>
<dt>dateCreated</dt><dd><time datetime="${escapeHtml(item.dateCreated || '')}">${escapeHtml(item.dateCreated || '')}</time></dd>
<dt>dateModified</dt><dd><time datetime="${escapeHtml(item.dateModified || '')}">${escapeHtml(item.dateModified || '')}</time></dd>`;
  return {
    status: 200,
    html: layout({
      title: displayName(item, ENTITY),
      currentEntity: ENTITY,
      body: `
<article>
<dl>${rows}${meta}</dl>
<p><a href="${BASE}">Back to list</a></p>
</article>`,
    }),
  };
}
