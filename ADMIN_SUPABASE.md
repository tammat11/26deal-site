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

Partners and polls use `/api/admin-data`. The browser no longer writes these
tables through the public Supabase client.

Configure these environment variables in Vercel:

- `SUPABASE_URL`: optional, defaults to the current project URL;
- `SUPABASE_SECRET_KEY`: required server-side Supabase secret key;
- `ADMIN_API_TOKEN`: required private token entered by an administrator in the
  admin UI.

Never expose `SUPABASE_SECRET_KEY` through a `VITE_*` variable.

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

The existing website OTP flow still contains a `0000` bypass and a
`localStorage` login flag. Remove both when the website receives proper
server-side authentication.
# Изменения админки

- 2026-07-28: поле «Краткое описание» убрано из формы создания и
  редактирования новостей. Основной контент вводится в «Текст новости».
- 2026-08-01: в списке мероприятий добавлена кнопка «Напомнить». Она доступна
  сразу и повторно в любой момент для опубликованного предстоящего мероприятия
  и отправляет push всем устройствам.
