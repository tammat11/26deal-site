-- ================================================================
-- 26 Business Club — ТЗ «Рейтинг резидентов» + «Опросы и формы v2»
-- Запускать целиком в Supabase → SQL Editor. Повторный запуск безопасен.
--
-- Часть 1. Баллы и рейтинг
--   events.category / points / champion_points — настройка баллов на событие
--   event_attendance   — явка (Посетил / Не посетил / Чемпион) по резиденту
--   points_ledger      — журнал начислений (только добавление, история
--                        не теряется: исправление = новая строка-дельта)
--   get_leaderboard()  — рейтинг за год / за всё время
--
-- Часть 2. Опросы
--   surveys: вид, аудитория, старт, дедлайн, обязательность, анонимность
--   polls:   тип nps, обязательный вопрос, максимум шкалы
--   resident_groups / resident_group_members — группы и Форумы
--   survey_targets     — выбранные вручную получатели
--   survey_completions — кто прошёл анкету (отдельно от ответов → анонимность)
--   submit_survey()    — отправка анкеты одним вызовом
--   survey_recipient_status() — аналитика для админки
--   push_send() + survey_push_tick() (pg_cron) — пуш о старте и напоминание
-- ================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_net;

-- ── Общее: какой резидент стоит за текущим пользователем ─────────
-- Вход только по телефону, прямой связи auth.users → residents нет,
-- сопоставляем по цифрам номера (как во всех view админки).
create or replace function public.resident_id_for_user(p_user uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select r.id
  from auth.users u
  join public.residents r
    on regexp_replace(coalesce(r.phone, ''), '\D', '', 'g')
     = regexp_replace(coalesce(u.phone, ''), '\D', '', 'g')
  where u.id = p_user
    and coalesce(u.phone, '') <> ''
  order by r.is_published desc, r.created_at
  limit 1
$$;

create or replace function public.current_resident_id()
returns uuid language sql stable security definer set search_path = public as $$
  select public.resident_id_for_user(auth.uid())
$$;

grant execute on function public.current_resident_id() to authenticated;

-- Обратное: все auth-пользователи с телефоном резидента.
create or replace function public.user_ids_for_resident(p_resident uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select u.id
  from public.residents r
  join auth.users u
    on regexp_replace(coalesce(u.phone, ''), '\D', '', 'g')
     = regexp_replace(coalesce(r.phone, ''), '\D', '', 'g')
  where r.id = p_resident
    and coalesce(r.phone, '') <> ''
$$;

-- ================================================================
-- ЧАСТЬ 1. БАЛЛЫ
-- ================================================================

alter table public.events
  add column if not exists category text not null default 'business',
  add column if not exists points int not null default 100,
  add column if not exists champion_points int not null default 300;

do $$ begin
  alter table public.events add constraint events_category_check
    check (category in ('board','forum','training','family','sport','business'));
exception when duplicate_object then null; end $$;

-- Family-события уже помечены через format — переносим в категорию.
update public.events
   set category = 'family', points = 200
 where format = 'family' and category = 'business' and points = 100;

create table if not exists public.event_attendance (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  attended    boolean,                      -- null = не отмечено
  is_champion boolean not null default false,
  updated_at  timestamptz not null default now(),
  unique (event_id, resident_id)
);
create index if not exists event_attendance_resident_idx on public.event_attendance(resident_id);

create table if not exists public.points_ledger (
  id          uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.residents(id) on delete cascade,
  kind        text not null check (kind in ('attendance','champion','referral','adjustment')),
  points      int  not null,
  title       text not null,                -- что показать в истории
  comment     text,
  event_id    uuid,                         -- без FK: история переживает удаление события
  reverses    uuid references public.points_ledger(id) on delete set null,
  occurred_at timestamptz not null default now(),  -- дата события / действия (для рейтинга за год)
  created_at  timestamptz not null default now()
);
create index if not exists points_ledger_resident_idx on public.points_ledger(resident_id, occurred_at desc);
create index if not exists points_ledger_event_idx on public.points_ledger(event_id, resident_id, kind);

-- Приводит сумму баллов (событие, резидент, вид) к нужному значению,
-- дописывая строку-дельту. Так любое исправление явки или баллов события
-- остаётся в истории, а баланс всегда равен сумме журнала.
create or replace function public.sync_event_points(p_event uuid, p_resident uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  ev public.events%rowtype;
  att public.event_attendance%rowtype;
  want_att int := 0;
  want_champ int := 0;
  have int;
  ev_title text;
  ev_date timestamptz;
begin
  select * into ev from public.events where id = p_event;
  select * into att from public.event_attendance where event_id = p_event and resident_id = p_resident;

  if found and ev.id is not null then
    if att.attended is true then want_att := ev.points; end if;
    if att.attended is true and att.is_champion then want_champ := ev.champion_points; end if;
  end if;

  ev_title := coalesce(ev.title,
    (select l.title from public.points_ledger l
      where l.event_id = p_event and l.kind = 'attendance' order by created_at limit 1),
    'Мероприятие');
  ev_date := coalesce(ev.date, now());

  select coalesce(sum(points), 0) into have from public.points_ledger
   where event_id = p_event and resident_id = p_resident and kind = 'attendance';
  if have <> want_att then
    insert into public.points_ledger(resident_id, kind, points, title, comment, event_id, occurred_at)
    values (p_resident, 'attendance', want_att - have, ev_title,
            case when have = 0 then null
                 when want_att = 0 then 'Отметка о посещении снята'
                 else 'Изменены баллы мероприятия' end,
            p_event, ev_date);
  end if;

  select coalesce(sum(points), 0) into have from public.points_ledger
   where event_id = p_event and resident_id = p_resident and kind = 'champion';
  if have <> want_champ then
    insert into public.points_ledger(resident_id, kind, points, title, comment, event_id, occurred_at)
    values (p_resident, 'champion', want_champ - have, 'Чемпион: ' || ev_title,
            case when have = 0 then null
                 when want_champ = 0 then 'Чемпионство снято'
                 else 'Изменены баллы за чемпионство' end,
            p_event, ev_date);
  end if;
end $$;

create or replace function public.trg_event_attendance_points()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rid uuid := coalesce(new.resident_id, old.resident_id);
  eid uuid := coalesce(new.event_id, old.event_id);
begin
  perform public.sync_event_points(eid, rid);
  -- Зеркалим явку в event_rsvps.attended — его читают уже выпущенные версии
  -- приложения («Мероприятий посещено» в профиле).
  update public.event_rsvps
     set attended = case when tg_op = 'DELETE' then null else new.attended end
   where event_id = eid
     and user_id in (select public.user_ids_for_resident(rid));
  return null;
end $$;

drop trigger if exists trg_event_attendance_points on public.event_attendance;
create trigger trg_event_attendance_points
  after insert or update or delete on public.event_attendance
  for each row execute function public.trg_event_attendance_points();

create or replace function public.trg_event_points_changed()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if new.points is distinct from old.points
     or new.champion_points is distinct from old.champion_points then
    for r in select resident_id from public.event_attendance where event_id = new.id loop
      perform public.sync_event_points(new.id, r.resident_id);
    end loop;
  end if;
  -- Перенос даты события двигает его баллы в рейтинге «за год».
  if new.date is distinct from old.date then
    update public.points_ledger set occurred_at = new.date
     where event_id = new.id and kind in ('attendance','champion');
  end if;
  return new;
end $$;

drop trigger if exists trg_event_points_changed on public.events;
create trigger trg_event_points_changed
  after update on public.events
  for each row execute function public.trg_event_points_changed();

-- Перенос уже отмеченной явки (с 01.07.2026 админка ставила event_rsvps.attended).
-- Триггер сам начислит баллы по текущим настройкам событий.
insert into public.event_attendance (event_id, resident_id, attended)
select distinct on (v.event_id, v.resident_id) v.event_id, v.resident_id, v.attended
from public.event_rsvps_with_resident v
where v.attended is not null and v.resident_id is not null
order by v.event_id, v.resident_id, v.attended desc
on conflict (event_id, resident_id) do nothing;

-- Рейтинг: все опубликованные резиденты, включая тех, у кого 0 баллов.
-- p_year = null → за всё время. Год считаем по времени Алматы.
create or replace function public.get_leaderboard(p_year int default null)
returns table (resident_id uuid, name text, company text, photo_url text, points bigint, place bigint)
language sql stable security definer set search_path = public as $$
  with totals as (
    select r.id, r.name, r.company, r.photo_url,
           coalesce(sum(l.points), 0)::bigint as pts
    from public.residents r
    left join public.points_ledger l
      on l.resident_id = r.id
     and (p_year is null
          or extract(year from l.occurred_at at time zone 'Asia/Almaty') = p_year)
    where r.is_published
    group by r.id
  )
  select id, name, company, photo_url, pts,
         rank() over (order by pts desc)
  from totals
  order by pts desc, name
$$;

grant execute on function public.get_leaderboard(int) to anon, authenticated;

alter table public.event_attendance enable row level security;
alter table public.points_ledger enable row level security;

-- Рейтинг и история внутри клуба открыты всем резидентам.
drop policy if exists "attendance_read" on public.event_attendance;
create policy "attendance_read" on public.event_attendance for select using (true);
drop policy if exists "ledger_read" on public.points_ledger;
create policy "ledger_read" on public.points_ledger for select using (true);

-- Админка работает под anon-ключом (свой вход по телефону, не Supabase Auth),
-- поэтому запись — для роли anon, как у остальных таблиц админки.
drop policy if exists "attendance_admin_write" on public.event_attendance;
create policy "attendance_admin_write" on public.event_attendance
  for all to anon using (true) with check (true);
-- Журнал: только добавление, без правки и удаления строк.
drop policy if exists "ledger_admin_insert" on public.points_ledger;
create policy "ledger_admin_insert" on public.points_ledger
  for insert to anon
  with check (kind in ('referral','adjustment'));

-- ================================================================
-- ЧАСТЬ 2. ОПРОСЫ
-- ================================================================

create table if not exists public.resident_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.resident_group_members (
  group_id    uuid not null references public.resident_groups(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  primary key (group_id, resident_id)
);

alter table public.surveys
  add column if not exists kind text not null default 'poll',
  add column if not exists audience text not null default 'all',
  add column if not exists audience_event_id uuid references public.events(id) on delete set null,
  add column if not exists audience_group_id uuid references public.resident_groups(id) on delete set null,
  add column if not exists starts_at timestamptz,
  add column if not exists is_mandatory boolean not null default false,
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists reminder_sent_at timestamptz;

do $$ begin
  alter table public.surveys add constraint surveys_audience_check
    check (audience in ('all','selected','event','group'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.surveys add constraint surveys_kind_check
    check (kind in ('poll','pre_board','pre_forum','registration','requests','nps','feedback','other'));
exception when duplicate_object then null; end $$;

create table if not exists public.survey_targets (
  survey_id   uuid not null references public.surveys(id) on delete cascade,
  resident_id uuid not null references public.residents(id) on delete cascade,
  primary key (survey_id, resident_id)
);

create table if not exists public.survey_completions (
  id           uuid primary key default gen_random_uuid(),
  survey_id    uuid not null references public.surveys(id) on delete cascade,
  resident_id  uuid references public.residents(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete set null,
  completed_at timestamptz not null default now()
);
create unique index if not exists survey_completions_resident_uq
  on public.survey_completions(survey_id, resident_id) where resident_id is not null;
create unique index if not exists survey_completions_user_uq
  on public.survey_completions(survey_id, user_id) where user_id is not null;

-- Вопросы: NPS, обязательность, шкала.
alter table public.polls
  add column if not exists is_required boolean not null default true,
  add column if not exists scale_max int not null default 5;

-- Снимаем старый CHECK на polls.type (если был), чтобы добавить nps.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
     where conrelid = 'public.polls'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%type%'
  loop
    execute format('alter table public.polls drop constraint %I', c);
  end loop;
  alter table public.polls add constraint polls_type_check
    check (type in ('single','multiple','text','rating','nps'));
exception when duplicate_object then null;
end $$;

-- Анонимные ответы пишутся без user_id.
alter table public.poll_answers alter column user_id drop not null;

-- Получатели анкеты (резиденты) по её аудитории.
create or replace function public.survey_recipients(p_survey uuid)
returns table (resident_id uuid) language sql stable security definer set search_path = public as $$
  with s as (select * from public.surveys where id = p_survey)
  select r.id from public.residents r, s
   where r.is_published and s.audience = 'all'
  union
  select t.resident_id from public.survey_targets t, s
   where t.survey_id = s.id and s.audience = 'selected'
  union
  select m.resident_id from public.resident_group_members m, s
   where m.group_id = s.audience_group_id and s.audience = 'group'
  union
  -- участники мероприятия: отмеченные как пришедшие + записавшиеся «иду»
  select a.resident_id from public.event_attendance a, s
   where a.event_id = s.audience_event_id and s.audience = 'event' and a.attended is true
  union
  select v.resident_id from public.event_rsvps_with_resident v, s
   where v.event_id = s.audience_event_id and s.audience = 'event'
     and v.status in ('going','with_family') and v.resident_id is not null
$$;

create or replace function public.is_survey_recipient(p_survey uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.survey_recipients(p_survey) x
     where x.resident_id = public.current_resident_id())
$$;

-- Кто из получателей ответил. Учитываем и completions (новое приложение),
-- и ответы старых версий, которые писали poll_answers по вопросам напрямую.
create or replace function public.survey_recipient_status(p_survey uuid)
returns table (resident_id uuid, name text, company text, photo_url text,
               responded boolean, completed_at timestamptz)
language sql stable security definer set search_path = public as $$
  with rec as (select resident_id from public.survey_recipients(p_survey)),
  done as (
    select c.resident_id, min(c.completed_at) as at
      from public.survey_completions c
     where c.survey_id = p_survey and c.resident_id is not null
     group by c.resident_id
    union all
    select public.resident_id_for_user(a.user_id), min(a.created_at)
      from public.poll_answers a
      join public.polls p on p.id = a.poll_id
     where p.survey_id = p_survey and a.user_id is not null
     group by a.user_id
  ),
  d as (select resident_id, min(at) as at from done where resident_id is not null group by resident_id)
  select r.id, r.name, r.company, r.photo_url, d.resident_id is not null, d.at
    from rec
    join public.residents r on r.id = rec.resident_id
    left join d on d.resident_id = rec.resident_id
   order by (d.resident_id is not null), r.name
$$;

grant execute on function public.survey_recipient_status(uuid) to anon, authenticated;

-- Отправка анкеты. p_answers: [{"poll_id": "...", "answer": {...}}], где
-- answer в прежнем формате: {"value": "0"} / {"values": ["0","2"]} /
-- {"value": "текст"} / {"value": 4}.
create or replace function public.submit_survey(p_survey uuid, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  s public.surveys%rowtype;
  rid uuid := public.current_resident_id();
  uid uuid := auth.uid();
  item jsonb;
  q record;
  ans jsonb;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select * into s from public.surveys where id = p_survey;
  if not found or not s.is_active then raise exception 'survey_closed'; end if;
  if s.starts_at is not null and s.starts_at > now() then raise exception 'survey_not_started'; end if;
  if s.ends_at is not null and s.ends_at < now() then raise exception 'survey_closed'; end if;
  if s.audience <> 'all' and not public.is_survey_recipient(p_survey) then
    raise exception 'not_a_recipient';
  end if;
  if exists (select 1 from public.survey_completions
              where survey_id = p_survey
                and (user_id = uid or (rid is not null and resident_id = rid))) then
    raise exception 'already_completed';
  end if;

  -- Все обязательные вопросы должны быть в ответе.
  for q in select id, question from public.polls
            where survey_id = p_survey and coalesce(is_active, true) and is_required loop
    if not exists (select 1 from jsonb_array_elements(p_answers) e
                    where e->>'poll_id' = q.id::text
                      and e->'answer' is not null and e->'answer' <> '{}'::jsonb) then
      raise exception 'required_missing:%', q.question;
    end if;
  end loop;

  for item in select * from jsonb_array_elements(p_answers) loop
    ans := item->'answer';
    if ans is null or ans = '{}'::jsonb then continue; end if;
    if not exists (select 1 from public.polls
                    where id = (item->>'poll_id')::uuid and survey_id = p_survey) then
      continue;
    end if;
    if s.is_anonymous then
      insert into public.poll_answers(poll_id, user_id, answer)
      values ((item->>'poll_id')::uuid, null, ans);
    else
      -- Не полагаемся на unique(poll_id, user_id): в живой базе его могли снять.
      delete from public.poll_answers
       where poll_id = (item->>'poll_id')::uuid and user_id = uid;
      insert into public.poll_answers(poll_id, user_id, answer)
      values ((item->>'poll_id')::uuid, uid, ans);
    end if;
  end loop;

  insert into public.survey_completions(survey_id, resident_id, user_id)
  values (p_survey, rid, uid);
end $$;

grant execute on function public.submit_survey(uuid, jsonb) to authenticated;

-- RLS
alter table public.resident_groups enable row level security;
alter table public.resident_group_members enable row level security;
alter table public.survey_targets enable row level security;
alter table public.survey_completions enable row level security;

drop policy if exists "groups_read" on public.resident_groups;
create policy "groups_read" on public.resident_groups for select using (true);
drop policy if exists "groups_admin" on public.resident_groups;
create policy "groups_admin" on public.resident_groups for all to anon using (true) with check (true);

drop policy if exists "group_members_read" on public.resident_group_members;
create policy "group_members_read" on public.resident_group_members for select using (true);
drop policy if exists "group_members_admin" on public.resident_group_members;
create policy "group_members_admin" on public.resident_group_members for all to anon using (true) with check (true);

drop policy if exists "survey_targets_admin" on public.survey_targets;
create policy "survey_targets_admin" on public.survey_targets for all to anon using (true) with check (true);

drop policy if exists "completions_own" on public.survey_completions;
create policy "completions_own" on public.survey_completions
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "completions_admin_read" on public.survey_completions;
create policy "completions_admin_read" on public.survey_completions
  for select to anon using (true);

-- Резидент видит только свои анкеты и только после даты старта.
-- Это действует и на уже установленные версии приложения.
drop policy if exists "View active surveys" on public.surveys;
drop policy if exists "surveys_admin_read" on public.surveys;
create policy "surveys_admin_read" on public.surveys for select to anon using (true);
drop policy if exists "surveys_resident_read" on public.surveys;
create policy "surveys_resident_read" on public.surveys for select to authenticated
  using ((starts_at is null or starts_at <= now())
         and (audience = 'all' or public.is_survey_recipient(id)));

-- Для админки: в анонимных анкетах имя не раскрываем.
create or replace view public.poll_answers_with_resident as
select
  a.id,
  a.poll_id,
  a.answer,
  a.created_at,
  case when a.user_id is null then 'Анонимно'
       else coalesce(res.name, p.full_name, 'Резидент') end as name,
  case when a.user_id is null then null else res.company end as company
from public.poll_answers a
left join public.profiles p on p.id = a.user_id
left join auth.users u on u.id = a.user_id
left join public.residents res
  on regexp_replace(res.phone, '\D', '', 'g') = regexp_replace(u.phone, '\D', '', 'g');

grant select on public.poll_answers_with_resident to anon, authenticated;

-- ── Пуши ──────────────────────────────────────────────────────────
create or replace function public.push_send(p_title text, p_body text, p_residents uuid[] default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  fn_url text := 'https://xhsyvdflxfkywkuhwfwk.supabase.co/functions/v1/push-broadcast';
  fn_key text := '05b92e067ea0c603e86e2b47b5d42b96d223c2d32b02c701';
begin
  if p_residents is not null and cardinality(p_residents) = 0 then return; end if;
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||fn_key),
    body := case when p_residents is null
      then jsonb_build_object('title', p_title, 'body', p_body)
      else jsonb_build_object('title', p_title, 'body', p_body,
                              'recipientMode', 'selected', 'residentIds', to_jsonb(p_residents))
    end);
end $$;

-- Одно уведомление на анкету: когда она активна, в ней есть вопросы и
-- наступила дата старта. Адресно — только её аудитории.
create or replace function public.survey_announce(p_survey uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  s public.surveys%rowtype;
  q_count int;
  ids uuid[];
begin
  select * into s from public.surveys where id = p_survey;
  if not found or not coalesce(s.is_active, true) or s.notified_at is not null then return; end if;
  if s.starts_at is not null and s.starts_at > now() then return; end if;
  select count(*) into q_count from public.polls where survey_id = s.id and coalesce(is_active, true);
  if q_count = 0 then return; end if;

  if s.audience <> 'all' then
    select array_agg(resident_id) into ids from public.survey_recipients(s.id);
    ids := coalesce(ids, '{}');
  end if;
  perform public.push_send(
    case when s.is_mandatory then 'Обязательный опрос' else 'Новый опрос' end,
    coalesce(s.title, 'Поделитесь мнением'), ids);
  update public.surveys set notified_at = now() where id = s.id;
end $$;

create or replace function public.notify_new_survey()
returns trigger language plpgsql security definer as $$
begin
  perform public.survey_announce(new.id);
  return new;
end $$;

drop trigger if exists trg_notify_new_survey on public.surveys;
create trigger trg_notify_new_survey
  after insert or update on public.surveys
  for each row
  when (pg_trigger_depth() = 0)
  execute function public.notify_new_survey();

-- Раз в 15 минут: анонс отложенных анкет + напоминание за сутки до дедлайна
-- тем, кто ещё не ответил.
create or replace function public.survey_push_tick()
returns void language plpgsql security definer set search_path = public as $$
declare
  s record;
  ids uuid[];
begin
  for s in select id from public.surveys
            where is_active and notified_at is null
              and (starts_at is null or starts_at <= now()) loop
    perform public.survey_announce(s.id);
  end loop;

  for s in select * from public.surveys
            where is_active and notified_at is not null and reminder_sent_at is null
              and ends_at is not null and ends_at > now()
              and ends_at <= now() + interval '24 hours' loop
    select array_agg(resident_id) into ids
      from public.survey_recipient_status(s.id) where not responded;
    perform public.push_send('Напоминание об опросе',
      '«' || s.title || '» — осталось меньше суток', coalesce(ids, '{}'));
    update public.surveys set reminder_sent_at = now() where id = s.id;
  end loop;
end $$;

-- Служебные функции: только для триггеров/cron, не через REST (иначе публичным
-- anon-ключом можно было бы рассылать пуши или дёргать пересчёт баллов).
revoke execute on function public.push_send(text, text, uuid[]) from public, anon, authenticated;
revoke execute on function public.survey_announce(uuid) from public, anon, authenticated;
revoke execute on function public.survey_push_tick() from public, anon, authenticated;
revoke execute on function public.sync_event_points(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.user_ids_for_resident(uuid) from public, anon, authenticated;
revoke execute on function public.resident_id_for_user(uuid) from public, anon, authenticated;
revoke execute on function public.survey_recipients(uuid) from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'survey-push-tick';
select cron.schedule('survey-push-tick', '*/15 * * * *', 'select public.survey_push_tick()');

-- Realtime для новых таблиц (приложение перезагружает данные по событию).
do $$ begin
  alter publication supabase_realtime add table public.surveys;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.points_ledger;
exception when others then null; end $$;
