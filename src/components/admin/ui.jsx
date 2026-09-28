import React from 'react';

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
