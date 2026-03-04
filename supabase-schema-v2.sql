-- ─────────────────────────────────────────────────────────────────────────────
-- TPRM Platform — Step 3 Schema Additions
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── DOCUMENTS TABLE ─────────────────────────────────────────────────────────
-- Stores metadata for uploaded files (actual files go in Supabase Storage)
create table if not exists documents (
  id           bigint primary key generated always as identity,
  vendor_id    bigint references vendors(id) on delete cascade,
  name         text not null,
  file_path    text not null,
  file_size    bigint,
  file_type    text,
  doc_type     text default 'other',  -- audit_report | certificate | contract | questionnaire | other
  summary      text,
  key_findings jsonb default '[]',
  score_impact jsonb default '{"security":0,"compliance":0,"financial":0,"operational":0,"reputational":0}',
  uploaded_by  text,
  created_at   timestamptz default now()
);

-- ─── COMMENTS TABLE ───────────────────────────────────────────────────────────
create table if not exists comments (
  id          bigint primary key generated always as identity,
  vendor_id   bigint references vendors(id) on delete cascade,
  author_name text not null,
  author_role text,
  body        text not null,
  section     text default 'general',  -- general | assessment | dd | alerts | intelligence
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── ENABLE RLS ───────────────────────────────────────────────────────────────
alter table documents enable row level security;
alter table comments  enable row level security;

-- ─── POLICIES ─────────────────────────────────────────────────────────────────
create policy "Allow all on documents" on documents for all using (true) with check (true);
create policy "Allow all on comments"  on comments  for all using (true) with check (true);

-- ─── SUPABASE STORAGE BUCKET ──────────────────────────────────────────────────
-- Create a storage bucket for vendor documents
insert into storage.buckets (id, name, public)
values ('vendor-documents', 'vendor-documents', false)
on conflict do nothing;

-- Allow all operations on the bucket for now
create policy "Allow all on vendor-documents"
  on storage.objects for all
  using (bucket_id = 'vendor-documents')
  with check (bucket_id = 'vendor-documents');
