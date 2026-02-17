import { NextResponse } from 'next/server';
import { getDb } from '../../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../../backend/lib/auth';
import { getPrompt } from '../../../../backend/lib/prompts';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { data, error } = await supabase
      .from('job_postings')
      .select('id, title, description, skills, status, created_at')
      .eq('user_id', authUser.uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const postingsWithCounts = [];
    for (const p of (data || [])) {
      const { count } = await supabase
        .from('job_applications')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', p.id);

      postingsWithCounts.push({
        id: p.id,
        title: p.title,
        description: p.description,
        skills: p.skills,
        status: p.status,
        applicationCount: count || 0,
        createdAt: p.created_at
      });
    }

    return NextResponse.json(postingsWithCounts);
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

    const body = await request.json();
    const { title, description, skills } = body;

    if (!title?.trim() || !description?.trim()) {
      return NextResponse.json({ error: 'Titre et description requis.' }, { status: 400 });
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API non configuree' }, { status: 500 });

    const systemPrompt = getPrompt('recruiter.generate_reference_cv');
    const userPrompt = `Titre du poste : ${title.trim()}\n\nDescription du poste :\n${description.trim()}\n\nCompetences recherchees :\n${(skills || '').trim()}`;

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
        temperature: 0.6
      })
    });

    if (!res.ok) throw new Error('AI request failed');
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    let referenceCv;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      referenceCv = JSON.parse(cleaned);
    } catch (e) {
      console.error('Reference CV parse error:', e);
      referenceCv = {};
    }

    const { data: row, error } = await supabase
      .from('job_postings')
      .insert({
        user_id: authUser.uid,
        title: title.trim(),
        description: description.trim(),
        skills: (skills || '').trim(),
        reference_cv: referenceCv,
        status: 'draft'
      })
      .select('id')
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({
      id: row.id,
      title: title.trim(),
      description: description.trim(),
      skills: (skills || '').trim(),
      referenceCv,
      status: 'draft'
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
