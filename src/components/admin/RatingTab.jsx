import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Modal, Field, Avatar } from './ui';
import { showToast, fmtDate, exportXlsx } from './helpers';
import { LEDGER_KINDS, REFERRAL_POINTS } from './points';

const THIS_YEAR = new Date().getFullYear();

const pointsText = p => (p > 0 ? `+${p}` : `${p}`);

/**
 * Рейтинг резидентов. Баланс = сумма журнала points_ledger.
 * Баллы за посещение/чемпионство база начисляет сама по отметкам явки;
 * здесь — рекомендации, ручные корректировки и история с отменой.
 */
export const RatingTab = () => {
  const [period, setPeriod] = useState(String(THIS_YEAR));
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const [addMode, setAddMode] = useState(null); // 'referral' | 'adjustment'

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('get_leaderboard', { p_year: period === 'all' ? null : parseInt(period) });
    setError(e ? e.message : null);
    setRows(data || []);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const exportAll = async () => {
    const { data: ledger } = await supabase.from('points_ledger')
      .select('*, residents(name, company)').order('occurred_at', { ascending: false });
    await exportXlsx(`Рейтинг резидентов ${period === 'all' ? 'за всё время' : period}`, [
      { name: 'Рейтинг', rows: (rows || []).map(r => ({ 'Место': r.place, 'Резидент': r.name, 'Компания': r.company || '', 'Баллы': r.points })) },
      { name: 'Начисления', rows: (ledger || []).map(l => ({
        'Дата': fmtDate(l.occurred_at), 'Резидент': l.residents?.name || '', 'Вид': LEDGER_KINDS[l.kind] || l.kind,
        'Мероприятие / действие': l.title, 'Баллы': l.points, 'Комментарий': l.comment || '',
      })) },
    ]);
  };

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Рейтинг резидентов</div>
          <div className="section-sub">Баллы за посещение начисляются автоматически после отметки «Посетил» в мероприятии</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={{ width: 150 }}>
            <option value={String(THIS_YEAR)}>{THIS_YEAR} год</option>
            <option value={String(THIS_YEAR - 1)}>{THIS_YEAR - 1} год</option>
            <option value="all">За всё время</option>
          </select>
          <button className="btn btn-outline" onClick={exportAll} disabled={!rows?.length}>⬇ Excel</button>
          <button className="btn btn-outline" onClick={() => setAddMode('adjustment')}>± Корректировка</button>
          <button className="btn btn-gold" onClick={() => setAddMode('referral')}>+ Рекомендация</button>
        </div>
      </div>

      {error && <div className="card" style={{ color: 'var(--danger)', marginBottom: 16 }}>Не удалось загрузить рейтинг: {error}. Примените миграцию 2026-09-28_points_and_surveys_v2.sql.</div>}

      <div className="tbl-wrap">
        <table>
          <thead><tr><th style={{ width: 60 }}>Место</th><th>Резидент</th><th style={{ width: 120 }}>Баллы</th><th style={{ width: 120 }}></th></tr></thead>
          <tbody>
            {(rows || []).map(r => (
              <tr key={r.resident_id}>
                <td style={{ fontWeight: 800, color: r.place <= 3 && r.points > 0 ? 'var(--gold)' : 'var(--muted)' }}>{r.place}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar url={r.photo_url} name={r.name} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.name}</div>
                      {r.company && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.company}</div>}
                    </div>
                  </div>
                </td>
                <td><span className="badge badge-gold" style={{ fontSize: 13 }}>{r.points}</span></td>
                <td><button className="btn btn-outline btn-sm" onClick={() => setHistoryFor(r)}>История</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows === null && <div className="loading"><span className="spinner" /></div>}
        {rows?.length === 0 && !error && <div className="loading" style={{ color: 'var(--muted)' }}>Резидентов нет</div>}
      </div>

      {historyFor && <HistoryModal resident={historyFor} onClose={() => setHistoryFor(null)} onChanged={load} />}
      {addMode && <AddPointsModal mode={addMode} residents={rows || []} onClose={() => setAddMode(null)} onSaved={() => { setAddMode(null); load(); }} />}
    </>
  );
};

const HistoryModal = ({ resident, onClose, onChanged }) => {
  const [items, setItems] = useState(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('points_ledger').select('*')
      .eq('resident_id', resident.resident_id).order('occurred_at', { ascending: false }).order('created_at', { ascending: false });
    setItems(data || []);
  }, [resident.resident_id]);

  useEffect(() => { load(); }, [load]);

  const reversedIds = new Set((items || []).map(i => i.reverses).filter(Boolean));
  const total = (items || []).reduce((s, i) => s + i.points, 0);

  const reverse = async item => {
    const reason = prompt(`Отменить начисление «${item.title}» (${pointsText(item.points)})?\nУкажите причину:`);
    if (reason === null) return;
    const { error } = await supabase.from('points_ledger').insert({
      resident_id: item.resident_id, kind: 'adjustment', points: -item.points,
      title: `Отмена: ${item.title}`, comment: reason || null, reverses: item.id,
    });
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Начисление отменено');
    load(); onChanged();
  };

  return (
    <Modal title={`История баллов — ${resident.name}`} onClose={onClose} wide>
      <div className="stat-pill" style={{ alignSelf: 'flex-start' }}>Баланс за всё время: {total}</div>
      {items === null ? <div className="loading"><span className="spinner" /></div> : items.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Начислений пока нет</div>
      ) : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Дата</th><th>Мероприятие / действие</th><th>Баллы</th><th></th></tr></thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDate(i.occurred_at)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{i.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{LEDGER_KINDS[i.kind]}{i.comment ? ` · ${i.comment}` : ''}</div>
                  </td>
                  <td style={{ fontWeight: 700, color: i.points >= 0 ? 'var(--success)' : 'var(--danger)' }}>{pointsText(i.points)}</td>
                  <td>
                    {(i.kind === 'referral' || i.kind === 'adjustment') && !i.reverses && !reversedIds.has(i.id) && (
                      <button className="btn btn-danger btn-xs" onClick={() => reverse(i)}>Отменить</button>
                    )}
                    {(i.kind === 'attendance' || i.kind === 'champion') && (
                      <span title="Чтобы исправить, измените отметку в карточке мероприятия" style={{ fontSize: 11, color: 'var(--muted)' }}>авто</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};

const AddPointsModal = ({ mode, residents, onClose, onSaved }) => {
  const isReferral = mode === 'referral';
  const [form, setForm] = useState({
    resident_id: '', points: isReferral ? REFERRAL_POINTS : '', candidate: '', comment: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const points = parseInt(form.points);
    if (!form.resident_id) return showToast('Выберите резидента', 'err');
    if (!points) return showToast('Укажите количество баллов', 'err');
    if (isReferral && !form.candidate.trim()) return showToast('Укажите вступившего кандидата', 'err');
    if (!isReferral && !form.comment.trim()) return showToast('Укажите причину корректировки', 'err');
    setSaving(true);
    const { error } = await supabase.from('points_ledger').insert({
      resident_id: form.resident_id,
      kind: mode,
      points,
      title: isReferral ? `Рекомендация: ${form.candidate.trim()}` : 'Корректировка',
      comment: form.comment.trim() || null,
      occurred_at: new Date(`${form.date}T12:00:00`).toISOString(),
    });
    setSaving(false);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Баллы начислены');
    onSaved();
  };

  return (
    <Modal title={isReferral ? 'Рекомендация кандидата' : 'Корректировка баллов'} onClose={onClose} onSave={save} saving={saving}>
      <div className="form-grid">
        <div className="field full"><label>Резидент *</label>
          <select value={form.resident_id} onChange={e => setForm(f => ({ ...f, resident_id: e.target.value }))}>
            <option value="">— выберите —</option>
            {[...residents].sort((a, b) => a.name.localeCompare(b.name)).map(r => <option key={r.resident_id} value={r.resident_id}>{r.name}</option>)}
          </select>
        </div>
        {isReferral && (
          <div className="field full"><label>Кандидат, вступивший в клуб *</label>
            <input type="text" value={form.candidate} onChange={e => setForm(f => ({ ...f, candidate: e.target.value }))} placeholder="ФИО нового резидента" />
          </div>
        )}
        <Field label={isReferral ? 'Баллы' : 'Баллы (минус — списание)'}>
          <input type="number" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))} placeholder="-100" />
        </Field>
        <Field label="Дата"><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
        <div className="field full"><label>{isReferral ? 'Комментарий' : 'Причина *'}</label>
          <textarea rows={2} value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} />
        </div>
      </div>
    </Modal>
  );
};
