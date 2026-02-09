import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let serverClient = null;
if (url && serviceKey) {
  serverClient = createClient(url, serviceKey);
}

export function getSupabase() {
  return serverClient;
}
