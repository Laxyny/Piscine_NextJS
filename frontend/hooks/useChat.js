import { useState, useEffect } from 'react';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/chat');
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error(err);
      setError('Could not load messages');
    }
  };

  const sendMessage = async (content) => {
    if (!content.trim()) return;
    
    const tempId = Date.now();
    const userMsg = { id: tempId, content, role: 'user', createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const aiMsg = await res.json();
    
      await fetchMessages();

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
