-- ================================================================
-- 26 Business Club — редактируемые правила баллов (2026-10-27)
-- points_settings хранит шкалу; apply_points_rule меняет значение и
-- переносит его на мероприятия — триггер на events сам пересчитывает
-- баллы всех отмеченных резидентов (разница дописывается в журнал).
-- Повторный запуск безопасен.
-- ================================================================

create table if not exists public.points_settings (
  key        text primary key,
  points     int  not null,
  updated_at timestamptz not null default now()
);

insert into public.points_settings(key, points) values
  ('board', 100), ('forum', 150), ('training', 300), ('family', 200),
  ('sport', 200), ('business', 100), ('champion', 300), ('referral', 500),
  ('no_show', 100), ('late', 50), ('left_early', 50)
on conflict (key) do nothing;

alter table public.points_settings enable row level security;
drop policy if exists "points_settings_read" on public.points_settings;
create policy "points_settings_read" on public.points_settings for select using (true);
-- Изменения — только через apply_points_rule (она же пересчитывает события).

-- Меняет правило. p_overwrite_custom = true — перезаписать и мероприятия,
-- где значение меняли вручную (отличается от прежнего правила).
-- Возвращает число затронутых мероприятий.
create or replace function public.apply_points_rule(p_key text, p_points int, p_overwrite_custom boolean default false)
returns int language plpgsql security definer set search_path = public as $$
declare
  old_points int;
  n int := 0;
begin
  if p_points is null or p_points < 0 then raise exception 'invalid_points'; end if;
  select points into old_points from public.points_settings where key = p_key;
  if not found then raise exception 'unknown_rule:%', p_key; end if;

  update public.points_settings set points = p_points, updated_at = now() where key = p_key;

  -- Обновление events запускает trg_event_points_changed → пересчёт журнала.
  if p_key in ('board','forum','training','family','sport','business') then
    update public.events set points = p_points
     where category = p_key and points <> p_points
       and (p_overwrite_custom or points = old_points);
    get diagnostics n = row_count;
  elsif p_key = 'champion' then
    update public.events set champion_points = p_points
     where champion_points <> p_points
       and (p_overwrite_custom or champion_points = old_points);
    get diagnostics n = row_count;
  elsif p_key = 'no_show' then
    update public.events set no_show_penalty = p_points
     where no_show_penalty <> p_points
       and (p_overwrite_custom or no_show_penalty = old_points);
    get diagnostics n = row_count;
  elsif p_key = 'late' then
    update public.events set late_penalty = p_points
     where late_penalty <> p_points
       and (p_overwrite_custom or late_penalty = old_points);
    get diagnostics n = row_count;
  elsif p_key = 'left_early' then
    update public.events set left_early_penalty = p_points
     where left_early_penalty <> p_points
       and (p_overwrite_custom or left_early_penalty = old_points);
    get diagnostics n = row_count;
  end if;
  -- referral: только значение по умолчанию для новых рекомендаций.
  return n;
end $$;

-- Админка работает под anon-ключом (как и остальные её записи).
grant execute on function public.apply_points_rule(text, int, boolean) to anon, authenticated;
