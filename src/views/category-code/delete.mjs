import { layout, escapeHtml, displayName, errorPage } from '../layout.mjs';
import { api } from '../../api-client.mjs';

const ENTITY = "CategoryCode";
const BASE = "/category-codes";

export async function renderForm({ id }) {
  const { status, body } = await api.get(ENTITY, id);
  if (status === 404) return errorPage(404, ENTITY + ' not found.');
  if (status !== 200) return errorPage(status, body?.message || 'Failed to load.');
  return {
    status: 200,
    html: layout({
      title: 'Delete ' + ENTITY,
      currentEntity: ENTITY,
      body: `
<form method="POST" action="${BASE}/${escapeHtml(id)}/delete">
<p>Delete <strong>${escapeHtml(displayName(body, ENTITY))}</strong>? This cannot be undone.</p>
<p><button type="submit">Confirm Delete</button> · <a href="${BASE}/${escapeHtml(id)}">Cancel</a></p>
</form>`,
    }),
  };
}

export async function handleSubmit({ id }) {
  const { status } = await api.remove(ENTITY, id);
  if (status === 204 || status === 404) {
    return { status: 303, redirect: BASE };
  }
  return errorPage(status, 'Delete failed.');
}
