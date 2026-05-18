import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const sql = neon(process.env.DATABASE_URL);

export const STORES = ['NovaPaw', 'NovaLift', 'NovaPod'];
export const PAGE_TYPES = ['prelander', 'pdp'];
export const AD_STATUSES = ['active', 'disabled'];
export const NAMING_SECTIONS = ['structure', 'abbreviations', 'examples'];

export function normalizeStore(input) {
  if (!input) return null;
  const lower = String(input).toLowerCase();
  return STORES.find(s => s.toLowerCase() === lower) || null;
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export function setJson(res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
}
