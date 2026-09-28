import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Modal, Field, Avatar } from './ui';
import { showToast } from './helpers';

/** Группы резидентов (Форум-группы, СД и т.п.) — для адресных опросов. */
export const GroupsTab = () => {
  const [groups, setGroups] = useState(null);
  const [residents, setResidents] = useState([]);
  const [modal, setModal] = useState(null); // null | 'new' | group
  const [form, setForm] = useState({});
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [g, r] = await Promise.all([
      supabase.from('resident_groups').select('*, resident_group_members(resident_id)').order('sort_order').order('name'),
      supabase.from('residents').select('id,name,company,photo_url').eq('is_published', true).order('name'),
    ]);
    if (g.error) showToast('Таблица групп не найдена — примените миграцию 2026-09-28', 'err');
    setGroups(g.data || []);
    setResidents(r.data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = g => {
    setForm(g === 'new' ? { name: '', description: '' } : { ...g });
    setMembers(g === 'new' ? [] : (g.resident_group_members || []).map(m => m.resident_id));
    setQuery(''); setModal(g);
  };

  const save = async () => {
    if (!form.name?.trim()) return showToast('Введите название', 'err');
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), description: form.description || null };
      let id = form.id;
      if (modal === 'new') {
        const { data, error } = await supabase.from('resident_groups').insert(payload).select().single();
        if (error) throw error;
        id = data.id;
      } else {
        const { error } = await supabase.from('resident_groups').update(payload).eq('id', id);
        if (error) throw error;
      }
      const { error: delErr } = await supabase.from('resident_group_members').delete().eq('group_id', id);
      if (delErr) throw delErr;
      if (members.length) {
        const { error: insErr } = await supabase.from('resident_group_members')
          .insert(members.map(resident_id => ({ group_id: id, resident_id })));
        if (insErr) throw insErr;
      }
      showToast('Сохранено');
      setModal(null); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const remove = async g => {
    if (!confirm(`Удалить группу «${g.name}»?`)) return;
    await supabase.from('resident_groups').delete().eq('id', g.id);
    showToast('Удалено'); load();
  };

  if (groups === null) return <div className="loading"><span className="spinner" /></div>;

  const q = query.trim().toLowerCase();
  const visible = residents.filter(r => !q || `${r.name} ${r.company || ''}`.toLowerCase().includes(q));

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Группы и Форумы</div>
          <div className="section-sub">Используются как аудитория опросов</div>
        </div>
        <button className="btn btn-gold" onClick={() => open('new')}>+ Группа</button>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Название</th><th>Участников</th><th></th></tr></thead>
          <tbody>
            {groups.map(g => (
              <tr key={g.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{g.name}</div>
                  {g.description && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{g.description}</div>}
                </td>
                <td><span className="badge badge-gray">{g.resident_group_members?.length ?? 0}</span></td>
                <td>
                  <div className="td-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => open(g)}>Изменить</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(g)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {groups.length === 0 && <div className="loading" style={{ color: 'var(--muted)' }}>Групп пока нет</div>}
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Новая группа' : 'Группа'} onClose={() => setModal(null)} onSave={save} saving={saving}>
          <div className="form-grid">
            <div className="field full"><label>Название *</label><input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Форум-группа №1" /></div>
            <div className="field full"><label>Описание</label><input type="text" value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <Field label={`Участники (${members.length})`}>
            <input type="text" placeholder="Поиск" value={query} onChange={e => setQuery(e.target.value)} />
          </Field>
          <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 8 }}>
            {visible.map(r => (
              <label key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 4px', cursor: 'pointer' }}>
                <input type="checkbox" checked={members.includes(r.id)}
                  onChange={e => setMembers(ids => e.target.checked ? [...ids, r.id] : ids.filter(x => x !== r.id))} />
                <Avatar url={r.photo_url} name={r.name} size={24} />
                <span>{r.name}{r.company ? ` · ${r.company}` : ''}</span>
              </label>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
};
