import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export function useChat(chatId) {
  const { getToken } = useAuth();
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

  const authHeaders = async () => {
    const token = await getToken();
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const fetchMessages = async (id) => {
    try {
      const res = await fetch(`/api/chat?chatId=${id}`, { headers: await authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
      setError('Could not load messages');
    }
  };

  const sendMessage = async (content, overrideChatId = null, mode = 'text') => {
    const targetChatId = overrideChatId || chatId;
    if (!content.trim() || !targetChatId) return;

    const tempId = Date.now();
    const userMsg = { 
        id: tempId, 
        content, 
        role: 'user', 
        type: 'text',
        createdAt: new Date().toISOString() 
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ content, chatId: targetChatId, mode }),
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
