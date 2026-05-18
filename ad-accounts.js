import { sql, uid, readJsonBody, setJson, normalizeStore, AD_STATUSES } from './_db.js';
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
        SELECT id, store, name, status, notes, position, created_at, updated_at
        FROM ad_accounts
        WHERE store = ${store}
        ORDER BY position, created_at
      `;
      return res.end(JSON.stringify({ accounts: rows }));
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const store = normalizeStore(body.store);
      if (!store) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Invalid store' }));
      }
      const id = uid();
      const name = String(body.name || '').trim();
      const status = AD_STATUSES.includes(body.status) ? body.status : 'active';
      const notes = String(body.notes || '');
      const [{ max_position }] = await sql`
        SELECT COALESCE(MAX(position), -1) AS max_position FROM ad_accounts WHERE store = ${store}
      `;
      const position = max_position + 1;
      const [row] = await sql`
        INSERT INTO ad_accounts (id, store, name, status, notes, position)
        VALUES (${id}, ${store}, ${name}, ${status}, ${notes}, ${position})
        RETURNING id, store, name, status, notes, position, created_at, updated_at
      `;
      return res.end(JSON.stringify({ account: row }));
    }

    if (req.method === 'PATCH') {
      const id = req.query?.id;
      if (!id) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Missing id' }));
      }
      const body = await readJsonBody(req);
      const name = typeof body.name === 'string' ? body.name : null;
      const status = AD_STATUSES.includes(body.status) ? body.status : null;
      const notes = typeof body.notes === 'string' ? body.notes : null;
      if (name === null && status === null && notes === null) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'No editable fields provided' }));
      }
      const [row] = await sql`
        UPDATE ad_accounts SET
          name = COALESCE(${name}, name),
          status = COALESCE(${status}, status),
          notes = COALESCE(${notes}, notes),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, store, name, status, notes, position, created_at, updated_at
      `;
      if (!row) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: 'Not found' }));
      }
      return res.end(JSON.stringify({ account: row }));
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id;
      if (!id) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Missing id' }));
      }
      await sql`DELETE FROM ad_accounts WHERE id = ${id}`;
      return res.end(JSON.stringify({ ok: true }));
    }

    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err) {
    console.error('ad-accounts error', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal error' }));
  }
}
