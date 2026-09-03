-- Blocks: the fixed skeleton of a week (classes, training) plus one-off
-- events. A block is not a task — it is never "done" — so it gets its own
-- table, same reasoning as habits in 0003. Recurrence is deliberately just
-- weekdays + a date range: term timetables don't need RRULE.

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  kind text not null default 'other' check (kind in ('school', 'training', 'other')),
  location text,
  notes text,
  start_time time not null,
  end_time time not null,
  -- Weekdays this repeats on (0 = Sunday … 6 = Saturday). Empty = one-off on starts_on.
  days smallint[] not null default '{}',
  starts_on date not null,
  -- null = open-ended (until archived).
  ends_on date,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blocks_time_order check (end_time > start_time),
  constraint blocks_date_order check (ends_on is null or ends_on >= starts_on)
);

-- "No class today." One row per skipped occurrence; unique so an offline
-- replay or a double tap is idempotent (same pattern as habit_logs).
create table if not exists block_skips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  block_id uuid not null references blocks(id) on delete cascade,
  on_date date not null,
  created_at timestamptz not null default now(),
  unique (block_id, on_date)
);

create index if not exists idx_blocks_user on blocks(user_id);
create index if not exists idx_block_skips_block on block_skips(block_id, on_date desc);
create index if not exists idx_block_skips_user on block_skips(user_id);

drop trigger if exists blocks_set_updated_at on blocks;
create trigger blocks_set_updated_at before update on blocks
  for each row execute function set_updated_at();

alter table blocks enable row level security;
alter table block_skips enable row level security;

drop policy if exists "blocks are private" on blocks;
create policy "blocks are private" on blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "block skips are private" on block_skips;
create policy "block skips are private" on block_skips
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Tasks: a planned slot, separate from the deadline (due_on stays the
-- deadline; scheduled_* is when you actually intend to do it).
alter table tasks
  add column if not exists scheduled_on date,
  add column if not exists scheduled_at time,
  add column if not exists duration_min smallint;

alter table tasks
  drop constraint if exists tasks_duration_range;
alter table tasks
  add constraint tasks_duration_range check (duration_min is null or duration_min between 5 and 720);

create index if not exists idx_tasks_scheduled on tasks(user_id, scheduled_on) where scheduled_on is not null;

-- Habits: optionally hang off a block ("stretch after Training"). Setting the
-- block to null on delete (rather than cascading the habit) matches how a
-- habit outlives the training season that inspired it.
alter table habits
  add column if not exists anchor_block_id uuid references blocks(id) on delete set null,
  add column if not exists anchor_position text;

alter table habits
  drop constraint if exists habits_anchor_position;
alter table habits
  add constraint habits_anchor_position check (anchor_position in ('before', 'after'));

create index if not exists idx_habits_anchor on habits(anchor_block_id);
