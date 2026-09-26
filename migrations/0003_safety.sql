create table if not exists safety_events (
  id text primary key,
  user_id text not null,
  kind text not null,
  created_at timestamptz not null default now()
);

create index if not exists safety_events_lookup_idx
  on safety_events (user_id, kind, created_at desc);

delete from reports
where id in (
  select id from (
    select id, row_number() over (
      partition by reporter_id, target_type, target_id
      order by created_at
    ) as rn
    from reports
  ) ranked
  where rn > 1
);

create unique index if not exists reports_once_idx
  on reports (reporter_id, target_type, target_id);

create index if not exists reports_target_idx
  on reports (target_type, target_id);
