/* global process */
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xhsyvdflxfkywkuhwfwk.supabase.co';

const partnerFields = [
    'name', 'description', 'category', 'address', 'phone', 'website', 'discount',
    'discount_conditions', 'is_exclusive', 'is_published', 'sort_order', 'logo_url', 'cover_url',
];
const pollFields = [
    'question', 'description', 'type', 'is_active', 'is_published', 'starts_at', 'ends_at', 'sort_order',
];

export default async function handler(req, res) {
    setJson(res);
    if (!isAuthorized(req)) return reply(res, 401, { error: 'Unauthorized' });

    try {
        const resource = req.query?.resource;
        if (req.method === 'GET' && resource === 'partners') {
            return reply(res, 200, await rest('partners?select=*&order=sort_order.asc,created_at.desc'));
        }
        if (req.method === 'GET' && resource === 'polls') {
            const polls = await rest('polls?select=*&order=sort_order.asc,created_at.desc');
            const options = await rest('poll_options?select=*&order=sort_order.asc,created_at.asc');
            return reply(res, 200, polls.map(poll => ({ ...poll, poll_options: options.filter(option => option.poll_id === poll.id) })));
        }
        if (req.method === 'GET' && resource === 'poll-answers') {
            const pollId = req.query?.poll_id;
            if (!pollId) return reply(res, 400, { error: 'poll_id is required' });
            return reply(res, 200, await rest(`poll_answers?select=*&poll_id=eq.${encodeURIComponent(pollId)}&order=created_at.desc`));
        }
        if (req.method === 'POST' && resource === 'partners') {
            return reply(res, 201, await insert('partners', pick(req.body, partnerFields)));
        }
        if (req.method === 'PATCH' && resource === 'partners') {
            return reply(res, 200, await update('partners', req.body?.id, pick(req.body, partnerFields)));
        }
        if (req.method === 'DELETE' && resource === 'partners') {
            await remove('partners', req.body?.id);
            return reply(res, 200, { ok: true });
        }
        if (req.method === 'POST' && resource === 'polls') {
            return reply(res, 201, await savePoll(null, req.body));
        }
        if (req.method === 'PATCH' && resource === 'polls') {
            return reply(res, 200, await savePoll(req.body?.id, req.body));
        }
        if (req.method === 'DELETE' && resource === 'polls') {
            await remove('polls', req.body?.id);
            return reply(res, 200, { ok: true });
        }
        return reply(res, 404, { error: 'Unknown admin operation' });
    } catch (error) {
        return reply(res, error.status || 500, { error: error.message });
    }
}

async function savePoll(id, body = {}) {
    const values = pick(body, pollFields);
    const poll = id ? await update('polls', id, values) : await insert('polls', values);
    const pollId = id || poll.id;
    await rest(`poll_options?poll_id=eq.${encodeURIComponent(pollId)}`, { method: 'DELETE' });
    const options = (body.poll_options || []).map((option, index) => ({
        poll_id: pollId,
        label: option.label,
        value: option.value || slugify(option.label),
        sort_order: Number(option.sort_order ?? index),
    }));
    if (options.length) await rest('poll_options', { method: 'POST', body: options });
    return { ...poll, poll_options: options };
}

async function insert(table, values) {
    const rows = await rest(table, { method: 'POST', body: values, prefer: 'return=representation' });
    return rows[0];
}

async function update(table, id, values) {
    requireId(id);
    const rows = await rest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', body: values, prefer: 'return=representation' });
    return rows[0];
}

async function remove(table, id) {
    requireId(id);
    await rest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
}

async function rest(path, { method = 'GET', body, prefer } = {}) {
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!secret) throw Object.assign(new Error('SUPABASE_SECRET_KEY is not configured'), { status: 500 });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        method,
        headers: {
            apikey: secret,
            Authorization: `Bearer ${secret}`,
            'Content-Type': 'application/json',
            ...(prefer ? { Prefer: prefer } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw Object.assign(new Error(data?.message || data?.error || `Supabase error ${response.status}`), { status: response.status });
    return data ?? [];
}

function isAuthorized(req) {
    const expected = process.env.ADMIN_API_TOKEN;
    return Boolean(expected && req.headers['x-admin-token'] === expected);
}

function pick(source = {}, fields) {
    return Object.fromEntries(fields.filter(field => source[field] !== undefined).map(field => [field, source[field] === '' ? null : source[field]]));
}

function requireId(id) {
    if (!id) throw Object.assign(new Error('id is required'), { status: 400 });
}

function slugify(value) {
    return String(value).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
}

function setJson(res) {
    res.setHeader('content-type', 'application/json; charset=utf-8');
}

function reply(res, status, body) {
    res.statusCode = status;
    res.end(JSON.stringify(body));
}
