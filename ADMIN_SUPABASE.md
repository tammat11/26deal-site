# Supabase admin notes

## Purpose

The `/admin` page manages website content and mobile application data stored in
the shared Supabase project. Do not add duplicate website-only tables.

## Required database migration

Before enabling the polls tab, apply the mobile application migration:

`supabase/migrations/2026-06-02_poll_admin_upgrade.sql`

The SQL is mirrored from the Flutter application repository. It creates
`poll_options`, adds the admin fields and backfills legacy `polls.options`.

Then apply the website supplement:

`supabase/migrations/2026-06-02_site_admin_upgrade.sql`

It adds partner and poll sorting fields, partner cover images and indexes used by
the website admin. It also removes the original single-vote unique index because
that index blocks valid `multiple` poll answers. Single-choice validation belongs
in the application service.

## Server-side admin API

The admin signs in with Supabase Auth (email + password); access is checked by
`rpc('is_admin')` (table `public.admin_users`) and the same `is_admin()` RLS
policies. Partners and polls are written directly through the Supabase client
under those policies (the old `/api/admin-data` + `ADMIN_API_TOKEN` was removed).

`/api/news-push` and `/api/event-reminder` require
`Authorization: Bearer <supabase access token>` of a signed-in admin
(`api/_lib/requireAdmin.js`: `auth.getUser(token)` + `rpc('is_admin')`).

Configure these environment variables in Vercel:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (or `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`);
- `PUSH_FN_KEY`: shared key of the `push-broadcast` Edge Function (server-only,
  never a `VITE_*` variable);
- `PUSH_FN_URL`: optional, defaults to `$SUPABASE_URL/functions/v1/push-broadcast`.

## Shared tables

### `partners`

The admin UI reads and writes `name`, `description`, `category`, `address`,
`phone`, `website`, `discount`, `discount_conditions`, `is_exclusive`,
`is_published`, `sort_order`, `logo_url` and `cover_url`.

### `polls`

The admin UI reads and writes `question`, `description`, `type`, `is_active`,
`is_published`, `starts_at`, `ends_at` and `sort_order`.

### `poll_options`

Each option is stored as a row with `poll_id`, `label`, `value` and
`sort_order`. The admin UI does not write new values into legacy `polls.options`.

### `poll_answers`

The admin UI reads answers by `poll_id`, shows vote aggregates and exports raw
answers to CSV. It does not edit answers.

## Security follow-up

Keep Row Level Security enabled. Public application users may read published
content and write only their own answers. They must not receive admin write
permissions for partners, polls or options.

The website OTP flow (`0000` bypass, `localStorage` flag, `admin_otp` Telegram
branch) was removed: the admin uses Supabase Auth.
# Изменения админки

- 2026-07-28: поле «Краткое описание» убрано из формы создания и
  редактирования новостей. Основной контент вводится в «Текст новости».
- 2026-08-01: в списке мероприятий добавлена кнопка «Напомнить». Она доступна
  сразу и повторно в любой момент для опубликованного предстоящего мероприятия
  и позволяет отправить push тем, кто идет, тем, кто не идет, выбранным
  резидентам или всем устройствам.
