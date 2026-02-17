import { NextResponse } from 'next/server';
import { getDb } from '../../../backend/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { data, error } = await supabase
      .from('job_postings')
      .select('id, title, description, skills, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json(
      (data || []).map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        skills: p.skills,
        createdAt: p.created_at
      }))
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
