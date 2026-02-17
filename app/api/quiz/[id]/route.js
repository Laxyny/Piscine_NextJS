import { NextResponse } from 'next/server';
import { getDb } from '../../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../../backend/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { id } = await params;

    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, description, questions, created_at')
      .eq('id', id)
      .eq('user_id', authUser.uid)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Quiz non trouve' }, { status: 404 });
    }

    const { data: responses } = await supabase
      .from('quiz_responses')
      .select('id, score, max_score, evaluation, created_at')
      .eq('quiz_id', id)
      .eq('user_id', authUser.uid)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      id: data.id,
      title: data.title,
      description: data.description,
      questions: data.questions,
      createdAt: data.created_at,
      responses: (responses || []).map(r => ({
        id: r.id,
        score: r.score,
        maxScore: r.max_score,
        evaluation: r.evaluation,
        createdAt: r.created_at
      }))
    });
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
      .from('quizzes')
      .delete()
      .eq('id', id)
      .eq('user_id', authUser.uid);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
