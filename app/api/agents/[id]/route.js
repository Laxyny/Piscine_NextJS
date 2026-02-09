import { NextResponse } from 'next/server';
import { getDb } from '../../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../../backend/lib/auth';

export const dynamic = 'force-dynamic';

async function checkAgentOwner(supabase, agentId, uid) {
  const { data, error } = await supabase.from('agents').select('user_id').eq('id', agentId).single();
  if (error || !data) return false;
  return data.user_id === uid;
}

export async function DELETE(request, { params }) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { id } = await params;
    const isOwner = await checkAgentOwner(supabase, id, authUser.uid);
    if (!isOwner) return unauthorizedResponse();

    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const supabase = getDb();
    if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

    const { id } = await params;
    const isOwner = await checkAgentOwner(supabase, id, authUser.uid);
    if (!isOwner) return unauthorizedResponse();

    const body = await request.json();
    const updates = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.systemPrompt !== undefined) updates.system_prompt = body.systemPrompt;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase.from('agents').update(updates).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
