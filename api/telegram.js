/* eslint-env node */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
        return;
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: 'Server is not configured' }));
        return;
    }

    let body = req.body;
    if (body == null) {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString('utf8');
        try {
            body = raw ? JSON.parse(raw) : {};
        } catch {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
            return;
        }
    } else if (typeof body === 'string') {
        try {
            body = body ? JSON.parse(body) : {};
        } catch {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: false, error: 'Invalid JSON' }));
            return;
        }
    }

    const kind = body.kind;
    let text = '';
    let parseMode = 'HTML';

    if (kind === 'application') {
        const name = (body.name ?? '').toString();
        const phone = (body.phone ?? '').toString();
        const email = (body.email ?? '').toString();
        const company = (body.company ?? '').toString();

        if (!name || !phone || !email || !company) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: false, error: 'Missing fields' }));
            return;
        }

        text = `
<b>🔔 Новая заявка с сайта 26 Business Club</b>

👤 <b>Имя:</b> ${escapeHtml(name)}
📱 <b>Телефон:</b> ${escapeHtml(phone)}
📧 <b>Email:</b> ${escapeHtml(email)}
🏢 <b>Компания:</b> ${escapeHtml(company)}
        `.trim();
    } else if (kind === 'admin_otp') {
        const phone = (body.phone ?? '').toString();
        const code = (body.code ?? '').toString();

        if (!phone || !code) {
            res.statusCode = 400;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: false, error: 'Missing fields' }));
            return;
        }

        // Optional server-side allowlist: comma-separated phones in env.
        const envAllowlist = (process.env.ADMIN_ALLOWED_PHONES || '').split(',').map(s => s.trim()).filter(Boolean);
        if (envAllowlist.length > 0) {
            const normalizedInput = phone.replace(/\s/g, '');
            const allowed = envAllowlist.some(p => p.replace(/\s/g, '') === normalizedInput);
            if (!allowed) {
                res.statusCode = 403;
                res.setHeader('content-type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ ok: false, error: 'Forbidden' }));
                return;
            }
        }

        text = `🔑 Код админки: ${code}\nНомер: ${phone}`;
        parseMode = undefined;
    } else {
        res.statusCode = 400;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: 'Unknown kind' }));
        return;
    }

    try {
        const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                ...(parseMode ? { parse_mode: parseMode } : {})
            })
        });

        const data = await telegramRes.json().catch(() => ({}));
        if (!telegramRes.ok || !data.ok) {
            res.statusCode = 502;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ ok: false, error: data.description || 'Telegram error' }));
            return;
        }

        res.statusCode = 200;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: true }));
    } catch (err) {
        res.statusCode = 502;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: err?.message || 'Network error' }));
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}
