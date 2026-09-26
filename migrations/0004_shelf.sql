alter table profiles add column if not exists avatar_data text not null default '';

create table if not exists saves (
  post_id text not null,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists saves_user_idx on saves (user_id, created_at desc);

create table if not exists reposts (
  post_id text not null,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists reposts_user_idx on reposts (user_id, created_at desc);
