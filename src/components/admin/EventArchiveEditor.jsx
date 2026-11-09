import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, Circle, Play, ArrowUp, ArrowDown, Trash2, Upload } from 'lucide-react';
import { Field, Toggle, MigrationNotice, Banner, Ico, PubState } from './ui';
import { showToast, fmtDate, probeColumns } from './helpers';
import { warmImage } from '../../lib/warmImage';

// Архив мероприятия (план 5.19): итоги, фото/видео в bucket event-media,
// ссылка на видео, примечание о согласии на съёмку, публикация в приложении.
// Колонки — миграция 2026-11-09_reminders_archive.sql.

const BUCKET = 'event-media';
const MIGRATION = '2026-11-09_reminders_archive.sql';
const COLS = ['description_archive', 'gallery', 'video_url', 'archive_published', 'media_consent_note'];
const DEADLINE_DAYS = 3;

/** Путь объекта в bucket по его публичному URL (null — внешний URL). */
const storagePath = url => {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = (url || '').indexOf(marker);
  return i < 0 ? null : decodeURIComponent(url.slice(i + marker.length));
};

const safeName = name => (name || 'file')
  .normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(-80);

const normalizeGallery = g => (Array.isArray(g) ? g : [])
  .filter(x => x && x.url)
  .map(x => ({ url: x.url, caption: x.caption || '', type: x.type === 'video' ? 'video' : 'photo' }));

export function EventArchiveEditor({ event }) {
  const [state, setState] = useState('loading'); // loading | missing | ready
  const [summary, setSummary] = useState('');
  const [gallery, setGallery] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [consent, setConsent] = useState('');
  const [published, setPublished] = useState(false);
  const [removed, setRemoved] = useState([]); // пути в storage, удалить при сохранении
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!event?.id) return;
    let alive = true;
    (async () => {
      setState('loading');
      const present = await probeColumns(supabase, 'events', COLS);
      if (!alive) return;
      if (COLS.some(c => !present.has(c))) { setState('missing'); return; }
      const { data, error } = await supabase.from('events').select(COLS.join(',')).eq('id', event.id).maybeSingle();
      if (!alive) return;
      if (error) { showToast('Не удалось загрузить архив: ' + error.message, 'err'); return; }
      setSummary(data?.description_archive || '');
      setGallery(normalizeGallery(data?.gallery));
      setVideoUrl(data?.video_url || '');
      setConsent(data?.media_consent_note || '');
      setPublished(!!data?.archive_published);
      setRemoved([]);
      setDirty(false);
      setState('ready');
    })();
    return () => { alive = false; };
  }, [event?.id]);

  const touch = fn => (...a) => { fn(...a); setDirty(true); };

  const upload = async files => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setUploading(n => n + list.length);
    const added = [];
    for (const file of list) {
      try {
        const path = `events/${event.id}/${Date.now()}-${safeName(file.name)}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          upsert: false, contentType: file.type || undefined, cacheControl: '31536000',
        });
        if (error) throw error;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        if (!(file.type || '').startsWith('video/')) warmImage(data.publicUrl);
        added.push({ url: data.publicUrl, caption: '', type: (file.type || '').startsWith('video/') ? 'video' : 'photo' });
      } catch (e) {
        showToast(`${file.name}: ${e.message || 'ошибка загрузки'}`, 'err');
      } finally {
        setUploading(n => n - 1);
      }
    }
    if (added.length) {
      setGallery(g => [...g, ...added]);
      setDirty(true);
      showToast(`Загружено: ${added.length}. Не забудьте сохранить.`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const move = touch((i, d) => setGallery(g => {
    const j = i + d;
    if (j < 0 || j >= g.length) return g;
    const next = [...g];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  }));

  const remove = touch(i => {
    const p = storagePath(gallery[i]?.url);
    if (p) setRemoved(r => (r.includes(p) ? r : [...r, p]));
    setGallery(g => g.filter((_, k) => k !== i));
  });

  const setCaption = touch((i, caption) => setGallery(g => g.map((x, k) => (k === i ? { ...x, caption } : x))));

  const save = async () => {
    const url = videoUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) { showToast('Ссылка на видео должна начинаться с http(s)://', 'err'); return; }
    if (published && !summary.trim() && !gallery.length && !url) {
      showToast('Нечего публиковать: добавьте итоги, фото или видео', 'err'); return;
    }
    setSaving(true);
    const { error } = await supabase.from('events').update({
      description_archive: summary.trim() || null,
      gallery: gallery.map(x => ({ url: x.url, caption: x.caption.trim(), type: x.type })),
      video_url: url || null,
      media_consent_note: consent.trim() || null,
      archive_published: published,
    }).eq('id', event.id);
    if (error) { setSaving(false); showToast('Ошибка сохранения: ' + error.message, 'err'); return; }
    if (removed.length) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove(removed);
      if (rmErr) showToast('Архив сохранён, но файлы не удалены из хранилища: ' + rmErr.message, 'err');
      setRemoved([]);
    }
    setSaving(false);
    setDirty(false);
    showToast(published ? 'Архив сохранён и опубликован' : 'Архив сохранён (черновик)');
  };

  if (!event?.id) return null;
  if (state === 'missing') return <MigrationNotice file={MIGRATION} what="Архив мероприятия" />;
  if (state === 'loading') return <div className="hint"><span className="spinner" /> Загрузка архива…</div>;

  // Чек-лист: архив — не позже 3 дней после мероприятия.
  const eventDate = event.date ? new Date(event.date) : null;
  const deadline = eventDate ? new Date(eventDate.getTime() + DEADLINE_DAYS * 864e5) : null;
  const now = new Date();
  const isPast = eventDate && eventDate < now;
  const overdue = deadline && now > deadline && !published;
  const checklist = [
    { ok: !!summary.trim(), label: 'Итоги написаны' },
    { ok: gallery.some(x => x.type === 'photo'), label: 'Фото загружены' },
    { ok: gallery.every(x => x.type !== 'photo' || x.caption.trim()), label: 'Подписи к фото' },
    { ok: !!consent.trim(), label: 'Согласие на съёмку отмечено' },
    { ok: published, label: 'Опубликовано в приложении' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Banner tone={overdue ? 'red' : 'gold'}>
        Архив — не позже {DEADLINE_DAYS} дней после мероприятия
        {deadline && <> · срок: <b>{fmtDate(deadline)}</b></>}
        {overdue && ' · просрочено'}
        {!isPast && eventDate && ' · мероприятие ещё не прошло'}
      </Banner>

      <div className="checklist" style={{ marginBottom: 0 }}>
        {checklist.map(c => (
          <span key={c.label} className={`check-item${c.ok ? ' ok' : ''}`}>
            <Ico i={c.ok ? Check : Circle} size={14} /> {c.label}
          </span>
        ))}
      </div>

      <Field label="Итоги мероприятия">
        <textarea rows={5} value={summary} placeholder="Кто выступал, ключевые мысли, договорённости, цифры…"
          onChange={e => touch(setSummary)(e.target.value)} />
      </Field>

      <Field label={`Фото и видео (${gallery.length})`}>
        <div className="field-row">
          <input ref={fileRef} type="file" multiple accept="image/*,video/mp4,video/quicktime"
            style={{ display: 'none' }} onChange={e => upload(e.target.files)} />
          <button type="button" className="btn btn-outline btn-sm" disabled={uploading > 0} onClick={() => fileRef.current?.click()}>
            {uploading > 0 ? <><span className="spinner" /> Загрузка ({uploading})…</> : <><Ico i={Upload} /> Загрузить файлы</>}
          </button>
          <span className="hint">JPG/PNG/WebP/HEIC, MP4/MOV · до 50 МБ · порядок = порядок в приложении</span>
        </div>
      </Field>

      {gallery.length > 0 && (
        <div className="list">
          {gallery.map((m, i) => (
            <div key={m.url} className="list-row" style={{ padding: 4, paddingLeft: 8 }}>
              <span className="idx" style={{ textAlign: 'center' }}>{i + 1}</span>
              {m.type === 'video'
                ? <div style={{ width: 56, height: 56, borderRadius: 4, background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', flexShrink: 0 }} title="Видео"><Ico i={Play} /></div>
                : <a href={m.url} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                    <img src={m.url} alt="" loading="lazy" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                  </a>}
              <input type="text" value={m.caption} placeholder={m.type === 'video' ? 'Подпись к видео' : 'Подпись к фото'}
                style={{ flex: 1, minWidth: 0 }} onChange={e => setCaption(i, e.target.value)} />
              <div style={{ display: 'flex', gap: 2 }}>
                <button type="button" className="btn-icon" aria-label="Выше" title="Выше" disabled={i === 0} onClick={() => move(i, -1)}><Ico i={ArrowUp} /></button>
                <button type="button" className="btn-icon" aria-label="Ниже" title="Ниже" disabled={i === gallery.length - 1} onClick={() => move(i, 1)}><Ico i={ArrowDown} /></button>
                <button type="button" className="btn-icon danger" aria-label="Удалить" title="Удалить"
                  onClick={() => { if (window.confirm('Удалить файл из архива? Файл будет удалён из хранилища после сохранения.')) remove(i); }}><Ico i={Trash2} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Field label="Ссылка на видео (YouTube, Google Drive и т.п.)">
        <input type="url" value={videoUrl} placeholder="https://…" onChange={e => touch(setVideoUrl)(e.target.value)} />
      </Field>

      <Field label="Согласие на съёмку / публикацию">
        <input type="text" value={consent} placeholder="Например: участники предупреждены о съёмке, отказавшиеся не в кадре"
          onChange={e => touch(setConsent)(e.target.value)} />
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <label className="check-label">
          <Toggle checked={published} onChange={touch(setPublished)} />
          <span>Опубликовать в архиве</span>
          <PubState on={published} onLabel="в приложении" offLabel="черновик" />
        </label>
        <button type="button" className="btn btn-outline btn-sm" disabled={saving || uploading > 0 || !dirty} onClick={save}>
          {saving ? <><span className="spinner" /> Сохранение…</> : dirty ? 'Сохранить архив' : 'Сохранено'}
        </button>
      </div>
    </div>
  );
}

export default EventArchiveEditor;
