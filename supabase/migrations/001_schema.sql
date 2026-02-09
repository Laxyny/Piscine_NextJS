create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nouvelle discussion',
  agent_id uuid,
  agent_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  content text not null,
  role text not null,
  type text not null default 'text',
  created_at timestamptz not null default now()
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  system_prompt text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile jsonb not null default '{}',
  cv text not null default '',
  lettre text not null default '',
  suggestions text not null default '',
  created_at timestamptz not null default now()
);

alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.agents enable row level security;
alter table public.career_generations enable row level security;

create policy "chats_select_own" on public.chats for select using (auth.uid() = user_id);
create policy "chats_insert_own" on public.chats for insert with check (auth.uid() = user_id);
create policy "chats_update_own" on public.chats for update using (auth.uid() = user_id);
create policy "chats_delete_own" on public.chats for delete using (auth.uid() = user_id);

create policy "messages_select_own" on public.messages for select using (
  exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
);
create policy "messages_insert_own" on public.messages for insert with check (
  exists (select 1 from public.chats where chats.id = messages.chat_id and chats.user_id = auth.uid())
);

create policy "agents_select_own" on public.agents for select using (auth.uid() = user_id);
create policy "agents_insert_own" on public.agents for insert with check (auth.uid() = user_id);
create policy "agents_update_own" on public.agents for update using (auth.uid() = user_id);
create policy "agents_delete_own" on public.agents for delete using (auth.uid() = user_id);

create policy "career_select_own" on public.career_generations for select using (auth.uid() = user_id);
create policy "career_insert_own" on public.career_generations for insert with check (auth.uid() = user_id);

create index if not exists idx_chats_user_id on public.chats(user_id);
create index if not exists idx_messages_chat_id on public.messages(chat_id);
create index if not exists idx_agents_user_id on public.agents(user_id);
create index if not exists idx_career_user_id on public.career_generations(user_id);
