import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Field, Avatar } from './ui';
import { showToast, fmtDate, fmtDateTime } from './helpers';
import { LEDGER_KINDS, FALLBACK_RULES, loadPointsSettings } from './points';

const THIS_YEAR = new Date().getFullYear();
const QUICK = [100, 300, 500, -100, -300];
const pointsText = p => (p > 0 ? `+${p}` : `${p}`);
const today = () => new Date().toISOString().slice(0, 10);

/**
 * Корректировка баллов: выбрать резидента → начислить / списать с причиной.
 * Журнал только дописывается: ошибочная запись отменяется обратной строкой,
 * история сохраняется. Баллы за посещение здесь не правятся — они следуют
 * за отметкой явки в карточке мероприятия.
 */
export const PointsTab = () => {
  const [residents, setResidents] = useState(null);   // [{resident_id, name, company, photo_url, all, year}]
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [recent, setRecent] = useState([]);
  const [form, setForm] = useState({ kind: 'adjustment', points: '', comment: '', candidate: '', date: today() });
  const [saving, setSaving] = useState(false);
  const [referralPoints, setReferralPoints] = useState(FALLBACK_RULES.referral);

  useEffect(() => { loadPointsSettings().then(r => setReferralPoints(r.referral)); }, []);

  const loadBalances = useCallback(async () => {
    const [all, year] = await Promise.all([
      supabase.rpc('get_leaderboard', { p_year: null }),
      supabase.rpc('get_leaderboard', { p_year: THIS_YEAR }),
    ]);
    if (all.error) { showToast('Не удалось загрузить баллы: ' + all.error.message, 'err'); setResidents([]); return; }
    const yearBy = Object.fromEntries((year.data || []).map(r => [r.resident_id, r.points]));
    setResidents((all.data || [])
      .map(r => ({ ...r, all: r.points, year: yearBy[r.resident_id] ?? 0 }))
      .sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const loadRecent = useCallback(async () => {
    const { data } = await supabase.from('points_ledger')
      .select('*, residents(name)')
      .in('kind', ['adjustment', 'referral'])
      .order('created_at', { ascending: false })
      .limit(30);
    setRecent(data || []);
  }, []);

  const loadHistory = useCallback(async id => {
    if (!id) { setHistory([]); return; }
    const { data } = await supabase.from('points_ledger').select('*')
      .eq('resident_id', id)
      .order('occurred_at', { ascending: false })
      .order('created_at', { ascending: false });
    setHistory(data || []);
  }, []);

  useEffect(() => { loadBalances(); loadRecent(); }, [loadBalances, loadRecent]);
  useEffect(() => { loadHistory(selectedId); }, [selectedId, loadHistory]);

  const selected = useMemo(
    () => (residents || []).find(r => r.resident_id === selectedId) || null,
    [residents, selectedId],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (residents || []).filter(r => !q || `${r.name} ${r.company || ''}`.toLowerCase().includes(q));
  }, [residents, query]);

  // Отменённые строки и сами отмены не отменяются повторно.
  const reversedIds = useMemo(
    () => new Set([...history, ...recent].map(i => i.reverses).filter(Boolean)),
    [history, recent],
  );

  const refreshAll = async () => { await Promise.all([loadBalances(), loadRecent(), loadHistory(selectedId)]); };

  const save = async () => {
    const points = parseInt(form.points, 10);
    const isReferral = form.kind === 'referral';
    if (!selected) return showToast('Выберите резидента', 'err');
    if (!points) return showToast('Укажите количество баллов', 'err');
    if (isReferral && !form.candidate.trim()) return showToast('Укажите вступившего кандидата', 'err');
    if (!isReferral && !form.comment.trim()) return showToast('Укажите причину', 'err');
    setSaving(true);
    const { error } = await supabase.from('points_ledger').insert({
      resident_id: selected.resident_id,
      kind: form.kind,
      points,
      title: isReferral ? `Рекомендация: ${form.candidate.trim()}` : 'Корректировка',
      comment: form.comment.trim() || null,
      occurred_at: new Date(`${form.date}T12:00:00`).toISOString(),
    });
    setSaving(false);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast(`${selected.name}: ${pointsText(points)} баллов`);
    setForm(f => ({ ...f, points: '', comment: '', candidate: '' }));
    refreshAll();
  };

  const reverse = async item => {
    const reason = prompt(`Отменить «${item.title}» (${pointsText(item.points)})?\nУкажите причину:`);
    if (reason === null) return;
    const { error } = await supabase.from('points_ledger').insert({
      resident_id: item.resident_id, kind: 'adjustment', points: -item.points,
      title: `Отмена: ${item.title}`, comment: reason || null, reverses: item.id,
    });
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Начисление отменено');
    refreshAll();
  };

  const canReverse = i => (i.kind === 'referral' || i.kind === 'adjustment') && !i.reverses && !reversedIds.has(i.id);

  if (residents === null) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Корректировка баллов</div>
          <div className="section-sub">Начисление и списание вручную — с причиной, история сохраняется. Баллы за посещение меняются отметкой явки в мероприятии.</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* ── Резиденты ── */}
        <div className="card" style={{ padding: 12, flex: '1 1 280px', maxWidth: 380 }}>
          <input type="text" placeholder="Поиск резидента" value={query} onChange={e => setQuery(e.target.value)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10, maxHeight: 560, overflowY: 'auto' }}>
            {filtered.map(r => (
              <button key={r.resident_id} type="button" onClick={() => setSelectedId(r.resident_id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer',
                  textAlign: 'left', font: 'inherit', color: 'var(--text)',
                  background: r.resident_id === selectedId ? 'var(--gold-dim)' : 'transparent',
                  border: `1px solid ${r.resident_id === selectedId ? 'rgba(212,168,83,.4)' : 'transparent'}`,
                }}>
                <Avatar url={r.photo_url} name={r.name} size={30} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                  {r.company && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.company}</span>}
                </span>
                <span className="badge badge-gold" title="Баланс за всё время">{r.all}</span>
              </button>
            ))}
            {filtered.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13, padding: 8 }}>Никого не найдено</div>}
          </div>
        </div>

        {/* ── Форма + история ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: '3 1 420px', minWidth: 0 }}>
          {!selected ? (
            <div className="card" style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>Выберите резидента слева</div>
          ) : (
            <>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <Avatar url={selected.photo_url} name={selected.name} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{selected.name}</div>
                    {selected.company && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{selected.company}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)' }}>{selected.all}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>всего · {selected.year} за {THIS_YEAR}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {[['adjustment', 'Корректировка'], ['referral', 'Рекомендация кандидата']].map(([v, l]) => (
                    <button key={v} type="button"
                      className={form.kind === v ? 'btn btn-gold btn-sm' : 'btn btn-outline btn-sm'}
                      onClick={() => setForm(f => ({ ...f, kind: v, points: v === 'referral' && !f.points ? String(referralPoints) : f.points }))}>
                      {l}
                    </button>
                  ))}
                </div>

                <div className="form-grid">
                  <Field label="Баллы (минус — списание)">
                    <input type="number" value={form.points} placeholder="например 100 или -100"
                      onChange={e => setForm(f => ({ ...f, points: e.target.value }))} />
                  </Field>
                  <Field label="Дата"><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
                  <div className="field full" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {QUICK.map(q => (
                      <button key={q} type="button" className="btn btn-outline btn-xs"
                        style={{ color: q < 0 ? 'var(--danger)' : 'var(--success)' }}
                        onClick={() => setForm(f => ({ ...f, points: String(q) }))}>{pointsText(q)}</button>
                    ))}
                  </div>
                  {form.kind === 'referral' && (
                    <div className="field full"><label>Кандидат, вступивший в клуб *</label>
                      <input type="text" value={form.candidate} placeholder="ФИО нового резидента"
                        onChange={e => setForm(f => ({ ...f, candidate: e.target.value }))} />
                    </div>
                  )}
                  <div className="field full"><label>{form.kind === 'referral' ? 'Комментарий' : 'Причина *'}</label>
                    <textarea rows={2} value={form.comment} placeholder={form.kind === 'referral' ? '' : 'Например: ошибочно отмечено посещение СД 12.10'}
                      onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                  <button className="btn btn-gold" onClick={save} disabled={saving}>
                    {saving ? <><span className="spinner" /> Сохранение…</> : (parseInt(form.points, 10) < 0 ? 'Списать баллы' : 'Начислить баллы')}
                  </button>
                </div>
              </div>

              <div className="tbl-wrap">
                <div style={{ padding: '10px 14px', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>История резидента</div>
                <table>
                  <thead><tr><th>Дата</th><th>Мероприятие / действие</th><th>Баллы</th><th></th></tr></thead>
                  <tbody>
                    {history.map(i => (
                      <tr key={i.id}>
                        <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDate(i.occurred_at)}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{i.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{LEDGER_KINDS[i.kind]}{i.comment ? ` · ${i.comment}` : ''}</div>
                        </td>
                        <td style={{ fontWeight: 700, color: i.points >= 0 ? 'var(--success)' : 'var(--danger)' }}>{pointsText(i.points)}</td>
                        <td>
                          {canReverse(i) && <button className="btn btn-danger btn-xs" onClick={() => reverse(i)}>Отменить</button>}
                          {(i.kind === 'attendance' || i.kind === 'champion') && (
                            <span title="Меняется отметкой в карточке мероприятия" style={{ fontSize: 11, color: 'var(--muted)' }}>авто</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {history.length === 0 && <div className="loading" style={{ color: 'var(--muted)' }}>Начислений пока нет</div>}
              </div>
            </>
          )}

          <div className="tbl-wrap">
            <div style={{ padding: '10px 14px', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>Последние ручные изменения</div>
            <table>
              <thead><tr><th>Когда</th><th>Резидент</th><th>Что</th><th>Баллы</th><th></th></tr></thead>
              <tbody>
                {recent.map(i => (
                  <tr key={i.id}>
                    <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDateTime(i.created_at)}</td>
                    <td style={{ fontWeight: 600, cursor: 'pointer' }} onClick={() => setSelectedId(i.resident_id)}>{i.residents?.name || '—'}</td>
                    <td>
                      <div>{i.title}</div>
                      {i.comment && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{i.comment}</div>}
                    </td>
                    <td style={{ fontWeight: 700, color: i.points >= 0 ? 'var(--success)' : 'var(--danger)' }}>{pointsText(i.points)}</td>
                    <td>{canReverse(i) && <button className="btn btn-danger btn-xs" onClick={() => reverse(i)}>Отменить</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recent.length === 0 && <div className="loading" style={{ color: 'var(--muted)' }}>Ручных изменений пока не было</div>}
          </div>
        </div>
      </div>
    </>
  );
};
