-- ================================================================
-- 26 Business Club — доработки ТЗ (2026-10-07)
--   Анкета «Регистрация / подтверждение участия» связана с записью на
--   мероприятие: ответ на вопрос-подтверждение пишет event_rsvps.
-- Повторный запуск безопасен.
-- ================================================================

alter table public.surveys
  add column if not exists rsvp_event_id uuid references public.events(id) on delete set null;

-- Вопрос-подтверждение: варианты по порядку = Иду / Не иду / Возможно.
alter table public.polls
  add column if not exists rsvp_link boolean not null default false;

create or replace function public.submit_survey(p_survey uuid, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  s public.surveys%rowtype;
  rid uuid := public.current_resident_id();
  uid uuid := auth.uid();
  item jsonb;
  q record;
  ans jsonb;
  opt int;
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
    select id, rsvp_link into q from public.polls
     where id = (item->>'poll_id')::uuid and survey_id = p_survey;
    if not found then continue; end if;

    if s.is_anonymous then
      insert into public.poll_answers(poll_id, user_id, answer)
      values (q.id, null, ans);
    else
      -- Не полагаемся на unique(poll_id, user_id): в живой базе его могли снять.
      delete from public.poll_answers where poll_id = q.id and user_id = uid;
      insert into public.poll_answers(poll_id, user_id, answer)
      values (q.id, uid, ans);
    end if;

    -- Регистрация: ответ «Иду / Не иду / Возможно» = запись на мероприятие.
    if q.rsvp_link and s.rsvp_event_id is not null then
      opt := nullif(ans->>'value', '')::int;
      if opt between 0 and 2 then
        insert into public.event_rsvps(event_id, user_id, status)
        values (s.rsvp_event_id, uid, (array['going','not_going','maybe'])[opt + 1])
        on conflict (event_id, user_id) do update set status = excluded.status;
      end if;
    end if;
  end loop;

  insert into public.survey_completions(survey_id, resident_id, user_id)
  values (p_survey, rid, uid);
end $$;

grant execute on function public.submit_survey(uuid, jsonb) to authenticated;
