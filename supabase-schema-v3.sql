-- ─────────────────────────────────────────────────────────────────────────────
-- TPRM Platform — Schema v3: Documents, Comments, Auth + Alerts
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── DOCUMENTS ───────────────────────────────────────────────────────────────
create table if not exists documents (
  id           bigint primary key generated always as identity,
  vendor_id    bigint references vendors(id) on delete cascade,
  name         text not null,
  file_path    text not null,
  file_size    bigint,
  file_type    text,
  doc_type     text default 'other',
  summary      text,
  key_findings jsonb default '[]',
  score_impact jsonb default '{"security":0,"compliance":0,"financial":0,"operational":0,"reputational":0}',
  uploaded_by  text,
  created_at   timestamptz default now()
);

-- ─── COMMENTS ────────────────────────────────────────────────────────────────
create table if not exists comments (
  id          bigint primary key generated always as identity,
  vendor_id   bigint references vendors(id) on delete cascade,
  author_name text not null,
  author_role text,
  body        text not null,
  section     text default 'general',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── ENABLE RLS ───────────────────────────────────────────────────────────────
alter table documents enable row level security;
alter table comments  enable row level security;

-- ─── POLICIES ─────────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_policies where tablename='documents' and policyname='Allow all on documents') then
    create policy "Allow all on documents" on documents for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='comments' and policyname='Allow all on comments') then
    create policy "Allow all on comments" on comments for all using (true) with check (true);
  end if;
end $$;

-- ─── STORAGE BUCKET ──────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('vendor-documents', 'vendor-documents', false)
on conflict (id) do nothing;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and policyname='Allow all on vendor-documents') then
    create policy "Allow all on vendor-documents"
      on storage.objects for all
      using (bucket_id = 'vendor-documents')
      with check (bucket_id = 'vendor-documents');
  end if;
end $$;
