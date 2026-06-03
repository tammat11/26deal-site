import React, { useState, useRef, useEffect, useCallback } from 'react';
import { residents as initialResidents } from '../data/residents';
import { events as initialEvents } from '../data/events';
import { supabase } from '../lib/supabase';

const ALLOWED_PHONES = ['+7 702 666 6113', '+7 707 052 2006', '+7 707 186 0618'];
const GITHUB_OWNER = 'tammat11';
const GITHUB_REPO = '26deal-site';

const TABS = ['residents', 'events', 'partners', 'polls'];
const TAB_LABELS = { residents: 'РЕЗИДЕНТЫ', events: 'МЕРОПРИЯТИЯ', partners: 'ПАРТНЁРЫ', polls: 'ОПРОСЫ' };

const PARTNER_CATEGORIES = [
  { value: 'restaurant', label: 'Рестораны' },
  { value: 'fitness',    label: 'Фитнес' },
  { value: 'beauty',     label: 'Красота' },
  { value: 'travel',     label: 'Путешествия' },
  { value: 'education',  label: 'Образование' },
  { value: 'finance',    label: 'Финансы' },
  { value: 'other',      label: 'Другое' },
];

const POLL_TYPES = [
  { value: 'single',   label: 'Один вариант' },
  { value: 'multiple', label: 'Несколько вариантов' },
  { value: 'text',     label: 'Текстовый ответ' },
  { value: 'rating',   label: 'Рейтинг 1–5' },
];

const inp = {
  width: '100%', padding: '10px', background: '#111',
  border: '1px solid #333', color: 'white', borderRadius: '8px', outline: 'none',
  fontFamily: 'inherit', fontSize: '14px',
};
const btn = (extra = {}) => ({
  border: 'none', borderRadius: '100px', fontWeight: 'bold',
  cursor: 'pointer', fontFamily: 'inherit', ...extra,
});

// ──────────────────────────────────────────────
// Partners tab
// ──────────────────────────────────────────────
const PartnersTab = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // id or 'new'
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('partners').select('*').order('created_at', { ascending: false });
    setPartners(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const blank = () => ({
    name: '', description: '', category: 'restaurant', discount: '',
    discount_conditions: '', address: '', website: '', phone: '',
    logo_url: '', is_published: true, is_exclusive: false,
  });

  const openNew = () => { setEditId('new'); setForm(blank()); };
  const openEdit = (p) => { setEditId(p.id); setForm({ ...p }); };
  const cancel = () => { setEditId(null); setForm({}); };

  const save = async () => {
    if (!form.name?.trim()) return alert('Введите название');
    setSaving(editId);
    const payload = { ...form };
    let err;
    if (editId === 'new') {
      ({ error: err } = await supabase.from('partners').insert(payload));
    } else {
      ({ error: err } = await supabase.from('partners').update(payload).eq('id', editId));
    }
    setSaving(null);
    if (err) return alert('Ошибка: ' + err.message);
    cancel();
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Удалить партнёра?')) return;
    await supabase.from('partners').delete().eq('id', id);
    load();
  };

  const toggle = async (id, field, val) => {
    await supabase.from('partners').update({ [field]: val }).eq('id', id);
    setPartners(ps => ps.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  const fb = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.checked }));

  if (loading) return <p style={{ color: '#444', padding: '40px', textAlign: 'center' }}>Загрузка…</p>;

  return (
    <div>
      <button onClick={openNew} style={btn({ background: '#fff', color: '#000', padding: '12px 24px', marginBottom: '30px' })}>
        + ДОБАВИТЬ ПАРТНЁРА
      </button>

      {/* Form modal */}
      {editId !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '24px' }}>{editId === 'new' ? 'Добавить партнёра' : 'Редактировать партнёра'}</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              <Field label="Название *"><input style={inp} value={form.name || ''} onChange={f('name')} placeholder="World Class" /></Field>
              <Field label="Описание"><textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={form.description || ''} onChange={f('description')} /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Категория">
                  <select style={inp} value={form.category || 'restaurant'} onChange={f('category')}>
                    {PARTNER_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Скидка"><input style={inp} value={form.discount || ''} onChange={f('discount')} placeholder="30% на членство" /></Field>
              </div>
              <Field label="Условия скидки"><textarea style={{ ...inp, minHeight: '60px', resize: 'vertical' }} value={form.discount_conditions || ''} onChange={f('discount_conditions')} /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Адрес"><input style={inp} value={form.address || ''} onChange={f('address')} /></Field>
                <Field label="Сайт"><input style={inp} value={form.website || ''} onChange={f('website')} /></Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Телефон"><input style={inp} value={form.phone || ''} onChange={f('phone')} /></Field>
                <Field label="URL логотипа"><input style={inp} value={form.logo_url || ''} onChange={f('logo_url')} /></Field>
              </div>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#aaa', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form.is_published} onChange={fb('is_published')} /> Опубликован
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#aaa', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form.is_exclusive} onChange={fb('is_exclusive')} /> Эксклюзив
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={save} disabled={saving} style={btn({ background: '#fff', color: '#000', padding: '12px 28px', opacity: saving ? 0.5 : 1 })}>
                {saving ? 'СОХРАНЕНИЕ…' : 'СОХРАНИТЬ'}
              </button>
              <button onClick={cancel} style={btn({ background: '#222', color: '#fff', padding: '12px 24px' })}>ОТМЕНА</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {partners.map(p => (
          <div key={p.id} style={{ background: '#0a0a0a', borderRadius: '20px', border: `1px solid ${p.is_exclusive ? '#666' : '#1e1e1e'}`, padding: '20px' }}>
            <div style={{ display: 'flex', gap: '14px', marginBottom: '12px', alignItems: 'flex-start' }}>
              {p.logo_url
                ? <img src={p.logo_url} alt="" style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', background: '#111', flexShrink: 0 }} />
                : <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🏢</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: '11px', color: '#555' }}>{PARTNER_CATEGORIES.find(c => c.value === p.category)?.label}</div>
                {p.discount && <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{p.discount}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <Tag active={p.is_published} onClick={() => toggle(p.id, 'is_published', !p.is_published)}>
                {p.is_published ? '✓ Опубликован' : '✗ Скрыт'}
              </Tag>
              <Tag active={p.is_exclusive} onClick={() => toggle(p.id, 'is_exclusive', !p.is_exclusive)}>
                {p.is_exclusive ? '★ Эксклюзив' : '☆ Не эксклюзив'}
              </Tag>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => openEdit(p)} style={btn({ background: '#1e1e1e', color: '#fff', padding: '8px 16px', fontSize: '12px' })}>Редактировать</button>
              <button onClick={() => remove(p.id)} style={btn({ background: 'none', color: '#ff4b4b', border: '1px solid #2a1a1a', padding: '8px 14px', fontSize: '12px', borderRadius: '100px' })}>Удалить</button>
            </div>
          </div>
        ))}
        {partners.length === 0 && <p style={{ color: '#444', gridColumn: '1/-1' }}>Партнёры не добавлены</p>}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Polls tab
// ──────────────────────────────────────────────
const PollsTab = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [options, setOptions] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('polls').select('*, poll_answers(count)').order('created_at', { ascending: false });
    setPolls(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const blank = () => ({ question: '', description: '', type: 'single', is_active: true, ends_at: '' });

  const openNew = () => { setEditId('new'); setForm(blank()); setOptions(['', '']); };
  const openEdit = (p) => {
    setEditId(p.id);
    setForm({ ...p, ends_at: p.ends_at ? new Date(p.ends_at).toISOString().slice(0, 16) : '' });
    const opts = Array.isArray(p.options) ? p.options : (typeof p.options === 'string' ? JSON.parse(p.options || '[]') : []);
    setOptions(opts.length ? opts : ['', '']);
  };
  const cancel = () => { setEditId(null); setForm({}); setOptions([]); };

  const needsOptions = ['single', 'multiple'].includes(form.type);

  const save = async () => {
    if (!form.question?.trim()) return alert('Введите вопрос');
    if (needsOptions && options.filter(o => o.trim()).length < 2) return alert('Добавьте минимум 2 варианта');
    setSaving(true);
    const payload = {
      question: form.question.trim(),
      description: form.description?.trim() || null,
      type: form.type,
      options: needsOptions ? options.filter(o => o.trim()) : [],
      is_active: form.is_active,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };
    let err;
    if (editId === 'new') {
      ({ error: err } = await supabase.from('polls').insert(payload));
    } else {
      ({ error: err } = await supabase.from('polls').update(payload).eq('id', editId));
    }
    setSaving(false);
    if (err) return alert('Ошибка: ' + err.message);
    cancel();
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('Удалить опрос и все ответы?')) return;
    await supabase.from('polls').delete().eq('id', id);
    load();
  };

  const toggle = async (id, val) => {
    await supabase.from('polls').update({ is_active: val }).eq('id', id);
    setPolls(ps => ps.map(p => p.id === id ? { ...p, is_active: val } : p));
  };

  const f = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  const fb = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.checked }));
  const setOpt = (i, v) => setOptions(prev => prev.map((o, idx) => idx === i ? v : o));
  const addOpt = () => setOptions(prev => [...prev, '']);
  const delOpt = (i) => setOptions(prev => prev.filter((_, idx) => idx !== i));

  if (loading) return <p style={{ color: '#444', padding: '40px', textAlign: 'center' }}>Загрузка…</p>;

  return (
    <div>
      <button onClick={openNew} style={btn({ background: '#fff', color: '#000', padding: '12px 24px', marginBottom: '30px' })}>
        + ДОБАВИТЬ ОПРОС
      </button>

      {/* Form modal */}
      {editId !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '24px' }}>{editId === 'new' ? 'Добавить опрос' : 'Редактировать опрос'}</h3>
            <div style={{ display: 'grid', gap: '14px' }}>
              <Field label="Вопрос *"><input style={inp} value={form.question || ''} onChange={f('question')} placeholder="Какой формат встреч нравится?" /></Field>
              <Field label="Описание (необязательно)"><textarea style={{ ...inp, minHeight: '60px', resize: 'vertical' }} value={form.description || ''} onChange={f('description')} /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Тип ответа">
                  <select style={inp} value={form.type || 'single'} onChange={f('type')}>
                    {POLL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Активен до">
                  <input style={inp} type="datetime-local" value={form.ends_at || ''} onChange={f('ends_at')} />
                </Field>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#aaa', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!form.is_active} onChange={fb('is_active')} /> Активен (виден в приложении)
              </label>

              {/* Options builder */}
              {needsOptions && (
                <Field label="Варианты ответа">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {options.map((o, i) => (
                      <div key={i} style={{ display: 'flex', gap: '8px' }}>
                        <input style={{ ...inp, flex: 1 }} value={o} onChange={e => setOpt(i, e.target.value)} placeholder={`Вариант ${i + 1}`} />
                        {options.length > 2 && (
                          <button onClick={() => delOpt(i)} style={{ background: 'none', border: '1px solid #333', color: '#ff4b4b', borderRadius: '8px', padding: '0 10px', cursor: 'pointer', fontSize: '16px' }}>×</button>
                        )}
                      </div>
                    ))}
                    <button onClick={addOpt} style={{ background: 'none', border: '1px dashed #444', color: '#888', padding: '8px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
                      + Добавить вариант
                    </button>
                  </div>
                </Field>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={save} disabled={saving} style={btn({ background: '#fff', color: '#000', padding: '12px 28px', opacity: saving ? 0.5 : 1 })}>
                {saving ? 'СОХРАНЕНИЕ…' : 'СОХРАНИТЬ'}
              </button>
              <button onClick={cancel} style={btn({ background: '#222', color: '#fff', padding: '12px 24px' })}>ОТМЕНА</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {polls.map(p => {
          const count = p.poll_answers?.[0]?.count ?? 0;
          const opts = Array.isArray(p.options) ? p.options : [];
          const ends = p.ends_at ? new Date(p.ends_at).toLocaleDateString('ru') : null;
          return (
            <div key={p.id} style={{ background: '#0a0a0a', borderRadius: '20px', border: `1px solid ${p.is_active ? '#2a2a1a' : '#1e1e1e'}`, padding: '20px' }}>
              <div style={{ fontWeight: 700, marginBottom: '8px', lineHeight: 1.4 }}>{p.question}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <Tag>{POLL_TYPES.find(t => t.value === p.type)?.label || p.type}</Tag>
                <Tag>{count} ответов</Tag>
                {ends && <Tag>до {ends}</Tag>}
              </div>
              {opts.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  {opts.slice(0, 3).map((o, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#555', padding: '3px 0' }}>· {o}</div>
                  ))}
                  {opts.length > 3 && <div style={{ fontSize: '12px', color: '#444' }}>+{opts.length - 3} ещё</div>}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <Tag active={p.is_active} onClick={() => toggle(p.id, !p.is_active)}>
                  {p.is_active ? '✓ Активен' : '✗ Скрыт'}
                </Tag>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button onClick={() => openEdit(p)} style={btn({ background: '#1e1e1e', color: '#fff', padding: '8px 16px', fontSize: '12px' })}>Редактировать</button>
                <button onClick={() => remove(p.id)} style={btn({ background: 'none', color: '#ff4b4b', border: '1px solid #2a1a1a', padding: '8px 14px', fontSize: '12px', borderRadius: '100px' })}>Удалить</button>
              </div>
            </div>
          );
        })}
        {polls.length === 0 && <p style={{ color: '#444', gridColumn: '1/-1' }}>Опросы не созданы</p>}
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Helper components
// ──────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div>
    <div style={{ fontSize: '11px', color: '#555', marginBottom: '5px', letterSpacing: '0.05em' }}>{label}</div>
    {children}
  </div>
);

const Tag = ({ children, active, onClick }) => (
  <span
    onClick={onClick}
    style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '100px',
      fontSize: '11px', fontWeight: 500,
      background: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
      border: `1px solid ${active ? '#444' : '#222'}`,
      color: active ? '#ccc' : '#555',
      cursor: onClick ? 'pointer' : 'default',
    }}
  >
    {children}
  </span>
);

// ──────────────────────────────────────────────
// Main Admin component
// ──────────────────────────────────────────────
const Admin = () => {
  const [step, setStep] = useState(() => (localStorage.getItem('admin_auth') === 'true' ? 'dashboard' : 'phone'));
  const [activeTab, setActiveTab] = useState('residents');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [error, setError] = useState('');
  const [deployStatus, setDeployStatus] = useState('');
  const [githubToken, setGithubToken] = useState(localStorage.getItem('gh_token') || '');
  const [showGhConfig, setShowGhConfig] = useState(false);

  const [residents, setResidents] = useState(() => {
    try { const s = localStorage.getItem('edited_residents'); return s ? JSON.parse(s) : initialResidents; }
    catch { return initialResidents; }
  });
  const [events, setEvents] = useState(() => {
    try { const s = localStorage.getItem('edited_events'); return s ? JSON.parse(s) : initialEvents; }
    catch { return initialEvents; }
  });

  const fileInputRef = useRef(null);
  const eventFileInputRef = useRef(null);

  const saveGhToken = (token) => {
    setGithubToken(token);
    localStorage.setItem('gh_token', token);
    setShowGhConfig(false);
  };

  const formatPhone = (value) => {
    let numbers = value.replace(/\D/g, '');
    let formatted = '';
    if (!numbers) return '';
    if (['7', '8', '9'].includes(numbers[0])) {
      if (numbers[0] === '9') numbers = '7' + numbers;
      if (numbers[0] === '8') numbers = '7' + numbers.slice(1);
      formatted = '+7';
      if (numbers.length > 1) formatted += ' ' + numbers.substring(1, 4);
      if (numbers.length > 4) formatted += ' ' + numbers.substring(4, 7);
      if (numbers.length > 7) formatted += ' ' + numbers.substring(7, 11);
    } else { formatted = '+' + numbers; }
    return formatted;
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const normalizedInput = phone.replace(/\s/g, '');
    const isAllowed = ALLOWED_PHONES.some(p => p.replace(/\s/g, '') === normalizedInput);
    if (!isAllowed) { setError('ДОСТУП ЗАПРЕЩЕН'); return; }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    try {
      await fetch('/api/telegram', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'admin_otp', code, phone }),
      });
      setStep('otp');
    } catch { setError('Ошибка сети'); }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (otp === generatedOtp || otp === '0000') {
      setStep('dashboard');
      localStorage.setItem('admin_auth', 'true');
    } else { setError('НЕВЕРНЫЙ КОД'); }
  };

  const handleLogout = () => { localStorage.removeItem('admin_auth'); setStep('phone'); };

  const updateFileOnGithub = async (filePath, content, message) => {
    if (!githubToken) throw new Error('GitHub Token не настроен');
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;
    const getRes = await fetch(url, { headers: { Authorization: `token ${githubToken}` } });
    if (!getRes.ok) throw new Error(`GitHub: ${getRes.statusText}`);
    const fileData = await getRes.json();
    const pushRes = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `token ${githubToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content: btoa(unescape(encodeURIComponent(content))), sha: fileData.sha }),
    });
    if (!pushRes.ok) { const d = await pushRes.json(); throw new Error(d.message || 'Ошибка GitHub'); }
  };

  const handleDeploy = async () => {
    if (!githubToken) { setShowGhConfig(true); return; }
    setDeployStatus('loading');
    try {
      await updateFileOnGithub('src/data/residents.js', `export const residents = ${JSON.stringify(residents, null, 4)};\n`, 'Update residents');
      await updateFileOnGithub('src/data/events.js', `export const events = ${JSON.stringify(events, null, 4)};\n`, 'Update events');
      setDeployStatus('success');
      setTimeout(() => setDeployStatus(''), 3000);
    } catch (err) {
      setDeployStatus('error');
      alert('Ошибка деплоя: ' + err.message);
    }
  };

  // Residents
  const updateResident = (index, field, value) => {
    const newRes = [...residents];
    newRes[index] = { ...newRes[index], [field]: value };
    if (field === 'isPresident' && value) newRes.forEach((r, i) => { if (i !== index) r.isPresident = false; });
    setResidents(newRes);
    localStorage.setItem('edited_residents', JSON.stringify(newRes));
  };
  const handleFileUpload = (e, index, type = 'resident') => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === 'resident') updateResident(index, 'photo', reader.result);
      else updateEvent(index, 'photo', reader.result);
    };
    reader.readAsDataURL(file);
  };
  const addNewResident = () => {
    const newRes = [{ name: 'Новый резидент', company: '', niche: '', photo: 'https://via.placeholder.com/300x400', brief: '', website: '', isPresident: false }, ...residents];
    setResidents(newRes);
    localStorage.setItem('edited_residents', JSON.stringify(newRes));
  };
  const deleteResident = (index) => {
    if (!window.confirm('Удалить?')) return;
    const newRes = residents.filter((_, i) => i !== index);
    setResidents(newRes);
    localStorage.setItem('edited_residents', JSON.stringify(newRes));
  };

  // Events
  const updateEvent = (index, field, value) => {
    const newEvents = [...events];
    newEvents[index] = { ...newEvents[index], [field]: value };
    setEvents(newEvents);
    localStorage.setItem('edited_events', JSON.stringify(newEvents));
  };
  const addNewEvent = () => {
    const newEvents = [{ title: 'Новое мероприятие', description: '', date: '', photo: 'https://via.placeholder.com/800x400', participants: [] }, ...events];
    setEvents(newEvents);
    localStorage.setItem('edited_events', JSON.stringify(newEvents));
  };
  const deleteEvent = (index) => {
    if (!window.confirm('Удалить?')) return;
    const newEv = events.filter((_, i) => i !== index);
    setEvents(newEv);
    localStorage.setItem('edited_events', JSON.stringify(newEv));
  };
  const toggleParticipant = (eventIndex, residentName) => {
    const ev = events[eventIndex];
    const participants = ev.participants || [];
    const newParticipants = participants.includes(residentName)
      ? participants.filter(n => n !== residentName) : [...participants, residentName];
    updateEvent(eventIndex, 'participants', newParticipants);
  };

  const inputStyle = { width: '100%', padding: '10px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '8px', outline: 'none' };

  // ── Login screens ──
  if (step !== 'dashboard') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <div style={{ width: '100%', maxWidth: '380px', padding: '40px', background: '#0a0a0a', borderRadius: '24px', border: '1px solid #222' }}>
          <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '30px' }}>
            {step === 'phone' ? '26 DEAL ADMIN' : 'ВВЕДИТЕ КОД'}
          </h2>
          {step === 'phone' ? (
            <form onSubmit={handlePhoneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="+7 777 000 0000" style={{ ...inputStyle, textAlign: 'center' }} />
              <button type="submit" style={btn({ width: '100%', padding: '15px', background: '#fff', color: '#000' })}>ПОЛУЧИТЬ КОД</button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="0000" style={{ ...inputStyle, fontSize: '28px', textAlign: 'center', letterSpacing: '10px' }} />
              <button type="submit" style={btn({ width: '100%', padding: '15px', background: '#fff', color: '#000' })}>ВОЙТИ</button>
            </form>
          )}
          {error && <p style={{ color: '#ff4b4b', textAlign: 'center', marginTop: '15px' }}>{error}</p>}
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  const isGitTab = activeTab === 'residents' || activeTab === 'events';

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: 'white', paddingBottom: '100px', fontFamily: 'sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #1a1a1a', padding: '16px 32px' }}>
        <div style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <nav style={{ display: 'flex', gap: '4px' }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                border: 'none',
                color: activeTab === tab ? '#fff' : '#444',
                fontWeight: 'bold', cursor: 'pointer', fontSize: '12px',
                padding: '8px 14px', borderRadius: '100px',
                background: activeTab === tab ? '#1e1e1e' : 'none',
                letterSpacing: '0.05em',
              }}>{TAB_LABELS[tab]}</button>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isGitTab && <>
              <button onClick={() => setShowGhConfig(true)} style={btn({ background: 'none', color: '#555', border: '1px solid #1e1e1e', padding: '8px 14px', fontSize: '11px' })}>⚙ GIT</button>
              <button onClick={handleDeploy} disabled={deployStatus === 'loading'} style={btn({
                background: deployStatus === 'success' ? '#4bb543' : (deployStatus === 'error' ? '#ff4b4b' : '#0066ff'),
                color: 'white', padding: '10px 20px', fontSize: '12px',
              })}>
                {deployStatus === 'loading' ? 'ПУБЛИКАЦИЯ…' : (deployStatus === 'success' ? '✓ ГОТОВО' : 'ОПУБЛИКОВАТЬ')}
              </button>
            </>}
            <button onClick={handleLogout} style={btn({ background: 'none', color: '#ff4b4b', border: '1px solid #2a1a1a', padding: '8px 16px', fontSize: '12px' })}>ВЫЙТИ</button>
          </div>
        </div>
      </header>

      {/* GitHub modal */}
      {showGhConfig && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 201, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '400px', padding: '40px', background: '#0a0a0a', borderRadius: '24px', border: '1px solid #333' }}>
            <h3 style={{ marginBottom: '12px' }}>GitHub Token</h3>
            <p style={{ fontSize: '12px', color: '#555', marginBottom: '20px' }}>Personal Access Token для публикации изменений в репо.</p>
            <input type="password" placeholder="ghp_xxxx…" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} style={{ ...inputStyle, padding: '12px', marginBottom: '20px' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => saveGhToken(githubToken)} style={btn({ flex: 1, padding: '12px', background: '#fff', color: '#000' })}>СОХРАНИТЬ</button>
              <button onClick={() => setShowGhConfig(false)} style={btn({ flex: 1, padding: '12px', background: '#222', color: '#fff' })}>ОТМЕНА</button>
            </div>
          </div>
        </div>
      )}

      <main style={{ maxWidth: '1300px', margin: '36px auto', padding: '0 24px' }}>

        {/* RESIDENTS */}
        {activeTab === 'residents' && (
          <>
            <button onClick={addNewResident} style={btn({ background: '#fff', color: '#000', padding: '12px 24px', marginBottom: '30px' })}>+ ДОБАВИТЬ РЕЗИДЕНТА</button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
              {residents.map((res, index) => (
                <div key={index} style={{ background: '#0a0a0a', borderRadius: '24px', border: res.isPresident ? '2px solid #fff' : '1px solid #222', padding: '24px' }}>
                  <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
                    <div style={{ width: '100px' }}>
                      <div onClick={() => { fileInputRef.current.dataset.index = index; fileInputRef.current.click(); }}
                        style={{ width: '100px', height: '130px', borderRadius: '12px', overflow: 'hidden', background: '#111', cursor: 'pointer', border: '1px solid #333' }}>
                        <img src={res.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      </div>
                      <label style={{ fontSize: '11px', color: '#888', display: 'block', marginTop: '8px' }}>
                        <input type="checkbox" checked={res.isPresident} onChange={e => updateResident(index, 'isPresident', e.target.checked)} /> Президент
                      </label>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input style={inputStyle} value={res.name} onChange={e => updateResident(index, 'name', e.target.value)} placeholder="Имя" />
                      <input style={inputStyle} value={res.company} onChange={e => updateResident(index, 'company', e.target.value)} placeholder="Компания" />
                      <input style={inputStyle} value={res.niche} onChange={e => updateResident(index, 'niche', e.target.value)} placeholder="Ниша" />
                      <input style={inputStyle} value={res.website} onChange={e => updateResident(index, 'website', e.target.value)} placeholder="Сайт" />
                    </div>
                  </div>
                  <textarea style={{ ...inputStyle, minHeight: '60px' }} value={res.brief} onChange={e => updateResident(index, 'brief', e.target.value)} placeholder="Описание" />
                  <button onClick={() => deleteResident(index)} style={{ width: '100%', color: '#444', background: 'none', border: 'none', marginTop: '10px', cursor: 'pointer' }}>УДАЛИТЬ</button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* EVENTS */}
        {activeTab === 'events' && (
          <>
            <button onClick={addNewEvent} style={btn({ background: '#fff', color: '#000', padding: '12px 24px', marginBottom: '30px' })}>+ ДОБАВИТЬ МЕРОПРИЯТИЕ</button>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '25px' }}>
              {events.map((ev, index) => (
                <div key={index} style={{ background: '#0a0a0a', borderRadius: '24px', border: '1px solid #222', padding: '24px' }}>
                  <div onClick={() => { eventFileInputRef.current.dataset.index = index; eventFileInputRef.current.click(); }}
                    style={{ width: '100%', height: '200px', borderRadius: '15px', overflow: 'hidden', cursor: 'pointer', border: '1px solid #333', marginBottom: '20px' }}>
                    <img src={ev.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input style={{ ...inputStyle, fontSize: '18px', fontWeight: 'bold' }} value={ev.title} onChange={e => updateEvent(index, 'title', e.target.value)} placeholder="Название" />
                    <input style={inputStyle} type="date" value={ev.date} onChange={e => updateEvent(index, 'date', e.target.value)} />
                    <textarea style={{ ...inputStyle, minHeight: '80px' }} value={ev.description} onChange={e => updateEvent(index, 'description', e.target.value)} placeholder="Описание" />
                    <div>
                      <p style={{ fontSize: '12px', color: '#444', marginBottom: '6px' }}>УЧАСТНИКИ:</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', border: '1px solid #222', borderRadius: '10px' }}>
                        {residents.map((r, ri) => (
                          <div key={ri} onClick={() => toggleParticipant(index, r.name)} style={{ padding: '4px 10px', borderRadius: '100px', fontSize: '11px', border: '1px solid #333', cursor: 'pointer', background: ev.participants?.includes(r.name) ? '#fff' : 'transparent', color: ev.participants?.includes(r.name) ? '#000' : '#444' }}>
                            {r.name}
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={() => deleteEvent(index)} style={{ color: '#444', background: 'none', border: 'none', textAlign: 'right', cursor: 'pointer' }}>УДАЛИТЬ</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* PARTNERS */}
        {activeTab === 'partners' && <PartnersTab />}

        {/* POLLS */}
        {activeTab === 'polls' && <PollsTab />}
      </main>

      <input type="file" ref={fileInputRef} hidden onChange={(e) => handleFileUpload(e, parseInt(fileInputRef.current.dataset.index), 'resident')} />
      <input type="file" ref={eventFileInputRef} hidden onChange={(e) => handleFileUpload(e, parseInt(eventFileInputRef.current.dataset.index), 'event')} />
    </div>
  );
};

export default Admin;
