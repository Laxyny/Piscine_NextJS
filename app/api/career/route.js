import { NextResponse } from 'next/server';
import { db } from '../../../backend/lib/db';
import { collection, addDoc } from 'firebase/firestore';
import { getAuthFromRequest, unauthorizedResponse } from '../../../backend/lib/auth';

export const dynamic = 'force-dynamic';

function parseStructuredResponse(text) {
  const cvMatch = text.match(/##\s*CV\s*([\s\S]*?)(?=##\s*Lettre|$)/i);
  const lettreMatch = text.match(/##\s*Lettre\s*(?:de\s*motivation)?\s*([\s\S]*?)(?=##\s*Suggestions|$)/i);
  const suggestionsMatch = text.match(/##\s*Suggestions\s*([\s\S]*?)$/i);
  return {
    cv: (cvMatch && cvMatch[1].trim()) || '',
    lettre: (lettreMatch && lettreMatch[1].trim()) || '',
    suggestions: (suggestionsMatch && suggestionsMatch[1].trim()) || ''
  };
}

export async function POST(request) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const userId = authUser.uid;

    const body = await request.json();
    const { nom, formation, experiences, competences, poste } = body;

    const hasContent = [formation, experiences, competences, poste].some(
      (v) => v && String(v).trim().length > 0
    );
    if (!hasContent)
      return NextResponse.json(
        { error: 'Renseignez au moins un champ parmi formation, expériences, compétences ou poste visé.' },
        { status: 400 }
      );

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API non configurée' }, { status: 500 });

    const profileText = [
      nom && `Nom: ${nom}`,
      formation && `Formation: ${formation}`,
      experiences && `Expériences professionnelles: ${experiences}`,
      competences && `Compétences: ${competences}`,
      poste && `Poste ou domaine visé: ${poste}`
    ].filter(Boolean).join('\n');

    const systemPrompt = `Tu es un expert en recrutement et en rédaction de CV et lettres de motivation.
Tu dois répondre UNIQUEMENT avec le format suivant, sans rien avant ni après:

## CV
[Propose un CV structuré et professionnel adapté au profil]

## Lettre de motivation
[Propose une lettre de motivation rédigée et personnalisée]

## Suggestions
[Liste de conseils concrets pour améliorer la candidature, sous forme de points]

Utilise des titres de section clairs dans le CV (Profil, Compétences, Expériences, etc.).`;

    const userPrompt = `Voici le profil professionnel à partir duquel générer un CV, une lettre de motivation et des suggestions:\n\n${profileText}`;

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
        temperature: 0.6
      })
    });

    if (!res.ok) throw new Error('AI request failed');
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    const { cv, lettre, suggestions } = parseStructuredResponse(rawContent);

    const docRef = await addDoc(collection(db, 'careerGenerations'), {
      userId,
      profile: { nom: nom || '', formation: formation || '', experiences: experiences || '', competences: competences || '', poste: poste || '' },
      cv,
      lettre,
      suggestions,
      createdAt: new Date().toISOString()
    });

    return NextResponse.json({
      id: docRef.id,
      cv,
      lettre,
      suggestions
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
