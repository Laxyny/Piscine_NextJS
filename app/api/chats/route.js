import { NextResponse } from 'next/server';
import { getDb } from '../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../backend/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { data, error } = await supabase
      .from('chats')
      .select('id, title, agent_id, agent_name, created_at')
      .eq('user_id', authUser.uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    const chats = (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      agentId: row.agent_id,
      agentName: row.agent_name,
      createdAt: row.created_at
    }));

    return NextResponse.json(chats);
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

    const body = await request.json().catch(() => ({}));
    const { title = 'Nouvelle discussion', agentId, agentName } = body;

    const { data, error } = await supabase
      .from('chats')
      .insert({
        user_id: authUser.uid,
        title: title || 'Nouvelle discussion',
        agent_id: agentId || null,
        agent_name: agentName || null
      })
      .select('id')
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
