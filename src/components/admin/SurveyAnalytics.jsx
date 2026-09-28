import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Modal, Avatar } from './ui';
import { fmtDateTime, exportXlsx } from './helpers';
import { optionIndex, answerText, npsOf } from './answers';

function summarize(poll, answers) {
  const opts = Array.isArray(poll.options) ? poll.options : [];
  if (poll.type === 'single' || poll.type === 'multiple') {
    const counts = opts.map(() => 0);
    for (const a of answers) {
      const raw = a.answer || {};
      const vals = Array.isArray(raw.values) ? raw.values : (raw.value !== undefined ? [raw.value] : []);
      for (const v of vals) { const i = optionIndex(poll, v); if (i !== null) counts[i]++; }
    }
    return { kind: 'options', rows: opts.map((label, i) => ({ label, count: counts[i] })) };
  }
  const nums = answers.map(a => Number(a.answer?.value)).filter(v => Number.isFinite(v));
  if (poll.type === 'nps') {
    return { kind: 'nps', nps: npsOf(nums), rows: Array.from({ length: 11 }, (_, v) => ({ label: String(v), count: nums.filter(x => x === v).length })) };
  }
  if (poll.type === 'rating') {
    const max = poll.scale_max || 5;
    const avg = nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : null;
    return { kind: 'rating', avg, rows: Array.from({ length: max }, (_, i) => ({ label: String(i + 1), count: nums.filter(x => x === i + 1).length })) };
  }
  return { kind: 'text', items: answers.filter(a => a.answer?.value).map(a => ({ name: a.name, text: String(a.answer.value), at: a.created_at })) };
}

const Bars = ({ rows, total }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    {rows.map((r, i) => {
      const pct = total ? Math.round((r.count / total) * 100) : 0;
      return (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 38%) 1fr 70px', gap: 10, alignItems: 'center', fontSize: 12 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.label}>{r.label}</span>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--s3)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gold)' }} />
          </div>
          <span style={{ color: 'var(--muted)', textAlign: 'right' }}>{r.count} · {pct}%</span>
        </div>
      );
    })}
  </div>
);

export const SurveyAnalytics = ({ survey, onClose }) => {
  const [recipients, setRecipients] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [error, setError] = useState(null);
  const [listTab, setListTab] = useState('pending');

  useEffect(() => {
    (async () => {
      const [rec, qs] = await Promise.all([
        supabase.rpc('survey_recipient_status', { p_survey: survey.id }),
        supabase.from('polls').select('*').eq('survey_id', survey.id).order('sort_order'),
      ]);
      if (rec.error) setError(rec.error.message);
      const ids = (qs.data || []).map(q => q.id);
      const ans = ids.length
        ? await supabase.from('poll_answers_with_resident').select('*').in('poll_id', ids).order('created_at')
        : { data: [] };
      setQuestions(qs.data || []);
      setAnswers(ans.data || []);
      setRecipients(rec.data || []);
    })();
  }, [survey.id]);

  const stats = useMemo(() => {
    const list = recipients || [];
    const responded = list.filter(r => r.responded).length;
    return { total: list.length, responded, pending: list.length - responded, pct: list.length ? Math.round((responded / list.length) * 100) : 0 };
  }, [recipients]);

  const byQuestion = useMemo(() => questions.map(q => {
    const qa = answers.filter(a => a.poll_id === q.id);
    return { q, count: qa.length, summary: summarize(q, qa), answers: qa };
  }), [questions, answers]);

  // Итоговый NPS анкеты: по первому NPS-вопросу (обычно он один).
  const surveyNps = byQuestion.find(x => x.q.type === 'nps')?.summary.nps;

  const doExport = () => exportXlsx(`Опрос — ${survey.title}`, [
    { name: 'Сводка', rows: [
      { 'Показатель': 'Получателей', 'Значение': stats.total },
      { 'Показатель': 'Ответили', 'Значение': stats.responded },
      { 'Показатель': 'Не ответили', 'Значение': stats.pending },
      { 'Показатель': '% заполнения', 'Значение': `${stats.pct}%` },
      ...(surveyNps ? [{ 'Показатель': 'NPS', 'Значение': surveyNps.score }] : []),
      { 'Показатель': 'Анонимный', 'Значение': survey.is_anonymous ? 'Да' : 'Нет' },
    ] },
    { name: 'Результаты', rows: byQuestion.flatMap(({ q, count, summary }) => {
      if (summary.kind === 'text') return summary.items.map(i => ({ 'Вопрос': q.question, 'Вариант / ответ': i.text, 'Кол-во': 1, '%': '' }));
      const base = summary.rows.map(r => ({ 'Вопрос': q.question, 'Вариант / ответ': r.label, 'Кол-во': r.count, '%': count ? Math.round((r.count / count) * 100) : 0 }));
      if (summary.kind === 'nps' && summary.nps) base.push({ 'Вопрос': q.question, 'Вариант / ответ': 'NPS', 'Кол-во': summary.nps.score, '%': '' });
      if (summary.kind === 'rating' && summary.avg !== null) base.push({ 'Вопрос': q.question, 'Вариант / ответ': 'Средняя оценка', 'Кол-во': Number(summary.avg.toFixed(2)), '%': '' });
      return base;
    }) },
    { name: 'Ответы', rows: byQuestion.flatMap(({ q, answers: qa }) => qa.map(a => ({
      'Резидент': survey.is_anonymous ? 'Анонимно' : a.name, 'Компания': survey.is_anonymous ? '' : (a.company || ''),
      'Вопрос': q.question, 'Ответ': answerText(q, a), 'Дата': fmtDateTime(a.created_at),
    }))) },
    { name: 'Ответили', rows: (recipients || []).filter(r => r.responded).map(r => ({ 'Резидент': r.name, 'Компания': r.company || '', 'Дата': fmtDateTime(r.completed_at) })) },
    { name: 'Не ответили', rows: (recipients || []).filter(r => !r.responded).map(r => ({ 'Резидент': r.name, 'Компания': r.company || '' })) },
  ]);

  const shown = (recipients || []).filter(r => (listTab === 'done') === r.responded);

  return (
    <Modal title={`Аналитика — ${survey.title}`} onClose={onClose} wide>
      {error && <div style={{ color: 'var(--danger)', fontSize: 13 }}>Ошибка: {error}. Примените миграцию 2026-09-28.</div>}
      {recipients === null ? <div className="loading"><span className="spinner" /></div> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${surveyNps ? 5 : 4}, 1fr)`, gap: 10 }}>
            {[
              ['Получателей', stats.total],
              ['Ответили', stats.responded],
              ['Не ответили', stats.pending],
              ['Заполнение', `${stats.pct}%`],
              ...(surveyNps ? [['NPS', surveyNps.score]] : []),
            ].map(([label, value]) => (
              <div key={label} className="card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: label === 'NPS' ? 'var(--gold)' : 'var(--text)' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className={listTab === 'pending' ? 'btn btn-gold btn-sm' : 'btn btn-outline btn-sm'} onClick={() => setListTab('pending')}>Не ответили ({stats.pending})</button>
            <button className={listTab === 'done' ? 'btn btn-gold btn-sm' : 'btn btn-outline btn-sm'} onClick={() => setListTab('done')}>Ответили ({stats.responded})</button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-outline btn-sm" onClick={doExport}>⬇ Выгрузить в Excel</button>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {shown.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Пусто</div>}
            {shown.map(r => (
              <div key={r.resident_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 8, background: 'var(--s2)' }}>
                <Avatar url={r.photo_url} name={r.name} size={24} />
                <span style={{ fontSize: 12, flex: 1 }}>{r.name}{r.company ? ` · ${r.company}` : ''}</span>
                {r.completed_at && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtDateTime(r.completed_at)}</span>}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {byQuestion.map(({ q, count, summary }, idx) => (
              <div key={q.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 10 }}>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{idx + 1}.</span>
                  <span style={{ fontWeight: 700, flex: 1 }}>{q.question}</span>
                  <span className="stat-pill">{count} ответов</span>
                </div>
                {summary.kind === 'options' && <Bars rows={summary.rows} total={count} />}
                {summary.kind === 'rating' && <>
                  <div style={{ fontSize: 13, marginBottom: 8 }}>Средняя оценка: <b style={{ color: 'var(--gold)' }}>{summary.avg !== null ? summary.avg.toFixed(2) : '—'}</b> из {q.scale_max || 5}</div>
                  <Bars rows={summary.rows} total={count} />
                </>}
                {summary.kind === 'nps' && <>
                  {summary.nps && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      <span className="badge badge-gold" style={{ fontSize: 13 }}>NPS {summary.nps.score}</span>
                      <span className="badge badge-green">Промоутеры (9–10): {summary.nps.promoters}</span>
                      <span className="badge badge-gray">Нейтралы (7–8): {summary.nps.passives}</span>
                      <span className="badge badge-red">Критики (0–6): {summary.nps.detractors}</span>
                    </div>
                  )}
                  <Bars rows={summary.rows} total={count} />
                </>}
                {summary.kind === 'text' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                    {summary.items.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Ответов пока нет</div>}
                    {summary.items.map((i, k) => (
                      <div key={k} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--s2)', fontSize: 13 }}>
                        <div>{i.text}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{survey.is_anonymous ? 'Анонимно' : i.name} · {fmtDateTime(i.at)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
};
