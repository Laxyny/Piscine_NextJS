create table if not exists public.job_postings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  skills text not null default '',
  reference_cv jsonb not null default '{}',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_postings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_text text not null default '',
  cv_data jsonb not null default '{}',
  analysis jsonb,
  score integer,
  created_at timestamptz not null default now()
);

alter table public.job_postings enable row level security;
alter table public.job_applications enable row level security;

create policy "postings_select_own" on public.job_postings for select using (auth.uid() = user_id);
create policy "postings_select_published" on public.job_postings for select using (status = 'published');
create policy "postings_insert_own" on public.job_postings for insert with check (auth.uid() = user_id);
create policy "postings_update_own" on public.job_postings for update using (auth.uid() = user_id);
create policy "postings_delete_own" on public.job_postings for delete using (auth.uid() = user_id);

create policy "applications_select_recruiter" on public.job_applications for select using (
  exists (select 1 from public.job_postings where job_postings.id = job_applications.job_id and job_postings.user_id = auth.uid())
);
create policy "applications_select_own" on public.job_applications for select using (auth.uid() = user_id);
create policy "applications_insert_own" on public.job_applications for insert with check (auth.uid() = user_id);
create policy "applications_update_recruiter" on public.job_applications for update using (
  exists (select 1 from public.job_postings where job_postings.id = job_applications.job_id and job_postings.user_id = auth.uid())
);

create index if not exists idx_job_postings_user_id on public.job_postings(user_id);
create index if not exists idx_job_postings_status on public.job_postings(status);
create index if not exists idx_job_applications_job_id on public.job_applications(job_id);
create index if not exists idx_job_applications_user_id on public.job_applications(user_id);
