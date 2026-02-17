import { NextResponse } from 'next/server';
import { getDb } from '../../../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../../../backend/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { id } = await params;

    const { data, error } = await supabase
      .from('job_postings')
      .select('*')
      .eq('id', id)
      .eq('user_id', authUser.uid)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Offre non trouvee' }, { status: 404 });
    }

    const { data: apps } = await supabase
      .from('job_applications')
      .select('id, user_id, cv_data, analysis, score, created_at')
      .eq('job_id', id)
      .order('score', { ascending: false, nullsFirst: false });

    return NextResponse.json({
      id: data.id,
      title: data.title,
      description: data.description,
      skills: data.skills,
      referenceCv: data.reference_cv,
      status: data.status,
      createdAt: data.created_at,
      applications: (apps || []).map(a => ({
        id: a.id,
        userId: a.user_id,
        cvData: a.cv_data,
        analysis: a.analysis,
        score: a.score,
        createdAt: a.created_at
      }))
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { id } = await params;
    const body = await request.json();
    const updates = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.skills !== undefined) updates.skills = body.skills;
    if (body.referenceCv !== undefined) updates.reference_cv = body.referenceCv;
    if (body.status !== undefined) updates.status = body.status;
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length <= 1) {
      return NextResponse.json({ error: 'Rien a modifier' }, { status: 400 });
    }

    const { error } = await supabase
      .from('job_postings')
      .update(updates)
      .eq('id', id)
      .eq('user_id', authUser.uid);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { id } = await params;

    const { error } = await supabase
      .from('job_postings')
      .delete()
      .eq('id', id)
      .eq('user_id', authUser.uid);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
