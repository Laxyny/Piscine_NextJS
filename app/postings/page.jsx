"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../frontend/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '../../frontend/hooks/useAuth';
import { SettingsProvider } from '../../frontend/context/SettingsContext';

function PostingsContent() {
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();

  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [cvText, setCvText] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user]);

  const getHeaders = useCallback(async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  useEffect(() => {
    const load = async () => {
      try {
        const headers = await getHeaders();
        const res = await fetch('/api/postings', { headers });
        const data = await res.json();
        if (res.ok) setPostings(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    if (user) load();
  }, [user]);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setError('');
    setSuccess('');
    if (!cvFile && !cvText.trim()) {
      setError('Fournissez votre CV (PDF ou texte).');
      return;
    }
    setApplying(true);
    try {
      const headers = await getHeaders();
      const fd = new FormData();
      if (cvFile) fd.set('cvFile', cvFile);
      if (cvText.trim()) fd.set('cvText', cvText.trim());
      const res = await fetch(`/api/postings/${selected.id}/apply`, {
        method: 'POST', headers, body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setSuccess('Candidature envoyee avec succes.');
      setCvFile(null);
      setCvText('');
    } catch (e) { setError(e.message); }
    finally { setApplying(false); }
  };

  if (authLoading || !user) return <div className="loading">Chargement...</div>;

  return (
    <div className="settings-container career-page-container">
      <header className="settings-header">
        <Link href="/" className="back-link">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Retour
        </Link>
        <h1>Offres d'emploi</h1>
      </header>

      {!selected ? (
        <section className="settings-section">
          <h2>Offres disponibles</h2>
          {loading ? <p>Chargement...</p> : postings.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Aucune offre disponible pour le moment.</p>
          ) : (
            <div className="postings-list">
              {postings.map(p => (
                <div key={p.id} className="posting-card" onClick={() => { setSelected(p); setError(''); setSuccess(''); }}>
                  <h3>{p.title}</h3>
                  <p>{p.description?.slice(0, 200)}{p.description?.length > 200 ? '...' : ''}</p>
                  {p.skills && (
                    <div className="recruiter-skills-tags">
                      {p.skills.split(',').map((s, i) => s.trim() && (
                        <span key={i} className="recruiter-skill-tag">{s.trim()}</span>
                      ))}
                    </div>
                  )}
                  <span className="posting-date">
                    {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <button type="button" className="cancel-btn" style={{ marginBottom: '1rem' }} onClick={() => { setSelected(null); setError(''); setSuccess(''); }}>
            Retour aux offres
          </button>

          <section className="settings-section">
            <h2>{selected.title}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>{selected.description}</p>
            {selected.skills && (
              <div className="recruiter-skills-tags" style={{ marginTop: '1rem' }}>
                {selected.skills.split(',').map((s, i) => s.trim() && (
                  <span key={i} className="recruiter-skill-tag">{s.trim()}</span>
                ))}
              </div>
            )}
          </section>

          <section className="settings-section">
            <h2>Postuler</h2>
            {success ? (
              <div className="posting-success">
                <p>{success}</p>
                <button type="button" className="save-btn" onClick={() => { setSelected(null); setSuccess(''); }}>Retour aux offres</button>
              </div>
            ) : (
              <form onSubmit={handleApply} className="career-form">
                <div className="form-group">
                  <label>Mon CV (PDF)</label>
                  <input type="file" accept=".pdf,application/pdf" onChange={e => setCvFile(e.target.files?.[0] || null)} className="career-file-input" />
                </div>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>OU collez le texte de votre CV</label>
                  <textarea value={cvText} onChange={e => setCvText(e.target.value)} placeholder="Collez ici le texte de votre CV..." rows={8} />
                </div>
                {error && <p className="career-error">{error}</p>}
                <button type="submit" className="save-btn" disabled={applying} style={{ marginTop: '1rem' }}>
                  {applying ? 'Envoi en cours...' : 'Envoyer ma candidature'}
                </button>
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function PostingsPage() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <PostingsContent />
      </AuthProvider>
    </SettingsProvider>
  );
}
