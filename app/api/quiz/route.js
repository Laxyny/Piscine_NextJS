import { NextResponse } from 'next/server';
import { getDb } from '../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../backend/lib/auth';
import { getPrompt } from '../../../backend/lib/prompts';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { data, error } = await supabase
      .from('quizzes')
      .select('id, title, description, questions, created_at')
      .eq('user_id', authUser.uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const list = (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      questionCount: Array.isArray(row.questions) ? row.questions.length : 0,
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

    const body = await request.json();
    const { jobDescription, skills, questionCount } = body;

    if (!jobDescription && !skills) {
      return NextResponse.json({ error: 'Fournissez une description de poste ou des competences.' }, { status: 400 });
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API non configuree' }, { status: 500 });

    const systemPrompt = getPrompt('quiz.generate');
    let userPrompt = '';

    if (jobDescription && skills) {
      userPrompt = `Description du poste :\n${jobDescription}\n\nCompetences recherchees :\n${skills}`;
    } else if (jobDescription) {
      userPrompt = `Description du poste :\n${jobDescription}`;
    } else {
      userPrompt = `Competences recherchees :\n${skills}`;
    }

    if (questionCount) {
      userPrompt += `\n\nGenere exactement ${questionCount} questions.`;
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
        model: 'grok-3-mini-fast',
        stream: false,
        temperature: 0.7
      })
    });

    if (!res.ok) throw new Error('AI request failed');
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    let quiz;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      quiz = JSON.parse(cleaned);
    } catch (e) {
      console.error('Quiz parse error:', e);
      return NextResponse.json({ error: 'Erreur lors de la generation du quiz.' }, { status: 500 });
    }

    const { data: row, error } = await supabase
      .from('quizzes')
      .insert({
        user_id: authUser.uid,
        title: quiz.title || 'Quiz sans titre',
        description: quiz.description || '',
        questions: quiz.questions || []
      })
      .select('id')
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({
      id: row.id,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
