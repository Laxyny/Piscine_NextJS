"use client";
import { useState, useEffect } from 'react';

export default function AgentsModal({ user, onClose, onSelectAgent }) {
  const [agents, setAgents] = useState([]);
  const [view, setView] = useState('list'); // 'list' or 'edit'
  const [editingAgent, setEditingAgent] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', systemPrompt: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, [user]);

  const fetchAgents = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/agents?userId=${user.uid}`);
      const data = await res.json();
      setAgents(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingAgent ? `/api/agents/${editingAgent.id}` : '/api/agents';
      const method = editingAgent ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, userId: user.uid })
      });

      if (res.ok) {
        await fetchAgents();
        setView('list');
        setEditingAgent(null);
        setFormData({ name: '', description: '', systemPrompt: '' });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Supprimer cet assistant ?')) return;
    
    try {
      await fetch(`/api/agents/${id}`, { method: 'DELETE' });
      fetchAgents();
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (agent) => {
    setEditingAgent(agent);
    setFormData({ 
      name: agent.name, 
      description: agent.description, 
      systemPrompt: agent.systemPrompt 
    });
    setView('edit');
  };

  const startCreate = () => {
    setEditingAgent(null);
    setFormData({ name: '', description: '', systemPrompt: '' });
    setView('edit');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{view === 'list' ? 'Mes GPTs personnalisés' : (editingAgent ? 'Modifier le GPT' : 'Nouveau GPT')}</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          {view === 'list' ? (
            <div className="agents-list">
              <button className="create-agent-btn" onClick={startCreate}>
                + Créer un nouveau GPT
              </button>
              
              {agents.length === 0 ? (
                <p className="empty-agents">Aucun GPT personnalisé pour le moment.</p>
              ) : (
                <div className="agents-grid">
                  {agents.map(agent => (
                    <div key={agent.id} className="agent-card" onClick={() => onSelectAgent(agent)}>
                      <div className="agent-info">
                        <h3>{agent.name}</h3>
                        <p>{agent.description}</p>
                      </div>
                      <div className="agent-actions">
                        <button onClick={(e) => { e.stopPropagation(); startEdit(agent); }} className="edit-btn" title="Modifier">✎</button>
                        <button onClick={(e) => handleDelete(e, agent.id)} className="delete-btn" title="Supprimer">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="agent-form">
              <div className="form-group">
                <label>Nom</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required 
                  placeholder="Ex: Expert Python"
                />
              </div>
              
              <div className="form-group">
                <label>Description (optionnel)</label>
                <input 
                  type="text" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Une courte description..."
                />
              </div>

              <div className="form-group">
                <label>Instructions (System Prompt)</label>
                <textarea 
                  value={formData.systemPrompt} 
                  onChange={e => setFormData({...formData, systemPrompt: e.target.value})}
                  required
                  placeholder="Tu es un expert en..."
                  rows={6}
                />
                <small>C'est ici que vous définissez la personnalité et les règles de votre assistant.</small>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setView('list')} className="cancel-btn">Annuler</button>
                <button type="submit" className="save-btn" disabled={loading}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
