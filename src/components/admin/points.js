import { supabase } from '../../lib/supabase';

// Базовое начисление по ТЗ. Значение подставляется при выборе категории,
// но админ может поменять баллы для конкретного мероприятия.
export const EVENT_CATEGORIES = [
  { value: 'board',    label: 'Совет директоров',                     points: 100 },
  { value: 'forum',    label: 'Форум',                                points: 150 },
  { value: 'training', label: 'Обучение / тренинг',                   points: 300 },
  { value: 'family',   label: 'Family-мероприятие',                   points: 200 },
  { value: 'sport',    label: 'Спортивное мероприятие',               points: 200 },
  { value: 'business', label: 'Партнёрское / networking / business', points: 100 },
];

export const CHAMPION_POINTS = 300;

// Антибаллы (с 27.10.2026): списываются автоматически по отметкам явки,
// суммы настраиваются на каждое мероприятие.
export const PENALTIES = [
  { key: 'no_show_penalty',    rule: 'no_show',    label: 'Записался «Иду», но не пришёл', points: 100 },
  { key: 'late_penalty',       rule: 'late',       label: 'Опоздал',                       points: 50 },
  { key: 'left_early_penalty', rule: 'left_early', label: 'Ушёл раньше',                   points: 50 },
];
export const REFERRAL_POINTS = 500;

// Значения по умолчанию, если таблица правил ещё не создана.
export const FALLBACK_RULES = {
  ...Object.fromEntries(EVENT_CATEGORIES.map(c => [c.value, c.points])),
  champion: CHAMPION_POINTS,
  referral: REFERRAL_POINTS,
  ...Object.fromEntries(PENALTIES.map(p => [p.rule, p.points])),
};

/** Текущие правила баллов из points_settings (key → points). */
export async function loadPointsSettings() {
  const { data, error } = await supabase.from('points_settings').select('key, points');
  if (error || !data?.length) return { ...FALLBACK_RULES };
  return { ...FALLBACK_RULES, ...Object.fromEntries(data.map(r => [r.key, r.points])) };
}

export const defaultPointsFor = (category, rules = FALLBACK_RULES) =>
  rules[category] ?? EVENT_CATEGORIES.find(c => c.value === category)?.points ?? 100;

export const categoryLabel = category =>
  EVENT_CATEGORIES.find(c => c.value === category)?.label ?? category;

export const LEDGER_KINDS = {
  attendance: 'Посещение',
  champion:   'Чемпионство',
  referral:   'Рекомендация',
  adjustment: 'Корректировка',
  no_show:    'Неявка после записи',
  late:       'Опоздание',
  left_early: 'Ранний уход',
};
