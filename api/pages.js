import { sql, uid, readJsonBody, setJson, normalizeStore, PAGE_TYPES } from './_db.js';
import { requireAuth } from './_auth.js';

export default async function handler(req, res) {
  setJson(res);
  if (!(await requireAuth(req, res))) return;

  try {
    if (req.method === 'GET') {
      const store = normalizeStore(req.query?.store);
      if (!store) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Invalid or missing store' }));
      }
      const rows = await sql`
        SELECT id, store, page_type, label, url, position, created_at, updated_at
        FROM pages
        WHERE store = ${store}
        ORDER BY page_type, position, created_at
      `;
      return res.end(JSON.stringify({ pages: rows }));
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const store = normalizeStore(body.store);
      const pageType = String(body.page_type || '').toLowerCase();
      if (!store || !PAGE_TYPES.includes(pageType)) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Invalid store or page_type' }));
      }
      const id = uid();
      const label = String(body.label || '').trim();
      const url = String(body.url || '').trim();
      const [{ max_position }] = await sql`
        SELECT COALESCE(MAX(position), -1) AS max_position
        FROM pages WHERE store = ${store} AND page_type = ${pageType}
      `;
      const position = max_position + 1;
      const [row] = await sql`
        INSERT INTO pages (id, store, page_type, label, url, position)
        VALUES (${id}, ${store}, ${pageType}, ${label}, ${url}, ${position})
        RETURNING id, store, page_type, label, url, position, created_at, updated_at
      `;
      return res.end(JSON.stringify({ page: row }));
    }

    if (req.method === 'PATCH') {
      const id = req.query?.id;
      if (!id) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Missing id' }));
      }
      const body = await readJsonBody(req);
      const sets = [];
      const params = {};
      if (typeof body.label === 'string') { sets.push('label'); params.label = body.label; }
      if (typeof body.url === 'string') { sets.push('url'); params.url = body.url; }
      if (sets.length === 0) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'No editable fields provided' }));
      }
      const [row] = await sql`
        UPDATE pages SET
          label = COALESCE(${params.label ?? null}, label),
          url = COALESCE(${params.url ?? null}, url),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, store, page_type, label, url, position, created_at, updated_at
      `;
      if (!row) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: 'Not found' }));
      }
      return res.end(JSON.stringify({ page: row }));
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id;
      if (!id) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Missing id' }));
      }
      await sql`DELETE FROM pages WHERE id = ${id}`;
      return res.end(JSON.stringify({ ok: true }));
    }

    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err) {
    console.error('pages error', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal error' }));
  }
}
