import { requireAdmin, pushConfig } from './_lib/requireAdmin.js';

// Push «Новая новость» всем резидентам. Вызывает только вошедший админ
// (Authorization: Bearer <supabase access token>, is_admin() = true).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const { url, key } = pushConfig();
  if (!url || !key) return res.status(500).json({ error: 'Push is not configured' });

  const title = String(req.body?.title || '').trim().slice(0, 300);
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ title: 'Новая новость', body: title }),
  });

  const result = await response.text();
  if (!response.ok) {
    return res.status(502).json({ error: result || 'Push failed' });
  }
  return res.status(200).send(result);
}
