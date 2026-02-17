import { NextResponse } from 'next/server';
import { getDb } from '../../../../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../../../../backend/lib/auth';
import { getPrompt } from '../../../../../../backend/lib/prompts';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { id } = await params;
    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'ID de candidature requis.' }, { status: 400 });
    }

    const { data: posting } = await supabase
      .from('job_postings')
      .select('reference_cv')
      .eq('id', id)
      .eq('user_id', authUser.uid)
      .single();

    if (!posting) {
      return NextResponse.json({ error: 'Offre non trouvee' }, { status: 404 });
    }

    const { data: application } = await supabase
      .from('job_applications')
      .select('id, cv_data')
      .eq('id', applicationId)
      .eq('job_id', id)
      .single();

    if (!application) {
      return NextResponse.json({ error: 'Candidature non trouvee' }, { status: 404 });
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API non configuree' }, { status: 500 });

    const systemPrompt = getPrompt('recruiter.compare_candidate');
    const userPrompt = `--- CV de REFERENCE (candidat ideal) ---\n${JSON.stringify(posting.reference_cv, null, 2)}\n\n--- CV du CANDIDAT ---\n${JSON.stringify(application.cv_data, null, 2)}`;

    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: 'grok-3-mini-fast',
        stream: false,
        temperature: 0.3
      })
    });

    if (!res.ok) throw new Error('AI request failed');
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    let analysis;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch (e) {
      console.error('Compare parse error:', e);
      return NextResponse.json({ error: "Erreur lors de l'analyse." }, { status: 500 });
    }

    const score = Math.round(Number(analysis.overallScore) || 0);
    analysis.overallScore = score;

    if (analysis.categories) {
      for (const cat of analysis.categories) {
        cat.score = Math.round(Number(cat.score) || 0);
        cat.weight = Math.round(Number(cat.weight) || 0);
      }
    }

    await supabase
      .from('job_applications')
      .update({ analysis, score })
      .eq('id', applicationId);

    return NextResponse.json({ analysis });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
