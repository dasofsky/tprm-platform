-- TPRM Platform — Schema v7: Approval data
alter table vendors add column if not exists approval jsonb default '{}';
