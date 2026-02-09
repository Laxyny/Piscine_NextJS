import { getSupabase } from './supabase';

export function getDb() {
  return getSupabase();
}
