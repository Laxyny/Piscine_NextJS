import { NextResponse } from 'next/server';
import { db } from '../../../backend/lib/db';
import { collection, getDocs, addDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { getAuthFromRequest, unauthorizedResponse } from '../../../backend/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const authUser = await getAuthFromRequest(request);
        if (!authUser) return unauthorizedResponse();
        const userId = authUser.uid;

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
        const authUser = await getAuthFromRequest(request);
        if (!authUser) return unauthorizedResponse();
        const userId = authUser.uid;

        const body = await request.json();
        const { name, description, systemPrompt } = body;

        if (!name || !systemPrompt) {
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
