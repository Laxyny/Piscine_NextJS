import { NextResponse } from 'next/server';
import { getDb } from '../../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../../backend/lib/auth';
import { getPrompt } from '../../../../backend/lib/prompts';

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

export async function GET(request) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { data, error } = await supabase
      .from('cv_analyses')
      .select('id, analysis, overall_score, created_at')
      .eq('user_id', authUser.uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const list = (data || []).map((row) => ({
      id: row.id,
      analysis: row.analysis,
      overallScore: row.overall_score,
      createdAt: row.created_at
    }));

    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const contentType = request.headers.get('content-type') || '';
    let cvContent = '';
    let offerText = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      offerText = formData.get('offerText') || '';
      const cvText = formData.get('cvText') || '';
      const file = formData.get('cvFile');

      if (file && file instanceof Blob && file.size > 0) {
        try {
          const buf = Buffer.from(await file.arrayBuffer());
          cvContent = await extractPdfText(buf);
        } catch (pdfError) {
          console.error('PDF extraction failed:', pdfError);
          if (!cvText.trim()) {
            return NextResponse.json(
              { error: "Impossible d'extraire le texte du PDF. Collez le texte de votre CV." },
              { status: 400 }
            );
          }
        }
      }
      if (!cvContent && cvText.trim()) {
        cvContent = cvText.trim();
      }
    } else {
      const body = await request.json();
      cvContent = (body.cvText || '').trim();
      offerText = (body.offerText || '').trim();
    }

    if (!cvContent || cvContent.length < 30) {
      return NextResponse.json({ error: 'Fournissez le contenu de votre CV.' }, { status: 400 });
    }

    if (!offerText || offerText.length < 20) {
      return NextResponse.json({ error: "Fournissez le texte de l'offre d'emploi." }, { status: 400 });
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API non configuree' }, { status: 500 });

    const systemPrompt = getPrompt('analysis.cv_vs_offer');
    const userPrompt = `--- CV du candidat ---\n${cvContent}\n\n--- Offre d'emploi ---\n${offerText}`;

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

    let analysis;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch (e) {
      console.error('Analysis parse error:', e);
      return NextResponse.json({ error: "Erreur lors de l'analyse." }, { status: 500 });
    }

    const overallScore = Math.round(Number(analysis.overallScore) || 0);
    analysis.overallScore = overallScore;

    if (analysis.categories && Array.isArray(analysis.categories)) {
      for (const cat of analysis.categories) {
        cat.score = Math.round(Number(cat.score) || 0);
        cat.weight = Math.round(Number(cat.weight) || 0);
      }
    }

    const { data: row, error: insertError } = await supabase
      .from('cv_analyses')
      .insert({
        user_id: authUser.uid,
        cv_text: cvContent.slice(0, 10000),
        offer_text: offerText.slice(0, 10000),
        analysis,
        overall_score: overallScore
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(insertError);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({
      id: row.id,
      analysis
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
