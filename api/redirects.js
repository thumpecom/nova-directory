import { sql, uid, readJsonBody, setJson, normalizeStore } from './_db.js';
import { requireAuth } from './_auth.js';

// Walk forward from a starting page id, collecting the redirect chain.
// Returns ordered list of page ids. Stops on dead-end or cycle detection.
async function chainFrom(startId) {
  const rows = await sql`
    WITH RECURSIVE walk AS (
      SELECT r.source_page_id, r.destination_page_id, 1 AS depth, ARRAY[r.source_page_id] AS path
      FROM redirects r
      WHERE r.source_page_id = ${startId}
      UNION ALL
      SELECT r.source_page_id, r.destination_page_id, w.depth + 1, w.path || r.source_page_id
      FROM redirects r
      JOIN walk w ON r.source_page_id = w.destination_page_id
      WHERE NOT (r.source_page_id = ANY(w.path)) AND w.depth < 50
    )
    SELECT source_page_id, destination_page_id, depth FROM walk ORDER BY depth
  `;
  return rows;
}

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
      // Return all redirects scoped to this store (source's store).
      const rows = await sql`
        SELECT r.id, r.source_page_id, r.destination_page_id, r.created_at,
               s.label AS source_label, s.url AS source_url, s.page_type AS source_type,
               d.label AS dest_label, d.url AS dest_url, d.page_type AS dest_type, d.store AS dest_store
        FROM redirects r
        JOIN pages s ON s.id = r.source_page_id
        JOIN pages d ON d.id = r.destination_page_id
        WHERE s.store = ${store}
        ORDER BY r.created_at DESC
      `;
      return res.end(JSON.stringify({ redirects: rows }));
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const sourceId = String(body.source_page_id || '').trim();
      const destId = String(body.destination_page_id || '').trim();
      if (!sourceId || !destId) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Missing source or destination' }));
      }
      if (sourceId === destId) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Source and destination cannot match' }));
      }
      // Confirm both pages exist.
      const pages = await sql`
        SELECT id FROM pages WHERE id IN (${sourceId}, ${destId})
      `;
      if (pages.length !== 2) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Source or destination page not found' }));
      }
      // Cycle check: if destination eventually chains back to source, reject.
      const chain = await chainFrom(destId);
      if (chain.some(r => r.destination_page_id === sourceId || r.source_page_id === sourceId)) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'This redirect would create a cycle' }));
      }
      const id = uid();
      try {
        const [row] = await sql`
          INSERT INTO redirects (id, source_page_id, destination_page_id)
          VALUES (${id}, ${sourceId}, ${destId})
          RETURNING id, source_page_id, destination_page_id, created_at
        `;
        return res.end(JSON.stringify({ redirect: row }));
      } catch (e) {
        // UNIQUE violation on source_page_id
        if (String(e?.message || '').includes('unique')) {
          res.statusCode = 409;
          return res.end(JSON.stringify({ error: 'This source already has a redirect. Delete the existing one first.' }));
        }
        throw e;
      }
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id;
      if (!id) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Missing id' }));
      }
      await sql`DELETE FROM redirects WHERE id = ${id}`;
      return res.end(JSON.stringify({ ok: true }));
    }

    res.statusCode = 405;
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  } catch (err) {
    console.error('redirects error', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal error' }));
  }
}
