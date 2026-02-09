import { NextResponse } from 'next/server';
import { getDb } from '../../../../backend/lib/db';
import { getAuthFromRequest, unauthorizedResponse } from '../../../../backend/lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(request) {
  const authUser = await getAuthFromRequest(request);
  if (!authUser) return unauthorizedResponse();
  const supabase = getDb();
  if (!supabase) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });

  const userId = authUser.uid;

  try {
    const { data: chats } = await supabase.from('chats').select('id').eq('user_id', userId);
    if (chats && chats.length > 0) {
      const ids = chats.map((c) => c.id);
      await supabase.from('messages').delete().in('chat_id', ids);
      await supabase.from('chats').delete().eq('user_id', userId);
    }
    return NextResponse.json({ success: true, count: chats?.length || 0 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
