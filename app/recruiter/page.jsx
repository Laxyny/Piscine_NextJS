"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../frontend/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '../../frontend/hooks/useAuth';
import { SettingsProvider } from '../../frontend/context/SettingsContext';

function RecruiterContent() {
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();

  const [view, setView] = useState('list');
  const [postings, setPostings] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ title: '', description: '', skills: '' });
  const [creating, setCreating] = useState(false);

  const [currentPosting, setCurrentPosting] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [refineInput, setRefineInput] = useState('');
  const [refining, setRefining] = useState(false);

  const [analyzingId, setAnalyzingId] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  const [editingCv, setEditingCv] = useState(false);
  const [editCvField, setEditCvField] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user]);

  const getHeaders = useCallback(async () => {
    const token = await getToken();
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, [getToken]);

  const fetchPostings = async () => {
    setListLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/recruiter/postings', { headers });
      const data = await res.json();
      if (res.ok) setPostings(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setListLoading(false); }
  };

  useEffect(() => {
    if (user) fetchPostings();
  }, [user]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.description.trim()) {
      setError('Titre et description requis.');
      return;
    }
    setCreating(true);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/recruiter/postings', {
        method: 'POST', headers,
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setForm({ title: '', description: '', skills: '' });
      setView('list');
      fetchPostings();
      loadPosting(data.id);
    } catch (e) { setError(e.message); }
    finally { setCreating(false); }
  };

  const loadPosting = async (id) => {
    setDetailLoading(true);
    setSelectedApp(null);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/recruiter/postings/${id}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setCurrentPosting(data);
        setView('detail');
      }
    } catch (e) { console.error(e); }
    finally { setDetailLoading(false); }
  };

  const togglePublish = async () => {
    if (!currentPosting) return;
    const newStatus = currentPosting.status === 'published' ? 'draft' : 'published';
    try {
      const headers = await getHeaders();
      await fetch(`/api/recruiter/postings/${currentPosting.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ status: newStatus })
      });
      setCurrentPosting(prev => ({ ...prev, status: newStatus }));
      fetchPostings();
    } catch (e) { console.error(e); }
  };

  const deletePosting = async (id) => {
    if (!confirm('Supprimer cette offre et toutes ses candidatures ?')) return;
    try {
      const headers = await getHeaders();
      await fetch(`/api/recruiter/postings/${id}`, { method: 'DELETE', headers });
      setPostings(prev => prev.filter(p => p.id !== id));
      if (currentPosting?.id === id) {
        setCurrentPosting(null);
        setView('list');
      }
    } catch (e) { console.error(e); }
  };

  const handleRefine = async (e) => {
    e.preventDefault();
    if (!refineInput.trim() || !currentPosting) return;
    setRefining(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/recruiter/postings/${currentPosting.id}/refine`, {
        method: 'POST', headers,
        body: JSON.stringify({ instruction: refineInput, referenceCv: currentPosting.referenceCv })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setCurrentPosting(prev => ({ ...prev, referenceCv: data.referenceCv }));
      setRefineInput('');
    } catch (e) { setError(e.message); }
    finally { setRefining(false); }
  };

  const saveCvManual = async () => {
    if (!currentPosting) return;
    try {
      const parsed = JSON.parse(editCvField);
      const headers = await getHeaders();
      await fetch(`/api/recruiter/postings/${currentPosting.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ referenceCv: parsed })
      });
      setCurrentPosting(prev => ({ ...prev, referenceCv: parsed }));
      setEditingCv(false);
    } catch (e) {
      setError('JSON invalide.');
    }
  };

  const analyzeCandidate = async (appId) => {
    if (!currentPosting) return;
    setAnalyzingId(appId);
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/recruiter/postings/${currentPosting.id}/analyze`, {
        method: 'POST', headers,
        body: JSON.stringify({ applicationId: appId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      const updated = { analysis: data.analysis, score: data.analysis.overallScore };
      setCurrentPosting(prev => ({
        ...prev,
        applications: prev.applications.map(a =>
          a.id === appId ? { ...a, ...updated } : a
        )
      }));
      setSelectedApp(prev => prev && prev.id === appId ? { ...prev, ...updated } : prev);
    } catch (e) { console.error(e); }
    finally { setAnalyzingId(null); }
  };

  if (authLoading || !user) return <div className="loading">Chargement...</div>;

  const refCv = currentPosting?.referenceCv || {};
  const apps = currentPosting?.applications || [];
  const sortedApps = [...apps].sort((a, b) => (b.score || 0) - (a.score || 0));

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
        <h1>Espace recruteur</h1>
        {view !== 'create' && (
          <button type="button" className="save-btn" style={{ marginLeft: 'auto' }} onClick={() => { setView('create'); setError(''); }}>
            Nouvelle offre
          </button>
        )}
      </header>

      {view === 'create' && (
        <section className="settings-section">
          <h2>Creer une offre d'emploi</h2>
          <form onSubmit={handleCreate} className="career-form">
            <div className="form-group">
              <label>Titre du poste</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Developpeur Full-Stack, Chef de projet..." />
            </div>
            <div className="form-group">
              <label>Description du poste</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Missions, responsabilites, contexte..." rows={8} />
            </div>
            <div className="form-group">
              <label>Competences recherchees</label>
              <textarea value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} placeholder="JavaScript, React, Node.js, management..." rows={3} />
            </div>
            {error && <p className="career-error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={() => { setView('list'); setError(''); }}>Annuler</button>
              <button type="submit" className="save-btn" disabled={creating}>
                {creating ? 'Creation en cours...' : 'Creer et generer le profil ideal'}
              </button>
            </div>
          </form>
        </section>
      )}

      {view === 'list' && (
        <section className="settings-section">
          <h2>Mes offres d'emploi</h2>
          {listLoading ? <p>Chargement...</p> : postings.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Aucune offre creee. Cliquez sur "Nouvelle offre" pour commencer.</p>
          ) : (
            <div className="recruiter-postings-list">
              {postings.map(p => (
                <div key={p.id} className="recruiter-posting-card" onClick={() => loadPosting(p.id)}>
                  <div className="recruiter-posting-info">
                    <h3>{p.title}</h3>
                    <p>{p.description?.slice(0, 120)}{p.description?.length > 120 ? '...' : ''}</p>
                    <div className="recruiter-posting-meta">
                      <span className={`recruiter-status ${p.status}`}>{p.status === 'published' ? 'Publiee' : 'Brouillon'}</span>
                      <span>{p.applicationCount} candidature{p.applicationCount !== 1 ? 's' : ''}</span>
                      <span>{new Date(p.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <button type="button" className="delete-btn" onClick={(e) => { e.stopPropagation(); deletePosting(p.id); }} title="Supprimer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {view === 'detail' && currentPosting && (
        <>
          <div className="recruiter-detail-header">
            <button type="button" className="cancel-btn" onClick={() => { setView('list'); setCurrentPosting(null); setSelectedApp(null); }}>Retour aux offres</button>
            <button type="button" className={`save-btn ${currentPosting.status === 'published' ? 'published' : ''}`} onClick={togglePublish}>
              {currentPosting.status === 'published' ? 'Depublier' : 'Publier l\'offre'}
            </button>
          </div>

          <section className="settings-section">
            <h2>{currentPosting.title}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>{currentPosting.description}</p>
            {currentPosting.skills && (
              <div className="recruiter-skills-tags">
                {currentPosting.skills.split(',').map((s, i) => s.trim() && (
                  <span key={i} className="recruiter-skill-tag">{s.trim()}</span>
                ))}
              </div>
            )}
          </section>

          <section className="settings-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, border: 'none', padding: 0 }}>CV de reference (profil ideal)</h2>
              <button type="button" className="cancel-btn" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                onClick={() => { setEditingCv(!editingCv); if (!editingCv) setEditCvField(JSON.stringify(currentPosting.referenceCv, null, 2)); }}>
                {editingCv ? 'Annuler' : 'Modifier manuellement'}
              </button>
            </div>

            {editingCv ? (
              <div>
                <textarea value={editCvField} onChange={e => setEditCvField(e.target.value)} rows={20}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.85rem', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-primary)', resize: 'vertical' }} />
                {error && <p className="career-error">{error}</p>}
                <button type="button" className="save-btn" style={{ marginTop: '0.75rem' }} onClick={saveCvManual}>Enregistrer</button>
              </div>
            ) : (
              <div className="recruiter-reference-cv">
                {refCv.basics && (
                  <div className="recruiter-cv-section">
                    <h3>{refCv.basics.name || 'Candidat Ideal'}</h3>
                    <p className="recruiter-cv-summary">{refCv.basics.summary}</p>
                  </div>
                )}
                {refCv.work && refCv.work.length > 0 && (
                  <div className="recruiter-cv-section">
                    <h4>Experiences</h4>
                    {refCv.work.map((w, i) => (
                      <div key={i} className="recruiter-cv-item">
                        <strong>{w.position}</strong> - {w.company}
                        <span className="recruiter-cv-dates">{w.startDate} - {w.endDate}</span>
                        {w.highlights && <ul>{w.highlights.map((h, j) => <li key={j}>{h}</li>)}</ul>}
                      </div>
                    ))}
                  </div>
                )}
                {refCv.skills && refCv.skills.length > 0 && (
                  <div className="recruiter-cv-section">
                    <h4>Competences</h4>
                    <div className="recruiter-skills-tags">
                      {refCv.skills.flatMap(s => s.keywords || []).map((k, i) => (
                        <span key={i} className="recruiter-skill-tag">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
                {refCv.education && refCv.education.length > 0 && (
                  <div className="recruiter-cv-section">
                    <h4>Formation</h4>
                    {refCv.education.map((ed, i) => (
                      <div key={i} className="recruiter-cv-item">
                        <strong>{ed.studyType} {ed.area}</strong> - {ed.institution}
                        <span className="recruiter-cv-dates">{ed.startDate} - {ed.endDate}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleRefine} className="career-refine-form" style={{ marginTop: '1rem' }}>
              <input type="text" className="career-refine-input" value={refineInput} onChange={e => setRefineInput(e.target.value)}
                placeholder="Modifier via IA (ex: ajouter 2 ans d'experience Docker, changer le niveau de formation...)" disabled={refining} />
              <button type="submit" className="career-refine-send" disabled={refining || !refineInput.trim()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </form>
          </section>

          <section className="settings-section">
            <h2>Candidatures ({sortedApps.length})</h2>
            {sortedApps.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>
                {currentPosting.status === 'published'
                  ? 'Aucune candidature pour le moment.'
                  : 'Publiez l\'offre pour recevoir des candidatures.'}
              </p>
            ) : (
              <div className="recruiter-candidates-list">
                {sortedApps.map((app, rank) => {
                  const isOpen = selectedApp?.id === app.id;
                  const a = isOpen ? selectedApp : app;
                  return (
                    <div key={app.id} className="recruiter-candidate-wrapper">
                      <div className={`recruiter-candidate-card ${isOpen ? 'active' : ''}`}
                        onClick={() => setSelectedApp(isOpen ? null : app)}>
                        <div className="recruiter-candidate-rank">#{rank + 1}</div>
                        <div className="recruiter-candidate-info">
                          <span className="recruiter-candidate-name">{app.cvData?.basics?.name || 'Candidat'}</span>
                          <span className="recruiter-candidate-summary">{app.cvData?.basics?.summary?.slice(0, 100) || 'CV soumis'}{app.cvData?.basics?.summary?.length > 100 ? '...' : ''}</span>
                        </div>
                        <div className="recruiter-candidate-actions">
                          {app.score !== null && app.score !== undefined ? (
                            <span className={`recruiter-candidate-score ${app.score >= 70 ? 'high' : app.score >= 50 ? 'medium' : 'low'}`}>{app.score}%</span>
                          ) : (
                            <button type="button" className="save-btn" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                              disabled={analyzingId === app.id}
                              onClick={(e) => { e.stopPropagation(); analyzeCandidate(app.id); }}>
                              {analyzingId === app.id ? 'Analyse...' : 'Analyser'}
                            </button>
                          )}
                        </div>
                      </div>

                      {isOpen && (
                        <div className="recruiter-candidate-detail">
                          {a.cvData && (
                            <div className="recruiter-candidate-cv-preview">
                              <h4>Profil du candidat</h4>
                              {a.cvData.basics?.summary && (
                                <p className="recruiter-cv-summary">{a.cvData.basics.summary}</p>
                              )}
                              {a.cvData.work && a.cvData.work.length > 0 && (
                                <div className="recruiter-cv-section">
                                  <h4>Experiences</h4>
                                  {a.cvData.work.map((w, i) => (
                                    <div key={i} className="recruiter-cv-item">
                                      <strong>{w.position}</strong> - {w.company}
                                      <span className="recruiter-cv-dates">{w.startDate} - {w.endDate}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {a.cvData.skills && a.cvData.skills.length > 0 && (
                                <div className="recruiter-cv-section">
                                  <h4>Competences</h4>
                                  <div className="recruiter-skills-tags">
                                    {a.cvData.skills.flatMap(s => s.keywords || []).map((k, i) => (
                                      <span key={i} className="recruiter-skill-tag">{k}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {a.cvData.education && a.cvData.education.length > 0 && (
                                <div className="recruiter-cv-section">
                                  <h4>Formation</h4>
                                  {a.cvData.education.map((ed, i) => (
                                    <div key={i} className="recruiter-cv-item">
                                      <strong>{ed.studyType} {ed.area}</strong> - {ed.institution}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {!a.analysis && (
                            <div className="recruiter-no-analysis">
                              <p>Aucune analyse effectuee pour ce candidat.</p>
                              <button type="button" className="save-btn" disabled={analyzingId === a.id}
                                onClick={() => analyzeCandidate(a.id)}>
                                {analyzingId === a.id ? 'Analyse en cours...' : 'Lancer l\'analyse'}
                              </button>
                            </div>
                          )}

                          {a.analysis && (
                            <div className="recruiter-analysis-detail">
                              <div className="recruiter-analysis-header">
                                <div className="recruiter-analysis-left">
                                  <span className={`recruiter-verdict ${a.analysis.verdict}`}>
                                    {a.analysis.verdict === 'recommande' && 'Recommande'}
                                    {a.analysis.verdict === 'a_considerer' && 'A considerer'}
                                    {a.analysis.verdict === 'non_retenu' && 'Non retenu'}
                                  </span>
                                  <p className="recruiter-analysis-feedback">{a.analysis.globalFeedback}</p>
                                </div>
                                <div className="quiz-score-circle" data-percentage={a.analysis.overallScore}>
                                  <svg viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="52" className="quiz-score-bg" />
                                    <circle cx="60" cy="60" r="52" className="quiz-score-fill"
                                      style={{ strokeDasharray: `${(a.analysis.overallScore / 100) * 327} 327` }} />
                                  </svg>
                                  <div className="quiz-score-value">
                                    <span className="quiz-score-number">{a.analysis.overallScore}%</span>
                                    <span className="quiz-score-label">compatibilite</span>
                                  </div>
                                </div>
                              </div>

                              {a.analysis.categories && (
                                <div className="analysis-categories">
                                  {a.analysis.categories.map((cat, i) => (
                                    <div key={i} className="analysis-category">
                                      <div className="analysis-category-header">
                                        <span className="analysis-category-name">{cat.name}</span>
                                        <span className="analysis-category-score">{cat.score}%</span>
                                      </div>
                                      <div className="analysis-bar">
                                        <div className={`analysis-bar-fill ${cat.score >= 70 ? 'high' : cat.score >= 40 ? 'medium' : 'low'}`}
                                          style={{ width: `${cat.score}%` }} />
                                      </div>
                                      <p className="analysis-category-detail">{cat.details}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {a.analysis.skillsMatch && a.analysis.skillsMatch.length > 0 && (
                                <div className="recruiter-analysis-section">
                                  <h4>Adequation des competences</h4>
                                  <div className="analysis-skills-grid">
                                    {a.analysis.skillsMatch.map((s, i) => (
                                      <div key={i} className={`analysis-skill-card ${s.status}`}>
                                        <div className="analysis-skill-header">
                                          <span className="analysis-skill-name">{s.skill}</span>
                                          <span className={`analysis-skill-badge ${s.status}`}>
                                            {s.status === 'match' && 'OK'}
                                            {s.status === 'partial' && 'Partiel'}
                                            {s.status === 'missing' && 'Absent'}
                                          </span>
                                        </div>
                                        <p className="analysis-skill-detail">{s.detail}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {a.analysis.experienceMatch && (
                                <div className="recruiter-analysis-section">
                                  <h4>Experience</h4>
                                  <div className="recruiter-exp-grid">
                                    <div className="recruiter-exp-item">
                                      <span className="recruiter-exp-label">Requis (ideal)</span>
                                      <span className="recruiter-exp-value">{a.analysis.experienceMatch.requiredYears}</span>
                                    </div>
                                    <div className="recruiter-exp-item">
                                      <span className="recruiter-exp-label">Candidat</span>
                                      <span className="recruiter-exp-value">{a.analysis.experienceMatch.candidateYears}</span>
                                    </div>
                                  </div>
                                  {a.analysis.experienceMatch.relevantExperiences && a.analysis.experienceMatch.relevantExperiences.length > 0 && (
                                    <ul className="recruiter-exp-list good">
                                      {a.analysis.experienceMatch.relevantExperiences.map((x, i) => <li key={i}>{x}</li>)}
                                    </ul>
                                  )}
                                  {a.analysis.experienceMatch.gaps && a.analysis.experienceMatch.gaps.length > 0 && (
                                    <ul className="recruiter-exp-list bad">
                                      {a.analysis.experienceMatch.gaps.map((x, i) => <li key={i}>{x}</li>)}
                                    </ul>
                                  )}
                                </div>
                              )}

                              <div className="recruiter-analysis-columns">
                                {a.analysis.strengths && a.analysis.strengths.length > 0 && (
                                  <div className="recruiter-analysis-col good">
                                    <h4>Points forts</h4>
                                    <ul>{a.analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                  </div>
                                )}
                                {a.analysis.weaknesses && a.analysis.weaknesses.length > 0 && (
                                  <div className="recruiter-analysis-col bad">
                                    <h4>Points faibles</h4>
                                    <ul>{a.analysis.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function RecruiterPage() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <RecruiterContent />
      </AuthProvider>
    </SettingsProvider>
  );
}
