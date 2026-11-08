import { requireAdmin, pushConfig } from './_lib/requireAdmin.js';

// Напоминание о мероприятии. Вызывается из админки (не cron), поэтому
// требует Authorization: Bearer <supabase access token> админа.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const { url, key } = pushConfig();
  if (!url || !key) return res.status(500).json({ error: 'Push is not configured' });

  const title = String(req.body?.title || '').trim();
  const eventDate = new Date(req.body?.date);
  const eventId = String(req.body?.eventId || '').trim();
  const recipientMode = String(req.body?.recipientMode || 'all');
  const residentIds = Array.isArray(req.body?.residentIds) ? req.body.residentIds : [];
  if (!title || Number.isNaN(eventDate.getTime())) {
    return res.status(400).json({ error: 'Title and date are required' });
  }
  if (eventDate.getTime() <= Date.now()) {
    return res.status(400).json({ error: 'Event has already passed' });
  }

  const dateText = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Almaty',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(eventDate);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      title: 'Напоминание о мероприятии',
      body: `«${title}» - ${dateText}`,
      eventId,
      recipientMode,
      residentIds,
    }),
  });

  const result = await response.text();
  if (!response.ok) {
    return res.status(502).json({ error: result || 'Push failed' });
  }
  return res.status(200).send(result);
}
