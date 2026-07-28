-- Temporary compatibility policy for the current browser-only admin panel.
-- The panel uses the Supabase anon key and does not establish a Supabase Auth
-- session, so writes would otherwise be silently blocked by RLS.
--
-- Replace these policies with authenticated admin-role checks when the admin
-- login is migrated to Supabase Auth or a protected server API.

alter table public.news enable row level security;

drop policy if exists "news_anon_insert" on public.news;
create policy "news_anon_insert"
  on public.news for insert to anon
  with check (true);

drop policy if exists "news_anon_update" on public.news;
create policy "news_anon_update"
  on public.news for update to anon
  using (true)
  with check (true);

drop policy if exists "news_anon_delete" on public.news;
create policy "news_anon_delete"
  on public.news for delete to anon
  using (true);
