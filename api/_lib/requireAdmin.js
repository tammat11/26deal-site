/* global process */
// Общая проверка для serverless-функций админки.
// Ожидает заголовок `Authorization: Bearer <supabase access token>` вошедшего админа:
//   1) auth.getUser(token) — токен валиден и не истёк;
//   2) rpc('is_admin') от имени этого токена — пользователь есть в public.admin_users.
// Файлы в api/_lib не становятся отдельными эндпоинтами (префикс "_").
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const bearer = req => {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(header).trim());
  return match ? match[1].trim() : '';
};

// Возвращает { ok: true, user } либо { ok: false, status, error }.
export async function requireAdmin(req) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, status: 500, error: 'Server is not configured' };
  }
  const token = bearer(req);
  if (!token) return { ok: false, status: 401, error: 'Unauthorized' };

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return { ok: false, status: 401, error: 'Unauthorized' };

  const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');
  if (rpcError || isAdmin !== true) return { ok: false, status: 403, error: 'Forbidden' };

  return { ok: true, user: userData.user };
}

// Ключ для Edge Function push-broadcast. Только из env, в коде не хранится.
export function pushConfig() {
  const url = process.env.PUSH_FN_URL
    || (SUPABASE_URL ? `${SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/push-broadcast` : '');
  const key = process.env.PUSH_FN_KEY || '';
  return { url, key };
}
