import bcrypt from 'bcryptjs';
import { sql, ensureSchema, setCors } from './_lib/db.js';
import { checkAuth } from './_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkAuth(req)) return res.status(401).json({ error: 'Authentication required' });

  await ensureSchema();
  const { password } = req.body || {};
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const hash = await bcrypt.hash(password, 10);
  await sql`
    INSERT INTO admin_auth (id, password_hash) VALUES (1, ${hash})
    ON CONFLICT (id) DO UPDATE SET password_hash = ${hash}
  `;
  return res.status(200).json({ ok: true });
}
