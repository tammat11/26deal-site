-- Poll admin upgrade mirrored from the mobile app repository.
-- Keeps the current app working while preparing a cleaner structure for web admin.

create table if not exists poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references polls(id) on delete cascade,
  label text not null,
  value text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table polls
  add column if not exists description text,
  add column if not exists is_published boolean not null default true,
  add column if not exists starts_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table poll_answers
  add column if not exists option_id uuid references poll_options(id) on delete set null,
  add column if not exists text_answer text,
  add column if not exists rating_value int;

create index if not exists idx_poll_options_poll_id_sort
  on poll_options (poll_id, sort_order);

create index if not exists idx_polls_active_published
  on polls (is_active, is_published, created_at desc);

create index if not exists idx_poll_answers_poll_user
  on poll_answers (poll_id, user_id);

create index if not exists idx_poll_answers_poll_option
  on poll_answers (poll_id, option_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_polls_updated_at on polls;
create trigger trg_polls_updated_at
before update on polls
for each row execute function set_updated_at();

alter table poll_options enable row level security;

drop policy if exists "View published poll options" on poll_options;
create policy "View published poll options"
  on poll_options
  for select
  using (
    exists (
      select 1
      from polls
      where polls.id = poll_options.poll_id
        and polls.is_active = true
        and coalesce(polls.is_published, true) = true
    )
  );

-- Backfill from legacy polls.options into poll_options.
insert into poll_options (poll_id, label, value, sort_order)
select
  p.id,
  opt.value::text as label,
  opt.value::text as value,
  opt.ordinality - 1 as sort_order
from polls p
cross join lateral jsonb_array_elements_text(coalesce(p.options, '[]'::jsonb))
  with ordinality as opt(value, ordinality)
where not exists (
  select 1
  from poll_options po
  where po.poll_id = p.id
);
