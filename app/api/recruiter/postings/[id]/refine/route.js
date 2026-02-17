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
    const { instruction, referenceCv } = body;

    if (!instruction?.trim()) {
      return NextResponse.json({ error: 'Instruction requise.' }, { status: 400 });
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API non configuree' }, { status: 500 });

    const systemPrompt = getPrompt('recruiter.refine_reference_cv');
    const userPrompt = `--- CV de reference actuel ---\n${JSON.stringify(referenceCv, null, 2)}\n\n--- Modification demandee ---\n${instruction.trim()}`;

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
        temperature: 0.4
      })
    });

    if (!res.ok) throw new Error('AI request failed');
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    let newCv;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      newCv = JSON.parse(cleaned);
    } catch (e) {
      console.error('Refine parse error:', e);
      return NextResponse.json({ error: 'Erreur lors de la modification.' }, { status: 500 });
    }

    await supabase
      .from('job_postings')
      .update({ reference_cv: newCv, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', authUser.uid);

    return NextResponse.json({ referenceCv: newCv });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
