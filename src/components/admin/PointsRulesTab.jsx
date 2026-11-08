import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';
import { Ico } from './ui';
import { fmtDate, showToast } from './helpers';
import { EVENT_CATEGORIES, PENALTIES, MANUAL_AWARDS, loadPointsSettings } from './points';

// Строки шкалы: ключ в points_settings, подпись, как начисляется.
const RULES = [
  ...EVENT_CATEGORIES.map(c => ({ key: c.value, label: c.label, note: 'за посещение' })),
  { key: 'champion', label: 'Чемпион мероприятия', note: 'сверху к баллам за посещение — отметка «Чемпион» в явке', plus: true },
  { key: 'co_champion', label: 'Со-чемпион мероприятия', note: 'сверху к баллам за посещение — отметка «Со-чемпион» в явке', plus: true },
  ...MANUAL_AWARDS.map(a => ({ key: a.kind, label: a.label, note: 'начисляется вручную в разделе «Баллы»', manual: true })),
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
        .select('id, title, date, category, points, champion_points, co_champion_points, no_show_penalty, late_cancel_penalty, late_penalty, left_early_penalty, is_published')
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
    const field = { champion: 'champion_points', co_champion: 'co_champion_points', no_show: 'no_show_penalty', late_cancel: 'late_cancel_penalty', late: 'late_penalty', left_early: 'left_early_penalty' }[key] || 'points';
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
    const scope = rule.manual
      ? 'Прошлые ручные начисления не пересчитываются — новое значение подставится для будущих.'
      : `Баллы резидентов будут пересчитаны по всем мероприятиям${custom && !overwrite ? ` (кроме ${custom} с ручным значением)` : ''}.`;
    if (!confirm(`«${rule.label}»: ${settings[editKey]} → ${value}.\n${scope}\nПродолжить?`)) return;
    setSaving(true);
    const { data, error } = await supabase.rpc('apply_points_rule', {
      p_key: editKey, p_points: value, p_overwrite_custom: overwrite,
    });
    setSaving(false);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast(rule.manual ? 'Сохранено' : `Сохранено, пересчитано мероприятий: ${data ?? 0}`);
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
          <thead><tr><th>За что</th><th style={{ width: 240 }}>Баллов</th><th>Как начисляется</th><th style={{ width: 160 }}></th></tr></thead>
          <tbody>
            {RULES.map(r => {
              const value = settings[r.key];
              const editing = editKey === r.key;
              const { custom } = editing ? impact(r.key) : { custom: 0 };
              return (
                <tr key={r.key}>
                  <td className="cell-title">{r.label}</td>
                  <td>
                    {editing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {r.penalty && <span className="mono" style={{ color: 'var(--danger)' }}>−</span>}
                          <input type="number" min="0" value={draft} autoFocus style={{ width: 104, fontFamily: 'var(--mono)' }}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') apply(); if (e.key === 'Escape') setEditKey(null); }} />
                        </div>
                        {!r.manual && custom > 0 && (
                          <label className="check-label" style={{ fontSize: 12 }}>
                            <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} />
                            и {custom} мероприятий с ручным значением
                          </label>
                        )}
                      </div>
                    ) : (
                      <span className="td-num" style={{ fontWeight: 500, color: r.penalty ? 'var(--danger)' : 'var(--text)' }}>
                        {r.penalty ? '−' : r.plus ? '+' : ''}{value}
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{r.note}</td>
                  <td>
                    {editing ? (
                      <div className="td-actions">
                        <button className="btn btn-gold btn-sm" onClick={apply} disabled={saving}>{saving ? '…' : 'Применить'}</button>
                        <button className="btn-icon" aria-label="Отмена" title="Отмена" onClick={() => setEditKey(null)} disabled={saving}><Ico i={X} /></button>
                      </div>
                    ) : (
                      <div className="td-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => startEdit(r.key)} disabled={!!editKey}>Изменить</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginBottom: 32, fontSize: 13, lineHeight: '22px', color: 'var(--text-2)', maxWidth: 880 }}>
        <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>Баллы начисляются только за <b style={{ color: 'var(--text)' }}>фактическое посещение</b> — после отметки «Посетил» в карточке мероприятия, не за регистрацию.</li>
          <li>При изменении правила новое значение получают все мероприятия этой категории (кроме тех, где баллы меняли вручную — их можно включить галочкой), и баланс каждого резидента пересчитывается: разница видна строкой в его истории.</li>
          <li>Баллы одного мероприятия можно изменить отдельно — в его карточке.</li>
          <li>Антибаллы: «Не посетил» у подтвердившего участие — списание автоматически; снял «Иду» менее чем за 3 календарных дня — списание автоматически (снимается, если снова записался или пришёл); «Опоздал» и «Ушёл раньше» — баллы за посещение остаются, штраф вычитается. Баланс может быть отрицательным.</li>
          <li>Рейтинг считается за текущий год (по дате мероприятия) и за всё время.</li>
        </ul>
      </div>

      <div className="section-title sm">Мероприятия по категориям</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {EVENT_CATEGORIES.map(c => {
          const list = byCategory[c.value] || [];
          const scale = settings[c.value];
          return (
            <div key={c.value} className="tbl-wrap">
              <div className="tbl-caption" style={list.length ? undefined : { borderBottom: 'none' }}>
                <span>{c.label}</span>
                <span className="hint"><span className="mono" style={{ color: 'var(--text-2)' }}>{scale}</span> по правилу · {list.length} мероприятий</span>
              </div>
              {list.length > 0 && (
                <table>
                  <thead><tr><th style={{ width: 120 }}>Дата</th><th>Мероприятие</th><th style={{ width: 120 }}>Посещение</th><th style={{ width: 128 }}>Чемпионство</th></tr></thead>
                  <tbody>
                    {list.map(e => {
                      const custom = e.points !== scale;
                      const customChamp = e.champion_points !== settings.champion;
                      return (
                        <tr key={e.id}>
                          <td className="td-date">{fmtDate(e.date)}</td>
                          <td style={{ maxWidth: 440 }}>
                            <div className="truncate">{e.title}</div>
                            {!e.is_published && <div className="cell-sub">не опубликовано</div>}
                          </td>
                          <td className="td-num" style={{ color: custom ? 'var(--danger)' : 'var(--text)' }} title={custom ? `Изменено вручную (по правилу ${scale})` : 'По правилу'}>{e.points}</td>
                          <td className="td-num" style={{ color: customChamp ? 'var(--danger)' : 'var(--text-2)' }} title={customChamp ? `Изменено вручную (по правилу ${settings.champion})` : 'По правилу'}>+{e.champion_points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
        <div className="hint">
          <span style={{ color: 'var(--danger)' }}>Красным</span> — баллы мероприятия изменены вручную и отличаются от правила
        </div>
      </div>
    </>
  );
};
