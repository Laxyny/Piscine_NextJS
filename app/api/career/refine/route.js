import { NextResponse } from 'next/server';
import { getDb } from '../../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../../backend/lib/auth';
import { getPrompt } from '../../../../backend/lib/prompts';

export const dynamic = 'force-dynamic';

function parseRefineResponse(text) {
  const cvMatch = text.match(/##\s*CV\s*([\s\S]*?)(?=##\s*Lettre|$)/i);
  const lettreMatch = text.match(/##\s*Lettre\s*(?:de\s*motivation)?\s*([\s\S]*?)$/i);
  return {
    cv: (cvMatch && cvMatch[1].trim()) || '',
    lettre: (lettreMatch && lettreMatch[1].trim()) || ''
  };
}

export async function POST(request) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const body = await request.json();
    const { generationId, cv, lettre, instruction } = body;

    if (!generationId || !instruction?.trim()) {
      return NextResponse.json({ error: 'Instruction requise' }, { status: 400 });
    }

    if (!cv && !lettre) {
      return NextResponse.json({ error: 'CV ou lettre requis' }, { status: 400 });
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API non configuree' }, { status: 500 });

    const systemPrompt = getPrompt('career.refine');
    const userPrompt = `--- CV actuel ---\n${cv || '(vide)'}\n\n--- Lettre de motivation actuelle ---\n${lettre || '(vide)'}\n\n--- Modification demandee ---\n${instruction.trim()}`;

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
        model: 'grok-4-latest',
        stream: false,
        temperature: 0.4
      })
    });

    if (!res.ok) throw new Error('AI request failed');
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    const parsed = parseRefineResponse(rawContent);

    const newCv = parsed.cv || cv;
    const newLettre = parsed.lettre || lettre;

    const { error } = await supabase
      .from('career_generations')
      .update({ cv: newCv, lettre: newLettre })
      .eq('id', generationId)
      .eq('user_id', authUser.uid);

    if (error) {
      console.error(error);
    }

    return NextResponse.json({ cv: newCv, lettre: newLettre });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
