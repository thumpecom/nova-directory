import { readJsonBody, setJson } from './_db.js';
import { createSession, destroySession, isAuthed, verifyPassword } from './_auth.js';

export default async function handler(req, res) {
  setJson(res);
  const action = req.query?.action;

  try {
    if (action === 'login' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (!verifyPassword(body.password)) {
        res.statusCode = 401;
        return res.end(JSON.stringify({ error: 'Invalid password' }));
      }
      await createSession(res);
      return res.end(JSON.stringify({ ok: true }));
    }

    if (action === 'logout' && req.method === 'POST') {
      await destroySession(req, res);
      return res.end(JSON.stringify({ ok: true }));
    }

    if (action === 'me' && req.method === 'GET') {
      const authed = await isAuthed(req);
      return res.end(JSON.stringify({ authed }));
    }

    res.statusCode = 404;
    return res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    console.error('auth error', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Internal error' }));
  }
}
