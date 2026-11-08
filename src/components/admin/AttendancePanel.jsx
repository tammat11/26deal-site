import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trophy, Medal } from 'lucide-react';
import { Avatar, Ico } from './ui';
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
      supabase.from('event_attendance').select('resident_id,attended,is_champion,is_co_champion,is_late,left_early').eq('event_id', event.id),
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
    const prev = marks[residentId] || { attended: null, is_champion: false, is_co_champion: false, is_late: false, left_early: false };
    const next = { ...prev, ...patch };
    // Чемпион и со-чемпион — взаимоисключающие отметки.
    if (patch.is_champion) next.is_co_champion = false;
    if (patch.is_co_champion) next.is_champion = false;
    // Чемпион, опоздавший и ушедший раньше — все присутствовали.
    if (next.is_champion || next.is_co_champion || next.is_late || next.left_early) next.attended = true;
    if (next.attended !== true) { next.is_champion = false; next.is_co_champion = false; next.is_late = false; next.left_early = false; }
    setBusyId(residentId);
    const { error } = await supabase.from('event_attendance').upsert({
      event_id: event.id,
      resident_id: residentId,
      attended: next.attended,
      is_champion: next.is_champion,
      is_co_champion: !!next.is_co_champion,
      is_late: !!next.is_late,
      left_early: !!next.left_early,
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
  const coChampionCount = Object.values(marks).filter(m => m.is_co_champion).length;
  const isGoing = id => rsvps[id] === 'going' || rsvps[id] === 'with_family';
  const noShowCount = Object.entries(marks).filter(([id, m]) => m.attended === false && isGoing(id)).length;
  const penaltiesActive = event.date && new Date(event.date) >= new Date('2026-10-27T00:00:00+05:00');

  if (residents === null) return <div className="hint">Загрузка…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="meta-line">
        <span>Посетили <b>{attendedCount}</b></span>
        <span>Чемпионы <b>{championCount}</b></span>
        <span>Со-чемпионы <b>{coChampionCount}</b></span>
      </div>
      <div className="note">
        +{event.points ?? 0} за посещение · +{event.champion_points ?? 0} чемпион · +{event.co_champion_points ?? 150} со-чемпион
        <br />
        {penaltiesActive
          ? <>−{event.no_show_penalty ?? 400} неявка после подтверждения ({noShowCount}) · −{event.late_cancel_penalty ?? 200} поздняя отмена · −{event.late_penalty ?? 50} опоздание · −{event.left_early_penalty ?? 50} ранний уход</>
          : 'Антибаллы действуют для мероприятий с 27.10.2026'}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" placeholder="Поиск резидента" value={query} onChange={e => setQuery(e.target.value)} />
        <button type="button" className="btn btn-outline" style={{ flexShrink: 0 }} onClick={() => setOnlyRsvp(v => !v)}>
          {onlyRsvp ? 'Показать всех' : 'Только записавшиеся'}
        </button>
      </div>
      <div className="list" style={{ maxHeight: 380, overflowY: 'auto' }}>
        {list.length === 0 && <div className="hint">Никого не найдено</div>}
        {list.map(r => {
          const m = marks[r.id] || {};
          const busy = busyId === r.id;
          return (
            <div key={r.id} className="list-row" style={{ gap: 8, minHeight: 40, padding: '4px 8px', flexWrap: 'wrap', opacity: busy ? .6 : 1 }}>
              <Avatar url={r.photo_url} name={r.name} size={24} />
              <span style={{ fontSize: 13, flex: '1 1 160px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.name}{r.company ? <span style={{ color: 'var(--muted)' }}> · {r.company}</span> : ''}
              </span>
              {rsvps[r.id] && <span className="hint" style={{ whiteSpace: 'nowrap' }}>{RSVP_LABELS[rsvps[r.id]] || rsvps[r.id]}</span>}
              <button type="button" disabled={busy}
                className={`chip${m.attended === true ? ' on' : ''}`}
                onClick={() => save(r.id, { attended: m.attended === true ? null : true })}>Посетил</button>
              <button type="button" disabled={busy}
                className={`chip${m.attended === false ? ' on-bad' : ''}`}
                onClick={() => save(r.id, { attended: m.attended === false ? null : false })}>Не посетил</button>
              <button type="button" disabled={busy} title="Чемпион мероприятия" aria-label="Чемпион мероприятия"
                className={`chip${m.is_champion ? ' on' : ''}`}
                onClick={() => save(r.id, { is_champion: !m.is_champion })}><Ico i={Trophy} size={14} /></button>
              <button type="button" disabled={busy} title="Со-чемпион мероприятия" aria-label="Со-чемпион мероприятия"
                className={`chip${m.is_co_champion ? ' on' : ''}`}
                onClick={() => save(r.id, { is_co_champion: !m.is_co_champion })}><Ico i={Medal} size={14} /></button>
              <button type="button" disabled={busy} title={`Опоздал: −${event.late_penalty ?? 50}`}
                className={`chip${m.is_late ? ' on' : ''}`}
                onClick={() => save(r.id, { is_late: !m.is_late })}>Опоздал</button>
              <button type="button" disabled={busy} title={`Ушёл раньше: −${event.left_early_penalty ?? 50}`}
                className={`chip${m.left_early ? ' on' : ''}`}
                onClick={() => save(r.id, { left_early: !m.left_early })}>Ушёл раньше</button>
              {m.attended === false && isGoing(r.id) && penaltiesActive && (
                <span className="mono" style={{ color: 'var(--danger)' }} title="Подтвердил участие, но не пришёл">−{event.no_show_penalty ?? 400}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
