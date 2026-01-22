"use client";
import { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import Sidebar from './Sidebar';
import MessageBubble from './MessageBubble';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getApp } from 'firebase/app';

export default function Chat() {
  const { user, loading: authLoading, login } = useAuth();
  const { playNotification } = useSettings();
  const [currentChatId, setCurrentChatId] = useState(null);
  const { messages, loading: chatLoading, sendMessage } = useChat(currentChatId);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const prevMessagesLength = useRef(0);
  const db = getFirestore(getApp());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant') {
        playNotification();
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages, playNotification]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    let targetChatId = currentChatId;

    if (currentChatId === 'draft') {
      try {
        const docRef = await addDoc(collection(db, "chats"), {
          userId: user.uid,
          createdAt: serverTimestamp(),
          title: "Nouvelle discussion"
        });
        targetChatId = docRef.id;
        setCurrentChatId(targetChatId);
      } catch (error) {
        console.error("Error creating chat:", error);
        return;
      }
    }

    if (!targetChatId) return;

    const msgContent = input;
    setInput('');
    await sendMessage(msgContent, targetChatId);
  };

  if (authLoading) return <div className="loading">Chargement...</div>;

  if (!user) {
    return (
      <div className="login-container">
        <h1>Bienvenue sur ChatApp</h1>
        <p>Connectez-vous pour sauvegarder vos conversations.</p>
        <button onClick={login} className="login-btn">
          Se connecter avec Google
        </button>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        user={user}
        currentChatId={currentChatId}
        onSelectChat={setCurrentChatId}
        onNewChat={setCurrentChatId}
      />

      <main className="chat-container main-content">
        <header className="chat-header">
          <h1>ChatApp</h1>
        </header>

        {currentChatId ? (
          <>
            <div className="messages-list">
              {currentChatId === 'draft' && messages.length === 0 && (
                <div className="empty-state">
                  <p>Commencez une nouvelle conversation...</p>
                </div>
              )}

              {messages.map((msg, index) => (
                <MessageBubble
                  key={msg.id || index}
                  role={msg.role}
                  content={msg.content}
                  time={msg.createdAt}
                />
              ))}

              {chatLoading && (
                <div className="message assistant">
                  <div className="message-bubble typing">
                    <span>.</span><span>.</span><span>.</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="chat-form">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez votre question..."
                disabled={chatLoading}
                className="chat-input"
              />
              <button
                type="submit"
                disabled={chatLoading || !input.trim()}
                className="chat-button"
                aria-label="Envoyer"
              >

              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <h2>Sélectionnez ou créez une conversation</h2>
          </div>
        )}
      </main>
    </div>
  );
}
