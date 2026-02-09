"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AgentsModal from './AgentsModal';
import { getDisplayName, getInitials } from '../utils/displayName';
import { useAuth } from '../hooks/useAuth';

export default function Sidebar({ user, currentChatId, onSelectChat, onNewChat, selectedAgentId, onSelectAgent }) {
  const { getToken } = useAuth();
  const [chats, setChats] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [showAgentsModal, setShowAgentsModal] = useState(false);

  const authHeaders = async () => {
    const token = await getToken();
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };

  const fetchChats = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/chats', { headers: await authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setChats(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }
    fetchChats();
  }, [user, currentChatId]);

  const handleNewChat = () => {
    onNewChat('draft');
  };

  const startEditing = (e, chat) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const saveTitle = async (id) => {
    try {
      const res = await fetch(`/api/chat/${id}`, {
        method: 'PATCH',
        headers: await authHeaders(),
        body: JSON.stringify({ title: editTitle })
      });
      if (res.ok) {
        setEditingId(null);
        fetchChats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteChat = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Voulez-vous vraiment supprimer cette conversation ?')) return;

    try {
      const res = await fetch(`/api/chat/${id}`, { method: 'DELETE', headers: await authHeaders() });
      if (res.ok) {
        if (currentChatId === id) onSelectChat(null);
        fetchChats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button onClick={handleNewChat} className="new-chat-btn">
          + Nouvelle discussion
        </button>
        <button onClick={() => setShowAgentsModal(true)} className="new-chat-btn" style={{ marginTop: '0.5rem', background: 'transparent', border: '1px dashed #ccc' }}>
          Mes GPTs
        </button>
      </div>

      {showAgentsModal && (
        <AgentsModal
          user={user}
          onClose={() => setShowAgentsModal(false)}
          onSelectAgent={(agent) => {
            onSelectAgent(agent);
            setShowAgentsModal(false);
          }}
        />
      )}

      <div className="chat-list">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`chat-item ${currentChatId === chat.id ? 'active' : ''} ${chat.agentId ? 'agent-chat' : ''}`}
            onClick={() => onSelectChat(chat.id)}
          >
            {editingId === chat.id ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => saveTitle(chat.id)}
                onKeyDown={(e) => e.key === 'Enter' && saveTitle(chat.id)}
                autoFocus
                className="rename-input"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="chat-item-content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                  {chat.agentId && <span className="agent-badge">𝕏</span>}
                  <span className="chat-title">{chat.title || 'Discussion sans titre'}</span>
                </div>
                <div className="chat-actions">
                  {currentChatId === chat.id && (
                    <>
                      <button className="edit-btn" onClick={(e) => startEditing(e, chat)} title="Renommer">✎</button>
                      <button className="delete-btn" onClick={(e) => deleteChat(e, chat.id)} title="Supprimer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <Link href="/career" className="settings-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>Assistant carrière</span>
        </Link>
        <Link href="/settings" className="settings-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Paramètres</span>
        </Link>
        <div className="user-profile">
          {user?.photoURL ? (
            <img src={user.photoURL} alt={getDisplayName(user)} className="user-avatar" />
          ) : (
            <span className="user-avatar user-avatar-initials">{getInitials(getDisplayName(user))}</span>
          )}
          <span className="user-name">{getDisplayName(user)}</span>
        </div>
      </div>
    </aside>
  );
}
