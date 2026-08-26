import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sql, ensureSchema, setCors } from './_lib/db.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ error: 'Password required' });

  const rows = await sql`SELECT password_hash FROM admin_auth WHERE id = 1`;
  if (!rows.length) return res.status(503).json({ error: 'Admin password not configured yet' });

  const ok = await bcrypt.compare(password, rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: 'Неверный пароль' });

  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '30d' });
  return res.status(200).json({ token });
}
