import { NextResponse } from 'next/server';
import { getDb } from '../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../backend/lib/auth';
import { getPrompt } from '../../../backend/lib/prompts';

export const dynamic = 'force-dynamic';

async function extractPdfText(buffer) {
  try {
    let pdfParse;
    try {
      pdfParse = require('pdf-parse/lib/pdf-parse');
    } catch (requireError) {
      try {
        pdfParse = require('pdf-parse');
      } catch (requireError2) {
        try {
          const mod = await import('pdf-parse');
          pdfParse = mod.default || mod;
        } catch (importError) {
          throw new Error('PDF parsing module not available.');
        }
      }
    }
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse loaded but is not a function.');
    }
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const data = await pdfParse(buf);
    return (data && data.text) ? String(data.text).trim() : '';
  } catch (e) {
    console.error('PDF parse error:', e.message || e);
    throw e;
  }
}

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

function parseStructuredResponse(text) {
  const cvJson = parseJsonSection(text, 'CV_JSON');
  const lettreJson = parseJsonSection(text, 'LETTRE_JSON');
  const suggestionsMatch = text.match(/##\s*Suggestions\s*([\s\S]*?)$/i);
  const suggestions = (suggestionsMatch && suggestionsMatch[1].trim()) || '';

  if (cvJson || lettreJson) {
    return {
      cv: cvJson ? JSON.stringify(cvJson) : '{}',
      lettre: lettreJson ? JSON.stringify(lettreJson) : '{}',
      suggestions,
      isJson: true
    };
  }

  const cvMatch = text.match(/##\s*CV\s*([\s\S]*?)(?=##\s*Lettre|$)/i);
  const lettreMatch = text.match(/##\s*Lettre\s*(?:de\s*motivation)?\s*([\s\S]*?)(?=##\s*Suggestions|$)/i);
  return {
    cv: (cvMatch && cvMatch[1].trim()) || '',
    lettre: (lettreMatch && lettreMatch[1].trim()) || '',
    suggestions,
    isJson: false
  };
}

export async function GET(request) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { data, error } = await supabase
      .from('career_generations')
      .select('id, profile, cv, lettre, suggestions, created_at')
      .eq('user_id', authUser.uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const list = (data || []).map((row) => ({
      id: row.id,
      profile: row.profile,
      cv: row.cv,
      lettre: row.lettre,
      suggestions: row.suggestions,
      createdAt: row.created_at
    }));

    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

async function parseCvToJson(cvText, apiKey) {
  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: getPrompt('career.cv_parsing')
          },
          {
            role: 'user',
            content: `Extrais les informations de ce CV et retourne-les en JSON:\n\n${cvText}`
          }
        ],
        model: 'grok-4-latest',
        stream: false,
        temperature: 0.3
      })
    });

    if (!res.ok) {
      console.error('CV parsing failed:', res.status);
      return null;
    }

    const data = await res.json();
    const jsonText = data.choices?.[0]?.message?.content || '';
    const cleanedJson = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      return JSON.parse(cleanedJson);
    } catch (e) {
      console.error('JSON parse error:', e);
      return null;
    }
  } catch (e) {
    console.error('CV parsing error:', e);
    return null;
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const userId = authUser.uid;
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    let nom = '';
    let formation = '';
    let experiences = '';
    let competences = '';
    let poste = '';
    let offreEmploi = '';
    let cvPdfText = '';
    let cvText = '';
    let mode = '';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      mode = formData.get('mode') || '';
      offreEmploi = formData.get('offreEmploi') || '';
      cvText = formData.get('cvText') || '';

      const file = formData.get('cvFile');
      if (file && file instanceof Blob && file.size > 0) {
        try {
          const buf = Buffer.from(await file.arrayBuffer());
          cvPdfText = await extractPdfText(buf);
        } catch (pdfError) {
          console.error('PDF extraction failed:', pdfError);
          if (!cvText.trim()) {
            return NextResponse.json(
              { error: "Impossible d'extraire le texte du PDF. Veuillez coller le texte de votre CV dans le champ prevu." },
              { status: 400 }
            );
          }
        }
      }
      if (mode !== 'cv') {
        nom = formData.get('nom') || '';
        formation = formData.get('formation') || '';
        experiences = formData.get('experiences') || '';
        competences = formData.get('competences') || '';
        poste = formData.get('poste') || '';
      }
    } else {
      const body = await request.json();
      mode = body.mode || '';
      nom = body.nom || '';
      formation = body.formation || '';
      experiences = body.experiences || '';
      competences = body.competences || '';
      poste = body.poste || '';
      offreEmploi = body.offreEmploi || '';
    }

    const hasFormContent = [nom, formation, experiences, competences, poste].some(
      (v) => v && String(v).trim().length > 0
    );

    const cvContent = (cvText.trim() || cvPdfText.trim()).trim();

    if (mode === 'cv') {
      if (!cvContent || cvContent.length < 30) {
        return NextResponse.json(
          { error: "Fournissez votre CV : soit un fichier PDF avec texte selectionnable, soit collez le texte." },
          { status: 400 }
        );
      }
    } else if (mode === 'form') {
      if (!hasFormContent) {
        return NextResponse.json(
          { error: 'Renseignez au moins un champ.' },
          { status: 400 }
        );
      }
    } else {
      if (!hasFormContent && !cvContent) {
        return NextResponse.json(
          { error: 'Renseignez au moins un champ ou envoyez un CV.' },
          { status: 400 }
        );
      }
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API non configuree' }, { status: 500 });

    let systemPrompt;
    let userPrompt;
    let cvJson = null;

    if (cvContent) {
      cvJson = await parseCvToJson(cvContent, apiKey);

      const hasOffer = offreEmploi.trim().length > 0;
      if (hasOffer) {
        systemPrompt = getPrompt('career.json_system_from_cv_with_offer') || getPrompt('career.json_system_with_offer');
      } else {
        systemPrompt = getPrompt('career.json_system_from_cv_pdf') || getPrompt('career.json_system');
      }
      const offerBlock = hasOffer ? `\n\n--- Offre d'emploi ---\n${offreEmploi.trim()}` : '';

      if (cvJson) {
        const jsonStr = JSON.stringify(cvJson, null, 2);
        userPrompt = `IMPORTANT : Utilise UNIQUEMENT les informations du CV ci-dessous. N'invente rien.\n\n--- CV du candidat (JSON) ---\n${jsonStr}${offerBlock}`;
      } else {
        userPrompt = `IMPORTANT : Utilise UNIQUEMENT les informations ci-dessous. N'invente rien.\n\n--- CV actuel ---\n${cvContent}${offerBlock}`;
      }

      if (!hasOffer) userPrompt += "\n\n(Pas d'offre fournie : produis un CV ameliore et une lettre type.)";
    } else {
      const profileText = [
        nom && `Nom: ${nom}`,
        formation && `Formation: ${formation}`,
        experiences && `Experiences professionnelles: ${experiences}`,
        competences && `Competences: ${competences}`,
        poste && `Poste ou domaine vise: ${poste}`
      ]
        .filter(Boolean)
        .join('\n');

      if (offreEmploi.trim()) {
        systemPrompt = getPrompt('career.json_system_with_offer');
        userPrompt = `Profil professionnel:\n${profileText}\n\n--- Offre d'emploi ---\n${offreEmploi.trim()}`;
      } else {
        systemPrompt = getPrompt('career.json_system');
        userPrompt = `Voici le profil professionnel:\n\n${profileText}`;
      }
    }

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

    const profile = {
      nom: nom || (cvJson?.nom || ''),
      formation: formation || (cvJson?.formation || ''),
      experiences: experiences || (cvJson?.experiences || ''),
      competences: competences || (cvJson?.competences || ''),
      poste: poste || '',
      offreEmploi: offreEmploi || '',
      sourceCvPdf: !!cvPdfText.trim(),
      sourceCvText: !!cvText.trim(),
      cvJson: cvJson || null
    };

    const { data: row, error } = await supabase
      .from('career_generations')
      .insert({
        user_id: userId,
        profile,
        cv,
        lettre,
        suggestions
      })
      .select('id')
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({
      id: row.id,
      cv,
      lettre,
      suggestions
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
