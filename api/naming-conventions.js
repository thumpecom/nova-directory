import { sql, uid, readJsonBody, setJson, normalizeStore, NAMING_SECTIONS } from './_db.js';
import { requireAuth } from './_auth.js';

export default async function handler(req, res) {
  setJson(res);
  if (!(await requireAuth(req, res))) return;

  const action = req.query?.action;

  try {
    // ===== Format string (one row per store) =====
    if (action === 'format') {
      if (req.method === 'GET') {
        const store = normalizeStore(req.query?.store);
        if (!store) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Invalid or missing store' }));
        }
        const rows = await sql`SELECT store, format, updated_at FROM naming_convention_format WHERE store = ${store}`;
        return res.end(JSON.stringify({ format: rows[0] || { store, format: '' } }));
      }
      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        const store = normalizeStore(body.store);
        if (!store) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Invalid store' }));
        }
        const fmt = String(body.format || '');
        const [row] = await sql`
          INSERT INTO naming_convention_format (store, format, updated_at)
          VALUES (${store}, ${fmt}, NOW())
          ON CONFLICT (store) DO UPDATE SET format = EXCLUDED.format, updated_at = NOW()
          RETURNING store, format, updated_at
        `;
        return res.end(JSON.stringify({ format: row }));
      }
      res.statusCode = 405;
      return res.end(JSON.stringify({ error: 'Method not allowed' }));
    }

    // ===== Rows (structure / abbreviations / examples) =====
    if (action === 'rows') {
      if (req.method === 'GET') {
        const store = normalizeStore(req.query?.store);
        if (!store) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Invalid or missing store' }));
        }
        const rows = await sql`
          SELECT id, store, section, col1, col2, col3, position, created_at, updated_at
          FROM naming_convention_rows
          WHERE store = ${store}
          ORDER BY section, position, created_at
        `;
        return res.end(JSON.stringify({ rows }));
      }

      if (req.method === 'POST') {
        const body = await readJsonBody(req);
        const store = normalizeStore(body.store);
        const section = String(body.section || '').toLowerCase();
        if (!store || !NAMING_SECTIONS.includes(section)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Invalid store or section' }));
        }
        const id = uid();
        const col1 = String(body.col1 || '');
        const col2 = String(body.col2 || '');
        const col3 = String(body.col3 || '');
        const [{ max_position }] = await sql`
          SELECT COALESCE(MAX(position), -1) AS max_position
          FROM naming_convention_rows
          WHERE store = ${store} AND section = ${section}
        `;
        const position = max_position + 1;
        const [row] = await sql`
          INSERT INTO naming_convention_rows (id, store, section, col1, col2, col3, position)
          VALUES (${id}, ${store}, ${section}, ${col1}, ${col2}, ${col3}, ${position})
          RETURNING id, store, section, col1, col2, col3, position, created_at, updated_at
        `;
        return res.end(JSON.stringify({ row }));
      }

      if (req.method === 'PATCH') {
        const id = req.query?.id;
        if (!id) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Missing id' }));
        }
        const body = await readJsonBody(req);
        const col1 = typeof body.col1 === 'string' ? body.col1 : null;
        const col2 = typeof body.col2 === 'string' ? body.col2 : null;
        const col3 = typeof body.col3 === 'string' ? body.col3 : null;
        if (col1 === null && col2 === null && col3 === null) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'No editable fields provided' }));
        }
        const [row] = await sql`
          UPDATE naming_convention_rows SET
            col1 = COALESCE(${col1}, col1),
            col2 = COALESCE(${col2}, col2),
            col3 = COALESCE(${col3}, col3),
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING id, store, section, col1, col2, col3, position, created_at, updated_at
        `;
        if (!row) {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: 'Not found' }));
        }
        return res.end(JSON.stringify({ row }));
      }

      if (req.method === 'DELETE') {
        const id = req.query?.id;
        if (!id) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: 'Missing id' }));
        }
        await sql`DELETE FROM naming_convention_rows WHERE id = ${id}`;
        return res.end(JSON.stringify({ ok: true }));
      }

      res.statusCode = 405;
      return res.end(JSON.stringify({ error: 'Method not allowed' }));
    }

    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Unknown action' }));
  } catch (err) {
    console.error('naming-conventions error', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal error' }));
  }
}
