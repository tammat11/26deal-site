import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Avatar } from './ui';
import { showToast } from './helpers';

const RSVP_LABELS = { going: 'Идёт', with_family: 'С семьёй', maybe: 'Возможно', not_going: 'Не идёт' };

/**
 * Явка на мероприятие. Баллы начисляет сама база (триггер на event_attendance):
 * «Посетил» → баллы события, «Чемпион» → + баллы за чемпионство.
 * Список — все резиденты: отметить можно и тех, кто пришёл без записи в приложении.
 */
export const AttendancePanel = ({ event }) => {
  const [residents, setResidents] = useState(null);
  const [rsvps, setRsvps] = useState({});      // resident_id → status
  const [marks, setMarks] = useState({});      // resident_id → { attended, is_champion }
  const [query, setQuery] = useState('');
  const [onlyRsvp, setOnlyRsvp] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      supabase.from('residents').select('id,name,company,photo_url').eq('is_published', true).order('name'),
      supabase.from('event_rsvps_with_resident').select('resident_id,status').eq('event_id', event.id),
      supabase.from('event_attendance').select('resident_id,attended,is_champion').eq('event_id', event.id),
    ]).then(([r, v, a]) => {
      if (!alive) return;
      if (a.error) showToast('Таблица явки не найдена — примените миграцию 2026-09-28', 'err');
      setResidents(r.data || []);
      setRsvps(Object.fromEntries((v.data || []).map(x => [x.resident_id, x.status])));
      setMarks(Object.fromEntries((a.data || []).map(x => [x.resident_id, x])));
      // Если на событие никто не записывался — сразу показываем всех.
      if (!(v.data || []).length) setOnlyRsvp(false);
    });
    return () => { alive = false; };
  }, [event.id]);

  const save = async (residentId, patch) => {
    const prev = marks[residentId] || { attended: null, is_champion: false };
    const next = { ...prev, ...patch };
    if (next.is_champion) next.attended = true;          // чемпион всегда присутствовал
    if (next.attended !== true) next.is_champion = false;
    setBusyId(residentId);
    const { error } = await supabase.from('event_attendance').upsert({
      event_id: event.id,
      resident_id: residentId,
      attended: next.attended,
      is_champion: next.is_champion,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'event_id,resident_id' });
    setBusyId(null);
    if (error) return showToast('Ошибка: ' + error.message, 'err');
    setMarks(m => ({ ...m, [residentId]: next }));
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (residents || [])
      .filter(r => !onlyRsvp || rsvps[r.id] || marks[r.id]?.attended != null)
      .filter(r => !q || `${r.name} ${r.company || ''}`.toLowerCase().includes(q))
      .sort((a, b) => (rsvps[b.id] === 'going' || rsvps[b.id] === 'with_family') - (rsvps[a.id] === 'going' || rsvps[a.id] === 'with_family'));
  }, [residents, rsvps, marks, query, onlyRsvp]);

  const attendedCount = Object.values(marks).filter(m => m.attended === true).length;
  const championCount = Object.values(marks).filter(m => m.is_champion).length;

  if (residents === null) return <div style={{ color: 'var(--muted)', fontSize: 13 }}>Загрузка…</div>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span className="stat-pill">✅ Посетили: {attendedCount}</span>
        <span className="stat-pill">🏆 Чемпионы: {championCount}</span>
        <span className="stat-pill">+{event.points ?? 0} за посещение · +{event.champion_points ?? 0} за чемпионство</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input type="text" placeholder="Поиск резидента" value={query} onChange={e => setQuery(e.target.value)} />
        <button type="button" className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap' }} onClick={() => setOnlyRsvp(v => !v)}>
          {onlyRsvp ? 'Показать всех' : 'Только записавшиеся'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
        {list.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Никого не найдено</div>}
        {list.map(r => {
          const m = marks[r.id] || {};
          const busy = busyId === r.id;
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--border)', opacity: busy ? .6 : 1 }}>
              <Avatar url={r.photo_url} name={r.name} size={26} />
              <span style={{ fontSize: 12, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}{r.company ? ` · ${r.company}` : ''}
              </span>
              {rsvps[r.id] && <span className="badge badge-gray">{RSVP_LABELS[rsvps[r.id]] || rsvps[r.id]}</span>}
              <button type="button" disabled={busy}
                className={m.attended === true ? 'btn btn-gold btn-xs' : 'btn btn-outline btn-xs'}
                onClick={() => save(r.id, { attended: m.attended === true ? null : true })}>Посетил</button>
              <button type="button" disabled={busy} className="btn btn-xs"
                style={m.attended === false
                  ? { background: 'rgba(255,80,80,.18)', border: '1px solid rgba(255,80,80,.5)', color: '#ff7b7b' }
                  : { background: 'none', border: '1px solid var(--border)', color: 'var(--muted)' }}
                onClick={() => save(r.id, { attended: m.attended === false ? null : false })}>Не посетил</button>
              <button type="button" disabled={busy} title="Чемпион мероприятия"
                className={m.is_champion ? 'btn btn-gold btn-xs' : 'btn btn-outline btn-xs'}
                onClick={() => save(r.id, { is_champion: !m.is_champion })}>🏆</button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
