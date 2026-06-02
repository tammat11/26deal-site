# Supabase admin notes

## Purpose

The `/admin` page manages two groups of data:

- legacy website content: residents and events;
- mobile app data stored in Supabase: partners, polls and poll answers.

The Supabase-backed tabs must follow the live mobile app schema. Do not replace it
with a second website-only schema or synchronize data between duplicate tables.

## Live schema used by the admin UI

### `partners`

The UI currently reads and writes:

- `id`
- `created_at`
- `name`
- `description`
- `category`
- `discount`
- `discount_conditions`
- `address`
- `website`
- `phone`
- `logo_url`
- `is_exclusive`
- `is_published`

### `polls`

The UI currently reads and writes:

- `id`
- `created_at`
- `question`
- `description`
- `type`: `single`, `multiple`, `text` or `rating`
- `options`: JSON array of strings
- `is_active`
- `ends_at`

The current database does not expose a `poll_options` table. Options belong to
the `polls.options` array until the mobile app and database are migrated together.

### `poll_answers`

The UI reads answers by `poll_id`, shows raw answer records for compatibility
with the mobile app payload and exports them to CSV. It does not edit answers.

## Security follow-up

The admin page currently uses the public Supabase client from the browser. Before
production use, verify Row Level Security policies for `partners`, `polls`,
`poll_answers`, `events` and the `events` storage bucket. Public application users
must not receive insert, update or delete permissions for admin-managed tables.

A production hardening pass should move admin writes behind authenticated
server-side routes or Supabase Auth with an admin role. The existing localStorage
admin flag and the `0000` OTP bypass are not sufficient authorization controls.
