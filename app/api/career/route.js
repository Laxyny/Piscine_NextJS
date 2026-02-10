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
          console.warn('pdf-parse not available, PDF extraction will fail');
          throw new Error('PDF parsing module not available. Please install pdf-parse or use text input instead.');
        }
      }
    }
    
    if (typeof pdfParse !== 'function') {
      throw new Error('pdf-parse loaded but is not a function. Type: ' + typeof pdfParse);
    }
    
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const data = await pdfParse(buf);
    return (data && data.text) ? String(data.text).trim() : '';
  } catch (e) {
    console.error('PDF parse error:', e.message || e);
    throw e;
  }
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
            content: 'Tu es un expert en parsing de CV. Extrais les informations du CV fourni, même si le formatage est mauvais ou incomplet. Retourne UNIQUEMENT un JSON valide, sans texte avant ni après. Utilise exactement cette structure:\n{\n  "nom": "Prénom Nom",\n  "email": "email@example.com",\n  "telephone": "06 12 34 56 78",\n  "adresse": "123 Rue Exemple, 34000 Ville",\n  "formation": "Liste des diplômes et formations, une par ligne",\n  "experiences": "Liste des expériences professionnelles avec dates et descriptions",\n  "competences": "Liste des compétences techniques et transversales",\n  "langues": "Langues parlées si mentionnées",\n  "autres": "Autres informations pertinentes"\n}\nSi une information n\'est pas présente dans le CV, utilise une chaîne vide "". Sois tolérant avec le formatage : même si le texte est mal structuré, extrais les informations correctement. Ne mets rien d\'autre que le JSON.'
          },
          {
            role: 'user',
            content: `Extrais les informations de ce CV (même si mal formaté) et retourne-les en JSON:\n\n${cvText}`
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
      console.error('JSON parse error:', e, 'Raw text:', cleanedJson);
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
              { error: "Impossible d'extraire le texte du PDF. Veuillez coller le texte de votre CV dans le champ prévu, ou installez le module pdf-parse dans le conteneur Docker." },
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
          { error: "Fournissez votre CV : soit un fichier PDF avec texte sélectionnable, soit collez le texte de votre CV dans le champ prévu." },
          { status: 400 }
        );
      }
    } else if (mode === 'form') {
      if (!hasFormContent) {
        return NextResponse.json(
          { error: 'Renseignez au moins un champ (nom, formation, expériences, compétences ou poste).' },
          { status: 400 }
        );
      }
    } else {
      if (!hasFormContent && !cvContent) {
        return NextResponse.json(
          { error: 'Renseignez au moins un champ ou envoyez un CV (PDF ou texte).' },
          { status: 400 }
        );
      }
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API non configurée' }, { status: 500 });

    let systemPrompt;
    let userPrompt;
    let cvJson = null;

    if (cvContent) {
      cvJson = await parseCvToJson(cvContent, apiKey);
      
      systemPrompt = getPrompt('career.system_from_cv_pdf') || getPrompt('career.system_with_offer');
      const offerBlock = offreEmploi.trim() ? `\n\n--- Offre d'emploi ---\n${offreEmploi.trim()}` : '';
      
      if (cvJson) {
        const jsonStr = JSON.stringify(cvJson, null, 2);
        userPrompt = `IMPORTANT : Utilise UNIQUEMENT les informations du CV structuré ci-dessous. Le nom, les coordonnées, la formation, les expériences et les compétences doivent venir EXACTEMENT de ce JSON. N'invente rien.\n\n--- CV du candidat (format JSON) ---\n${jsonStr}${offerBlock}`;
      } else {
        console.warn('CV JSON parsing failed, using raw text');
        userPrompt = `IMPORTANT : Utilise UNIQUEMENT les informations ci-dessous pour le nom, les coordonnées, la formation, les expériences et les compétences. N'invente rien. Même si le texte est mal formaté, extrais les informations correctement.\n\n--- CV actuel du candidat ---\n${cvContent}${offerBlock}`;
      }
      
      if (!offreEmploi.trim()) userPrompt += '\n\n(Pas d\'offre fournie : produis un CV amélioré et une lettre type.)';
    } else {
      const profileText = [
        nom && `Nom: ${nom}`,
        formation && `Formation: ${formation}`,
        experiences && `Expériences professionnelles: ${experiences}`,
        competences && `Compétences: ${competences}`,
        poste && `Poste ou domaine visé: ${poste}`
      ]
        .filter(Boolean)
        .join('\n');

      if (offreEmploi.trim()) {
        systemPrompt = getPrompt('career.system_with_offer');
        userPrompt = `Profil professionnel:\n${profileText}\n\n--- Offre d'emploi ---\n${offreEmploi.trim()}`;
      } else {
        systemPrompt = getPrompt('career.system');
        userPrompt = `Voici le profil professionnel à partir duquel générer un CV, une lettre de motivation et des suggestions:\n\n${profileText}`;
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
