import { NextResponse } from 'next/server';
import { db } from '../../../backend/lib/db';
import { collection, getDocs, addDoc, orderBy, query, limit, doc, updateDoc, getDoc } from "firebase/firestore";

export const dynamic = 'force-dynamic';

async function generateTitle(firstMessage, apiKey) {
    try {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                messages: [
                    { 
                        role: 'system', 
                        content: 'Génère un titre de conversation très court (3-5 mots max) qui résume ce message utilisateur. Si c\'est du code, résume ce que fait le code (ex: "Script Python Hello World"). Ne mets pas de guillemets, pas de préfixe "Titre:", juste le texte brut.' 
                    },
                    { role: 'user', content: firstMessage }
                ],
                model: 'grok-4-latest', temperature: 0.3
            })
        });
        const data = await res.json();
        let title = data.choices[0]?.message?.content || 'Nouvelle discussion';
        
        title = title.replace(/^["']|["']$/g, '');
        title = title.replace(/^Title:\s*/i, '');
        
        return title.substring(0, 50);
    } catch {
        return 'Nouvelle discussion';
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const chatId = searchParams.get('chatId');

        if (!chatId) return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });

        const messagesRef = collection(db, "chats", chatId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);

        const messages = [];
        querySnapshot.forEach((doc) => {
            messages.push({ id: doc.id, ...doc.data() });
        });

        return NextResponse.json(messages);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { content, chatId, mode = 'text' } = body;

        if (!chatId || !content) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

        const messagesRef = collection(db, "chats", chatId, "messages");

        const historyQuery = query(messagesRef, orderBy("createdAt", "desc"), limit(30));
        const historySnapshot = await getDocs(historyQuery);
        const history = [];
        historySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.role && data.content) history.push({ role: data.role, content: data.content });
        });
        history.reverse();

        const isFirstMessage = history.length === 0;

        await addDoc(messagesRef, {
            content: content,
            role: 'user',
            type: 'text',
            createdAt: new Date().toISOString(),
        });

        const apiKey = process.env.GROK_API_KEY;
        if (isFirstMessage && apiKey) {
             const title = await generateTitle(content, apiKey);
             await updateDoc(doc(db, "chats", chatId), { title: title });
        }

        let aiContent = '';
        let messageType = 'text';

        if (mode === 'image') {
            const imageResponse = await fetch('https://api.x.ai/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    prompt: content,
                    model: 'grok-2-image-1212',
                    response_format: 'url'
                }),
            });

            if (!imageResponse.ok) {
                const errData = await imageResponse.text();
                console.error('Image Gen Error:', errData);
                throw new Error('Image generation failed');
            }

            const imageData = await imageResponse.json();
            aiContent = imageData.data[0]?.url;
            messageType = 'image';

        } else {
            let systemInstruction = 'Tu es un assistant utile et professionnel. Tu utilises le Markdown pour formater tes réponses, surtout pour le code.';
            
            try {
                const chatDoc = await getDoc(doc(db, "chats", chatId));
                if (chatDoc.exists()) {
                    const chatData = chatDoc.data();
                    if (chatData.agentId) {
                        const agentDoc = await getDoc(doc(db, "agents", chatData.agentId));
                        if (agentDoc.exists()) {
                            systemInstruction = agentDoc.data().systemPrompt;
                        }
                    }
                }
            } catch (e) {
                console.error("Error fetching agent prompt:", e);
            }

            const messagesPayload = [
                { role: 'system', content: systemInstruction },
                ...history,
                { role: 'user', content: content }
            ];

            const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    messages: messagesPayload,
                    model: 'grok-4-latest',
                    stream: false,
                    temperature: 0.7
                }),
            });

            if (!grokResponse.ok) throw new Error('AI Error');

            const grokData = await grokResponse.json();
            aiContent = grokData.choices[0]?.message?.content || 'Error generation';
        }

        const aiDocRef = await addDoc(messagesRef, {
            content: aiContent,
            role: 'assistant',
            type: messageType,
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({ 
            id: aiDocRef.id, 
            content: aiContent, 
            role: 'assistant', 
            type: messageType,
            titleUpdate: isFirstMessage 
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
