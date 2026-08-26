import { sql, ensureSchema, toSlug, rowToItem, setCors } from '../_lib/db.js';
import { checkAuth } from '../_lib/auth.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!checkAuth(req)) return res.status(401).json({ error: 'Authentication required' });

  await ensureSchema();
  const { id } = req.query;

  if (req.method === 'PUT') {
    const body = req.body || {};
    const slug = toSlug(body.slug || body.title);
    const status = body.status === 'published' ? 'published' : 'draft';
    try {
      const rows = await sql`
        UPDATE posts SET slug = ${slug}, status = ${status}, data = ${JSON.stringify(body)}, updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `;
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(rowToItem(rows[0]));
    } catch (err) {
      if (String(err.message).includes('duplicate key')) {
        return res.status(409).json({ error: 'Slug already exists' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Failed to update' });
    }
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM posts WHERE id = ${id}`;
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
