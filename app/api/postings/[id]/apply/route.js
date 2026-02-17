import { NextResponse } from 'next/server';
import { getDb } from '../../../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../../../backend/lib/auth';

export const dynamic = 'force-dynamic';

async function extractPdfText(buffer) {
  try {
    let pdfParse;
    try {
      pdfParse = require('pdf-parse/lib/pdf-parse');
    } catch (_) {
      try {
        pdfParse = require('pdf-parse');
      } catch (_2) {
        const mod = await import('pdf-parse');
        pdfParse = mod.default || mod;
      }
    }
    if (typeof pdfParse !== 'function') throw new Error('pdf-parse not a function');
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const data = await pdfParse(buf);
    return (data && data.text) ? String(data.text).trim() : '';
  } catch (e) {
    console.error('PDF parse error:', e.message || e);
    throw e;
  }
}

async function parseCvToStructured(cvText, apiKey) {
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
            content: 'Tu es un expert en parsing de CV. Extrais les informations et retourne UNIQUEMENT un JSON valide avec cette structure : { "basics": { "name": "", "email": "", "phone": "", "summary": "", "location": { "city": "" } }, "work": [{ "company": "", "position": "", "startDate": "", "endDate": "", "summary": "", "highlights": [] }], "education": [{ "institution": "", "area": "", "studyType": "", "startDate": "", "endDate": "" }], "skills": [{ "name": "", "keywords": [] }], "languages": [{ "language": "", "fluency": "" }], "yearsOfExperience": 0 }. Calcule yearsOfExperience a partir des dates des experiences. Si une info manque, utilise une chaine vide.'
          },
          {
            role: 'user',
            content: `Extrais les informations de ce CV :\n\n${cvText}`
          }
        ],
        model: 'grok-3-mini-fast',
        stream: false,
        temperature: 0.3
      })
    });
    if (!res.ok) return {};
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('CV parsing error:', e);
    return {};
  }
}

export async function POST(request, { params }) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { id } = await params;

    const { data: posting } = await supabase
      .from('job_postings')
      .select('id, status')
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (!posting) {
      return NextResponse.json({ error: 'Offre non trouvee ou non publiee.' }, { status: 404 });
    }

    const { data: existing } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', id)
      .eq('user_id', authUser.uid)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Vous avez deja postule a cette offre.' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';
    let cvText = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const textVal = formData.get('cvText') || '';
      const file = formData.get('cvFile');

      if (file && file instanceof Blob && file.size > 0) {
        try {
          const buf = Buffer.from(await file.arrayBuffer());
          cvText = await extractPdfText(buf);
        } catch (_) {
          if (!textVal.trim()) {
            return NextResponse.json({ error: "Impossible d'extraire le texte du PDF." }, { status: 400 });
          }
        }
      }
      if (!cvText && textVal.trim()) cvText = textVal.trim();
    } else {
      const body = await request.json();
      cvText = (body.cvText || '').trim();
    }

    if (!cvText || cvText.length < 30) {
      return NextResponse.json({ error: 'Fournissez votre CV.' }, { status: 400 });
    }

    const apiKey = process.env.GROK_API_KEY;
    const cvData = apiKey ? await parseCvToStructured(cvText, apiKey) : {};

    const { data: row, error } = await supabase
      .from('job_applications')
      .insert({
        job_id: id,
        user_id: authUser.uid,
        cv_text: cvText.slice(0, 10000),
        cv_data: cvData
      })
      .select('id')
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({ id: row.id, success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
