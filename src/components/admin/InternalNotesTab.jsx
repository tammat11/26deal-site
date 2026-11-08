import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Lock } from 'lucide-react';
import { Modal, Field, Banner, MigrationNotice, Ico } from './ui';
import { showToast, fmtDate, fmtDateTime, isMissingTable } from './helpers';

// «Закрытый раздел»: внутренние заметки администраторов (регламенты,
// материалы Совета директоров). Таблица club_internal_notes
// (2026-11-09_knowledge_base.sql). В приложение и в «Каспер» не попадает.

const MIGRATION = '2026-11-09_knowledge_base.sql';

// Коды совпадают с check-ограничением club_internal_notes.category
// (2026-11-09_knowledge_base.sql); подписи — только для экрана.
const CATEGORY_LABELS = {
  event_regulation: 'Регламент мероприятия',
  board: 'Совет директоров',
  org: 'Организационное',
  other: 'Другое',
};
const CATEGORIES = Object.keys(CATEGORY_LABELS);
const catLabel = c => CATEGORY_LABELS[c] || c;

const ADMINS = ['Вячеслав', 'Лиана'];

const lastAuthor = () => { try { return localStorage.getItem('admin_author') || ''; } catch { return ''; } };
const rememberAuthor = v => { try { localStorage.setItem('admin_author', v); } catch { /* storage недоступен */ } };

export const InternalNotesTab = () => {
  const [rows, setRows] = useState(null);
  const [missing, setMissing] = useState(false);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [n, e] = await Promise.all([
      supabase.from('club_internal_notes').select('*'),
      supabase.from('events').select('id,title,date').order('date', { ascending: false }),
    ]);
    if (n.error) {
      if (isMissingTable(n.error)) setMissing(true);
      else showToast('Ошибка: ' + n.error.message, 'err');
      setRows([]);
    } else {
      setMissing(false);
      setRows([...(n.data || [])].sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''))));
    }
    setEvents(e.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const banner = (
    <Banner icon={Lock}>Только для администраторов. Не попадает в приложение и в «Каспер».</Banner>
  );

  if (missing) return <>{banner}<MigrationNotice file={MIGRATION} what="Закрытый раздел" /></>;
  if (rows === null) return <div className="loading"><span className="spinner" /></div>;

  const open = r => {
    setForm(r === 'new'
      ? { category: CATEGORIES[0], title: '', body: '', related_event_id: '', created_by: lastAuthor() }
      : { ...r, related_event_id: r.related_event_id || '', created_by: r.created_by || '' });
    setModal(r);
  };

  const save = async () => {
    if (!form.title?.trim()) return showToast('Введите заголовок', 'err');
    setSaving(true);
    try {
      const payload = {
        category: form.category || 'other',
        title: form.title.trim(),
        body: form.body || '',
        related_event_id: form.related_event_id || null,
        created_by: form.created_by?.trim() || null,
      };
      if (payload.created_by) rememberAuthor(payload.created_by);
      const { error } = modal === 'new'
        ? await supabase.from('club_internal_notes').insert(payload)
        : await supabase.from('club_internal_notes').update(payload).eq('id', form.id);
      if (error) throw error;
      showToast('Сохранено');
      setModal(null); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const remove = async r => {
    if (!confirm(`Удалить заметку «${r.title}»?`)) return;
    const { error } = await supabase.from('club_internal_notes').delete().eq('id', r.id);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Удалено'); load();
  };

  const eventTitle = id => {
    const ev = events.find(x => x.id === id);
    return ev ? `${ev.date ? fmtDate(ev.date) + ' · ' : ''}${ev.title}` : null;
  };

  const visible = rows.filter(r => !filter || r.category === filter);

  return (
    <>
      {banner}
      <div className="section-head">
        <div>
          <div className="section-title">Закрытый раздел</div>
          <div className="section-sub">{rows.length} заметок · регламенты, Совет директоров, оргвопросы</div>
        </div>
        <button className="btn btn-gold" onClick={() => open('new')}><Ico i={Plus} /> Заметка</button>
      </div>

      <div className="toolbar">
        <div className="seg">
          {['', ...CATEGORIES].map(c => (
            <button key={c || 'all'} className={`seg-btn${filter === c ? ' on' : ''}`} onClick={() => setFilter(c)}>
              {c ? catLabel(c) : 'Все'}
            </button>
          ))}
        </div>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Заметка</th><th>Категория</th><th>Мероприятие</th><th>Автор</th><th></th></tr></thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.id}>
                <td style={{ maxWidth: 360 }}>
                  <div className="cell-title">{r.title}</div>
                  <div className="cell-sub truncate" style={{ maxWidth: 340 }}>{(r.body || '').slice(0, 140)}</div>
                </td>
                <td><span className="badge">{r.category ? catLabel(r.category) : '—'}</span></td>
                <td style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 220 }}>{eventTitle(r.related_event_id) || '—'}</td>
                <td style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                  {r.created_by || '—'}
                  {(r.updated_at || r.created_at) && <div className="td-date" style={{ color: 'var(--muted)' }}>{fmtDateTime(r.updated_at || r.created_at)}</div>}
                </td>
                <td>
                  <div className="td-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => open(r)}>Открыть</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <div className="tbl-empty">Заметок нет</div>}
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Новая заметка' : 'Заметка'} wide onClose={() => setModal(null)} onSave={save} saving={saving}>
          <div className="form-grid">
            <Field label="Категория">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                {form.category && !CATEGORIES.includes(form.category) && <option value={form.category}>{form.category}</option>}
              </select>
            </Field>
            <Field label="Автор">
              <input type="text" list="internal-authors" value={form.created_by || ''} onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))} placeholder="Вячеслав" />
              <datalist id="internal-authors">{ADMINS.map(a => <option key={a} value={a} />)}</datalist>
            </Field>
            <div className="field full"><label>Заголовок *</label><input type="text" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Регламент Форума 15.11" /></div>
            <div className="field full"><label>Связанное мероприятие</label>
              <select value={form.related_event_id} onChange={e => setForm(f => ({ ...f, related_event_id: e.target.value }))}>
                <option value="">— не связано —</option>
                {events.map(ev => <option key={ev.id} value={ev.id}>{ev.date ? fmtDate(ev.date) + ' · ' : ''}{(ev.title || '').slice(0, 80)}</option>)}
              </select>
            </div>
            <div className="field full"><label>Текст</label>
              <textarea className="doc" value={form.body || ''} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={14} style={{ minHeight: 280 }} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
