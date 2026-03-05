-- TPRM Platform — Schema v8: Score reasons
alter table vendors add column if not exists score_reasons jsonb default '{}';
