-- ================================================================
-- 26 Business Club — антибаллы (2026-10-27)
--   • записался «Иду», но не пришёл (отметка «Не посетил») → −no_show_penalty
--   • опоздал (отметка «Опоздал» у пришедшего)              → −late_penalty
--   • ушёл раньше (отметка «Ушёл раньше» у пришедшего)       → −left_early_penalty
-- Баллы за посещение при опоздании / раннем уходе сохраняются, штраф
-- вычитается отдельной строкой журнала. Суммы — на каждое мероприятие,
-- по умолчанию 100 / 50 / 50. Действуют для мероприятий с 27.10.2026.
-- Повторный запуск безопасен.
-- ================================================================

alter table public.events
  add column if not exists no_show_penalty int not null default 100,
  add column if not exists late_penalty int not null default 50,
  add column if not exists left_early_penalty int not null default 50;

alter table public.event_attendance
  add column if not exists is_late boolean not null default false,
  add column if not exists left_early boolean not null default false;

-- Новые виды строк журнала.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.points_ledger'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.points_ledger drop constraint %I', c);
  end loop;
  alter table public.points_ledger add constraint points_ledger_kind_check
    check (kind in ('attendance','champion','referral','adjustment','no_show','late','left_early'));
end $$;

-- Приводит сумму строк (событие, резидент, вид) к нужной, дописывая дельту.
create or replace function public.sync_points_kind(
  p_event uuid, p_resident uuid, p_kind text, p_want int,
  p_title text, p_date timestamptz, p_cancel_note text, p_change_note text)
returns void language plpgsql security definer set search_path = public as $$
declare have int;
begin
  select coalesce(sum(points), 0) into have from public.points_ledger
   where event_id = p_event and resident_id = p_resident and kind = p_kind;
  if have <> p_want then
    insert into public.points_ledger(resident_id, kind, points, title, comment, event_id, occurred_at)
    values (p_resident, p_kind, p_want - have, p_title,
            case when have = 0 then null
                 when p_want = 0 then p_cancel_note
                 else p_change_note end,
            p_event, p_date);
  end if;
end $$;

create or replace function public.sync_event_points(p_event uuid, p_resident uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  ev public.events%rowtype;
  att public.event_attendance%rowtype;
  has_att boolean;
  registered boolean;
  -- Антибаллы введены 27.10.2026: к прошедшим до этого встречам не применяются.
  penalized boolean;
  t text;
  d timestamptz;
begin
  select * into ev from public.events where id = p_event;
  select * into att from public.event_attendance where event_id = p_event and resident_id = p_resident;
  has_att := found and ev.id is not null;

  t := coalesce(ev.title,
    (select l.title from public.points_ledger l
      where l.event_id = p_event and l.kind = 'attendance' order by created_at limit 1),
    'Мероприятие');
  d := coalesce(ev.date, now());
  penalized := has_att and d >= timestamptz '2026-10-27 00:00:00+05';

  -- Записывался ли резидент «Иду» (любым из своих аккаунтов).
  registered := exists (
    select 1 from public.event_rsvps r
     where r.event_id = p_event
       and r.status in ('going', 'with_family')
       and r.user_id in (select public.user_ids_for_resident(p_resident)));

  perform public.sync_points_kind(p_event, p_resident, 'attendance',
    case when has_att and att.attended is true then ev.points else 0 end,
    t, d, 'Отметка о посещении снята', 'Изменены баллы мероприятия');

  perform public.sync_points_kind(p_event, p_resident, 'champion',
    case when has_att and att.attended is true and att.is_champion then ev.champion_points else 0 end,
    'Чемпион: ' || t, d, 'Чемпионство снято', 'Изменены баллы за чемпионство');

  perform public.sync_points_kind(p_event, p_resident, 'no_show',
    case when penalized and att.attended is false and registered then -ev.no_show_penalty else 0 end,
    'Не пришёл после записи: ' || t, d, 'Штраф снят', 'Изменён штраф за неявку');

  perform public.sync_points_kind(p_event, p_resident, 'late',
    case when penalized and att.attended is true and att.is_late then -ev.late_penalty else 0 end,
    'Опоздание: ' || t, d, 'Штраф снят', 'Изменён штраф за опоздание');

  perform public.sync_points_kind(p_event, p_resident, 'left_early',
    case when penalized and att.attended is true and att.left_early then -ev.left_early_penalty else 0 end,
    'Ушёл раньше: ' || t, d, 'Штраф снят', 'Изменён штраф за ранний уход');
end $$;

-- Изменение баллов / штрафов мероприятия пересчитывает всех отмеченных.
create or replace function public.trg_event_points_changed()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.points is distinct from old.points
     or new.champion_points is distinct from old.champion_points
     or new.no_show_penalty is distinct from old.no_show_penalty
     or new.late_penalty is distinct from old.late_penalty
     or new.left_early_penalty is distinct from old.left_early_penalty then
    for r in select resident_id from public.event_attendance where event_id = new.id loop
      perform public.sync_event_points(new.id, r.resident_id);
    end loop;
  end if;
  if new.date is distinct from old.date then
    update public.points_ledger set occurred_at = new.date
     where event_id = new.id
       and kind in ('attendance','champion','no_show','late','left_early');
  end if;
  return new;
end $$;

-- Запись / отписка от мероприятия после отметки явки пересчитывает штраф
-- за неявку (например, резидент снял «Иду» заранее — штрафа нет).
create or replace function public.trg_rsvp_resync_points()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  eid uuid := coalesce(new.event_id, old.event_id);
  uid uuid := coalesce(new.user_id, old.user_id);
  rid uuid := public.resident_id_for_user(uid);
begin
  if rid is not null and exists (
       select 1 from public.event_attendance where event_id = eid and resident_id = rid) then
    perform public.sync_event_points(eid, rid);
  end if;
  return null;
end $$;

-- Только смена статуса записи: зеркалирование attended из event_attendance
-- в event_rsvps меняет другую колонку и этот триггер не задевает.
drop trigger if exists trg_rsvp_resync_points on public.event_rsvps;
create trigger trg_rsvp_resync_points
  after insert or delete or update of status on public.event_rsvps
  for each row execute function public.trg_rsvp_resync_points();

revoke execute on function public.sync_points_kind(uuid, uuid, text, int, text, timestamptz, text, text) from public, anon, authenticated;
revoke execute on function public.sync_event_points(uuid, uuid) from public, anon, authenticated;
