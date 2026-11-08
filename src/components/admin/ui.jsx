import React, { useId, useState } from 'react';
import { X, TriangleAlert, Info, Lock } from 'lucide-react';
import { PUB_STATUSES } from './helpers';

// Общие мелкие компоненты админки. Живут отдельно, чтобы разделы из
// src/components/admin/* могли их использовать без циклического импорта Admin.jsx.

/** Иконка в едином размере и толщине линии; цвет — от роли текста. */
export const Ico = ({ i, size = 16, className }) => {
  const Icon = i;
  return <Icon size={size} strokeWidth={1.5} className={className} aria-hidden="true" />;
};

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
    <div className={`modal${wide ? ' wide' : ''}`}>
      <div className="modal-title">{title}</div>
      {children}
      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onClose}>{onSave ? 'Отмена' : 'Закрыть'}</button>
        {onSave && (
          <button className="btn btn-gold" onClick={onSave} disabled={saving}>
            {saving ? <><span className="spinner" /> {saveLabel}</> : saveLabel}
          </button>
        )}
      </div>
    </div>
  </div>
);

export const Empty = ({ icon, text }) => (
  <div className="empty">
    {icon && <div className="empty-icon"><Ico i={icon} /></div>}
    <div>{text}</div>
  </div>
);

/** Подпись админки: латунная точка = «опубликовано / идёт сейчас»; иначе — тихий текст. */
export const PubState = ({ on, onLabel = 'Опубликовано', offLabel = 'Скрыто' }) => (
  <span className={`status${on ? '' : ' off'}`}><span className="dot" />{on ? onLabel : offLabel}</span>
);

export const Avatar = ({ url, name, size = 32 }) => url
  ? <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.max(10, Math.round(size * 0.36)), fontWeight: 500, color: 'var(--text-2)', flexShrink: 0 }}>
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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', minHeight: 36, padding: 4, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--s2)' }}>
      {tags.map(t => (
        <span key={t} className="badge" style={{ paddingRight: 2 }}>
          {t}
          <button type="button" className="btn-icon sm" style={{ width: 16, height: 16 }} aria-label={`Удалить ${t}`}
            onClick={() => onChange(tags.filter(x => x !== t))}><Ico i={X} size={12} /></button>
        </span>
      ))}
      <input type="text" value={draft} list={listId} placeholder={tags.length ? '' : placeholder}
        style={{ flex: 1, minWidth: 140, height: 28, border: 'none', background: 'transparent', padding: '0 8px', boxShadow: 'none' }}
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
  return <span className={`status${status === 'published' ? '' : ' off'}`}><span className="dot" />{s.label}</span>;
};

/** Кнопки workflow: На проверку → Опубликовать → Снять с публикации. */
export const StatusActions = ({ status, onChange, hasReview = true }) => (
  <>
    {status === 'draft' && hasReview && <button className="btn btn-outline btn-sm" onClick={() => onChange('review')}>На проверку</button>}
    {(status === 'review' || (status === 'draft' && !hasReview)) && <button className="btn btn-outline btn-sm" onClick={() => onChange('published')}>Опубликовать</button>}
    {status !== 'draft' && <button className="btn btn-outline btn-sm" onClick={() => onChange('draft')}>Снять с публикации</button>}
  </>
);

/** Заглушка вместо раздела, если таблицы ещё нет. */
export const MigrationNotice = ({ file, what }) => (
  <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', maxWidth: 680 }}>
    <span style={{ color: 'var(--muted)', marginTop: 2 }}><Ico i={TriangleAlert} /></span>
    <div>
      <div style={{ fontWeight: 500, marginBottom: 4 }}>{what ? `${what}: таблица не найдена` : 'Таблица не найдена'}</div>
      <div style={{ color: 'var(--text-2)', fontSize: 13 }}>
        Запустите миграцию <code>{file}</code> в Supabase → SQL Editor, затем обновите страницу
      </div>
    </div>
  </div>
);

/** Плашка-предупреждение (например, «Только для администраторов»). */
export const Banner = ({ children, tone = 'gold', icon }) => (
  <div className={`banner${tone === 'red' ? ' red' : ''}`}>
    <Ico i={icon || (tone === 'lock' ? Lock : Info)} />
    <div>{children}</div>
  </div>
);
