-- Website admin additions for 26 Business Club.
-- Apply after the mobile app migration: 2026-06-02_poll_admin_upgrade.sql.

alter table partners
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists sort_order int not null default 0,
  add column if not exists cover_url text;

alter table polls
  add column if not exists sort_order int not null default 0;

create index if not exists idx_partners_published_sort
  on partners (is_published, sort_order, created_at desc);

create index if not exists idx_partners_category_sort
  on partners (category, sort_order, created_at desc);

create index if not exists idx_polls_published_sort
  on polls (is_published, is_active, sort_order, created_at desc);

-- The mobile migration originally created this as a unique index, which blocks
-- valid multiple-choice answers. Enforce single-choice behavior in the service.
drop index if exists idx_poll_answers_single_vote;

create index if not exists idx_poll_answers_poll_option
  on poll_answers (poll_id, option_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_partners_updated_at on partners;
create trigger trg_partners_updated_at
before update on partners
for each row execute function set_updated_at();
