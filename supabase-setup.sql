-- Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New query → paste → Run

create table if not exists photos (
  id uuid primary key,
  image_data text not null,
  low_res_data text not null,
  user_id text not null,
  timestamp text not null,
  latitude float,
  longitude float,
  hash text not null,
  paid boolean default false,
  created_at timestamp with time zone default now()
);

-- Index for fast lookups by id
create index if not exists photos_id_idx on photos(id);

-- Optional: index for lookups by user
create index if not exists photos_user_idx on photos(user_id);
