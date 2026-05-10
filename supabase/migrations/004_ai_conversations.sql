-- Persistance des conversations avec l'assistant IA.
-- Une seule conversation par utilisateur, l'historique est conservé en jsonb.

create table if not exists ai_conversations (
  user_id uuid primary key references auth.users on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table ai_conversations enable row level security;

create policy "Users read their own conversation"
  on ai_conversations for select
  using (auth.uid() = user_id);

create policy "Users upsert their own conversation"
  on ai_conversations for insert
  with check (auth.uid() = user_id);

create policy "Users update their own conversation"
  on ai_conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete their own conversation"
  on ai_conversations for delete
  using (auth.uid() = user_id);
