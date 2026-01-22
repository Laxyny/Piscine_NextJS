"use client";
import { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';

export default function Chat() {
    const { messages, loading, sendMessage } = useChat();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        sendMessage(input);
        setInput('');
    };

    return (
        <div className="chat-container">
            <header className="chat-header">
                <h1>ChatApp</h1>
            </header>
            
            <div className="messages-list">
                {messages.length === 0 && !loading && (
                    <div className="empty-state">Poser une question</div>
                )}
                
                {messages.map((msg, index) => (
                    <div key={msg.id || index} className={`message ${msg.role}`}>
                        <div className="message-bubble">
                            <div className="message-sender">
                                {msg.role === 'user' ? 'Vous' : 'Grok IA'}
                            </div>
                            <div className="message-text">{msg.content}</div>
                            <div className="message-time">
                                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}
                            </div>
                        </div>
                    </div>
                ))}
                
                {loading && (
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
                    disabled={loading}
                    className="chat-input"
                />
                <button 
                    type="submit" 
                    disabled={loading || !input.trim()}
                    className="chat-button"
                >
                    Envoyer
                </button>
            </form>
        </div>
    );
}
