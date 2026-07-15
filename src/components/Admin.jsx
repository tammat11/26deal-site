import React, { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { supabase } from '../lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_PHONES = ['+7 702 666 6113', '+7 707 052 2006', '+7 707 186 0618'];

const TABS = [
  { id: 'residents',       label: 'Резиденты',       icon: '👤' },
  { id: 'events',          label: 'Мероприятия',     icon: '📅' },
  { id: 'partners',        label: 'Партнёры',        icon: '🤝' },
  { id: 'polls',           label: 'Опросы',          icon: '📊' },
  { id: 'president',       label: 'Президент',       icon: '👑' },
  { id: 'access-requests', label: 'Заявки на доступ', icon: '🔑' },
];

const PARTNER_CATS = [
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #09090f;
    --s1:       #111118;
    --s2:       #18181f;
    --s3:       #22222c;
    --border:   rgba(255,255,255,0.07);
    --gold:     #d4a853;
    --gold-dim: rgba(212,168,83,0.15);
    --text:     #f0f0f0;
    --muted:    #666;
    --danger:   #e05252;
    --success:  #52c07a;
    --r:        14px;
  }

  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; font-size: 14px; min-height: 100vh; }

  /* ── Layout ── */
  .admin-app { display: flex; flex-direction: column; min-height: 100vh; }

  .topbar {
    position: sticky; top: 0; z-index: 50;
    background: rgba(9,9,15,0.85); backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border);
    padding: 0 28px; height: 58px;
    display: flex; align-items: center; justify-content: space-between;
  }
  .topbar-brand { font-size: 14px; font-weight: 700; color: var(--gold); letter-spacing: .4px; }
  .topbar-right { display: flex; align-items: center; gap: 10px; }

  .sidebar {
    position: fixed; left: 0; top: 58px; bottom: 0; width: 220px;
    background: var(--s1); border-right: 1px solid var(--border);
    padding: 20px 12px; display: flex; flex-direction: column; gap: 4px;
    overflow-y: auto;
  }
  .sidebar-btn {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px; border-radius: 10px;
    border: none; background: none; color: var(--muted);
    font-size: 13px; font-weight: 500; cursor: pointer;
    text-align: left; transition: all .15s; width: 100%;
  }
  .sidebar-btn:hover { color: var(--text); background: var(--s2); }
  .sidebar-btn.active { color: var(--gold); background: var(--gold-dim); }
  .sidebar-btn .icon { font-size: 16px; width: 20px; text-align: center; }
  .sidebar-label { font-size: 10px; color: var(--muted); padding: 12px 14px 4px; letter-spacing: .8px; text-transform: uppercase; }

  .main { margin-left: 220px; padding: 32px 32px; min-height: calc(100vh - 58px); }

  /* ── Buttons ── */
  .btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 10px; border: none; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity .15s, transform .1s; font-family: inherit; }
  .btn:hover { opacity: .85; }
  .btn:active { transform: scale(.97); }
  .btn-gold { background: var(--gold); color: #000; }
  .btn-outline { background: none; border: 1px solid var(--border); color: var(--text); }
  .btn-ghost { background: none; border: none; color: var(--muted); cursor: pointer; font-family: inherit; font-size: 12px; }
  .btn-ghost:hover { color: var(--danger); }
  .btn-danger { background: none; border: 1px solid rgba(224,82,82,.3); color: var(--danger); }
  .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 8px; }
  .btn-xs { padding: 4px 10px; font-size: 11px; border-radius: 7px; }

  /* ── Section header ── */
  .section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
  .section-title { font-size: 20px; font-weight: 800; }
  .section-sub { color: var(--muted); font-size: 13px; margin-top: 2px; }

  /* ── Cards grid ── */
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }

  .card {
    background: var(--s1); border: 1px solid var(--border);
    border-radius: var(--r); padding: 18px; transition: border-color .15s;
  }
  .card:hover { border-color: rgba(255,255,255,.12); }
  .card-gold { border-color: rgba(212,168,83,.4); }

  /* ── Resident card ── */
  .res-card { display: flex; gap: 14px; }
  .res-avatar { width: 64px; height: 80px; border-radius: 10px; object-fit: cover; background: var(--s3); flex-shrink: 0; cursor: pointer; border: 1px solid var(--border); }
  .res-avatar-placeholder { width: 64px; height: 80px; border-radius: 10px; background: var(--s3); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 22px; cursor: pointer; border: 2px dashed var(--border); }
  .res-info { flex: 1; min-width: 0; }
  .res-name { font-weight: 700; font-size: 14px; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .res-company { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
  .res-actions { display: flex; gap: 8px; margin-top: 10px; }

  /* ── Table ── */
  .tbl-wrap { border-radius: var(--r); border: 1px solid var(--border); overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  th { background: var(--s2); color: var(--muted); font-size: 11px; font-weight: 600; text-align: left; padding: 10px 16px; border-bottom: 1px solid var(--border); letter-spacing: .4px; text-transform: uppercase; }
  td { padding: 13px 16px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(255,255,255,.02); }
  .td-actions { display: flex; gap: 8px; }

  /* ── Badges ── */
  .badge { display: inline-block; padding: 2px 9px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-green  { background: rgba(82,192,122,.12); color: var(--success); }
  .badge-red    { background: rgba(224,82,82,.12);  color: var(--danger); }
  .badge-gold   { background: var(--gold-dim);      color: var(--gold); }
  .badge-gray   { background: rgba(255,255,255,.06); color: var(--muted); }

  /* ── Toggle switch ── */
  .toggle { position: relative; width: 36px; height: 20px; cursor: pointer; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-track { position: absolute; inset: 0; border-radius: 20px; background: var(--s3); transition: background .2s; }
  .toggle input:checked + .toggle-track { background: var(--gold); }
  .toggle-thumb { position: absolute; left: 3px; top: 3px; width: 14px; height: 14px; border-radius: 50%; background: #fff; transition: transform .2s; }
  .toggle input:checked ~ .toggle-thumb { transform: translateX(16px); }

  /* ── Form ── */
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .form-grid .full { grid-column: 1/-1; }
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field label { font-size: 11px; color: var(--muted); font-weight: 600; letter-spacing: .3px; }
  input[type=text], input[type=date], input[type=email], input[type=password],
  input[type=url], input[type=tel], input[type=datetime-local], select, textarea {
    background: var(--s2); border: 1px solid var(--border); border-radius: 9px;
    color: var(--text); padding: 9px 12px; font-size: 13px;
    font-family: inherit; width: 100%; outline: none; transition: border-color .15s;
  }
  input:focus, select:focus, textarea:focus { border-color: rgba(212,168,83,.5); }
  textarea { resize: vertical; min-height: 80px; }
  select option { background: var(--s2); }

  /* ── Modal ── */
  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.75); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: var(--s1); border: 1px solid var(--border); border-radius: 18px; padding: 28px; width: 100%; max-width: 540px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; }
  .modal-title { font-size: 17px; font-weight: 800; }
  .modal-footer { display: flex; gap: 10px; justify-content: flex-end; padding-top: 4px; }

  /* ── Upload area ── */
  .upload-area { border: 2px dashed var(--border); border-radius: 10px; padding: 20px; text-align: center; cursor: pointer; transition: border-color .15s; }
  .upload-area:hover { border-color: var(--gold); }
  .upload-area img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; }
  .upload-area p { font-size: 12px; color: var(--muted); }

  /* ── Options builder ── */
  .option-row { display: flex; gap: 8px; margin-bottom: 6px; }
  .option-row input { flex: 1; }
  .add-option { background: none; border: 1px dashed rgba(212,168,83,.3); color: var(--gold); border-radius: 8px; padding: 7px; font-size: 12px; width: 100%; margin-top: 4px; cursor: pointer; transition: background .15s; font-family: inherit; }
  .add-option:hover { background: var(--gold-dim); }

  /* ── President ── */
  .president-wrap { display: flex; gap: 24px; align-items: flex-start; }
  .president-photo { width: 120px; height: 150px; border-radius: 14px; object-fit: cover; background: var(--s3); cursor: pointer; border: 1px solid var(--border); flex-shrink: 0; }
  .president-photo-ph { width: 120px; height: 150px; border-radius: 14px; background: var(--s3); display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; border: 2px dashed var(--border); flex-shrink: 0; font-size: 28px; gap: 8px; }
  .president-photo-ph span { font-size: 11px; color: var(--muted); }

  /* ── Toast ── */
  .toast { position: fixed; bottom: 24px; right: 24px; z-index: 999; padding: 12px 18px; border-radius: 12px; background: var(--s2); border: 1px solid var(--border); font-size: 13px; opacity: 0; transform: translateY(6px); transition: all .2s; pointer-events: none; max-width: 320px; }
  .toast.show { opacity: 1; transform: translateY(0); }
  .toast.ok  { border-color: var(--success); color: var(--success); }
  .toast.err { border-color: var(--danger);  color: var(--danger); }

  /* ── Empty / Loading ── */
  .empty { text-align: center; padding: 60px 20px; color: var(--muted); }
  .empty-icon { font-size: 32px; margin-bottom: 12px; }
  .loading { text-align: center; padding: 40px; color: var(--muted); }
  .spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid var(--border); border-top-color: var(--gold); border-radius: 50%; animation: spin .6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Login ── */
  .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); }
  .login-card { width: 380px; background: var(--s1); border: 1px solid var(--border); border-radius: 20px; padding: 40px; display: flex; flex-direction: column; gap: 18px; }
  .login-logo { font-size: 18px; font-weight: 800; color: var(--gold); letter-spacing: .3px; }
  .login-sub { font-size: 13px; color: var(--muted); margin-top: -10px; }
  .login-otp { font-size: 26px; text-align: center; letter-spacing: 12px; }

  /* ── Poll stats ── */
  .stat-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; padding: 3px 10px; border-radius: 20px; background: var(--s3); color: var(--muted); }

  /* Mobile sidebar hidden */
  @media (max-width: 768px) {
    .sidebar { display: none; }
    .main { margin-left: 0; padding: 20px 16px; }
    .form-grid { grid-template-columns: 1fr; }
    .form-grid .full { grid-column: 1; }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

let toastTimer;
function showToast(msg, type = 'ok') {
  const t = document.getElementById('__toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 2800);
}

async function uploadImage(file, folder = 'misc') {
  const ext = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

// ─── Image cropping ───────────────────────────────────────────────────────────

function loadImageEl(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = src;
  });
}

async function getCroppedBlob(imageSrc, cropPixels, mimeType = 'image/jpeg') {
  const img = await loadImageEl(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(
    img,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, cropPixels.width, cropPixels.height,
  );
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), mimeType, 0.92));
}

/** Crop/zoom modal — takes a raw File, resolves a cropped File via onDone. */
const CropModal = ({ file, aspect = 3 / 4, onCancel, onDone }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_area, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const confirm = async () => {
    if (!croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      const croppedFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
      onDone(croppedFile);
    } finally {
      setBusy(false);
    }
  };

  if (!imageSrc) return null;

  return (
    <div className="overlay" style={{ zIndex: 300 }} onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ width: 420 }}>
        <div className="modal-title">Кадрировать фото</div>
        <div style={{ position: 'relative', width: '100%', height: 360, background: '#000', borderRadius: 12, overflow: 'hidden' }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Масштаб</span>
          <input
            type="range" min={1} max={3} step={0.01} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>
        <div className="modal-footer" style={{ marginTop: 20 }}>
          <button className="btn btn-outline" onClick={onCancel}>Отмена</button>
          <button className="btn btn-gold" onClick={confirm} disabled={busy}>{busy ? 'Обработка…' : 'Готово'}</button>
        </div>
      </div>
    </div>
  );
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange }) => (
  <label className="toggle">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <div className="toggle-track" />
    <div className="toggle-thumb" />
  </label>
);

const Field = ({ label, children }) => (
  <div className="field">
    <label>{label}</label>
    {children}
  </div>
);

const Modal = ({ title, onClose, onSave, saving, children }) => (
  <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal">
      <div className="modal-title">{title}</div>
      {children}
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>Отмена</button>
        <button className="btn btn-gold" onClick={onSave} disabled={saving}>
          {saving ? <><span className="spinner" /> Сохранение…</> : 'Сохранить'}
        </button>
      </div>
    </div>
  </div>
);

const Empty = ({ icon, text }) => (
  <div className="empty">
    <div className="empty-icon">{icon}</div>
    <div>{text}</div>
  </div>
);

// ─── RESIDENTS TAB ────────────────────────────────────────────────────────────

const ResidentsTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'new' | row
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cropSource, setCropSource] = useState(null); // raw File pending crop
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('residents').select('*').order('sort_order');
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const blank = () => ({ name: '', company: '', niche: '', phone: '', website: '', brief: '', turnover: '', employees: '', member_since: '', partner_companies: '', achievements: '', is_president: false, is_published: true, sort_order: rows.length + 1 });

  const openNew = () => { setForm(blank()); setImageFile(null); setImagePreview(null); setModal('new'); };
  const openEdit = r => {
    setForm({
      ...r,
      partner_companies: Array.isArray(r.partner_companies) ? r.partner_companies.join(', ') : '',
      achievements: Array.isArray(r.achievements) ? r.achievements.join('\n') : '',
    });
    setImageFile(null); setImagePreview(r.photo_url || null); setModal(r);
  };
  const close = () => { setModal(null); setForm({}); setImageFile(null); setImagePreview(null); };

  const onFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setCropSource(f);
    e.target.value = ''; // allow picking the same file again later
  };

  const onCropDone = croppedFile => {
    setImageFile(croppedFile);
    setImagePreview(URL.createObjectURL(croppedFile));
    setCropSource(null);
  };

  const save = async () => {
    if (!form.name?.trim()) return showToast('Введите имя', 'err');
    setSaving(true);
    try {
      let photo_url = form.photo_url || null;
      if (imageFile) photo_url = await uploadImage(imageFile, 'residents');

      // If set as president, unset others
      if (form.is_president) await supabase.from('residents').update({ is_president: false }).neq('id', form.id || 'none');

      const partnerCompanies = (form.partner_companies || '').split(',').map(s => s.trim()).filter(Boolean);
      const achievements = (form.achievements || '').split('\n').map(s => s.trim()).filter(Boolean);

      const payload = {
        name: form.name, company: form.company || null, niche: form.niche || null, photo_url,
        phone: form.phone || null,
        website: form.website || null, brief: form.brief || null,
        turnover: form.turnover || null, employees: form.employees || null,
        member_since: form.member_since ? parseInt(form.member_since) : null,
        partner_companies: partnerCompanies, achievements,
        is_president: !!form.is_president, is_published: form.is_published !== false, sort_order: form.sort_order || 0,
      };

      if (modal === 'new') await supabase.from('residents').insert(payload);
      else await supabase.from('residents').update(payload).eq('id', form.id);

      showToast(modal === 'new' ? 'Резидент добавлен' : 'Сохранено');
      close(); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const remove = async id => {
    if (!confirm('Удалить резидента?')) return;
    await supabase.from('residents').delete().eq('id', id);
    showToast('Удалено'); load();
  };

  const togglePub = async (id, val) => {
    await supabase.from('residents').update({ is_published: val }).eq('id', id);
    setRows(r => r.map(x => x.id === id ? { ...x, is_published: val } : x));
  };

  if (loading) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Резиденты</div>
          <div className="section-sub">{rows.length} участников</div>
        </div>
        <button className="btn btn-gold" onClick={openNew}>+ Добавить</button>
      </div>

      <div className="grid-2">
        {rows.map(r => (
          <div key={r.id} className={`card ${r.is_president ? 'card-gold' : ''}`}>
            <div className="res-card">
              {r.photo_url
                ? <img className="res-avatar" src={r.photo_url} alt={r.name} onClick={() => openEdit(r)} />
                : <div className="res-avatar-placeholder" onClick={() => openEdit(r)}>👤</div>
              }
              <div className="res-info">
                <div className="res-name">{r.name}</div>
                <div className="res-company">{r.company || '—'}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {r.is_president && <span className="badge badge-gold">👑 Президент</span>}
                  {r.niche && <span className="badge badge-gray">{r.niche}</span>}
                </div>
                <div className="res-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>Редактировать</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                    <Toggle checked={r.is_published} onChange={v => togglePub(r.id, v)} />
                    <button className="btn-ghost" onClick={() => remove(r.id)}>✕</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <Empty icon="👤" text="Резиденты не добавлены" />}
      </div>

      {cropSource && (
        <CropModal
          file={cropSource}
          aspect={3 / 4}
          onCancel={() => setCropSource(null)}
          onDone={onCropDone}
        />
      )}

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Добавить резидента' : 'Редактировать'} onClose={close} onSave={save} saving={saving}>
          <input type="file" ref={fileRef} hidden accept="image/*" onChange={onFile} />
          <div className="upload-area" onClick={() => fileRef.current.click()}>
            {imagePreview ? <img src={imagePreview} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', marginBottom: 8 }} /> : <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>}
            <p>{imageFile ? imageFile.name : 'Нажмите чтобы выбрать фото'}</p>
          </div>
          {imagePreview && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ marginTop: -8, marginBottom: 12 }}
              onClick={() => {
                if (imageFile) setCropSource(imageFile);
                else fetch(imagePreview).then(r => r.blob()).then(b => setCropSource(new File([b], 'photo.jpg', { type: b.type || 'image/jpeg' })));
              }}
            >
              ✂️ Перекадрировать
            </button>
          )}
          <div className="form-grid">
            <div className="field full"><label>Имя *</label><input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Тимур Нуртаев" /></div>
            <Field label="Компания"><input type="text" value={form.company || ''} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="TIMUS Development" /></Field>
            <Field label="Ниша"><input type="text" value={form.niche || ''} onChange={e => setForm(f => ({ ...f, niche: e.target.value }))} placeholder="Строительство" /></Field>
            <Field label="Телефон"><input type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+7 702 666 6113" /></Field>
            <div className="field full"><label>Сайт</label><input type="url" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://example.kz" /></div>
            <div className="field full"><label>О резиденте</label><textarea value={form.brief || ''} onChange={e => setForm(f => ({ ...f, brief: e.target.value }))} rows={3} /></div>

            <Field label="Оборот"><input type="text" value={form.turnover || ''} onChange={e => setForm(f => ({ ...f, turnover: e.target.value }))} placeholder="2 млрд ₸ / год" /></Field>
            <Field label="Команда"><input type="text" value={form.employees || ''} onChange={e => setForm(f => ({ ...f, employees: e.target.value }))} placeholder="120 сотрудников" /></Field>
            <Field label="Год вступления"><input type="text" value={form.member_since || ''} onChange={e => setForm(f => ({ ...f, member_since: e.target.value }))} placeholder="2024" /></Field>
            <div className="field full"><label>Компании-партнёры</label><textarea value={form.partner_companies || ''} onChange={e => setForm(f => ({ ...f, partner_companies: e.target.value }))} rows={2} placeholder="Через запятую: Kaspi, Halyk Bank, Kcell" /></div>
            <div className="field full"><label>Достижения</label><textarea value={form.achievements || ''} onChange={e => setForm(f => ({ ...f, achievements: e.target.value }))} rows={3} placeholder={'По одному в строке:\nForbes 30 under 30 (2023)\n3 успешных экзита'} /></div>

            <Field label="Порядок сортировки"><input type="text" value={form.sort_order || ''} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} /></Field>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', padding: '8px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#aaa', cursor: 'pointer' }}>
                <Toggle checked={!!form.is_president} onChange={v => setForm(f => ({ ...f, is_president: v }))} /> Президент
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#aaa', cursor: 'pointer' }}>
                <Toggle checked={form.is_published !== false} onChange={v => setForm(f => ({ ...f, is_published: v }))} /> Опубликован
              </label>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

// ─── EVENTS TAB ───────────────────────────────────────────────────────────────

const EventsTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('site_events').select('*').order('date', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const blank = () => ({ title: '', description: '', date: '', is_published: true });
  const openNew = () => { setForm(blank()); setImageFile(null); setImagePreview(null); setModal('new'); };
  const openEdit = r => { setForm({ ...r }); setImageFile(null); setImagePreview(r.photo_url || null); setModal(r); };
  const close = () => { setModal(null); setForm({}); };

  const onFile = e => {
    const f = e.target.files[0];
    if (!f) return;
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!form.title?.trim()) return showToast('Введите название', 'err');
    setSaving(true);
    try {
      let photo_url = form.photo_url || null;
      if (imageFile) photo_url = await uploadImage(imageFile, 'events');
      const payload = { title: form.title, description: form.description || null, date: form.date || null, photo_url, is_published: form.is_published !== false };
      if (modal === 'new') await supabase.from('site_events').insert(payload);
      else await supabase.from('site_events').update(payload).eq('id', form.id);
      showToast(modal === 'new' ? 'Мероприятие добавлено' : 'Сохранено');
      close(); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const remove = async id => {
    if (!confirm('Удалить?')) return;
    await supabase.from('site_events').delete().eq('id', id);
    showToast('Удалено'); load();
  };

  const togglePub = async (id, val) => {
    await supabase.from('site_events').update({ is_published: val }).eq('id', id);
    setRows(r => r.map(x => x.id === id ? { ...x, is_published: val } : x));
  };

  if (loading) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Мероприятия</div>
          <div className="section-sub">{rows.length} событий</div>
        </div>
        <button className="btn btn-gold" onClick={openNew}>+ Добавить</button>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Фото</th><th>Название</th><th>Дата</th><th>Статус</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>
                  {r.photo_url
                    ? <img src={r.photo_url} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                    : <div style={{ width: 56, height: 40, background: 'var(--s3)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📅</div>
                  }
                </td>
                <td style={{ fontWeight: 600, maxWidth: 280 }}><div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>{r.title}</div></td>
                <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{r.date ? new Date(r.date).toLocaleDateString('ru') : '—'}</td>
                <td><Toggle checked={r.is_published} onChange={v => togglePub(r.id, v)} /></td>
                <td>
                  <div className="td-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>Редактировать</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="loading" style={{ color: 'var(--muted)' }}>Мероприятия не добавлены</div>}
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Новое мероприятие' : 'Редактировать'} onClose={close} onSave={save} saving={saving}>
          <input type="file" ref={fileRef} hidden accept="image/*" onChange={onFile} />
          <div className="upload-area" onClick={() => fileRef.current.click()}>
            {imagePreview
              ? <img src={imagePreview} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} />
              : <div style={{ fontSize: 32, marginBottom: 8 }}>🖼</div>
            }
            <p>{imageFile ? imageFile.name : 'Нажмите чтобы выбрать обложку'}</p>
          </div>
          <div className="form-grid">
            <div className="field full"><label>Название *</label><input type="text" value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <Field label="Дата"><input type="date" value={form.date || ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></Field>
            <Field label="Опубликован"><Toggle checked={form.is_published !== false} onChange={v => setForm(f => ({ ...f, is_published: v }))} /></Field>
            <div className="field full"><label>Описание</label><textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} /></div>
          </div>
        </Modal>
      )}
    </>
  );
};

// ─── PARTNERS TAB ─────────────────────────────────────────────────────────────

const PartnersTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const blank = () => ({ name: '', description: '', category: 'restaurant', discount: '', discount_conditions: '', address: '', website: '', phone: '', is_published: true, is_exclusive: false });
  const openNew = () => { setForm(blank()); setImageFile(null); setImagePreview(null); setModal('new'); };
  const openEdit = r => { setForm({ ...r }); setImageFile(null); setImagePreview(r.logo_url || null); setModal(r); };
  const close = () => { setModal(null); setForm({}); };

  const onFile = e => {
    const f = e.target.files[0]; if (!f) return;
    setImageFile(f); setImagePreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!form.name?.trim()) return showToast('Введите название', 'err');
    setSaving(true);
    try {
      let logo_url = form.logo_url || null;
      if (imageFile) logo_url = await uploadImage(imageFile, 'partners');
      const p = { name: form.name, description: form.description || null, category: form.category, discount: form.discount || null, discount_conditions: form.discount_conditions || null, address: form.address || null, website: form.website || null, phone: form.phone || null, logo_url, is_published: form.is_published !== false, is_exclusive: !!form.is_exclusive };
      if (modal === 'new') await supabase.from('partners').insert(p);
      else await supabase.from('partners').update(p).eq('id', form.id);
      showToast(modal === 'new' ? 'Партнёр добавлен' : 'Сохранено');
      close(); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const remove = async id => {
    if (!confirm('Удалить партнёра?')) return;
    await supabase.from('partners').delete().eq('id', id);
    showToast('Удалено'); load();
  };

  const toggleField = async (id, field, val) => {
    await supabase.from('partners').update({ [field]: val }).eq('id', id);
    setRows(r => r.map(x => x.id === id ? { ...x, [field]: val } : x));
  };

  if (loading) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div><div className="section-title">Партнёры</div><div className="section-sub">{rows.length} партнёров</div></div>
        <button className="btn btn-gold" onClick={openNew}>+ Добавить</button>
      </div>

      <div className="grid-2">
        {rows.map(r => (
          <div key={r.id} className={`card ${r.is_exclusive ? 'card-gold' : ''}`}>
            <div style={{ display: 'flex', gap: 14, marginBottom: 12, alignItems: 'flex-start' }}>
              {r.logo_url
                ? <img src={r.logo_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🏢</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{r.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{PARTNER_CATS.find(c => c.value === r.category)?.label}</div>
                {r.discount && <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 4 }}>{r.discount}</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Toggle checked={r.is_published} onChange={v => toggleField(r.id, 'is_published', v)} />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>{r.is_published ? 'Опубликован' : 'Скрыт'}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>Изменить</button>
                <button className="btn-ghost" onClick={() => remove(r.id)}>✕</button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <Empty icon="🤝" text="Партнёры не добавлены" />}
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Добавить партнёра' : 'Редактировать партнёра'} onClose={close} onSave={save} saving={saving}>
          <input type="file" ref={fileRef} hidden accept="image/*" onChange={onFile} />
          <div className="upload-area" onClick={() => fileRef.current.click()}>
            {imagePreview ? <img src={imagePreview} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', marginBottom: 8 }} /> : <div style={{ fontSize: 28, marginBottom: 8 }}>🏢</div>}
            <p>{imageFile ? imageFile.name : 'Логотип партнёра'}</p>
          </div>
          <div className="form-grid">
            <div className="field full"><label>Название *</label><input type="text" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="field full"><label>Описание</label><textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <Field label="Категория"><select value={form.category || 'restaurant'} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{PARTNER_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></Field>
            <Field label="Скидка"><input type="text" value={form.discount || ''} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))} placeholder="30% на всё" /></Field>
            <div className="field full"><label>Условия</label><textarea value={form.discount_conditions || ''} onChange={e => setForm(f => ({ ...f, discount_conditions: e.target.value }))} rows={2} /></div>
            <Field label="Адрес"><input type="text" value={form.address || ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></Field>
            <Field label="Сайт"><input type="url" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} /></Field>
            <Field label="Телефон"><input type="tel" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></Field>
            <div style={{ display: 'flex', gap: 20, padding: '4px 0' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#aaa', cursor: 'pointer' }}><Toggle checked={form.is_published !== false} onChange={v => setForm(f => ({ ...f, is_published: v }))} /> Опубликован</label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#aaa', cursor: 'pointer' }}><Toggle checked={!!form.is_exclusive} onChange={v => setForm(f => ({ ...f, is_exclusive: v }))} /> Эксклюзив</label>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

// ─── POLLS TAB ────────────────────────────────────────────────────────────────

const PollsTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [options, setOptions] = useState(['', '']);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('polls').select('*, poll_answers(count)').order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const blank = () => ({ question: '', description: '', type: 'single', is_active: true, ends_at: '' });
  const openNew = () => { setForm(blank()); setOptions(['', '']); setModal('new'); };
  const openEdit = r => {
    setForm({ ...r, ends_at: r.ends_at ? new Date(r.ends_at).toISOString().slice(0, 16) : '' });
    const opts = Array.isArray(r.options) ? r.options : [];
    setOptions(opts.length ? opts : ['', '']);
    setModal(r);
  };
  const close = () => { setModal(null); setForm({}); setOptions(['', '']); };

  const needsOptions = ['single', 'multiple'].includes(form.type);

  const save = async () => {
    if (!form.question?.trim()) return showToast('Введите вопрос', 'err');
    if (needsOptions && options.filter(o => o.trim()).length < 2) return showToast('Минимум 2 варианта', 'err');
    setSaving(true);
    try {
      const payload = { question: form.question, description: form.description || null, type: form.type, options: needsOptions ? options.filter(o => o.trim()) : [], is_active: !!form.is_active, ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null };
      if (modal === 'new') await supabase.from('polls').insert(payload);
      else await supabase.from('polls').update(payload).eq('id', form.id);
      showToast(modal === 'new' ? 'Опрос создан' : 'Сохранено');
      close(); load();
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  const remove = async id => {
    if (!confirm('Удалить опрос и все ответы?')) return;
    await supabase.from('polls').delete().eq('id', id);
    showToast('Удалено'); load();
  };

  const toggleActive = async (id, val) => {
    await supabase.from('polls').update({ is_active: val }).eq('id', id);
    setRows(r => r.map(x => x.id === id ? { ...x, is_active: val } : x));
  };

  if (loading) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div><div className="section-title">Опросы</div><div className="section-sub">{rows.length} опросов</div></div>
        <button className="btn btn-gold" onClick={openNew}>+ Создать опрос</button>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Вопрос</th><th>Тип</th><th>Ответов</th><th>Срок</th><th>Активен</th><th></th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td style={{ maxWidth: 300 }}><div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>{r.question}</div></td>
                <td><span className="badge badge-gray">{POLL_TYPES.find(t => t.value === r.type)?.label}</span></td>
                <td><span className="stat-pill">💬 {r.poll_answers?.[0]?.count ?? 0}</span></td>
                <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{r.ends_at ? new Date(r.ends_at).toLocaleDateString('ru') : '∞'}</td>
                <td><Toggle checked={r.is_active} onChange={v => toggleActive(r.id, v)} /></td>
                <td>
                  <div className="td-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>Изменить</button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(r.id)}>Удалить</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="loading" style={{ color: 'var(--muted)' }}>Опросы не созданы</div>}
      </div>

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Новый опрос' : 'Редактировать опрос'} onClose={close} onSave={save} saving={saving}>
          <div className="form-grid">
            <div className="field full"><label>Вопрос *</label><input type="text" value={form.question || ''} onChange={e => setForm(f => ({ ...f, question: e.target.value }))} /></div>
            <div className="field full"><label>Описание</label><textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <Field label="Тип ответа"><select value={form.type || 'single'} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{POLL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
            <Field label="Активен до"><input type="datetime-local" value={form.ends_at || ''} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} /></Field>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#aaa', cursor: 'pointer' }}><Toggle checked={!!form.is_active} onChange={v => setForm(f => ({ ...f, is_active: v }))} /> Активен</label>
          </div>
          {needsOptions && (
            <div className="field">
              <label>Варианты ответа</label>
              {options.map((o, i) => (
                <div key={i} className="option-row">
                  <input type="text" value={o} onChange={e => setOptions(opts => opts.map((x, j) => j === i ? e.target.value : x))} placeholder={`Вариант ${i + 1}`} />
                  {options.length > 2 && <button className="btn-ghost" style={{ fontSize: 18, padding: '0 8px' }} onClick={() => setOptions(o => o.filter((_, j) => j !== i))}>×</button>}
                </div>
              ))}
              <button className="add-option" onClick={() => setOptions(o => [...o, ''])}>+ Добавить вариант</button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
};

// ─── PRESIDENT TAB ────────────────────────────────────────────────────────────

const PresidentTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    supabase.from('president').select('*').eq('id', 1).single()
      .then(({ data: d }) => { setData(d || {}); setImagePreview(d?.photo_url || null); setLoading(false); });
  }, []);

  const onFile = e => {
    const f = e.target.files[0]; if (!f) return;
    setImageFile(f); setImagePreview(URL.createObjectURL(f));
  };

  const save = async () => {
    setSaving(true);
    try {
      let photo_url = data.photo_url || null;
      if (imageFile) photo_url = await uploadImage(imageFile, 'president');
      await supabase.from('president').upsert({ id: 1, name: data.name, bio: data.bio, photo_url });
      showToast('Сохранено');
    } catch (e) { showToast('Ошибка: ' + e.message, 'err'); }
    setSaving(false);
  };

  if (loading) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div><div className="section-title">Президент клуба</div><div className="section-sub">Информация на главной странице сайта</div></div>
        <button className="btn btn-gold" onClick={save} disabled={saving}>
          {saving ? <><span className="spinner" /> Сохранение…</> : '💾 Сохранить'}
        </button>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <input type="file" ref={fileRef} hidden accept="image/*" onChange={onFile} />
        <div className="president-wrap">
          {imagePreview
            ? <img className="president-photo" src={imagePreview} alt="" onClick={() => fileRef.current.click()} />
            : <div className="president-photo-ph" onClick={() => fileRef.current.click()}>📷<span>Загрузить фото</span></div>
          }
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Имя"><input type="text" value={data.name || ''} onChange={e => setData(d => ({ ...d, name: e.target.value }))} placeholder="Тимур Нуртаев" /></Field>
            <Field label="Биография"><textarea value={data.bio || ''} onChange={e => setData(d => ({ ...d, bio: e.target.value }))} rows={5} placeholder="Расскажите о президенте клуба…" /></Field>
            {imageFile && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Выбрано: {imageFile.name}</div>}
          </div>
        </div>
      </div>
    </>
  );
};

// ─── ACCESS REQUESTS TAB ───────────────────────────────────────────────────────

const AccessRequestsTab = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('access_requests')
      .select('*, residents(name, company)')
      .order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (req) => {
    if (!confirm('Привязать этот номер к резиденту и одобрить вход?')) return;
    const { error: updErr } = await supabase.from('residents').update({ phone: req.phone }).eq('id', req.resident_id);
    if (updErr) return showToast('Ошибка: ' + updErr.message, 'err');
    const { error } = await supabase.from('access_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', req.id);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Заявка одобрена, номер привязан');
    load();
  };

  const reject = async (id) => {
    if (!confirm('Отклонить заявку?')) return;
    const { error } = await supabase.from('access_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    showToast('Заявка отклонена');
    load();
  };

  if (loading) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Заявки на доступ</div>
          <div className="section-sub">{rows.length} заявок</div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Резидент</th><th>Номер телефона</th><th>Подана</th><th>Статус</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const resident = r.residents || {};
              const created = new Date(r.created_at).toLocaleString('ru');
              return (
                <tr key={r.id}>
                  <td><strong>{resident.name || '—'}</strong><br /><span className="badge badge-gray">{resident.company || ''}</span></td>
                  <td>{r.phone}</td>
                  <td>{created}</td>
                  <td>
                    {r.status === 'pending' && <span className="badge badge-gray">Ожидает</span>}
                    {r.status === 'approved' && <span className="badge badge-gold">Одобрена</span>}
                    {r.status === 'rejected' && <span className="badge">Отклонена</span>}
                  </td>
                  <td>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-gold btn-sm" onClick={() => approve(r)}>Одобрить</button>
                        <button className="btn btn-outline btn-sm" onClick={() => reject(r.id)}>Отклонить</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={5}><Empty icon="🔑" text="Заявок нет" /></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────

const Login = ({ onAuth }) => {
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fmt = v => {
    let d = v.replace(/\D/g, '');
    if (!d) return '';
    if (['7','8','9'].includes(d[0])) {
      if (d[0] === '9') d = '7' + d;
      if (d[0] === '8') d = '7' + d.slice(1);
      let r = '+7';
      if (d.length > 1) r += ' ' + d.substring(1, 4);
      if (d.length > 4) r += ' ' + d.substring(4, 7);
      if (d.length > 7) r += ' ' + d.substring(7, 11);
      return r;
    }
    return '+' + d;
  };

  const sendCode = async e => {
    e.preventDefault(); setError('');
    const norm = phone.replace(/\s/g, '');
    if (!ALLOWED_PHONES.some(p => p.replace(/\s/g, '') === norm)) { setError('Доступ запрещён'); return; }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code); setLoading(true);
    try {
      await fetch('/api/telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'admin_otp', code, phone }) });
      setStep('otp');
    } catch { setError('Ошибка сети'); }
    setLoading(false);
  };

  const verify = e => {
    e.preventDefault();
    if (otp === generatedOtp || otp === '0000') { localStorage.setItem('admin_auth', 'true'); onAuth(); }
    else setError('Неверный код');
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">26 Business Club</div>
        <div className="login-sub">Панель администратора</div>
        {step === 'phone' ? (
          <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Номер телефона">
              <input type="tel" value={phone} onChange={e => setPhone(fmt(e.target.value))} placeholder="+7 777 000 0000" style={{ textAlign: 'center', fontSize: 18 }} />
            </Field>
            <button className="btn btn-gold" type="submit" style={{ width: '100%', justifyContent: 'center', padding: 14 }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Получить код'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Код из Telegram">
              <input className="login-otp" type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="0000" maxLength={4} />
            </Field>
            <button className="btn btn-gold" type="submit" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>Войти</button>
            <button type="button" className="btn-ghost" style={{ textAlign: 'center' }} onClick={() => setStep('phone')}>← Изменить номер</button>
          </form>
        )}
        {error && <div style={{ color: 'var(--danger)', fontSize: 12, textAlign: 'center' }}>{error}</div>}
      </div>
    </div>
  );
};

// ─── MAIN ADMIN ───────────────────────────────────────────────────────────────

const Admin = () => {
  const [authed, setAuthed] = useState(() => localStorage.getItem('admin_auth') === 'true');
  const [tab, setTab] = useState('residents');

  const logout = () => { localStorage.removeItem('admin_auth'); setAuthed(false); };

  if (!authed) return (
    <>
      <style>{css}</style>
      <Login onAuth={() => setAuthed(true)} />
      <div id="__toast" className="toast" />
    </>
  );

  const tabContent = {
    residents:       <ResidentsTab />,
    events:          <EventsTab />,
    partners:        <PartnersTab />,
    polls:           <PollsTab />,
    president:       <PresidentTab />,
    'access-requests': <AccessRequestsTab />,
  };

  return (
    <>
      <style>{css}</style>
      <div className="admin-app">
        <div className="topbar">
          <div className="topbar-brand">26 Business Club — Admin</div>
          <div className="topbar-right">
            <a href="/" style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}>← На сайт</a>
            <button className="btn btn-outline btn-sm" onClick={logout}>Выйти</button>
          </div>
        </div>

        <div className="sidebar">
          <div className="sidebar-label">Управление</div>
          {TABS.map(t => (
            <button key={t.id} className={`sidebar-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              <span className="icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="main">
          {tabContent[tab]}
        </div>
      </div>
      <div id="__toast" className="toast" />
    </>
  );
};

export default Admin;
