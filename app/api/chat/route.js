import { NextResponse } from 'next/server';
import { getDb } from '../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../backend/lib/auth';
import { getPrompt } from '../../../backend/lib/prompts';w
export const dynamic = 'force-dynamic';

async function checkChatOwner(supabase, chatId, uid) {
  if (!supabase || !chatId) return false;
  const { data, error } = await supabase.from('chats').select('user_id').eq('id', chatId).single();
  if (error || !data) return false;
  return data.user_id === uid;
}

async function generateTitle(firstMessage, apiKey) {
  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: getPrompt('chat.title_generation') || 'Génère un titre de conversation très court (3-5 mots max).' },
          { role: 'user', content: firstMessage }
        ],
        model: 'grok-4-latest',
        temperature: 0.3
      })
    });
    const data = await res.json();
    let title = data.choices[0]?.message?.content || 'Nouvelle discussion';
    title = title.replace(/^["']|["']$/g, '');
    title = title.replace(/^Title:\s*/i, '');
    return title.substring(0, 50);
  } catch {
    return 'Nouvelle discussion';
  }
}

export async function GET(request) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');
    if (!chatId) return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });

    const isOwner = await checkChatOwner(supabase, chatId, authUser.uid);
    if (!isOwner) return unauthorizedResponse();

    const { data, error } = await supabase
      .from('messages')
      .select('id, content, role, type, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const messages = (data || []).map((row) => ({
      id: row.id,
      content: row.content,
      role: row.role,
      type: row.type,
      createdAt: row.created_at
    }));

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const body = await request.json();
    const { content, chatId, mode = 'text' } = body;
    if (!chatId || !content) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

    const isOwner = await checkChatOwner(supabase, chatId, authUser.uid);
    if (!isOwner) return unauthorizedResponse();

    const { data: historyRows } = await supabase
      .from('messages')
      .select('role, content')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(30);

    const history = (historyRows || []).reverse().map((r) => ({ role: r.role, content: r.content }));
    const isFirstMessage = history.length === 0;

    const { error: insertUserErr } = await supabase.from('messages').insert({
      chat_id: chatId,
      content,
      role: 'user',
      type: 'text'
    });
    if (insertUserErr) {
      console.error(insertUserErr);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const apiKey = process.env.GROK_API_KEY;
    if (isFirstMessage && apiKey) {
      const title = await generateTitle(content, apiKey);
      await supabase.from('chats').update({ title }).eq('id', chatId);
    }

    let aiContent = '';
    let messageType = 'text';

    if (mode === 'image') {
      const imageResponse = await fetch('https://api.x.ai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          prompt: content,
          model: 'grok-2-image-1212',
          response_format: 'url'
        })
      });

      if (!imageResponse.ok) {
        const errData = await imageResponse.text();
        console.error('Image Gen Error:', errData);
        throw new Error('Image generation failed');
      }

      const imageData = await imageResponse.json();
      aiContent = imageData.data[0]?.url;
      messageType = 'image';
    } else {
      let systemInstruction = getPrompt('chat.default_system') || 'Tu es un assistant utile et professionnel.';

      const { data: chatRow } = await supabase.from('chats').select('agent_id').eq('id', chatId).single();
      if (chatRow?.agent_id) {
        const { data: agentRow } = await supabase.from('agents').select('system_prompt').eq('id', chatRow.agent_id).single();
        if (agentRow?.system_prompt) systemInstruction = agentRow.system_prompt;
      }

      const messagesPayload = [
        { role: 'system', content: systemInstruction },
        ...history,
        { role: 'user', content: content }
      ];

      const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          messages: messagesPayload,
          model: 'grok-4-latest',
          stream: false,
          temperature: 0.7
        })
      });

      if (!grokResponse.ok) throw new Error('AI Error');

      const grokData = await grokResponse.json();
      aiContent = grokData.choices[0]?.message?.content || 'Error generation';
    }

    const { data: aiRow, error: aiInsertErr } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        content: aiContent,
        role: 'assistant',
        type: messageType
      })
      .select('id')
      .single();

    if (aiInsertErr) {
      console.error(aiInsertErr);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    return NextResponse.json({
      id: aiRow.id,
      content: aiContent,
      role: 'assistant',
      type: messageType,
      titleUpdate: isFirstMessage
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
