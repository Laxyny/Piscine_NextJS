create policy "career_update_own" on public.career_generations for update using (auth.uid() = user_id);
create policy "career_delete_own" on public.career_generations for delete using (auth.uid() = user_id);
