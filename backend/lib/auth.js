import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function getAuthFromRequest(request) {
  if (!url || !anonKey) return null;
  const header = request.headers.get('Authorization');
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  try {
    const supabase = createClient(url, anonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return { uid: user.id, email: user.email || null };
  } catch {
    return null;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
}
