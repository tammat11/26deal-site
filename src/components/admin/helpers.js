// Не-компонентные помощники админки (вынесены из ui.jsx ради fast refresh).

let toastTimer;
export function showToast(msg, type = 'ok') {
  const t = document.getElementById('__toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 2800);
}

export const fmtDate = d => d ? new Date(d).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
export const fmtDateTime = d => d ? new Date(d).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

/** Выгрузка в Excel: sheets = [{ name, rows: [{col: value}] }]. xlsx грузим лениво. */
export async function exportXlsx(fileName, sheets) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ '': 'Нет данных' }]);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, fileName.replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.xlsx');
}

// ── Схема БД: мягкая проверка новых таблиц/колонок ────────────────────────────
// Админка может открыться раньше, чем владелец запустил миграцию. Вместо
// падения показываем «Запустите миграцию …» и не шлём несуществующие колонки.

/** Ошибка PostgREST «таблицы нет» (42P01 / PGRST205 / schema cache). */
export const isMissingTable = err => !!err && (
  err.code === '42P01' || err.code === 'PGRST205' ||
  /relation .* does not exist|could not find the table/i.test(err.message || '')
);

/** Ошибка «колонки нет» (42703 / PGRST204). */
export const isMissingColumn = err => !!err && (
  err.code === '42703' || err.code === 'PGRST204' ||
  /column .* does not exist|could not find the .* column/i.test(err.message || '')
);

const colCache = new Map();
/** Какие из cols реально есть в table. Результат кэшируется на сессию. */
export async function probeColumns(supabase, table, cols) {
  const res = await Promise.all(cols.map(async c => {
    const key = `${table}.${c}`;
    if (!colCache.has(key)) {
      colCache.set(key, supabase.from(table).select(c).limit(1)
        .then(({ error }) => !error || !isMissingColumn(error)));
    }
    return [c, await colCache.get(key)];
  }));
  return new Set(res.filter(([, ok]) => ok).map(([c]) => c));
}

/** Убрать из payload ключи, которых нет в set (колонки из непримененной миграции). */
export const pickCols = (payload, keys, present) => {
  const out = { ...payload };
  for (const k of keys) if (!present.has(k)) delete out[k];
  return out;
};

/** Справочник отраслей. Синхронизирован с kIndustries в lib/core/industries.dart
 *  приложения и check-constraint residents_industry_group_check. */
export const INDUSTRIES = [
  'Строительство и недвижимость',
  'Производство и промышленность',
  'Торговля и дистрибуция',
  'Финансы и инвестиции',
  'IT и телеком',
  'Услуги и консалтинг',
  'Медицина и фарма',
  'Образование',
  'HoReCa и lifestyle',
  'Логистика и транспорт',
  'Агро',
  'Энергетика и ресурсы',
];

export const CLUB_ROLES = [
  'Президент', 'Вице-президент', 'Офицер по мероприятиям', 'Офицер по членству',
  'Офицер по финансам', 'Основатель клуба',
];

/** Статусы публикации документов и ответов «Каспера». */
export const PUB_STATUSES = {
  draft:     { label: 'Черновик',      badge: 'badge-gray' },
  review:    { label: 'На проверке',   badge: 'badge-gold' },
  published: { label: 'Опубликовано',  badge: 'badge-green' },
};
