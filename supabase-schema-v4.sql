-- TPRM Platform — Schema v4: Custom Categories
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run

create table if not exists categories (
  id         bigint primary key generated always as identity,
  name       text not null unique,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table categories enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='categories' and policyname='Allow all on categories') then
    create policy "Allow all on categories" on categories for all using (true) with check (true);
  end if;
end $$;

-- Seed with default categories
insert into categories (name, sort_order) values
('Cloud Infrastructure', 1), ('Data Storage', 2), ('Cybersecurity', 3),
('Payment Processing', 4), ('Logistics', 5), ('HR & Payroll', 6),
('Legal', 7), ('Marketing Tech', 8), ('ERP/CRM', 9), ('Other', 10)
on conflict (name) do nothing;

-- Add jira_ticket and logo_url columns to vendors
alter table vendors add column if not exists jira_ticket text;
alter table vendors add column if not exists logo_url    text;
