-- Activity log: historique de toutes les modifications (partagé web + mobile).

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  resource_type text not null check (
    resource_type in ('project', 'journal', 'credential', 'idea', 'todo')
  ),
  resource_id uuid,
  project_id uuid references projects on delete set null,
  action text not null check (
    action in ('create', 'update', 'delete', 'promote', 'toggle')
  ),
  label text not null,
  created_at timestamptz default now()
);

create index if not exists activity_log_user_created_idx
  on activity_log (user_id, created_at desc);

create index if not exists activity_log_project_idx
  on activity_log (project_id) where project_id is not null;

alter table activity_log enable row level security;

create policy "Users can read their own activity"
  on activity_log for select
  using (auth.uid() = user_id);

create policy "Users can insert their own activity"
  on activity_log for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own activity"
  on activity_log for delete
  using (auth.uid() = user_id);
