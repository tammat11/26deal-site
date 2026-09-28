// Ответ хранится как {"value": "0"} / {"values": ["0","2"]} / {"value": "текст"} / {"value": 7};
// для вариантов value — индекс в polls.options (у старых записей — сам текст).
export const optionIndex = (poll, raw) => {
  const opts = Array.isArray(poll.options) ? poll.options : [];
  const i = parseInt(raw, 10);
  if (String(i) === String(raw) && opts[i] !== undefined) return i;
  const byText = opts.indexOf(String(raw));
  return byText >= 0 ? byText : null;
};

export const answerText = (poll, ans) => {
  const opts = Array.isArray(poll.options) ? poll.options : [];
  const a = ans?.answer || {};
  const decode = v => { const i = optionIndex(poll, v); return i === null ? String(v) : opts[i]; };
  if (Array.isArray(a.values)) return a.values.map(decode).join(', ');
  if (a.value === undefined || a.value === null) return '—';
  if (poll.type === 'rating') return `${a.value} / ${poll.scale_max || 5}`;
  if (poll.type === 'nps') return `${a.value} / 10`;
  if (poll.type === 'text') return String(a.value);
  return decode(a.value);
};

export function npsOf(values) {
  const n = values.length;
  if (!n) return null;
  const promoters = values.filter(v => v >= 9).length;
  const detractors = values.filter(v => v <= 6).length;
  return {
    n, promoters, detractors, passives: n - promoters - detractors,
    score: Math.round(((promoters - detractors) / n) * 100),
  };
}

