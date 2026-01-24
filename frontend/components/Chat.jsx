"use client";
import { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import Sidebar from './Sidebar';
import MessageBubble from './MessageBubble';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../backend/lib/db';

export default function Chat() {
  const { user, loading: authLoading, login, loginWithGithub } = useAuth();
  const { playNotification } = useSettings();
  const [currentChatId, setCurrentChatId] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const { messages, loading: chatLoading, sendMessage } = useChat(currentChatId);

  const [input, setInput] = useState('');
  const [isImageMode, setIsImageMode] = useState(false);
  const messagesEndRef = useRef(null);
  const prevMessagesLength = useRef(0);

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
        const chatData = {
          userId: user.uid,
          createdAt: serverTimestamp(),
          title: "Nouvelle discussion"
        };
        
        if (selectedAgent) {
          chatData.agentId = selectedAgent.id;
          chatData.agentName = selectedAgent.name;
          chatData.title = selectedAgent.name; // Use agent name as initial title
        }

        const docRef = await addDoc(collection(db, "chats"), chatData);
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
    await sendMessage(msgContent, targetChatId, isImageMode ? 'image' : 'text');
  };

  if (authLoading) return <div className="loading">Chargement...</div>;

  if (!user) {
    return (
      <div className="login-container">
        <h1>Bienvenue sur ChatApp</h1>
        <p>Connectez-vous pour sauvegarder vos conversations.</p>
        <div className="login-buttons">
          <button onClick={login} className="login-btn google">
            <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.734 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
              </g>
            </svg>
            Continuer avec Google
          </button>
          <button onClick={loginWithGithub} className="login-btn github">
            <svg height="24" viewBox="0 0 16 16" version="1.1" width="24" aria-hidden="true">
              <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            Continuer avec GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar
        user={user}
        currentChatId={currentChatId}
        onSelectChat={(id) => { setCurrentChatId(id); setSelectedAgent(null); }}
        onNewChat={(id) => { setCurrentChatId(id); setSelectedAgent(null); }}
        selectedAgentId={selectedAgent?.id}
        onSelectAgent={(agent) => { setSelectedAgent(agent); setCurrentChatId('draft'); }}
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
                  type={msg.type}
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
              <button
                type="button"
                onClick={() => setIsImageMode(!isImageMode)}
                className={`mode-toggle-btn ${isImageMode ? 'active' : ''}`}
                title={isImageMode ? "Passer en mode Texte" : "Passer en mode Image"}
              >
                {isImageMode ? '🎨' : '📝'}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isImageMode ? "Décrivez l'image à générer..." : "Posez votre question..."}
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
