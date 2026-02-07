import { NextResponse } from 'next/server';
import { db } from '../../../../backend/lib/db';
import { doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { getAuthFromRequest, unauthorizedResponse } from '../../../../backend/lib/auth';

export const dynamic = 'force-dynamic';

async function checkAgentOwner(agentId, uid) {
  const snap = await getDoc(doc(db, "agents", agentId));
  if (!snap.exists()) return false;
  return snap.data().userId === uid;
}

export async function DELETE(request, { params }) {
    try {
        const authUser = await getAuthFromRequest(request);
        if (!authUser) return unauthorizedResponse();
        const { id } = await params;
        const isOwner = await checkAgentOwner(id, authUser.uid);
        if (!isOwner) return unauthorizedResponse();
        await deleteDoc(doc(db, "agents", id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const authUser = await getAuthFromRequest(request);
        if (!authUser) return unauthorizedResponse();
        const { id } = await params;
        const isOwner = await checkAgentOwner(id, authUser.uid);
        if (!isOwner) return unauthorizedResponse();
        const body = await request.json();
        await updateDoc(doc(db, "agents", id), {
            ...body,
            updatedAt: new Date().toISOString()
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
