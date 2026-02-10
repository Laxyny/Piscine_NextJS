import { NextResponse } from 'next/server';
import { getDb } from '../../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../../backend/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { id } = await params;

    const { error } = await supabase
      .from('career_generations')
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

export async function PATCH(request, { params }) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { id } = await params;
    const body = await request.json();
    const updates = {};

    if (body.title !== undefined) {
      const { data: current, error: fetchError } = await supabase
        .from('career_generations')
        .select('profile')
        .eq('id', id)
        .eq('user_id', authUser.uid)
        .single();

      if (fetchError) {
        console.error(fetchError);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
      }

      const profile = current.profile || {};
      profile.customTitle = body.title;
      updates.profile = profile;
    }

    if (body.cv !== undefined) updates.cv = body.cv;
    if (body.lettre !== undefined) updates.lettre = body.lettre;
    if (body.suggestions !== undefined) updates.suggestions = body.suggestions;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Rien a modifier' }, { status: 400 });
    }

    const { error } = await supabase
      .from('career_generations')
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
