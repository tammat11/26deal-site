import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Compass, Settings, ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { Modal, Field, Avatar, Empty, MigrationNotice, Banner, Ico } from './ui';
import { showToast, fmtDate, isMissingTable } from './helpers';

/**
 * Онбординг новых резидентов + Buddy (план 5.20, 5.22, 6.3; решение 3.6).
 * Таблицы: resident_onboarding, club_settings
 * (миграция supabase/migrations/2026-11-09_onboarding_buddy.sql в 26ClubAPP).
 *
 * Назначение Buddy пишет в resident_onboarding — триггер в БД сам шлёт пуш
 * обоим и кладёт уведомление в приложение.
 */

const MIGRATION = '2026-11-09_onboarding_buddy.sql';
const DEFAULT_TERM = 90;

const slug = s => (s || '').toLowerCase()
  .replace(/[^a-z0-9а-яё]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 40) || `item_${Date.now()}`;

const addDays = (days, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
};

const daysLeft = until => until ? Math.ceil((new Date(until) - Date.now()) / 86400000) : null;

export const OnboardingTab = () => {
  const [rows, setRows] = useState(null);         // resident_onboarding[]
  const [residents, setResidents] = useState([]);
  const [settings, setSettings] = useState({ founder_video_url: '', buddy_term_days: DEFAULT_TERM, onboarding_checklist: [] });
  const [missing, setMissing] = useState(false);
  const [filter, setFilter] = useState('active'); // active | done | all | none
  const [query, setQuery] = useState('');
  const [assign, setAssign] = useState(null);     // { resident, buddyId, term, until }
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [o, r, s] = await Promise.all([
      supabase.from('resident_onboarding').select('*'),
      supabase.from('residents').select('id,name,company,photo_url,phone,is_published').order('name'),
      supabase.from('club_settings').select('key,value'),
    ]);
    if (o.error && isMissingTable(o.error)) { setMissing(true); setRows([]); return; }
    if (o.error) showToast('Ошибка загрузки: ' + o.error.message, 'err');
    setRows(o.data || []);
    setResidents(r.data || []);
    const map = Object.fromEntries((s.data || []).map(x => [x.key, x.value]));
    setSettings({
      founder_video_url: typeof map.founder_video_url === 'string' ? map.founder_video_url : '',
      buddy_term_days: Number(map.buddy_term_days) || DEFAULT_TERM,
      onboarding_checklist: Array.isArray(map.onboarding_checklist) ? map.onboarding_checklist : [],
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const byId = useMemo(() => Object.fromEntries(residents.map(r => [r.id, r])), [residents]);
  const rowById = useMemo(() => Object.fromEntries((rows || []).map(o => [o.resident_id, o])), [rows]);
  const itemIds = useMemo(() => settings.onboarding_checklist.map(i => i.id).filter(Boolean), [settings]);

  const progressOf = o => {
    const done = (o.completed_items || []).filter(id => itemIds.includes(id)).length;
    return { done, total: itemIds.length };
  };

  const statusOf = o => {
    // tone — цвет тихой подписи статуса
    if (!o) return { label: 'Не назначен', tone: 'var(--muted)' };
    if (o.completed_at) return { label: 'Пройден', tone: 'var(--success)' };
    const { done } = progressOf(o);
    return done > 0 ? { label: 'В процессе', tone: 'var(--text)' } : { label: 'Не начат', tone: 'var(--text-2)' };
  };

  // ── Действия ───────────────────────────────────────────────────────
  const startOnboarding = async resident => {
    const { error } = await supabase.from('resident_onboarding')
      .upsert({ resident_id: resident.id }, { onConflict: 'resident_id', ignoreDuplicates: true });
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast(`Онбординг начат: ${resident.name}`);
    load();
  };

  const removeOnboarding = async resident => {
    if (!confirm(`Убрать онбординг у «${resident.name}»? Прогресс и Buddy будут удалены.`)) return;
    const { error } = await supabase.from('resident_onboarding').delete().eq('resident_id', resident.id);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Онбординг удалён'); load();
  };

  const openAssign = resident => {
    const o = rowById[resident.id];
    const term = settings.buddy_term_days || DEFAULT_TERM;
    setAssign({
      resident,
      buddyId: o?.buddy_resident_id || '',
      originalBuddy: o?.buddy_resident_id || '',
      term,
      until: (o?.buddy_until ? new Date(o.buddy_until) : addDays(term)).toISOString().slice(0, 10),
      search: '',
    });
  };

  const saveAssign = async () => {
    const a = assign;
    if (!a.buddyId) return showToast('Выберите Buddy', 'err');
    if (a.buddyId === a.resident.id) return showToast('Резидент не может быть Buddy сам себе', 'err');
    setSaving(true);
    const changed = a.buddyId !== a.originalBuddy;
    const payload = {
      resident_id: a.resident.id,
      buddy_resident_id: a.buddyId,
      buddy_until: new Date(`${a.until}T23:59:59`).toISOString(),
      ...(changed ? { buddy_assigned_at: new Date().toISOString() } : {}),
    };
    const { error } = await supabase.from('resident_onboarding').upsert(payload, { onConflict: 'resident_id' });
    setSaving(false);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast(changed ? 'Buddy назначен — уведомления отправлены' : 'Срок обновлён');
    setAssign(null); load();
  };

  const unassign = async () => {
    if (!confirm('Снять Buddy?')) return;
    setSaving(true);
    const { error } = await supabase.from('resident_onboarding')
      .update({ buddy_resident_id: null }).eq('resident_id', assign.resident.id);
    setSaving(false);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Buddy снят'); setAssign(null); load();
  };

  // ── Настройки ──────────────────────────────────────────────────────
  const openSettings = () => {
    setDraft({
      founder_video_url: settings.founder_video_url,
      buddy_term_days: settings.buddy_term_days,
      onboarding_checklist: settings.onboarding_checklist.map(i => ({ ...i })),
    });
    setSettingsOpen(true);
  };

  const setItem = (idx, patch) => setDraft(d => ({
    ...d, onboarding_checklist: d.onboarding_checklist.map((it, i) => i === idx ? { ...it, ...patch } : it),
  }));
  const moveItem = (idx, dir) => setDraft(d => {
    const list = [...d.onboarding_checklist];
    const j = idx + dir;
    if (j < 0 || j >= list.length) return d;
    [list[idx], list[j]] = [list[j], list[idx]];
    return { ...d, onboarding_checklist: list };
  });
  const removeItem = idx => setDraft(d => ({ ...d, onboarding_checklist: d.onboarding_checklist.filter((_, i) => i !== idx) }));
  const addItem = () => setDraft(d => ({ ...d, onboarding_checklist: [...d.onboarding_checklist, { id: '', title: '', description: '', _new: true }] }));

  const saveSettings = async () => {
    const term = parseInt(draft.buddy_term_days, 10);
    if (!term || term < 1 || term > 730) return showToast('Срок Buddy: от 1 до 730 дней', 'err');
    const url = (draft.founder_video_url || '').trim();
    if (url && !/^https?:\/\//i.test(url)) return showToast('Ссылка на видео должна начинаться с http(s)://', 'err');
    const seen = new Set();
    const checklist = [];
    for (const it of draft.onboarding_checklist) {
      const title = (it.title || '').trim();
      if (!title) continue;
      let id = (it.id || '').trim() || slug(title);
      while (seen.has(id)) id = `${id}_2`;
      seen.add(id);
      checklist.push({ id, title, description: (it.description || '').trim() });
    }
    if (!checklist.length) return showToast('Добавьте хотя бы один пункт чек-листа', 'err');
    setSaving(true);
    const { error } = await supabase.from('club_settings').upsert([
      { key: 'founder_video_url', value: url },
      { key: 'buddy_term_days', value: term },
      { key: 'onboarding_checklist', value: checklist },
    ], { onConflict: 'key' });
    setSaving(false);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Настройки сохранены'); setSettingsOpen(false); load();
  };

  // ── Рендер ─────────────────────────────────────────────────────────
  if (rows === null) return <div className="loading"><span className="spinner" /></div>;
  if (missing) return <MigrationNotice file={MIGRATION} what="Онбординг" />;

  const q = query.trim().toLowerCase();
  const list = residents
    .filter(r => r.is_published !== false || rowById[r.id])
    .filter(r => {
      const o = rowById[r.id];
      if (filter === 'active') return o && !o.completed_at;
      if (filter === 'done') return o && o.completed_at;
      if (filter === 'none') return !o;
      return true;
    })
    .filter(r => !q || `${r.name} ${r.company || ''}`.toLowerCase().includes(q))
    .sort((a, b) => {
      const oa = rowById[a.id], ob = rowById[b.id];
      return (ob?.created_at || '').localeCompare(oa?.created_at || '') || a.name.localeCompare(b.name);
    });

  const counts = {
    active: (rows || []).filter(o => !o.completed_at).length,
    noBuddy: (rows || []).filter(o => !o.completed_at && !o.buddy_resident_id).length,
    done: (rows || []).filter(o => o.completed_at).length,
  };

  const buddyCandidates = assign
    ? residents.filter(r => r.id !== assign.resident.id && r.is_published !== false)
      .filter(r => !assign.search || `${r.name} ${r.company || ''}`.toLowerCase().includes(assign.search.toLowerCase()))
    : [];
  const menteesOf = id => (rows || []).filter(o => o.buddy_resident_id === id && (!o.buddy_until || new Date(o.buddy_until) >= new Date())).length;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Онбординг и Buddy</div>
          <div className="section-sub">
            В процессе: {counts.active} · без Buddy: {counts.noBuddy} · пройден: {counts.done}
          </div>
        </div>
        <button className="btn btn-outline" onClick={openSettings}><Ico i={Settings} /> Настройки онбординга</button>
      </div>

      {!settings.founder_video_url && (
        <Banner>Ссылка на видеопослание основателя не задана — новички видят «Видео скоро появится». Укажите её в настройках.</Banner>
      )}

      <div className="toolbar">
        <div className="seg">
          {[['active', 'В процессе'], ['done', 'Пройден'], ['none', 'Без онбординга'], ['all', 'Все']].map(([k, l]) => (
            <button key={k} className={`seg-btn${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <span className="grow" />
        <input type="text" className="search" placeholder="Поиск резидента" value={query} onChange={e => setQuery(e.target.value)} />
      </div>

      {list.length === 0 ? (
        <Empty icon={Compass} text={filter === 'active' ? 'Сейчас никто не проходит онбординг' : 'Никого не найдено'} />
      ) : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Резидент</th><th>Buddy</th><th>Срок Buddy</th><th>Прогресс</th><th>Статус</th><th></th></tr></thead>
            <tbody>
              {list.map(r => {
                const o = rowById[r.id];
                const buddy = o?.buddy_resident_id ? byId[o.buddy_resident_id] : null;
                const st = statusOf(o);
                const p = o ? progressOf(o) : null;
                const left = daysLeft(o?.buddy_until);
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <Avatar url={r.photo_url} name={r.name} />
                        <div>
                          <div className="cell-title">{r.name}</div>
                          <div className="cell-sub">
                            {r.company || '—'}{o ? ` · с ${fmtDate(o.created_at)}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {buddy ? (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Avatar url={buddy.photo_url} name={buddy.name} size={24} />
                          <span>{buddy.name}</span>
                        </div>
                      ) : o ? <span style={{ color: 'var(--muted)' }}>не назначен</span> : '—'}
                    </td>
                    <td>
                      {o?.buddy_until ? (
                        <>
                          <div className="td-date" style={{ color: 'var(--text)' }}>{fmtDate(o.buddy_until)}</div>
                          <div className="cell-sub" style={{ color: left < 0 ? 'var(--danger)' : 'var(--muted)' }}>
                            {left < 0 ? 'истёк' : `осталось ${left} дн.`}
                          </div>
                        </>
                      ) : '—'}
                    </td>
                    <td style={{ minWidth: 140 }}>
                      {p ? (
                        <>
                          <div className="bar-track" style={{ height: 4 }}>
                            <div className="bar-fill" style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
                          </div>
                          <div className="cell-sub" style={{ marginTop: 6 }}>
                            <span className="mono">{p.done} из {p.total}</span>{o.video_watched_at ? ' · видео просмотрено' : ''}
                          </div>
                        </>
                      ) : '—'}
                    </td>
                    <td><span className="verdict" style={{ color: st.tone }}>{st.label}</span></td>
                    <td>
                      <div className="td-actions">
                        {o ? (
                          <>
                            <button className="btn btn-outline btn-sm" onClick={() => openAssign(r)}>{buddy ? 'Buddy и срок' : 'Назначить Buddy'}</button>
                            <button className="btn btn-danger btn-sm" onClick={() => removeOnboarding(r)}>Убрать</button>
                          </>
                        ) : (
                          <button className="btn btn-outline btn-sm" onClick={() => startOnboarding(r)}>Начать онбординг</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {assign && (
        <Modal title={`Buddy для ${assign.resident.name}`} onClose={() => setAssign(null)} onSave={saveAssign} saving={saving}
          saveLabel={assign.buddyId && assign.buddyId !== assign.originalBuddy ? 'Назначить и уведомить' : 'Сохранить'}>
          <div className="form-grid">
            <Field label="Срок, дней">
              <input type="number" min={1} max={730} value={assign.term}
                onChange={e => {
                  const term = e.target.value;
                  setAssign(a => ({ ...a, term, until: addDays(term).toISOString().slice(0, 10) }));
                }} />
            </Field>
            <Field label="Buddy до">
              <input type="date" value={assign.until} onChange={e => setAssign(a => ({ ...a, until: e.target.value }))} />
            </Field>
          </div>
          <Field label="Buddy (опытный резидент)">
            <input type="text" placeholder="Поиск" value={assign.search} onChange={e => setAssign(a => ({ ...a, search: e.target.value }))} />
          </Field>
          <div className="picker" style={{ maxHeight: 280 }}>
            {buddyCandidates.map(r => {
              const n = menteesOf(r.id);
              return (
                <label key={r.id} className="picker-row">
                  <input type="radio" name="buddy" checked={assign.buddyId === r.id}
                    onChange={() => setAssign(a => ({ ...a, buddyId: r.id }))} />
                  <Avatar url={r.photo_url} name={r.name} size={24} />
                  <span style={{ flex: 1 }}>{r.name}{r.company ? <span style={{ color: 'var(--muted)' }}> · {r.company}</span> : ''}</span>
                  {n > 0 && <span className="hint">ведёт {n}</span>}
                </label>
              );
            })}
            {buddyCandidates.length === 0 && <div className="hint" style={{ padding: 8 }}>Никого не найдено</div>}
          </div>
          <div className="note">
            При назначении или смене Buddy оба резидента получат пуш и уведомление в приложении
          </div>
          {assign.originalBuddy && (
            <button className="btn btn-danger btn-sm" style={{ alignSelf: 'flex-start' }} onClick={unassign} disabled={saving}>Снять Buddy</button>
          )}
        </Modal>
      )}

      {settingsOpen && draft && (
        <Modal title="Настройки онбординга" wide onClose={() => setSettingsOpen(false)} onSave={saveSettings} saving={saving}>
          <div className="form-grid">
            <div className="field full">
              <label>Видеопослание основателя (ссылка YouTube / Vimeo / файл)</label>
              <input type="url" value={draft.founder_video_url} placeholder="https://…"
                onChange={e => setDraft(d => ({ ...d, founder_video_url: e.target.value }))} />
            </div>
            <Field label="Срок Buddy по умолчанию, дней">
              <input type="number" min={1} max={730} value={draft.buddy_term_days}
                onChange={e => setDraft(d => ({ ...d, buddy_term_days: e.target.value }))} />
            </Field>
          </div>

          <div className="sub-head" style={{ marginTop: 8, marginBottom: 0 }}>Чек-лист до первого мероприятия</div>
          <div className="note">
            Пункты с id <code>video</code>, <code>constitution</code>, <code>faq</code>, <code>buddy_meet</code>, <code>profile</code>, <code>first_event</code> связаны
            с шагами в приложении (profile и first_event отмечаются автоматически). Новые пункты резидент отмечает сам.
          </div>
          {draft.onboarding_checklist.map((it, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--s0)' }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <input type="text" placeholder="Название пункта" value={it.title} onChange={e => setItem(idx, { title: e.target.value })} />
                <input type="text" placeholder="Пояснение (необязательно)" value={it.description || ''} onChange={e => setItem(idx, { description: e.target.value })} />
                <div className="hint" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  id {it._new
                    ? <input type="text" value={it.id} placeholder="авто из названия" style={{ width: 180, height: 28, padding: '0 8px', fontSize: 12, fontFamily: 'var(--mono)' }}
                        onChange={e => setItem(idx, { id: e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase() })} />
                    : <code>{it.id}</code>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button className="btn-icon" onClick={() => moveItem(idx, -1)} disabled={idx === 0} aria-label="Выше" title="Выше"><Ico i={ArrowUp} /></button>
                <button className="btn-icon" onClick={() => moveItem(idx, 1)} disabled={idx === draft.onboarding_checklist.length - 1} aria-label="Ниже" title="Ниже"><Ico i={ArrowDown} /></button>
                <button className="btn-icon danger" onClick={() => removeItem(idx)} aria-label="Удалить" title="Удалить"><Ico i={Trash2} /></button>
              </div>
            </div>
          ))}
          <button className="add-option" onClick={addItem}><Ico i={Plus} size={14} /> Пункт</button>
        </Modal>
      )}
    </>
  );
};

export default OnboardingTab;
