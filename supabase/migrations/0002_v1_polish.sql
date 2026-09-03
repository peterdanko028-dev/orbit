-- v1 polish: rollover tracking, implementation-intention fields, subtasks.
-- priority is reused as a boolean-ish star (0 = not starred, 3 = starred) —
-- no need to touch its 0-3 check constraint from 0001.

alter table tasks
  add column if not exists rollover_count smallint not null default 0,
  add column if not exists last_rollover_on date,
  add column if not exists first_step text,
  add column if not exists when_cue text,
  add column if not exists where_cue text,
  add column if not exists parent_id uuid references tasks(id) on delete cascade;

create index if not exists idx_tasks_parent on tasks(parent_id);
