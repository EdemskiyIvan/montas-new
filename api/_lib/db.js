import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

let migrated = false;

export async function ensureSchema() {
  if (migrated) return;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_auth (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      password_hash TEXT NOT NULL
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS cases (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  migrated = true;
}

export function toSlug(str) {
  return (
    String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

export function rowToItem(row) {
  return { ...row.data, id: row.id, slug: row.slug, status: row.status, updatedAt: row.updated_at };
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export { sql };
