"use client";
import { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../context/SettingsContext';
import Sidebar from './Sidebar';
import MessageBubble from './MessageBubble';
import Login from './Login';

export default function Chat() {
  const { user, loading: authLoading, getToken } = useAuth();
  const { playNotification } = useSettings();
  const [currentChatId, setCurrentChatId] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const { messages, loading: chatLoading, sendMessage } = useChat(currentChatId);

  const [input, setInput] = useState('');
  const [isImageMode, setIsImageMode] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const messagesEndRef = useRef(null);
  const prevMessagesLength = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined') setIsInIframe(window.self !== window.top);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        const token = await getToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const body = {
          title: selectedAgent ? selectedAgent.name : 'Nouvelle discussion',
          agentId: selectedAgent?.id || null,
          agentName: selectedAgent?.name || null
        };
        const res = await fetch('/api/chats', {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Failed to create chat');
        const data = await res.json();
        targetChatId = data.id;
        setCurrentChatId(targetChatId);
      } catch (error) {
        console.error('Error creating chat:', error);
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
    if (isInIframe) {
      return (
        <div className="login-container">
          <h1>Bienvenue sur ChatApp</h1>
          <p>Pour des raisons de sécurité, la connexion nécessite d'ouvrir l'application en plein écran.</p>
          <button
            onClick={() => window.open(window.location.href, '_blank')}
            className="login-btn"
            style={{ justifyContent: 'center', background: 'var(--primary-color)', color: 'white', border: 'none' }}
          >
            Ouvrir dans un nouvel onglet ↗
          </button>
        </div>
      );
    }
    return <Login />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        user={user}
        currentChatId={currentChatId}
        onSelectChat={(id) => {
          setCurrentChatId(id);
          setSelectedAgent(null);
        }}
        onNewChat={(id) => {
          setCurrentChatId(id);
          setSelectedAgent(null);
        }}
        selectedAgentId={selectedAgent?.id}
        onSelectAgent={(agent) => {
          setSelectedAgent(agent);
          setCurrentChatId('draft');
        }}
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
                title={isImageMode ? 'Passer en mode Texte' : 'Passer en mode Image'}
              >
                {isImageMode ? '🎨' : '📝'}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isImageMode ? "Décrivez l'image à générer..." : 'Posez votre question...'}
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
