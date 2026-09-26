alter table profiles add column if not exists public_key text not null default '';
alter table messages add column if not exists cipher text not null default '';
