import { NextResponse } from 'next/server';
import { getDb } from '../../../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../../../backend/lib/auth';
import { getPrompt } from '../../../../../backend/lib/prompts';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { id } = await params;
    const body = await request.json();
    const { answers } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: 'Reponses manquantes.' }, { status: 400 });
    }

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, questions')
      .eq('id', id)
      .eq('user_id', authUser.uid)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz non trouve' }, { status: 404 });
    }

    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API non configuree' }, { status: 500 });

    const systemPrompt = getPrompt('quiz.evaluate');

    const questionsWithAnswers = quiz.questions.map((q, i) => ({
      ...q,
      candidateAnswer: answers[i]?.answer ?? ''
    }));

    const userPrompt = `Voici le quiz et les reponses du candidat :\n\n${JSON.stringify(questionsWithAnswers, null, 2)}`;

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
        temperature: 0.3
      })
    });

    if (!res.ok) throw new Error('AI request failed');
    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    let evaluation;
    try {
      const cleaned = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      evaluation = JSON.parse(cleaned);
    } catch (e) {
      console.error('Evaluation parse error:', e);
      return NextResponse.json({ error: 'Erreur lors de l\'evaluation.' }, { status: 500 });
    }

    const totalScore = Math.round(Number(evaluation.totalScore) || 0);
    const maxScore = Math.round(Number(evaluation.maxScore) || 0);
    evaluation.totalScore = totalScore;
    evaluation.maxScore = maxScore;
    evaluation.percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    if (evaluation.scores && Array.isArray(evaluation.scores)) {
      for (const s of evaluation.scores) {
        s.earned = Math.round(Number(s.earned) || 0);
        s.max = Math.round(Number(s.max) || 0);
      }
    }

    const { data: row, error: insertError } = await supabase
      .from('quiz_responses')
      .insert({
        quiz_id: id,
        user_id: authUser.uid,
        answers,
        score: totalScore,
        max_score: maxScore,
        evaluation
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(insertError);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({
      id: row.id,
      evaluation
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
