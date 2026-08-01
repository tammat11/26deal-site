const PUSH_URL =
  'https://xhsyvdflxfkywkuhwfwk.supabase.co/functions/v1/push-broadcast';
const PUSH_KEY =
  '05b92e067ea0c603e86e2b47b5d42b96d223c2d32b02c701';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const title = String(req.body?.title || '').trim();
  const eventDate = new Date(req.body?.date);
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

  const response = await fetch(PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PUSH_KEY}`,
    },
    body: JSON.stringify({
      title: 'Напоминание о мероприятии',
      body: `«${title}» - ${dateText}`,
    }),
  });

  const result = await response.text();
  if (!response.ok) {
    return res.status(502).json({ error: result || 'Push failed' });
  }
  return res.status(200).send(result);
}
