import { NextResponse } from 'next/server';
import { db } from '../../../backend/lib/db';
import { collection, getDocs, addDoc, orderBy, query } from "firebase/firestore";

export async function GET() {
    try {
        const messagesRef = collection(db, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);

        const messages = [];
        querySnapshot.forEach((doc) => {
            messages.push({ id: doc.id, ...doc.data() });
        });

        return NextResponse.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { content } = body;

        if (!content || typeof content !== 'string' || content.trim() === '') {
            return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
        }

        const userMessageData = {
            content: content,
            role: 'user',
            createdAt: new Date().toISOString(),
        };

        const userDocRef = await addDoc(collection(db, "messages"), userMessageData);
        const userMessage = { id: userDocRef.id, ...userMessageData };

        const apiKey = process.env.GROK_API_KEY;
        if (!apiKey) {
            console.error('GROK_API_KEY is not defined');
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'system',
                        content: 'Tu es un assistant qui a pour but d\'aider au maximum la personne avec qui tu discutes'
                    },
                    {
                        role: 'user',
                        content: content
                    }
                ],
                model: 'grok-4-latest',
                stream: false,
                temperature: 0.7
            }),
        });

        if (!grokResponse.ok) {
            const errorData = await grokResponse.text();
            console.error('Grok API error:', errorData);
            return NextResponse.json({ error: 'Error from AI service' }, { status: 500 });
        }

        const grokData = await grokResponse.json();
        const aiContent = grokData.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

        const aiMessageData = {
            content: aiContent,
            role: 'assistant',
            createdAt: new Date().toISOString(),
        };

        const aiDocRef = await addDoc(collection(db, "messages"), aiMessageData);
        const aiMessage = { id: aiDocRef.id, ...aiMessageData };

        return NextResponse.json(aiMessage);

    } catch (error) {
        console.error('Error processing message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
