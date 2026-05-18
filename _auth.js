import { sql, uid, setJson } from './_db.js';

const COOKIE_NAME = 'nd_session';
const SESSION_DAYS = 30;

if (!process.env.APP_PASSWORD) {
  throw new Error('APP_PASSWORD environment variable is not set');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}

export function getSessionToken(req) {
  return parseCookies(req)[COOKIE_NAME] || null;
}

function setSessionCookie(res, token, maxAgeSec) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Secure',
    `Max-Age=${maxAgeSec}`,
  ];
  res.setHeader('Set-Cookie', parts.join('; '));
}

export async function createSession(res) {
  const token = uid() + uid();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql`
    INSERT INTO sessions (token, expires_at)
    VALUES (${token}, ${expiresAt.toISOString()})
  `;
  setSessionCookie(res, token, SESSION_DAYS * 24 * 60 * 60);
  return token;
}

export async function destroySession(req, res) {
  const token = getSessionToken(req);
  if (token) {
    await sql`DELETE FROM sessions WHERE token = ${token}`;
  }
  setSessionCookie(res, '', 0);
}

export async function isAuthed(req) {
  const token = getSessionToken(req);
  if (!token) return false;
  const rows = await sql`
    SELECT token FROM sessions
    WHERE token = ${token} AND expires_at > NOW()
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function requireAuth(req, res) {
  if (await isAuthed(req)) return true;
  setJson(res);
  res.statusCode = 401;
  res.end(JSON.stringify({ error: 'Unauthorized' }));
  return false;
}

export function verifyPassword(input) {
  return typeof input === 'string' && input === process.env.APP_PASSWORD;
}
