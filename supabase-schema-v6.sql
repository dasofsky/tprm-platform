-- TPRM Platform — Schema v6: Assigned assessor
alter table vendors add column if not exists assigned_to text;
