import { NextResponse } from 'next/server';
import { db } from '../../../../backend/lib/db';
import { doc, updateDoc, deleteDoc } from "firebase/firestore";

export async function PATCH(request, { params }) {
    const { id } = await params;
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
    const { id } = await params;
    try {
        await deleteDoc(doc(db, "chats", id));
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
