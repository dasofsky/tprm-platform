-- TPRM Platform — Schema v5: Contact Email column
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
alter table vendors add column if not exists contact_email text;
