-- Orbit v1: lists + tasks. RLS keyed on auth.uid() is what makes this private —
-- the anon key ships in the client by design, these policies are the real gate.

create extension if not exists "pgcrypto";

create table if not exists lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid references lists(id) on delete set null,
  title text not null,
  notes text,
  status text not null default 'todo' check (status in ('todo', 'done')),
  priority smallint not null default 0 check (priority between 0 and 3),
  due_on date,
  due_at time,
  completed_at timestamptz,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_user on tasks(user_id);
create index if not exists idx_tasks_list on tasks(list_id);
create index if not exists idx_lists_user on lists(user_id);

-- Deterministic last-write-wins: every update stamps updated_at itself, so two
-- offline devices reconciling never depend on client clocks.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_set_updated_at on tasks;
create trigger tasks_set_updated_at before update on tasks
  for each row execute function set_updated_at();

alter table lists enable row level security;
alter table tasks enable row level security;

create policy "lists are private" on lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks are private" on tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
