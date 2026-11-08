import React, { useId, useState } from 'react';
import { PUB_STATUSES } from './helpers';

// Общие мелкие компоненты админки. Живут отдельно, чтобы разделы из
// src/components/admin/* могли их использовать без циклического импорта Admin.jsx.

export const Toggle = ({ checked, onChange }) => (
  <label className="toggle">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <div className="toggle-track" />
    <div className="toggle-thumb" />
  </label>
);

export const Field = ({ label, children }) => (
  <div className="field">
    <label>{label}</label>
    {children}
  </div>
);

export const Modal = ({ title, onClose, onSave, saving, saveLabel = 'Сохранить', wide = false, children }) => (
  <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal" style={wide ? { maxWidth: 860 } : undefined}>
      <div className="modal-title">{title}</div>
      {children}
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>{onSave ? 'Отмена' : 'Закрыть'}</button>
        {onSave && (
          <button className="btn btn-gold" onClick={onSave} disabled={saving}>
            {saving ? <><span className="spinner" /> Отправка…</> : saveLabel}
          </button>
        )}
      </div>
    </div>
  </div>
);

export const Empty = ({ icon, text }) => (
  <div className="empty">
    <div className="empty-icon">{icon}</div>
    <div>{text}</div>
  </div>
);

export const Avatar = ({ url, name, size = 32 }) => url
  ? <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>
      {(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
    </div>
  );

/** Ввод тегов: Enter или запятая добавляет, × удаляет. value — string[]. */
export const TagsInput = ({ value, onChange, placeholder = 'Введите и нажмите Enter', suggestions = [] }) => {
  const [draft, setDraft] = useState('');
  const tags = Array.isArray(value) ? value : [];
  const add = raw => {
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean)
      .filter(t => !tags.some(x => x.toLowerCase() === t.toLowerCase()));
    if (parts.length) onChange([...tags, ...parts]);
    setDraft('');
  };
  const uid = useId();
  const listId = suggestions.length ? `tags-${uid}` : undefined;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: 6, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--s2)' }}>
      {tags.map(t => (
        <span key={t} className="badge badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {t}
          <button type="button" className="btn-ghost" style={{ padding: 0, fontSize: 13, lineHeight: 1 }} aria-label={`Удалить ${t}`}
            onClick={() => onChange(tags.filter(x => x !== t))}>×</button>
        </span>
      ))}
      <input type="text" value={draft} list={listId} placeholder={tags.length ? '' : placeholder}
        style={{ flex: 1, minWidth: 140, border: 'none', background: 'transparent', padding: '4px 6px' }}
        onChange={e => { const v = e.target.value; if (v.endsWith(',')) add(v); else setDraft(v); }}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); add(draft); }
          else if (e.key === 'Backspace' && !draft && tags.length) onChange(tags.slice(0, -1));
        }}
        onBlur={() => draft.trim() && add(draft)} />
      {listId && <datalist id={listId}>{suggestions.map(s => <option key={s} value={s} />)}</datalist>}
    </div>
  );
};

/** Бейдж статуса публикации (draft / review / published). */
export const StatusBadge = ({ status }) => {
  const s = PUB_STATUSES[status] || PUB_STATUSES.draft;
  return <span className={`badge ${s.badge}`}>{s.label}</span>;
};

/** Кнопки workflow: На проверку → Опубликовать → Снять с публикации. */
export const StatusActions = ({ status, onChange, hasReview = true }) => (
  <>
    {status === 'draft' && hasReview && <button className="btn btn-outline btn-sm" onClick={() => onChange('review')}>На проверку</button>}
    {(status === 'review' || (status === 'draft' && !hasReview)) && <button className="btn btn-gold btn-sm" onClick={() => onChange('published')}>Опубликовать</button>}
    {status !== 'draft' && <button className="btn btn-outline btn-sm" onClick={() => onChange('draft')}>Снять с публикации</button>}
  </>
);

/** Заглушка вместо раздела, если таблицы ещё нет. */
export const MigrationNotice = ({ file, what }) => (
  <div className="card" style={{ borderColor: 'rgba(212,168,83,.4)', color: 'var(--text)', lineHeight: 1.6 }}>
    <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ {what ? `${what}: таблица не найдена` : 'Таблица не найдена'}</div>
    <div style={{ color: 'var(--muted)', fontSize: 13 }}>
      Запустите миграцию <code style={{ color: 'var(--gold)' }}>{file}</code> в Supabase → SQL Editor, затем обновите страницу.
    </div>
  </div>
);

/** Плашка-предупреждение (например, «Только для администраторов»). */
export const Banner = ({ children, tone = 'gold' }) => (
  <div style={{
    padding: '12px 16px', borderRadius: 12, marginBottom: 18, fontSize: 13, lineHeight: 1.5,
    border: `1px solid ${tone === 'red' ? 'rgba(224,82,82,.4)' : 'rgba(212,168,83,.4)'}`,
    background: tone === 'red' ? 'rgba(224,82,82,.08)' : 'var(--gold-dim)',
    color: tone === 'red' ? 'var(--danger)' : 'var(--gold)',
  }}>{children}</div>
);
