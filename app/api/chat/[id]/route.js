import { NextResponse } from 'next/server';
import { getDb } from '../../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../../backend/lib/auth';

export const dynamic = 'force-dynamic';

async function checkChatOwner(supabase, chatId, uid) {
  if (!supabase || !chatId) return false;
  const { data, error } = await supabase.from('chats').select('user_id').eq('id', chatId).single();
  if (error || !data) return false;
  return data.user_id === uid;
}

export async function PATCH(request, { params }) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return unauthorizedResponse();
  const supabase = getDb();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const isOwner = await checkChatOwner(supabase, id, authUser.uid);
  if (!isOwner) return unauthorizedResponse();

  const body = await request.json();
  try {
    const { error } = await supabase.from('chats').update({ title: body.title }).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return unauthorizedResponse();
  const supabase = getDb();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const { id } = await params;
  const isOwner = await checkChatOwner(supabase, id, authUser.uid);
  if (!isOwner) return unauthorizedResponse();

  try {
    const { error } = await supabase.from('chats').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
