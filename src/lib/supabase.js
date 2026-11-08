import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://xhsyvdflxfkywkuhwfwk.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_gsCUZrj_9Nu-LRGg9sJI8w_iYPomAOH';

// Параметры редиректа Supabase Auth (ссылка «Забыли пароль?» → /admin#...&type=recovery).
// Читаем ДО createClient: supabase-js сам разбирает и очищает hash при инициализации,
// а чанк админки грузится позже и событие PASSWORD_RECOVERY может пропустить.
const readAuthRedirect = () => {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return {
    type: p.get('type') || null,
    error: p.get('error_description') ? p.get('error_description').replace(/\+/g, ' ') : null,
  };
};
export const authRedirect = readAuthRedirect();

// Единственный клиент на всё приложение (сайт и админка). Сессию админа
// (Supabase Auth) supabase-js хранит в localStorage и обновляет сам.
export const supabase = createClient(url, key);
