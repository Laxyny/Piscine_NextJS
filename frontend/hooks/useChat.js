import { useState, useEffect, useRef } from 'react';

export function useChat(chatId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load messages when chatId changes
  useEffect(() => {
    if (!chatId) {
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

  const sendMessage = async (content) => {
    if (!content.trim() || !chatId) return;

    // Optimistic update
    const tempId = Date.now();
    const userMsg = { id: tempId, content, role: 'user', createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, chatId }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const aiMsg = await res.json();
      
      // Update with real data
      await fetchMessages(chatId);
      return aiMsg; // Return AI message to trigger sound if needed

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
