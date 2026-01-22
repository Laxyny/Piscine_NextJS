import { useState, useEffect, useRef } from 'react';

export function useChat(chatId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chatId || chatId === 'draft') {
      setMessages([]);
      return;
    }
    fetchMessages(chatId);
  }, [chatId]);

  const fetchMessages = async (id) => {
    try {
      const res = await fetch(`/api/chat?chatId=${id}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
      setError('Could not load messages');
    }
  };

  const sendMessage = async (content, overrideChatId = null) => {
    const targetChatId = overrideChatId || chatId;
    if (!content.trim() || !targetChatId) return;

    const tempId = Date.now();
    const userMsg = { id: tempId, content, role: 'user', createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, chatId: targetChatId }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const aiMsg = await res.json();
      
      await fetchMessages(targetChatId);
      return aiMsg;

    } catch (err) {
      console.error(err);
      setError('Failed to send message');
      setMessages((prev) => prev.filter(m => m.id !== tempId));
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
  };
}
