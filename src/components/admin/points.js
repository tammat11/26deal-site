import { supabase } from '../../lib/supabase';

// Шкала клуба (v3). Текущие значения — в таблице points_settings
// («Правила баллов»); здесь — только запасные, если таблица недоступна.
export const EVENT_CATEGORIES = [
  { value: 'board',    label: 'Совет директоров',                     points: 200 },
  { value: 'forum',    label: 'Форум',                                points: 200 },
  { value: 'training', label: 'Обучение / тренинг',                   points: 250 },
  { value: 'family',   label: 'Family-мероприятие',                   points: 200 },
  { value: 'sport',    label: 'Спортивное мероприятие',               points: 100 },
  { value: 'business', label: 'Партнёрское / networking / business', points: 100 },
];

export const CHAMPION_POINTS = 300;
export const CO_CHAMPION_POINTS = 150;

// Начисляются вручную на странице «Баллы».
export const MANUAL_AWARDS = [
  { kind: 'referral',          label: 'Рекомендация кандидата, вступившего в клуб', points: 500, title: 'Рекомендация', needsName: 'Кандидат, вступивший в клуб' },
  { kind: 'site_visit',        label: 'Организация визита на своё предприятие',     points: 300, title: 'Визит на предприятие', needsName: 'Предприятие / тема визита' },
  { kind: 'informal_champion', label: 'Чемпион по неформальной встрече',            points: 200, title: 'Чемпион неформальной встречи', needsName: 'Встреча' },
];

// Антибаллы (с 27.10.2026): списываются автоматически по отметкам явки,
// суммы настраиваются на каждое мероприятие.
export const PENALTIES = [
  { key: 'no_show_penalty',     rule: 'no_show',     label: 'Подтвердил участие, но не пришёл',                 points: 400 },
  { key: 'late_cancel_penalty', rule: 'late_cancel', label: 'Отменил участие менее чем за 3 календарных дня', points: 200 },
  { key: 'late_penalty',        rule: 'late',        label: 'Опоздал на мероприятие',                          points: 50 },
  { key: 'left_early_penalty',  rule: 'left_early',  label: 'Ушёл до завершения мероприятия',                  points: 50 },
];
export const REFERRAL_POINTS = 500;

// Значения по умолчанию, если таблица правил ещё не создана.
export const FALLBACK_RULES = {
  ...Object.fromEntries(EVENT_CATEGORIES.map(c => [c.value, c.points])),
  champion: CHAMPION_POINTS,
  co_champion: CO_CHAMPION_POINTS,
  ...Object.fromEntries(MANUAL_AWARDS.map(a => [a.kind, a.points])),
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
  champion:    'Чемпионство',
  co_champion: 'Со-чемпионство',
  referral:    'Рекомендация',
  site_visit:  'Визит на предприятие',
  informal_champion: 'Чемпион неформальной встречи',
  adjustment:  'Корректировка',
  no_show:     'Неявка после подтверждения',
  late_cancel: 'Поздняя отмена участия',
  late:        'Опоздание',
  left_early:  'Ранний уход',
};
