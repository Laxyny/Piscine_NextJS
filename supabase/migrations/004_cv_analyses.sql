create table if not exists public.cv_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_text text not null default '',
  offer_text text not null default '',
  analysis jsonb not null default '{}',
  overall_score integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.cv_analyses enable row level security;

create policy "cv_analyses_select_own" on public.cv_analyses for select using (auth.uid() = user_id);
create policy "cv_analyses_insert_own" on public.cv_analyses for insert with check (auth.uid() = user_id);
create policy "cv_analyses_delete_own" on public.cv_analyses for delete using (auth.uid() = user_id);

create index if not exists idx_cv_analyses_user_id on public.cv_analyses(user_id);
