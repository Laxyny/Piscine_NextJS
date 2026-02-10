import { NextResponse } from 'next/server';
import { getDb } from '../../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../../backend/lib/auth';
import { getPrompt } from '../../../../backend/lib/prompts';

export const dynamic = 'force-dynamic';

function parseJsonSection(text, sectionName) {
  const regex = new RegExp(`##\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=##\\s|$)`, 'i');
  const match = text.match(regex);
  if (!match) return null;
  let raw = match[1].trim();
  raw = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Failed to parse ${sectionName}:`, e.message);
    return null;
  }
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

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API non configuree' }, { status: 500 });

    let isJson = false;
    let cvDisplay = cv || '';
    let lettreDisplay = lettre || '';

    try {
      const parsedCv = JSON.parse(cv);
      const parsedLettre = JSON.parse(lettre);
      isJson = true;
      cvDisplay = JSON.stringify(parsedCv, null, 2);
      lettreDisplay = JSON.stringify(parsedLettre, null, 2);
    } catch (e) {
      isJson = false;
    }

    const systemPrompt = isJson
      ? getPrompt('career.json_refine')
      : getPrompt('career.refine');

    const userPrompt = isJson
      ? `--- CV_JSON actuel ---\n${cvDisplay}\n\n--- LETTRE_JSON actuelle ---\n${lettreDisplay}\n\n--- Modification demandee ---\n${instruction.trim()}`
      : `--- CV actuel ---\n${cvDisplay}\n\n--- Lettre de motivation actuelle ---\n${lettreDisplay}\n\n--- Modification demandee ---\n${instruction.trim()}`;

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

    let newCv = cv;
    let newLettre = lettre;

    if (isJson) {
      const parsedCv = parseJsonSection(rawContent, 'CV_JSON');
      const parsedLettre = parseJsonSection(rawContent, 'LETTRE_JSON');
      if (parsedCv) newCv = JSON.stringify(parsedCv);
      if (parsedLettre) newLettre = JSON.stringify(parsedLettre);
    } else {
      const cvMatch = rawContent.match(/##\s*CV\s*([\s\S]*?)(?=##\s*Lettre|$)/i);
      const lettreMatch = rawContent.match(/##\s*Lettre\s*(?:de\s*motivation)?\s*([\s\S]*?)$/i);
      if (cvMatch) newCv = cvMatch[1].trim();
      if (lettreMatch) newLettre = lettreMatch[1].trim();
    }

    const { error } = await supabase
      .from('career_generations')
      .update({ cv: newCv, lettre: newLettre })
      .eq('id', generationId)
      .eq('user_id', authUser.uid);

    if (error) console.error(error);

    return NextResponse.json({ cv: newCv, lettre: newLettre });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
