-- Habits: recurring items with a stable cue, a daily check-in log, and a
-- consistency percentage. Deliberately NOT a streak counter — there is no
-- "current_streak" column to reset, because a missed day should cost a few
-- percent, not wipe the board.
--
-- Habits are their own table rather than recurrence columns on tasks: a habit
-- is never "done" and never rolls over, so sharing the tasks row would mean
-- every tasks query had to filter it back out.

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  -- The cue that anchors the habit: "after morning coffee", "at my desk".
  cue text,
  cue_time time,
  -- 'daily'  = every day
  -- 'days'   = the weekdays listed in days (0 = Sunday … 6 = Saturday)
  -- 'weekly' = any target_per_week days of the week, your choice which
  recurrence text not null default 'daily' check (recurrence in ('daily', 'days', 'weekly')),
  days smallint[] not null default '{}',
  target_per_week smallint not null default 3 check (target_per_week between 1 and 7),
  archived boolean not null default false,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per check-in. The unique constraint makes a double tap idempotent
-- rather than double-counting, which matters because the client writes
-- optimistically and the offline outbox may replay the same op.
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references habits(id) on delete cascade,
  done_on date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, done_on)
);

create index if not exists idx_habits_user on habits(user_id);
create index if not exists idx_habit_logs_habit on habit_logs(habit_id, done_on desc);
create index if not exists idx_habit_logs_user on habit_logs(user_id);

drop trigger if exists habits_set_updated_at on habits;
create trigger habits_set_updated_at before update on habits
  for each row execute function set_updated_at();

alter table habits enable row level security;
alter table habit_logs enable row level security;

drop policy if exists "habits are private" on habits;
create policy "habits are private" on habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "habit logs are private" on habit_logs;
create policy "habit logs are private" on habit_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
