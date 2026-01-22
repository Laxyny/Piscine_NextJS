"use client";
import { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import Link from 'next/link';

export default function Sidebar({ user, currentChatId, onSelectChat, onNewChat }) {
  const [chats, setChats] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const db = getFirestore(getApp());

  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }

    const q = query(
      collection(db, "chats"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChats(chatList);
    });

    return () => unsubscribe();
  }, [user]);

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
      await fetch(`/api/chat/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: editTitle })
      });
      setEditingId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteChat = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Voulez-vous vraiment supprimer cette conversation ?')) return;

    try {
      await fetch(`/api/chat/${id}`, {
        method: 'DELETE'
      });
      if (currentChatId === id) onSelectChat(null);
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
      </div>
      <div className="chat-list">
        {chats.map(chat => (
          <div
            key={chat.id}
            className={`chat-item ${currentChatId === chat.id ? 'active' : ''}`}
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
                <span className="chat-title">{chat.title || "Discussion sans titre"}</span>
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
        <Link href="/settings" className="settings-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Paramètres</span>
        </Link>
        <div className="user-profile">
          <img src={user?.photoURL} alt={user?.displayName} className="user-avatar" />
          <span className="user-name">{user?.displayName}</span>
        </div>
      </div>
    </aside>
  );
}
