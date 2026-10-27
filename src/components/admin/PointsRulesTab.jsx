import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { fmtDate, showToast } from './helpers';
import { EVENT_CATEGORIES, PENALTIES, loadPointsSettings } from './points';

// Строки шкалы: ключ в points_settings, подпись, как начисляется.
const RULES = [
  ...EVENT_CATEGORIES.map(c => ({ key: c.value, label: c.label, note: 'за посещение' })),
  { key: 'champion', label: 'Чемпионство мероприятия', note: 'сверху к баллам за посещение', plus: true },
  { key: 'referral', label: 'Рекомендация кандидата, вступившего в клуб', note: 'начисляется вручную в разделе «Баллы»' },
  ...PENALTIES.map(p => ({ key: p.rule, label: p.label, note: 'антибаллы — по отметке в карточке мероприятия (с 27.10.2026)', penalty: true })),
];

/**
 * Правила начисления баллов: шкала с правкой значений. Новое значение
 * переносится на мероприятия, и база сама пересчитывает баллы всех
 * отмеченных резидентов (разница — строкой в истории). Ниже — реальные
 * баллы каждого мероприятия по категориям, ручные отличия подсвечены.
 */
export const PointsRulesTab = () => {
  const [settings, setSettings] = useState(null);
  const [events, setEvents] = useState(null);
  const [editKey, setEditKey] = useState(null);
  const [draft, setDraft] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [s, e] = await Promise.all([
      loadPointsSettings(),
      supabase.from('events')
        .select('id, title, date, category, points, champion_points, no_show_penalty, late_penalty, left_early_penalty, is_published')
        .order('date', { ascending: false }),
    ]);
    setSettings(s);
    setEvents(e.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const byCategory = useMemo(() => {
    const groups = Object.fromEntries(EVENT_CATEGORIES.map(c => [c.value, []]));
    for (const e of events || []) (groups[e.category] ??= []).push(e);
    return groups;
  }, [events]);

  // Сколько мероприятий затронет правка и сколько из них с ручным значением.
  const impact = key => {
    const cur = settings?.[key];
    const field = { champion: 'champion_points', no_show: 'no_show_penalty', late: 'late_penalty', left_early: 'left_early_penalty' }[key] || 'points';
    const list = (events || []).filter(e => field !== 'points' || e.category === key);
    return { total: list.length, custom: list.filter(e => e[field] !== cur).length };
  };

  const startEdit = key => { setEditKey(key); setDraft(String(settings[key])); setOverwrite(false); };

  const apply = async () => {
    const value = parseInt(draft, 10);
    if (!Number.isInteger(value) || value < 0) return showToast('Введите целое число от 0', 'err');
    if (value === settings[editKey]) { setEditKey(null); return; }
    const rule = RULES.find(r => r.key === editKey);
    const { custom } = impact(editKey);
    const scope = editKey === 'referral'
      ? 'Прошлые рекомендации не пересчитываются — новое значение подставится для будущих.'
      : `Баллы резидентов будут пересчитаны по всем мероприятиям${custom && !overwrite ? ` (кроме ${custom} с ручным значением)` : ''}.`;
    if (!confirm(`«${rule.label}»: ${settings[editKey]} → ${value}.\n${scope}\nПродолжить?`)) return;
    setSaving(true);
    const { data, error } = await supabase.rpc('apply_points_rule', {
      p_key: editKey, p_points: value, p_overwrite_custom: overwrite,
    });
    setSaving(false);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast(editKey === 'referral' ? 'Сохранено' : `Сохранено, пересчитано мероприятий: ${data ?? 0}`);
    setEditKey(null);
    load();
  };

  if (settings === null || events === null) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Правила баллов</div>
          <div className="section-sub">Сколько баллов за что начисляется. «Изменить» — новое значение применяется к мероприятиям, баллы резидентов пересчитываются автоматически.</div>
        </div>
      </div>

      <div className="tbl-wrap" style={{ marginBottom: 16 }}>
        <table>
          <thead><tr><th>За что</th><th style={{ width: 260 }}>Баллов</th><th>Как начисляется</th><th style={{ width: 110 }}></th></tr></thead>
          <tbody>
            {RULES.map(r => {
              const value = settings[r.key];
              const editing = editKey === r.key;
              const { custom } = editing ? impact(r.key) : { custom: 0 };
              return (
                <tr key={r.key}>
                  <td style={{ fontWeight: 600 }}>{r.label}</td>
                  <td>
                    {editing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {r.penalty && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>−</span>}
                          <input type="number" min="0" value={draft} autoFocus style={{ width: 100 }}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') apply(); if (e.key === 'Escape') setEditKey(null); }} />
                        </div>
                        {r.key !== 'referral' && custom > 0 && (
                          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: 'var(--muted)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
                            и {custom} мероприятий с ручным значением
                          </label>
                        )}
                      </div>
                    ) : (
                      <span className={r.penalty ? 'badge badge-red' : 'badge badge-gold'} style={{ fontSize: 13 }}>
                        {r.penalty ? '−' : r.plus ? '+' : ''}{value}
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: 13 }}>{r.note}</td>
                  <td>
                    {editing ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-gold btn-xs" onClick={apply} disabled={saving}>{saving ? '…' : 'Применить'}</button>
                        <button className="btn btn-outline btn-xs" onClick={() => setEditKey(null)} disabled={saving}>✕</button>
                      </div>
                    ) : (
                      <button className="btn btn-outline btn-xs" onClick={() => startEdit(r.key)} disabled={!!editKey}>Изменить</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 22, fontSize: 13, lineHeight: 1.6, color: 'var(--muted)' }}>
        • Баллы начисляются только за <b style={{ color: 'var(--text)' }}>фактическое посещение</b> — после отметки «Посетил» в карточке мероприятия, не за регистрацию.<br />
        • При изменении правила новое значение получают все мероприятия этой категории (кроме тех, где баллы меняли вручную — их можно включить галочкой), и баланс каждого резидента пересчитывается: разница видна строкой в его истории.<br />
        • Баллы одного мероприятия можно изменить отдельно — в его карточке.<br />
        • Антибаллы: «Не посетил» у записавшегося «Иду» — списание автоматически; «Опоздал» и «Ушёл раньше» — баллы за посещение остаются, штраф вычитается. Баланс может быть отрицательным.<br />
        • Рейтинг считается за текущий год (по дате мероприятия) и за всё время.
      </div>

      <div className="section-title" style={{ fontSize: 16, marginBottom: 12 }}>Мероприятия по категориям</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {EVENT_CATEGORIES.map(c => {
          const list = byCategory[c.value] || [];
          const scale = settings[c.value];
          return (
            <div key={c.value} className="tbl-wrap">
              <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700 }}>{c.label}</span>
                <span className="badge badge-gold">{scale} по правилу</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{list.length} мероприятий</span>
              </div>
              {list.length > 0 && (
                <table>
                  <thead><tr><th style={{ width: 110 }}>Дата</th><th>Мероприятие</th><th style={{ width: 120 }}>Посещение</th><th style={{ width: 130 }}>Чемпионство</th></tr></thead>
                  <tbody>
                    {list.map(e => {
                      const custom = e.points !== scale;
                      const customChamp = e.champion_points !== settings.champion;
                      return (
                        <tr key={e.id}>
                          <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                          <td style={{ maxWidth: 420 }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
                            {!e.is_published && <span className="badge badge-gray">не опубликовано</span>}
                          </td>
                          <td>
                            <span className={custom ? 'badge badge-red' : 'badge badge-gold'} title={custom ? `Изменено вручную (по правилу ${scale})` : 'По правилу'}>{e.points}</span>
                          </td>
                          <td>
                            <span className={customChamp ? 'badge badge-red' : 'badge badge-gray'} title={customChamp ? `Изменено вручную (по правилу ${settings.champion})` : 'По правилу'}>+{e.champion_points}</span>
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
          <span className="badge badge-red">красным</span> — баллы мероприятия изменены вручную и отличаются от правила.
        </div>
      </div>
    </>
  );
};
