-- ─────────────────────────────────────────────────────────────────────────────
-- TPRM Platform — Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── VENDORS TABLE ───────────────────────────────────────────────────────────
create table if not exists vendors (
  id            bigint primary key generated always as identity,
  name          text not null,
  website       text,
  category      text,
  tier          text,
  status        text default 'Onboarding',
  risk_score    integer default 50,
  contact       text,
  country       text,
  ra_scores     jsonb default '{"security":50,"compliance":50,"financial":50,"operational":50,"reputational":50}',
  alerts        jsonb default '[]',
  dd_completed  jsonb default '[]',
  research      jsonb,
  documents     jsonb default '[]',
  mon_data      jsonb default '[50,50,50,50,50,50]',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ─── USERS TABLE ─────────────────────────────────────────────────────────────
create table if not exists users (
  id            bigint primary key generated always as identity,
  name          text not null,
  email         text unique not null,
  role          text default 'viewer',
  access        text default 'read_only',
  status        text default 'active',
  initials      text,
  last_login    timestamptz,
  department    text,
  avatar_idx    integer default 0,
  created_at    timestamptz default now()
);

-- ─── ENABLE ROW LEVEL SECURITY (keeps data private) ─────────────────────────
alter table vendors enable row level security;
alter table users   enable row level security;

-- ─── POLICIES (allow all access for now — we'll tighten this with Auth later) 
create policy "Allow all on vendors" on vendors for all using (true) with check (true);
create policy "Allow all on users"   on users   for all using (true) with check (true);

-- ─── SEED DATA — VENDORS ─────────────────────────────────────────────────────
insert into vendors (name, website, category, tier, status, risk_score, contact, country, ra_scores, alerts, dd_completed, mon_data) values
(
  'CloudNest Inc.', 'https://cloudnest.io', 'Cloud Infrastructure', 'Critical', 'Active', 72,
  'Sarah Lin', 'USA',
  '{"security":68,"compliance":75,"financial":80,"operational":65,"reputational":70}',
  '[{"id":1,"type":"warning","msg":"SSL cert expiring in 14 days"}]',
  '[0,1,3,4]',
  '[65,68,70,72,71,72]'
),
(
  'DataVault Ltd.', 'https://datavault.de', 'Data Storage', 'High', 'Under Review', 45,
  'Marco Rossi', 'Germany',
  '{"security":42,"compliance":50,"financial":55,"operational":40,"reputational":38}',
  '[{"id":2,"type":"critical","msg":"GDPR audit overdue 7 days"},{"id":3,"type":"info","msg":"Contract renewal in 60 days"}]',
  '[0]',
  '[52,50,48,46,44,45]'
),
(
  'SecureLink Corp.', 'https://securelink.co.uk', 'Cybersecurity', 'Critical', 'Active', 88,
  'Anika Patel', 'UK',
  '{"security":90,"compliance":88,"financial":85,"operational":87,"reputational":90}',
  '[]',
  '[0,1,2,3,4,5,6,7]',
  '[85,86,87,88,88,88]'
),
(
  'PayStream Solutions', 'https://paystream.ie', 'Payment Processing', 'High', 'Active', 61,
  'Tom Brennan', 'Ireland',
  '{"security":65,"compliance":70,"financial":55,"operational":58,"reputational":57}',
  '[{"id":4,"type":"info","msg":"Security review scheduled Mar 10"}]',
  '[0,1,2,3]',
  '[58,59,60,61,62,61]'
),
(
  'LogiTrack Systems', 'https://logitrack.sg', 'Logistics', 'Medium', 'Onboarding', 55,
  'Chen Wei', 'Singapore',
  '{"security":52,"compliance":58,"financial":60,"operational":50,"reputational":55}',
  '[{"id":5,"type":"warning","msg":"DD questionnaire not submitted"}]',
  '[]',
  '[50,52,53,54,55,55]'
);

-- ─── SEED DATA — USERS ───────────────────────────────────────────────────────
insert into users (name, email, role, access, status, initials, last_login, department, avatar_idx) values
('Alex Morgan',   'alex@company.com',   'admin',   'read_write', 'active',   'AM', '2026-03-03T10:22:00Z', 'Risk & Compliance', 0),
('Jamie Chen',    'jamie@company.com',  'analyst', 'read_write', 'active',   'JC', '2026-03-02T15:44:00Z', 'Security',          1),
('Sam Rivera',    'sam@company.com',    'viewer',  'read_only',  'active',   'SR', '2026-02-28T09:10:00Z', 'Operations',        2),
('Taylor Brooks', 'taylor@company.com', 'analyst', 'read_write', 'inactive', 'TB', '2026-02-10T11:30:00Z', 'Finance',           3),
('Jordan Kim',    'jordan@company.com', 'admin',   'read_write', 'active',   'JK', '2026-03-01T08:55:00Z', 'IT',                4);
