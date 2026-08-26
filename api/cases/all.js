import { sql, ensureSchema, rowToItem, setCors } from '../_lib/db.js';
import { checkAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAuth(req)) return res.status(401).json({ error: 'Authentication required' });

  await ensureSchema();
  const rows = await sql`SELECT * FROM cases ORDER BY created_at DESC`;
  return res.status(200).json(rows.map(rowToItem));
}
