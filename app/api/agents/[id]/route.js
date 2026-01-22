import { NextResponse } from 'next/server';
import { db } from '../../../backend/lib/db';
import { doc, deleteDoc, updateDoc } from "firebase/firestore";

export async function DELETE(request, { params }) {
    try {
        const { id } = params;
        await deleteDoc(doc(db, "agents", id));
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        const { id } = params;
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
