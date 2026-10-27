import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { fmtDate } from './helpers';
import { EVENT_CATEGORIES, CHAMPION_POINTS, REFERRAL_POINTS } from './points';

/**
 * Правила начисления баллов (только просмотр): шкала из ТЗ и реальные
 * баллы каждого мероприятия по категориям. Где баллы события отличаются
 * от шкалы — подсвечено, чтобы было видно ручные изменения.
 */
export const PointsRulesTab = () => {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    supabase.from('events')
      .select('id, title, date, category, points, champion_points, is_published')
      .order('date', { ascending: false })
      .then(({ data }) => setEvents(data || []));
  }, []);

  const byCategory = useMemo(() => {
    const groups = Object.fromEntries(EVENT_CATEGORIES.map(c => [c.value, []]));
    for (const e of events || []) (groups[e.category] ??= []).push(e);
    return groups;
  }, [events]);

  const rules = [
    ...EVENT_CATEGORIES.map(c => ({ label: c.label, points: c.points, note: 'за посещение' })),
    { label: 'Чемпионство мероприятия', points: CHAMPION_POINTS, note: 'сверху к баллам за посещение', plus: true },
    { label: 'Рекомендация кандидата, вступившего в клуб', points: REFERRAL_POINTS, note: 'начисляется вручную в разделе «Баллы»' },
  ];

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Правила баллов</div>
          <div className="section-sub">Сколько баллов за что начисляется. Изменить баллы конкретного мероприятия — в его карточке в разделе «Мероприятия».</div>
        </div>
      </div>

      <div className="tbl-wrap" style={{ marginBottom: 16 }}>
        <table>
          <thead><tr><th>За что</th><th style={{ width: 140 }}>Баллов</th><th>Как начисляется</th></tr></thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.label}>
                <td style={{ fontWeight: 600 }}>{r.label}</td>
                <td><span className="badge badge-gold" style={{ fontSize: 13 }}>{r.plus ? '+' : ''}{r.points}</span></td>
                <td style={{ color: 'var(--muted)', fontSize: 13 }}>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 22, fontSize: 13, lineHeight: 1.6, color: 'var(--muted)' }}>
        • Баллы начисляются только за <b style={{ color: 'var(--text)' }}>фактическое посещение</b> — после отметки «Посетил» в карточке мероприятия, не за регистрацию.<br />
        • Количество баллов можно изменить для каждого мероприятия отдельно — уже начисленные баллы пересчитаются сами.<br />
        • Ошибки исправляются в разделе «Баллы»: корректировка с причиной, история сохраняется.<br />
        • Рейтинг считается за текущий год (по дате мероприятия) и за всё время.
      </div>

      <div className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>Мероприятия по категориям</div>
      {events === null ? <div className="loading"><span className="spinner" /></div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {EVENT_CATEGORIES.map(c => {
            const list = byCategory[c.value] || [];
            return (
              <div key={c.value} className="tbl-wrap">
                <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700 }}>{c.label}</span>
                  <span className="badge badge-gold">{c.points} по шкале</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{list.length} мероприятий</span>
                </div>
                {list.length > 0 && (
                  <table>
                    <thead><tr><th style={{ width: 110 }}>Дата</th><th>Мероприятие</th><th style={{ width: 120 }}>Посещение</th><th style={{ width: 130 }}>Чемпионство</th></tr></thead>
                    <tbody>
                      {list.map(e => {
                        const custom = e.points !== c.points;
                        const customChamp = e.champion_points !== CHAMPION_POINTS;
                        return (
                          <tr key={e.id}>
                            <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                            <td style={{ maxWidth: 420 }}>
                              <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
                              {!e.is_published && <span className="badge badge-gray">не опубликовано</span>}
                            </td>
                            <td>
                              <span className={custom ? 'badge badge-red' : 'badge badge-gold'} title={custom ? `Изменено вручную (по шкале ${c.points})` : 'По шкале'}>{e.points}</span>
                            </td>
                            <td>
                              <span className={customChamp ? 'badge badge-red' : 'badge badge-gray'} title={customChamp ? `Изменено вручную (по шкале ${CHAMPION_POINTS})` : 'По шкале'}>+{e.champion_points}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            <span className="badge badge-red">красным</span> — баллы мероприятия изменены вручную и отличаются от шкалы.
          </div>
        </div>
      )}
    </>
  );
};
