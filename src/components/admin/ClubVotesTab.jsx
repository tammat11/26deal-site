import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Modal, Field, Toggle, Empty, MigrationNotice, Banner } from './ui';
import { showToast, fmtDateTime, isMissingTable } from './helpers';

// Голосования клуба (план 5.16, 6.1; решение 3.4) — отдельно от опросов.
// Таблицы club_votes / club_vote_options / club_vote_log и RPC
// club_vote_results_admin — миграция supabase/migrations/2026-11-09_club_votes.sql.
// Бюллетени тайных голосований админке недоступны (RLS): итоги — только
// агрегатами через RPC, поэтому и CSV содержит только агрегаты.

const MIGRATION = '2026-11-09_club_votes.sql';

const STATUS = {
  draft:     { label: 'Черновик',  badge: 'badge-gray' },
  open:      { label: 'Открыто',   badge: 'badge-green' },
  closed:    { label: 'Завершено', badge: 'badge-gold' },
  cancelled: { label: 'Отменено',  badge: 'badge-red' },
};

const PASS_RULES = [
  { value: 'simple_majority', label: 'Простое большинство' },
  { value: 'two_thirds',      label: '2/3 голосов' },
  { value: 'unanimous',       label: 'Единогласно' },
];
const passRuleLabel = v => PASS_RULES.find(r => r.value === v)?.label || v;

const MEANINGS = [
  { value: '',        label: '— вариант выбора' },
  { value: 'for',     label: 'За' },
  { value: 'against', label: 'Против' },
  { value: 'abstain', label: 'Воздержался' },
];

const DEFAULT_OPTIONS = [
  { label: 'За', meaning: 'for' },
  { label: 'Против', meaning: 'against' },
  { label: 'Воздержался', meaning: 'abstain' },
];

const ACTIONS = {
  created: 'Создано', opened: 'Открыто', closed: 'Закрыто', cancelled: 'Отменено',
  ballot_cast: 'Голос подан', result_computed: 'Итоги подсчитаны', updated: 'Изменено',
  exported: 'Выгрузка итогов',
};

const ERRORS = {
  RULES_LOCKED: 'Правила нельзя менять после открытия голосования',
  OPTIONS_LOCKED: 'Варианты нельзя менять после открытия голосования',
  INVALID_TRANSITION: 'Недопустимая смена статуса',
  INVALID_WINDOW: 'Дата закрытия уже прошла',
  DELETE_FORBIDDEN: 'Удалить можно только черновик — остальное отмените',
};
const errText = e => {
  const code = /([A-Z_]{4,}):/.exec(e?.message || '')?.[1];
  return ERRORS[code] || e?.message || 'Ошибка';
};

const toLocalInput = d => {
  if (!d) return '';
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocalInput = v => (v ? new Date(v).toISOString() : null);

const emptyForm = () => ({
  title: '', description: '', attachment_url: '',
  audience: 'all', group_id: '', is_secret: true, quorum_percent: 50,
  pass_rule: 'simple_majority', results_visibility: 'after_close',
  opens_at: '', closes_at: '', open_now: false,
});

const rulesLine = v => [
  v.is_secret ? 'Тайное' : 'Открытое',
  `кворум ${v.quorum_percent}%`,
  passRuleLabel(v.pass_rule).toLowerCase(),
  v.results_visibility === 'live' ? 'итоги онлайн' : 'итоги после закрытия',
].join(' · ');

const verdict = r => {
  if (!r) return null;
  if (!r.quorum_reached) return { text: 'Кворум не набран', badge: 'badge-red' };
  if (r.passed === true) return { text: 'Решение принято', badge: 'badge-green' };
  if (r.passed === false) return { text: 'Решение не принято', badge: 'badge-red' };
  const w = (r.options || []).find(o => o.id === r.winner_option_id);
  return w ? { text: `Выбран: «${w.label}»`, badge: 'badge-green' } : { text: 'Победитель не определён', badge: 'badge-gray' };
};

function downloadCsv(fileName, rows) {
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // ; и BOM — чтобы Excel с русской локалью открыл без мастера импорта.
  const csv = '﻿' + rows.map(r => r.map(esc).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName.replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Голосования клуба: создание, открытие/закрытие, явка, итоги, журнал, CSV. */
export const ClubVotesTab = () => {
  const [votes, setVotes] = useState(null);
  const [missing, setMissing] = useState(false);
  const [groups, setGroups] = useState([]);
  const [residents, setResidents] = useState({});
  const [tallies, setTallies] = useState({});
  const [modal, setModal] = useState(null); // null | 'new' | vote
  const [form, setForm] = useState(emptyForm());
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState(null); // vote для окна итогов/журнала
  const [log, setLog] = useState([]);

  const loadTally = useCallback(async id => {
    const { data, error } = await supabase.rpc('club_vote_results_admin', { p_vote: id });
    if (!error && data) setTallies(t => ({ ...t, [id]: data }));
    return data;
  }, []);

  const load = useCallback(async () => {
    const [v, g, r] = await Promise.all([
      supabase.from('club_votes').select('*, club_vote_options(id,label,meaning,sort_order)').order('created_at', { ascending: false }),
      supabase.from('resident_groups').select('id,name').order('sort_order').order('name'),
      supabase.from('residents').select('id,name'),
    ]);
    if (v.error) {
      if (isMissingTable(v.error)) setMissing(true);
      else showToast('Ошибка загрузки: ' + v.error.message, 'err');
      setVotes([]);
      return;
    }
    setVotes(v.data || []);
    setGroups(g.data || []);
    setResidents(Object.fromEntries((r.data || []).map(x => [x.id, x.name])));
    (v.data || []).filter(x => x.status !== 'draft' && x.status !== 'cancelled').forEach(x => loadTally(x.id));
  }, [loadTally]);

  useEffect(() => { load(); }, [load]);

  // Живая явка открытых голосований — раз в 15 секунд.
  useEffect(() => {
    const openIds = (votes || []).filter(v => v.status === 'open').map(v => v.id);
    if (!openIds.length) return undefined;
    const t = setInterval(() => openIds.forEach(loadTally), 15000);
    return () => clearInterval(t);
  }, [votes, loadTally]);

  const loadLog = useCallback(async id => {
    const { data, error } = await supabase.from('club_vote_log').select('*').eq('vote_id', id).order('at', { ascending: false }).limit(500);
    if (error) showToast('Журнал: ' + error.message, 'err');
    setLog(data || []);
  }, []);

  const openEditor = v => {
    if (v === 'new') {
      setForm(emptyForm());
      setOptions(DEFAULT_OPTIONS);
    } else {
      setForm({
        ...emptyForm(), ...v,
        description: v.description || '', attachment_url: v.attachment_url || '',
        group_id: v.group_id || '',
        opens_at: toLocalInput(v.opens_at), closes_at: toLocalInput(v.closes_at), open_now: false,
      });
      const opts = [...(v.club_vote_options || [])].sort((a, b) => a.sort_order - b.sort_order)
        .map(o => ({ label: o.label, meaning: o.meaning || '' }));
      setOptions(opts.length ? opts : DEFAULT_OPTIONS);
    }
    setModal(v);
  };

  const isDraft = modal === 'new' || modal?.status === 'draft';
  const isLocked = modal !== 'new' && modal && modal.status !== 'draft';

  const save = async () => {
    if (!form.title.trim()) return showToast('Введите вопрос голосования', 'err');
    if (form.audience === 'group' && !form.group_id) return showToast('Выберите группу', 'err');
    const q = Number(form.quorum_percent);
    if (!Number.isFinite(q) || q < 0 || q > 100) return showToast('Кворум — от 0 до 100%', 'err');
    const opts = options.map((o, i) => ({ label: o.label.trim(), meaning: o.meaning || null, sort_order: i })).filter(o => o.label);
    if (isDraft && opts.length < 2) return showToast('Нужно минимум два варианта', 'err');
    if (form.opens_at && form.closes_at && new Date(form.closes_at) <= new Date(form.opens_at)) return showToast('Закрытие должно быть позже открытия', 'err');
    if (form.open_now && form.closes_at && new Date(form.closes_at) <= new Date()) return showToast('Дата закрытия уже прошла', 'err');

    setSaving(true);
    try {
      const base = {
        title: form.title.trim(),
        description: form.description.trim(),
        attachment_url: form.attachment_url.trim() || null,
        closes_at: fromLocalInput(form.closes_at),
        results_visibility: form.results_visibility,
      };
      const rules = {
        audience: form.audience,
        group_id: form.audience === 'group' ? form.group_id : null,
        is_secret: !!form.is_secret,
        quorum_percent: q,
        pass_rule: form.pass_rule,
        opens_at: fromLocalInput(form.opens_at),
      };
      let id = modal?.id;
      if (modal === 'new') {
        const { data, error } = await supabase.from('club_votes')
          .insert({ ...base, ...rules, status: 'draft', created_by: 'admin' }).select().single();
        if (error) throw error;
        id = data.id;
      } else {
        const { error } = await supabase.from('club_votes').update(isDraft ? { ...base, ...rules } : base).eq('id', id);
        if (error) throw error;
      }
      if (isDraft) {
        const { error: delErr } = await supabase.from('club_vote_options').delete().eq('vote_id', id);
        if (delErr) throw delErr;
        const { error: insErr } = await supabase.from('club_vote_options').insert(opts.map(o => ({ ...o, vote_id: id })));
        if (insErr) throw insErr;
        if (form.open_now) {
          const { error: openErr } = await supabase.from('club_votes').update({ status: 'open' }).eq('id', id);
          if (openErr) throw openErr;
        }
      }
      showToast(form.open_now ? 'Голосование открыто, резидентам отправлен пуш' : 'Сохранено');
      setModal(null);
      load();
    } catch (e) { showToast('Ошибка: ' + errText(e), 'err'); }
    setSaving(false);
  };

  const setStatus = async (v, status) => {
    const prompts = {
      open: `Открыть голосование «${v.title}»? Резидентам придёт пуш. После открытия правила и варианты менять нельзя.`,
      closed: `Закрыть голосование «${v.title}» сейчас? Итоги будут зафиксированы и разосланы.`,
      cancelled: `Отменить голосование «${v.title}»? Это действие необратимо.`,
    };
    if (!confirm(prompts[status])) return;
    const { error } = await supabase.from('club_votes').update({ status }).eq('id', v.id);
    if (error) return showToast('Ошибка: ' + errText(error), 'err');
    showToast(STATUS[status].label);
    load();
    if (details?.id === v.id) { setDetails({ ...v, status }); loadLog(v.id); }
  };

  const remove = async v => {
    if (!confirm(`Удалить черновик «${v.title}»?`)) return;
    const { error } = await supabase.from('club_votes').delete().eq('id', v.id);
    if (error) return showToast('Ошибка: ' + errText(error), 'err');
    showToast('Удалено'); load();
  };

  const openDetails = async v => {
    setDetails(v); setLog([]);
    loadLog(v.id);
    if (v.status !== 'draft') loadTally(v.id);
  };

  const exportCsv = async v => {
    const r = await loadTally(v.id);
    if (!r) return showToast('Нет данных для выгрузки', 'err');
    const vd = verdict(r);
    const rows = [
      ['Голосование', v.title],
      ['Статус', STATUS[v.status]?.label || v.status],
      ['Правила', rulesLine(v)],
      ['Аудитория', v.audience === 'group' ? `Группа: ${groups.find(g => g.id === v.group_id)?.name || '—'}` : 'Все резиденты'],
      ['Открыто', fmtDateTime(v.opened_at || v.opens_at)],
      ['Закрыто', fmtDateTime(v.closed_at || v.closes_at)],
      ['Имеют право голоса', r.eligible],
      ['Проголосовали', r.turnout],
      ['Явка, %', r.turnout_percent],
      ['Кворум, %', r.quorum_percent],
      ['Кворум набран', r.quorum_reached ? 'Да' : 'Нет'],
      ['Итог', r.is_final ? vd?.text : 'Голосование не завершено'],
      [],
      ['Вариант', 'Значение', 'Голосов', '% от проголосовавших'],
      ...(r.options || []).map(o => [o.label, MEANINGS.find(m => m.value === (o.meaning || ''))?.label.replace('— ', '') || '', o.count, o.percent]),
    ];
    downloadCsv(`Итоги — ${v.title}`, rows);
    await supabase.from('club_vote_log').insert({ vote_id: v.id, action: 'exported', actor: 'admin', details: { format: 'csv' } });
    if (details?.id === v.id) loadLog(v.id);
  };

  const groupName = useMemo(() => Object.fromEntries(groups.map(g => [g.id, g.name])), [groups]);

  if (missing) return <MigrationNotice file={MIGRATION} what="Голосования клуба" />;
  if (votes === null) return <div className="loading"><span className="spinner" /></div>;

  return (
    <>
      <div className="section-head">
        <div>
          <div className="section-title">Голосования клуба</div>
          <div className="section-sub">Официальные решения клуба: кворум, правило большинства, тайность. Опросы — в разделе «Опросы».</div>
        </div>
        <button className="btn btn-gold" onClick={() => openEditor('new')}>+ Голосование</button>
      </div>

      {votes.length === 0 ? (
        <Empty icon="🗳️" text="Голосований пока нет" />
      ) : (
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Вопрос</th><th>Статус</th><th>Срок</th><th>Явка</th><th></th></tr></thead>
            <tbody>
              {votes.map(v => {
                const t = tallies[v.id];
                const vd = v.status === 'closed' ? verdict(t || v.result) : null;
                return (
                  <tr key={v.id}>
                    <td style={{ maxWidth: 380 }}>
                      <div style={{ fontWeight: 600 }}>{v.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                        {rulesLine(v)}{v.audience === 'group' ? ` · группа «${groupName[v.group_id] || '—'}»` : ''}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${STATUS[v.status]?.badge}`}>{STATUS[v.status]?.label}</span>
                      {vd && <div style={{ marginTop: 4 }}><span className={`badge ${vd.badge}`}>{vd.text}</span></div>}
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {v.opens_at && <div>с {fmtDateTime(v.opens_at)}</div>}
                      <div>{v.closes_at ? `до ${fmtDateTime(v.closes_at)}` : 'без срока'}</div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {t ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{t.turnout} / {t.eligible} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({t.turnout_percent}%)</span></div>
                          <div style={{ fontSize: 11, color: t.quorum_reached ? 'var(--success)' : 'var(--muted)' }}>
                            кворум {t.quorum_percent}% {t.quorum_reached ? '✓' : ''}
                          </div>
                        </>
                      ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td>
                      <div className="td-actions">
                        {(v.status === 'draft' || v.status === 'open') && <button className="btn btn-outline btn-sm" onClick={() => openEditor(v)}>Изменить</button>}
                        {v.status === 'draft' && <button className="btn btn-gold btn-sm" onClick={() => setStatus(v, 'open')}>Открыть</button>}
                        {v.status === 'open' && <button className="btn btn-gold btn-sm" onClick={() => setStatus(v, 'closed')}>Закрыть</button>}
                        {v.status !== 'draft' && <button className="btn btn-outline btn-sm" onClick={() => openDetails(v)}>Итоги и журнал</button>}
                        {(v.status === 'draft' || v.status === 'open') && <button className="btn btn-danger btn-sm" onClick={() => setStatus(v, 'cancelled')}>Отменить</button>}
                        {v.status === 'draft' && <button className="btn btn-danger btn-sm" onClick={() => remove(v)}>Удалить</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal !== null && (
        <Modal title={modal === 'new' ? 'Новое голосование' : 'Голосование'} onClose={() => setModal(null)} onSave={save} saving={saving}
          saveLabel={form.open_now ? 'Сохранить и открыть' : 'Сохранить'} wide>
          {isLocked && (
            <Banner>Голосование открыто: правила, аудитория и варианты зафиксированы. Можно изменить текст, материалы, срок закрытия и видимость итогов.</Banner>
          )}
          <div className="form-grid">
            <div className="field full"><label>Вопрос *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Утвердить бюджет клуба на 2027 год" />
            </div>
            <div className="field full"><label>Описание</label>
              <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Суть вопроса, контекст, что будет при принятии решения" />
            </div>
            <div className="field full"><label>Ссылка на материалы</label>
              <input type="url" value={form.attachment_url} onChange={e => setForm(f => ({ ...f, attachment_url: e.target.value }))} placeholder="https://…" />
            </div>

            <Field label="Аудитория">
              <select value={form.audience} disabled={isLocked} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}>
                <option value="all">Все резиденты</option>
                <option value="group">Группа / Форум</option>
              </select>
            </Field>
            {form.audience === 'group' ? (
              <Field label="Группа *">
                <select value={form.group_id} disabled={isLocked} onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))}>
                  <option value="">— выберите —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </Field>
            ) : <div />}

            <Field label="Кворум, % от имеющих право голоса">
              <input type="number" min={0} max={100} value={form.quorum_percent} disabled={isLocked}
                onChange={e => setForm(f => ({ ...f, quorum_percent: e.target.value }))} />
            </Field>
            <Field label="Правило принятия решения">
              <select value={form.pass_rule} disabled={isLocked} onChange={e => setForm(f => ({ ...f, pass_rule: e.target.value }))}>
                {PASS_RULES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>

            <Field label="Открытие (пусто — вручную)">
              <input type="datetime-local" value={form.opens_at} disabled={isLocked} onChange={e => setForm(f => ({ ...f, opens_at: e.target.value }))} />
            </Field>
            <Field label="Закрытие (автоматически)">
              <input type="datetime-local" value={form.closes_at} onChange={e => setForm(f => ({ ...f, closes_at: e.target.value }))} />
            </Field>

            <Field label="Итоги видны">
              <select value={form.results_visibility} onChange={e => setForm(f => ({ ...f, results_visibility: e.target.value }))}>
                <option value="after_close">После закрытия</option>
                <option value="live">В реальном времени</option>
              </select>
            </Field>
            <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Toggle checked={!!form.is_secret} onChange={val => !isLocked && setForm(f => ({ ...f, is_secret: val }))} />
                Тайное голосование
              </label>
              {isDraft && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Toggle checked={!!form.open_now} onChange={val => setForm(f => ({ ...f, open_now: val }))} />
                  Открыть сразу после сохранения
                </label>
              )}
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 14px', lineHeight: 1.5 }}>
            Воздержавшиеся учитываются в явке и кворуме, но не в большинстве (база = «За» + «Против»).
            Черновик с датой открытия откроется автоматически (проверка каждые 5 минут).
          </div>

          <Field label={`Варианты (${options.length})`}>
            <div>
              {options.map((o, i) => (
                <div key={i} className="option-row">
                  <input type="text" value={o.label} disabled={isLocked} placeholder={`Вариант ${i + 1}`}
                    onChange={e => setOptions(list => list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <select value={o.meaning || ''} disabled={isLocked} style={{ maxWidth: 170 }}
                    onChange={e => setOptions(list => list.map((x, j) => (j === i ? { ...x, meaning: e.target.value } : x)))}>
                    {MEANINGS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  {!isLocked && (
                    <>
                      <button type="button" className="btn btn-outline btn-xs" disabled={i === 0} aria-label="Выше"
                        onClick={() => setOptions(list => { const c = [...list]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; })}>↑</button>
                      <button type="button" className="btn btn-danger btn-xs" aria-label="Удалить вариант"
                        onClick={() => setOptions(list => list.filter((_, j) => j !== i))}>×</button>
                    </>
                  )}
                </div>
              ))}
              {!isLocked && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="add-option" onClick={() => setOptions(list => [...list, { label: '', meaning: '' }])}>+ Добавить вариант</button>
                  <button type="button" className="add-option" onClick={() => setOptions(DEFAULT_OPTIONS)}>За / Против / Воздержался</button>
                </div>
              )}
            </div>
          </Field>
        </Modal>
      )}

      {details && (
        <ResultsModal
          vote={details}
          tally={tallies[details.id]}
          log={log}
          residents={residents}
          onClose={() => setDetails(null)}
          onRefresh={() => { loadTally(details.id); loadLog(details.id); }}
          onExport={() => exportCsv(details)}
          onClose2={() => setStatus(details, 'closed')}
        />
      )}
    </>
  );
};

const ResultsModal = ({ vote, tally, log, residents, onClose, onRefresh, onExport, onClose2 }) => {
  const r = tally;
  const vd = r?.is_final ? verdict(r) : null;
  const actorName = a => {
    if (!a) return '—';
    if (a === 'admin') return 'Админка';
    if (a === 'system') return 'Система';
    return residents[a] || a;
  };
  const detailText = e => {
    const d = e.details || {};
    if (e.action === 'ballot_cast') {
      if (!d.option_id) return 'выбор скрыт (тайное)';
      const o = (vote.club_vote_options || []).find(x => x.id === d.option_id);
      return o ? `«${o.label}»` : '';
    }
    if (e.action === 'result_computed') {
      const v = verdict(d);
      return d.turnout != null ? `явка ${d.turnout}/${d.eligible} · ${v?.text || ''}` : '';
    }
    if (e.action === 'opened' || e.action === 'closed') return d.closes_at ? `срок ${fmtDateTime(d.closes_at)}` : '';
    if (e.action === 'updated') {
      return Object.entries(d).map(([k, val]) => `${k}: ${k.endsWith('_at') ? fmtDateTime(val) : val}`).join(', ');
    }
    return '';
  };

  return (
    <Modal title={vote.title} onClose={onClose} wide>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <span className={`badge ${STATUS[vote.status]?.badge}`}>{STATUS[vote.status]?.label}</span>
        {vd && <span className={`badge ${vd.badge}`}>{vd.text}</span>}
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{rulesLine(vote)}</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn-outline btn-sm" onClick={onRefresh}>Обновить</button>
        {vote.status === 'open' && <button className="btn btn-gold btn-sm" onClick={onClose2}>Закрыть сейчас</button>}
        {r && <button className="btn btn-outline btn-sm" onClick={onExport}>Экспорт CSV</button>}
      </div>

      {vote.status === 'cancelled' ? (
        <Banner tone="red">Голосование отменено — итоги не подводятся.</Banner>
      ) : !r ? (
        <div className="loading"><span className="spinner" /></div>
      ) : (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 16 }}>
            <Stat label="Проголосовали" value={`${r.turnout} / ${r.eligible}`} />
            <Stat label="Явка" value={`${r.turnout_percent}%`} />
            <Stat label={`Кворум ${r.quorum_percent}%`} value={r.quorum_reached ? 'набран' : 'нет'} tone={r.quorum_reached ? 'var(--success)' : 'var(--muted)'} />
            {r.votes_for + r.votes_against > 0 && <Stat label="За / Против" value={`${r.votes_for} / ${r.votes_against}`} />}
          </div>
          {(r.options || []).map(o => (
            <div key={o.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: r.winner_option_id === o.id ? 700 : 500 }}>{r.winner_option_id === o.id && r.is_final ? '✓ ' : ''}{o.label}</span>
                <span style={{ color: 'var(--muted)' }}>{o.count} · {o.percent}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 6, background: 'var(--s3)', overflow: 'hidden' }}>
                <div style={{
                  width: `${o.percent}%`, height: '100%',
                  background: o.meaning === 'for' ? 'var(--success)' : o.meaning === 'against' ? 'var(--danger)' : 'var(--gold)',
                }} />
              </div>
            </div>
          ))}
          {!r.is_final && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              Промежуточные данные.{vote.results_visibility === 'after_close' ? ' Резиденты видят только явку до закрытия.' : ' Резиденты видят результаты в реальном времени.'}
            </div>
          )}
          {vote.is_secret && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              Тайное голосование: бюллетени не выдаются ни приложению, ни админке — только агрегаты.
            </div>
          )}
        </div>
      )}

      <div style={{ fontWeight: 700, margin: '6px 0 8px' }}>Журнал</div>
      <div className="tbl-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
        <table>
          <thead><tr><th>Время</th><th>Событие</th><th>Кто</th><th>Детали</th></tr></thead>
          <tbody>
            {log.map(e => (
              <tr key={e.id}>
                <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDateTime(e.at)}</td>
                <td>{ACTIONS[e.action] || e.action}</td>
                <td style={{ fontSize: 12 }}>{actorName(e.actor)}</td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{detailText(e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {log.length === 0 && <div className="loading" style={{ color: 'var(--muted)' }}>Записей нет</div>}
      </div>
    </Modal>
  );
};

const Stat = ({ label, value, tone }) => (
  <div>
    <div style={{ fontSize: 20, fontWeight: 700, color: tone || 'var(--text)' }}>{value}</div>
    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</div>
  </div>
);
