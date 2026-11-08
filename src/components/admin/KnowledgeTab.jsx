import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus } from 'lucide-react';
import { Modal, Field, TagsInput, StatusBadge, StatusActions, MigrationNotice, Ico } from './ui';
import { showToast, fmtDate, isMissingTable, probeColumns, pickCols, PUB_STATUSES } from './helpers';

// «База знаний»: документы клуба (Конституция, Послание президента, FAQ),
// ответы для ассистента «Каспер» и офицеры по направлениям.
// Таблицы: club_documents (2026-11-09_club_documents.sql),
//          kb_entries + club_officer_areas (2026-11-09_knowledge_base.sql).

const DOC_MIGRATION = '2026-11-09_club_documents.sql';
const KB_MIGRATION = '2026-11-09_knowledge_base.sql';

const DOC_KINDS = [
  { value: 'constitution',      label: 'Конституция' },
  { value: 'president_message', label: 'Послание президента' },
  { value: 'faq',               label: 'FAQ' },
  { value: 'other',             label: 'Другое' },
];
const kindLabel = k => DOC_KINDS.find(x => x.value === k)?.label || k || '—';

const SECTIONS = [
  { id: 'docs',     label: 'Документы' },
  { id: 'kb',       label: 'Ответы для «Каспера»' },
  { id: 'officers', label: 'Офицеры по направлениям' },
];

const Loading = () => <div className="loading"><span className="spinner" /></div>;

/** Загрузка таблицы с распознаванием «таблицы нет». */
// order — строка 'col,col.desc' (стабильная зависимость для useCallback).
function useTable(table, order = '', select = '*') {
  const [rows, setRows] = useState(null);
  const [missing, setMissing] = useState(false);
  const load = useCallback(async () => {
    let q = supabase.from(table).select(select);
    for (const part of order.split(',').filter(Boolean)) {
      const [col, dir] = part.split('.');
      q = q.order(col, { ascending: dir !== 'desc' });
    }
    const { data, error } = await q;
    if (error) {
      if (isMissingTable(error)) setMissing(true);
      else showToast(`${table}: ${error.message}`, 'err');
      setRows([]);
      return;
    }
    setMissing(false);
    setRows(data || []);
  }, [table, select, order]);
  useEffect(() => { load(); }, [load]);
  return { rows, missing, load };
}

/** Статус строки: колонка status, а для старой схемы club_documents — is_published. */
const rowStatus = (r, cols) => cols.has('status')
  ? (PUB_STATUSES[r.status] ? r.status : 'draft')
  : (r.is_published ? 'published' : 'draft');

/** Payload смены статуса: пишем status и (если есть) синхронный is_published,
 *  который читает приложение. */
const statusPayload = (next, cols) => pickCols(
  { status: next, is_published: next === 'published' }, ['status', 'is_published'], cols);

const StatusSelect = ({ value, onChange, hasReview = true }) => (
  <select value={value} onChange={e => onChange(e.target.value)}>
    {Object.entries(PUB_STATUSES)
      .filter(([k]) => hasReview || k !== 'review')
      .map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
  </select>
);

// ─── Документы ────────────────────────────────────────────────────────────────

const DocsSection = ({ docs }) => {
  const { rows, missing, load } = docs;
  const [cols, setCols] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!missing) probeColumns(supabase, 'club_documents', ['status', 'is_published']).then(setCols);
  }, [missing]);

  if (missing) return <MigrationNotice file={DOC_MIGRATION} what="Документы клуба" />;
  if (rows === null) return <Loading />;

  const hasReview = cols.has('status');

  const open = r => {
    setForm(r === 'new'
      ? { kind: 'constitution', title: '', body: '', version_date: '', sort_order: rows.length + 1, status: 'draft' }
      : { ...r, version_date: r.version_date || '', status: rowStatus(r, cols) });
    setModal(r);
  };

  const save = async () => {
    if (!form.title?.trim()) return showToast('Введите заголовок', 'err');
    setSaving(true);
    try {
      const payload = {
        kind: form.kind || 'other',
        title: form.title.trim(),
        body: form.body || '',
        version_date: form.version_date || null,
        sort_order: parseInt(form.sort_order) || 0,
        ...statusPayload(form.status || 'draft', cols),
      };
      const { error } = modal === 'new'
        ? await supabase.from('club_documents').insert(payload)
        : await supabase.from('club_documents').update(payload).eq('id', form.id);
      if (error) throw error;
      showToast('Сохранено');
      setModal(null); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const setStatus = async (r, next) => {
    const { error } = await supabase.from('club_documents').update(statusPayload(next, cols)).eq('id', r.id);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast(PUB_STATUSES[next].label); load();
  };

  const remove = async r => {
    if (!confirm(`Удалить документ «${r.title}»?`)) return;
    const { error } = await supabase.from('club_documents').delete().eq('id', r.id);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Удалено'); load();
  };

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Документы клуба</div>
          <div className="section-sub">Конституция, Послание президента, FAQ. В приложении видны только опубликованные.</div>
        </div>
        <button className="btn btn-gold" onClick={() => open('new')}><Ico i={Plus} /> Документ</button>
      </div>
      {!hasReview && cols.has('is_published') && (
        <div className="hint" style={{ marginBottom: 12 }}>
          Шаг «На проверке» появится, когда в club_documents добавят колонку status (миграция {KB_MIGRATION})
        </div>
      )}
      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Документ</th><th>Вид</th><th>Редакция</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => {
              const st = rowStatus(r, cols);
              return (
                <tr key={r.id}>
                  <td style={{ maxWidth: 340 }}>
                    <div className="cell-title">{r.title}</div>
                    <div className="cell-sub truncate" style={{ maxWidth: 320 }}>{(r.body || '').slice(0, 120)}</div>
                  </td>
                  <td><span className="badge">{kindLabel(r.kind)}</span></td>
                  <td className="td-date">{fmtDate(r.version_date)}</td>
                  <td><StatusBadge status={st} /></td>
                  <td>
                    <div className="td-actions">
                      <StatusActions status={st} hasReview={hasReview} onChange={next => setStatus(r, next)} />
                      <button className="btn btn-outline btn-sm" onClick={() => open(r)}>Изменить</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Удалить</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="tbl-empty">Документов пока нет</div>}
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Новый документ' : 'Документ'} wide onClose={() => setModal(null)} onSave={save} saving={saving}>
          <div className="form-grid">
            <Field label="Вид">
              <select value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}>
                {DOC_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </Field>
            <Field label="Статус"><StatusSelect value={form.status} hasReview={hasReview} onChange={v => setForm(f => ({ ...f, status: v }))} /></Field>
            <div className="field full"><label>Заголовок *</label><input type="text" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Конституция 26 Business Club" /></div>
            <Field label="Дата редакции"><input type="date" value={form.version_date || ''} onChange={e => setForm(f => ({ ...f, version_date: e.target.value }))} /></Field>
            <Field label="Порядок"><input type="number" value={form.sort_order ?? 0} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} /></Field>
            <div className="field full"><label>Текст</label>
              <textarea className="doc" value={form.body || ''} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={18} placeholder="Полный текст документа" />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

// ─── Ответы для «Каспера» ─────────────────────────────────────────────────────

const KbSection = ({ docs, areas }) => {
  // Без order в запросе: схема kb_entries ещё может меняться — сортируем на клиенте.
  const { rows: rawRows, missing, load } = useTable('kb_entries');
  const rows = rawRows && [...rawRows].sort((x, y) => String(y.created_at || '').localeCompare(String(x.created_at || '')));
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  if (missing) return <MigrationNotice file={KB_MIGRATION} what="Ответы для «Каспера»" />;
  if (rows === null) return <Loading />;

  const docList = docs.rows || [];
  const areaList = areas.rows || [];

  const open = r => {
    setForm(r === 'new'
      ? { question: '', answer: '', source_document_id: '', source_title: '', officer_area_id: '', tags: [], status: 'draft' }
      : { ...r, source_document_id: r.source_document_id || '', officer_area_id: r.officer_area_id || '', tags: Array.isArray(r.tags) ? r.tags : [], status: PUB_STATUSES[r.status] ? r.status : 'draft' });
    setModal(r);
  };

  const save = async () => {
    if (!form.question?.trim()) return showToast('Введите вопрос', 'err');
    if (!form.answer?.trim()) return showToast('Введите ответ', 'err');
    setSaving(true);
    try {
      const payload = {
        question: form.question.trim(),
        answer: form.answer.trim(),
        source_document_id: form.source_document_id || null,
        source_title: form.source_title?.trim() || null,
        officer_area_id: form.officer_area_id || null,
        tags: form.tags || [],
        status: form.status || 'draft',
      };
      const { error } = modal === 'new'
        ? await supabase.from('kb_entries').insert(payload)
        : await supabase.from('kb_entries').update(payload).eq('id', form.id);
      if (error) throw error;
      showToast('Сохранено');
      setModal(null); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const setStatus = async (r, next) => {
    const { error } = await supabase.from('kb_entries').update({ status: next }).eq('id', r.id);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast(PUB_STATUSES[next].label); load();
  };

  const remove = async r => {
    if (!confirm('Удалить ответ?')) return;
    const { error } = await supabase.from('kb_entries').delete().eq('id', r.id);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Удалено'); load();
  };

  const q = query.trim().toLowerCase();
  const visible = rows.filter(r => !q || `${r.question} ${r.answer} ${(r.tags || []).join(' ')}`.toLowerCase().includes(q));

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Ответы для «Каспера»</div>
          <div className="section-sub">Ассистент в приложении отвечает только опубликованными ответами</div>
        </div>
        <button className="btn btn-gold" onClick={() => open('new')}><Ico i={Plus} /> Ответ</button>
      </div>
      <div className="toolbar">
        <input type="text" className="search" placeholder="Поиск по вопросу, ответу, тегам" value={query} onChange={e => setQuery(e.target.value)} style={{ maxWidth: 420 }} />
      </div>
      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Вопрос</th><th>Источник</th><th>Направление</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.id}>
                <td style={{ maxWidth: 360 }}>
                  <div className="cell-title">{r.question}</div>
                  <div className="cell-sub truncate" style={{ maxWidth: 340 }}>{r.answer}</div>
                  {(r.tags || []).length > 0 && (
                    <div className="badges">
                      {r.tags.map(t => <span key={t} className="badge">{t}</span>)}
                    </div>
                  )}
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{r.source_title || docList.find(d => d.id === r.source_document_id)?.title || '—'}</td>
                <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{areaList.find(a => a.id === r.officer_area_id)?.area || '—'}</td>
                <td><StatusBadge status={PUB_STATUSES[r.status] ? r.status : 'draft'} /></td>
                <td>
                  <div className="td-actions">
                    <StatusActions status={PUB_STATUSES[r.status] ? r.status : 'draft'} onChange={next => setStatus(r, next)} />
                    <button className="btn btn-outline btn-sm" onClick={() => open(r)}>Изменить</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <div className="tbl-empty">{rows.length ? 'Ничего не найдено' : 'Ответов пока нет'}</div>}
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Новый ответ' : 'Ответ для «Каспера»'} wide onClose={() => setModal(null)} onSave={save} saving={saving}>
          <div className="form-grid">
            <div className="field full"><label>Вопрос *</label><input type="text" value={form.question || ''} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} placeholder="Как пригласить гостя на мероприятие?" /></div>
            <div className="field full"><label>Ответ *</label><textarea value={form.answer || ''} onChange={e => setForm(f => ({ ...f, answer: e.target.value }))} rows={7} /></div>
            <Field label="Документ-источник">
              <select value={form.source_document_id} onChange={e => {
                const id = e.target.value;
                const doc = docList.find(d => d.id === id);
                setForm(f => ({ ...f, source_document_id: id, source_title: f.source_title?.trim() ? f.source_title : (doc?.title || '') }));
              }}>
                <option value="">— без документа —</option>
                {docList.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </Field>
            <Field label="Название источника"><input type="text" value={form.source_title || ''} onChange={e => setForm(f => ({ ...f, source_title: e.target.value }))} placeholder="Конституция, п. 4.2" /></Field>
            <Field label="Направление (офицер)">
              <select value={form.officer_area_id} onChange={e => setForm(f => ({ ...f, officer_area_id: e.target.value }))}>
                <option value="">— не указано —</option>
                {areaList.map(a => <option key={a.id} value={a.id}>{a.area}</option>)}
              </select>
            </Field>
            <Field label="Статус"><StatusSelect value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))} /></Field>
            <div className="field full"><label>Теги</label><TagsInput value={form.tags} onChange={v => setForm(f => ({ ...f, tags: v }))} placeholder="гости, мероприятия — Enter или запятая" /></div>
          </div>
        </Modal>
      )}
    </>
  );
};

// ─── Офицеры по направлениям ──────────────────────────────────────────────────

const OfficersSection = ({ areas }) => {
  const { rows, missing, load } = areas;
  const [residents, setResidents] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('residents').select('id,name,company,club_role').eq('is_published', true).order('name')
      .then(({ data }) => setResidents(data || []));
  }, []);

  if (missing) return <MigrationNotice file={KB_MIGRATION} what="Офицеры по направлениям" />;
  if (rows === null) return <Loading />;

  const open = r => {
    setForm(r === 'new'
      ? { area: '', resident_id: '', keywords: [], sort_order: rows.length + 1 }
      : { ...r, resident_id: r.resident_id || '', keywords: Array.isArray(r.keywords) ? r.keywords : [] });
    setModal(r);
  };

  const save = async () => {
    if (!form.area?.trim()) return showToast('Введите направление', 'err');
    setSaving(true);
    try {
      const payload = {
        area: form.area.trim(),
        resident_id: form.resident_id || null,
        keywords: form.keywords || [],
        sort_order: parseInt(form.sort_order) || 0,
      };
      const { error } = modal === 'new'
        ? await supabase.from('club_officer_areas').insert(payload)
        : await supabase.from('club_officer_areas').update(payload).eq('id', form.id);
      if (error) throw error;
      showToast('Сохранено');
      setModal(null); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const remove = async r => {
    if (!confirm(`Удалить направление «${r.area}»?`)) return;
    const { error } = await supabase.from('club_officer_areas').delete().eq('id', r.id);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Удалено'); load();
  };

  const resName = id => {
    const r = residents.find(x => x.id === id);
    return r ? `${r.name}${r.club_role ? ` · ${r.club_role}` : ''}` : '—';
  };

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Офицеры по направлениям</div>
          <div className="section-sub">«Каспер» направляет резидента к офицеру, если вопрос совпал по ключевым словам</div>
        </div>
        <button className="btn btn-gold" onClick={() => open('new')}><Ico i={Plus} /> Направление</button>
      </div>
      <div className="tbl-wrap">
        <table>
          <thead><tr><th style={{ width: 56 }}>№</th><th>Направление</th><th>Офицер</th><th>Ключевые слова</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="td-date">{r.sort_order}</td>
                <td className="cell-title">{r.area}</td>
                <td style={{ fontSize: 13, color: 'var(--text-2)' }}>{resName(r.resident_id)}</td>
                <td>
                  <div className="badges" style={{ maxWidth: 320, marginTop: 0 }}>
                    {(r.keywords || []).map(k => <span key={k} className="badge">{k}</span>)}
                  </div>
                </td>
                <td>
                  <div className="td-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => open(r)}>Изменить</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="tbl-empty">Направлений пока нет</div>}
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Новое направление' : 'Направление'} onClose={() => setModal(null)} onSave={save} saving={saving}>
          <div className="form-grid">
            <div className="field full"><label>Направление *</label><input type="text" value={form.area || ''} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="Мероприятия" /></div>
            <div className="field full"><label>Офицер (резидент)</label>
              <select value={form.resident_id} onChange={e => setForm(f => ({ ...f, resident_id: e.target.value }))}>
                <option value="">— не назначен —</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.name}{r.company ? ` · ${r.company}` : ''}</option>)}
              </select>
            </div>
            <div className="field full"><label>Ключевые слова</label><TagsInput value={form.keywords} onChange={v => setForm(f => ({ ...f, keywords: v }))} placeholder="мероприятие, ивент, регистрация" /></div>
            <Field label="Порядок"><input type="number" value={form.sort_order ?? 0} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
};

// ─── Вкладка ──────────────────────────────────────────────────────────────────

export const KnowledgeTab = () => {
  const [section, setSection] = useState('docs');
  // Документы и направления нужны и в своих разделах, и как справочники для kb_entries.
  const docs = useTable('club_documents', 'sort_order,title');
  const areas = useTable('club_officer_areas', 'sort_order,area');

  return (
    <>
      <div className="seg" role="tablist" style={{ marginBottom: 24 }}>
        {SECTIONS.map(s => (
          <button key={s.id} role="tab" aria-selected={section === s.id} className={`seg-btn${section === s.id ? ' on' : ''}`} onClick={() => setSection(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      {section === 'docs' && <DocsSection docs={docs} />}
      {section === 'kb' && <KbSection docs={docs} areas={areas} />}
      {section === 'officers' && <OfficersSection areas={areas} />}
    </>
  );
};
