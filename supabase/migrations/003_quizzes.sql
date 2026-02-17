create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  questions jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '[]',
  score integer,
  max_score integer,
  evaluation jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.quizzes enable row level security;
alter table public.quiz_responses enable row level security;

create policy "quizzes_select_own" on public.quizzes for select using (auth.uid() = user_id);
create policy "quizzes_insert_own" on public.quizzes for insert with check (auth.uid() = user_id);
create policy "quizzes_update_own" on public.quizzes for update using (auth.uid() = user_id);
create policy "quizzes_delete_own" on public.quizzes for delete using (auth.uid() = user_id);

create policy "quiz_responses_select_own" on public.quiz_responses for select using (auth.uid() = user_id);
create policy "quiz_responses_insert_own" on public.quiz_responses for insert with check (auth.uid() = user_id);
create policy "quiz_responses_delete_own" on public.quiz_responses for delete using (auth.uid() = user_id);

create index if not exists idx_quizzes_user_id on public.quizzes(user_id);
create index if not exists idx_quiz_responses_quiz_id on public.quiz_responses(quiz_id);
create index if not exists idx_quiz_responses_user_id on public.quiz_responses(user_id);
