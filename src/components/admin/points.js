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
export const REFERRAL_POINTS = 500;

export const defaultPointsFor = category =>
  EVENT_CATEGORIES.find(c => c.value === category)?.points ?? 100;

export const categoryLabel = category =>
  EVENT_CATEGORIES.find(c => c.value === category)?.label ?? category;

export const LEDGER_KINDS = {
  attendance: 'Посещение',
  champion:   'Чемпионство',
  referral:   'Рекомендация',
  adjustment: 'Корректировка',
};
