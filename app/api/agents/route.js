import { NextResponse } from 'next/server';
import { db } from '../../../backend/lib/db';
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

        const q = query(
            collection(db, "agents"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        const agents = [];
        querySnapshot.forEach((doc) => {
            agents.push({ id: doc.id, ...doc.data() });
        });

        return NextResponse.json(agents);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { name, description, systemPrompt, userId } = body;

        if (!name || !systemPrompt || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const docRef = await addDoc(collection(db, "agents"), {
            name,
            description: description || '',
            systemPrompt,
            userId,
            createdAt: new Date().toISOString()
        });

        return NextResponse.json({ id: docRef.id, ...body });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
