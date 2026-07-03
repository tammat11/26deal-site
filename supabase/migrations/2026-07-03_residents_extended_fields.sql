-- Add extended business, social and achievement fields to residents.
-- Mirrored from the Flutter application repository
-- (supabase/migrations/2026-06-30_residents_extended_fields.sql) so both the
-- website admin and the mobile app read/write the same columns.

alter table residents
  add column if not exists industry          text,
  add column if not exists turnover          text,
  add column if not exists employees         text,
  add column if not exists phone             text,
  add column if not exists email             text,
  add column if not exists member_since      integer,
  add column if not exists telegram          text,
  add column if not exists instagram         text,
  add column if not exists linkedin          text,
  add column if not exists partner_companies text[] default '{}',
  add column if not exists achievements      text[] default '{}';
