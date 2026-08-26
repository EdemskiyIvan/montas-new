import { sql, ensureSchema, toSlug, rowToItem, setCors } from '../_lib/db.js';
import { checkAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  await ensureSchema();

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM cases WHERE status = 'published' ORDER BY created_at DESC`;
    return res.status(200).json(rows.map(rowToItem));
  }

  if (req.method === 'POST') {
    if (!checkAuth(req)) return res.status(401).json({ error: 'Authentication required' });
    const body = req.body || {};
    const slug = toSlug(body.slug || body.title);
    const status = body.status === 'published' ? 'published' : 'draft';
    try {
      const rows = await sql`
        INSERT INTO cases (slug, status, data) VALUES (${slug}, ${status}, ${JSON.stringify(body)})
        RETURNING *
      `;
      return res.status(201).json(rowToItem(rows[0]));
    } catch (err) {
      if (String(err.message).includes('duplicate key')) {
        return res.status(409).json({ error: 'Slug already exists' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Failed to create' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
