import { NextResponse } from 'next/server';
import { db } from '../../../../backend/lib/db';
import { doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { getAuthFromRequest, unauthorizedResponse } from '../../../../backend/lib/auth';

async function checkChatOwner(chatId, uid) {
  if (!db || !chatId) return false;
  const chatSnap = await getDoc(doc(db, "chats", chatId));
  if (!chatSnap.exists()) return false;
  return chatSnap.data().userId === uid;
}

export async function PATCH(request, { params }) {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const { id } = await params;
    const isOwner = await checkChatOwner(id, authUser.uid);
    if (!isOwner) return unauthorizedResponse();
    const body = await request.json();
    try {
        const chatRef = doc(db, "chats", id);
        await updateDoc(chatRef, { title: body.title });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const authUser = await getAuthFromRequest(request);
    if (!authUser) return unauthorizedResponse();
    const { id } = await params;
    const isOwner = await checkChatOwner(id, authUser.uid);
    if (!isOwner) return unauthorizedResponse();
    try {
        await deleteDoc(doc(db, "chats", id));
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
