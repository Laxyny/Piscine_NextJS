"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../frontend/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '../../frontend/hooks/useAuth';
import { SettingsProvider } from '../../frontend/context/SettingsContext';
import ReactMarkdown from 'react-markdown';
import { CV_TEMPLATES } from '../../frontend/components/career/CvTemplates';
import { LETTER_TEMPLATES } from '../../frontend/components/career/LetterTemplates';
import { CvEditor, LettreEditor } from '../../frontend/components/career/CareerEditor';

function tryParseJson(str) {
  if (!str) return null;
  try {
    const parsed = JSON.parse(str);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
    return null;
  } catch { return null; }
}

function formatHistoryLabel(item) {
  if (item.profile?.customTitle) return item.profile.customTitle;
  const p = item.profile || {};
  const poste = p.poste || p.formation || p.nom;
  const date = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  return poste ? `${poste} – ${date}` : (date || item.id?.slice(0, 8));
}

function CareerContent() {
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState('cv');
  const [form, setForm] = useState({ nom: '', formation: '', experiences: '', competences: '', poste: '', offreEmploi: '' });
  const [cvFile, setCvFile] = useState(null);
  const [cvText, setCvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzeFile, setAnalyzeFile] = useState(null);
  const [analyzeCvText, setAnalyzeCvText] = useState('');
  const [analyzeOfferText, setAnalyzeOfferText] = useState('');
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const [refineInput, setRefineInput] = useState('');
  const [refineLoading, setRefineLoading] = useState(false);
  const [refineMessages, setRefineMessages] = useState([]);

  const [cvTemplateId, setCvTemplateId] = useState('moderne');
  const [letterTemplateId, setLetterTemplateId] = useState('formelle');
  const [viewTab, setViewTab] = useState('cv');
  const [showEditor, setShowEditor] = useState(false);
  const [editorTab, setEditorTab] = useState('cv');

  const cvPreviewRef = useRef(null);
  const lettrePreviewRef = useRef(null);
  const refineEndRef = useRef(null);

  const cvData = result ? tryParseJson(result.cv) : null;
  const lettreData = result ? tryParseJson(result.lettre) : null;
  const isJsonMode = !!(cvData || lettreData);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/');
  }, [authLoading, user]);

  const getHeaders = useCallback(async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch('/api/career', { headers });
      const data = await res.json();
      if (res.ok) setHistory(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  };

  const openHistory = () => {
    if (!showHistory) fetchHistory();
    setShowHistory(!showHistory);
  };

  const selectHistoryItem = (item) => {
    setResult({ id: item.id, cv: item.cv, lettre: item.lettre, suggestions: item.suggestions });
    setRefineMessages([]);
    setShowHistory(false);
  };

  const deleteGeneration = async (id) => {
    try {
      const headers = await getHeaders();
      const res = await fetch(`/api/career/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        setHistory(prev => prev.filter(item => item.id !== id));
        if (result?.id === id) { setResult(null); setRefineMessages([]); }
      }
    } catch (e) { console.error(e); }
  };

  const startRename = (item) => { setEditingId(item.id); setEditTitle(formatHistoryLabel(item)); };

  const saveRename = async (id) => {
    if (!editTitle.trim()) { setEditingId(null); return; }
    try {
      const headers = await getHeaders();
      headers['Content-Type'] = 'application/json';
      const res = await fetch(`/api/career/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ title: editTitle.trim() }) });
      if (res.ok) {
        setHistory(prev => prev.map(item => item.id === id ? { ...item, profile: { ...item.profile, customTitle: editTitle.trim() } } : item));
      }
    } catch (e) { console.error(e); }
    finally { setEditingId(null); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setRefineMessages([]);
    if (mode === 'cv') {
      if (!cvFile && !cvText.trim()) { setError('Choisissez un fichier CV (PDF) ou collez le texte de votre CV.'); return; }
    } else {
      const hasForm = [form.nom, form.formation, form.experiences, form.competences, form.poste].some(v => v && String(v).trim().length > 0);
      if (!hasForm) { setError('Renseignez au moins un champ.'); return; }
    }
    setLoading(true);
    try {
      const headers = await getHeaders();
      if (mode === 'cv') {
        const fd = new FormData();
        fd.set('mode', 'cv');
        fd.set('offreEmploi', form.offreEmploi || '');
        if (cvFile) fd.set('cvFile', cvFile);
        if (cvText.trim()) fd.set('cvText', cvText.trim());
        const res = await fetch('/api/career', { method: 'POST', headers, body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        setResult(data);
      } else {
        headers['Content-Type'] = 'application/json';
        const res = await fetch('/api/career', { method: 'POST', headers, body: JSON.stringify({ mode: 'form', ...form }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        setResult(data);
      }
    } catch (e) { setError(e.message || 'Erreur lors de la generation.'); }
    finally { setLoading(false); }
  };

  const handleRefine = async (e) => {
    e.preventDefault();
    if (!refineInput.trim() || !result) return;
    const instruction = refineInput.trim();
    setRefineInput('');
    setRefineMessages(prev => [...prev, { role: 'user', content: instruction }]);
    setRefineLoading(true);
    try {
      const headers = await getHeaders();
      headers['Content-Type'] = 'application/json';
      const res = await fetch('/api/career/refine', {
        method: 'POST', headers,
        body: JSON.stringify({ generationId: result.id, cv: result.cv, lettre: result.lettre, instruction })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setResult(prev => ({ ...prev, cv: data.cv, lettre: data.lettre }));
      setRefineMessages(prev => [...prev, { role: 'assistant', content: 'Modifications appliquees.' }]);
    } catch (e) {
      setRefineMessages(prev => [...prev, { role: 'assistant', content: `Erreur : ${e.message}` }]);
    } finally {
      setRefineLoading(false);
      setTimeout(() => refineEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleCvDataChange = useCallback((newData) => {
    if (!result) return;
    const newCv = JSON.stringify(newData);
    setResult(prev => ({ ...prev, cv: newCv }));
    (async () => {
      try {
        const headers = await getHeaders();
        headers['Content-Type'] = 'application/json';
        await fetch(`/api/career/${result.id}`, { method: 'PATCH', headers, body: JSON.stringify({ cv: newCv }) });
      } catch (e) { console.error(e); }
    })();
  }, [result?.id, getHeaders]);

  const handleLettreDataChange = useCallback((newData) => {
    if (!result) return;
    const newLettre = JSON.stringify(newData);
    setResult(prev => ({ ...prev, lettre: newLettre }));
    (async () => {
      try {
        const headers = await getHeaders();
        headers['Content-Type'] = 'application/json';
        await fetch(`/api/career/${result.id}`, { method: 'PATCH', headers, body: JSON.stringify({ lettre: newLettre }) });
      } catch (e) { console.error(e); }
    })();
  }, [result?.id, getHeaders]);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setError('');
    setAnalysisResult(null);
    if (!analyzeFile && !analyzeCvText.trim()) {
      setError('Fournissez votre CV (PDF ou texte).');
      return;
    }
    if (!analyzeOfferText.trim()) {
      setError("Collez le texte de l'offre d'emploi.");
      return;
    }
    setAnalyzeLoading(true);
    try {
      const headers = await getHeaders();
      const fd = new FormData();
      fd.set('offerText', analyzeOfferText.trim());
      if (analyzeFile) fd.set('cvFile', analyzeFile);
      if (analyzeCvText.trim()) fd.set('cvText', analyzeCvText.trim());
      const res = await fetch('/api/career/analyze', { method: 'POST', headers, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setAnalysisResult(data.analysis);
    } catch (e) { setError(e.message || "Erreur lors de l'analyse."); }
    finally { setAnalyzeLoading(false); }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setAnalyzeFile(null);
    setAnalyzeCvText('');
    setAnalyzeOfferText('');
    setError('');
  };

  const downloadPdf = async (ref, filename) => {
    if (!ref?.current) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(ref.current).save();
    } catch (e) { console.error(e); }
  };

  if (authLoading || !user) return <div className="loading">Chargement...</div>;

  const CvTpl = CV_TEMPLATES.find(t => t.id === cvTemplateId)?.component || CV_TEMPLATES[0].component;
  const LetterTpl = LETTER_TEMPLATES.find(t => t.id === letterTemplateId)?.component || LETTER_TEMPLATES[0].component;

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
        <h1>Assistant de carriere</h1>
        <button type="button" onClick={openHistory} className="save-btn" style={{ marginLeft: 'auto' }}>
          {showHistory ? "Masquer l'historique" : "Voir l'historique"}
        </button>
      </header>

      {showHistory && (
        <section className="settings-section career-history">
          <h2>Generations precedentes</h2>
          {historyLoading ? <p className="loading">Chargement...</p> : history.length === 0 ? <p>Aucune generation enregistree.</p> : (
            <ul className="career-history-list">
              {history.map(item => (
                <li key={item.id}>
                  {editingId === item.id ? (
                    <div className="career-history-edit">
                      <input type="text" className="rename-input" value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveRename(item.id); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus />
                      <button type="button" className="save-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => saveRename(item.id)}>OK</button>
                      <button type="button" className="cancel-btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => setEditingId(null)}>Annuler</button>
                    </div>
                  ) : (
                    <div className="career-history-item-row">
                      <button type="button" className="career-history-item" onClick={() => selectHistoryItem(item)}>{formatHistoryLabel(item)}</button>
                      <div className="career-history-actions">
                        <button type="button" className="edit-btn" title="Renommer" onClick={() => startRename(item)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button type="button" className="delete-btn" title="Supprimer" onClick={() => deleteGeneration(item.id)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!result && !analysisResult && (
        <section className="settings-section">
          <h2>Comment souhaitez-vous proceder ?</h2>
          <div className="career-mode-toggle">
            <button type="button" className={mode === 'cv' ? 'save-btn' : 'career-mode-btn'} onClick={() => { setMode('cv'); setError(''); }}>J'envoie mon CV (PDF)</button>
            <button type="button" className={mode === 'form' ? 'save-btn' : 'career-mode-btn'} onClick={() => { setMode('form'); setError(''); setCvFile(null); setCvText(''); }}>Je remplis le formulaire</button>
            <button type="button" className={mode === 'analyze' ? 'save-btn' : 'career-mode-btn'} onClick={() => { setMode('analyze'); setError(''); }}>Analyser CV vs Offre</button>
          </div>

          {mode === 'analyze' ? (
            <form onSubmit={handleAnalyze} className="career-form">
              <div className="form-group">
                <label>Mon CV (PDF)</label>
                <input type="file" accept=".pdf,application/pdf" onChange={e => setAnalyzeFile(e.target.files?.[0] || null)} className="career-file-input" />
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>OU collez le texte de votre CV</label>
                <textarea value={analyzeCvText} onChange={e => setAnalyzeCvText(e.target.value)} placeholder="Collez ici le texte de votre CV..." rows={8} />
              </div>
              <div className="form-group">
                <label>Offre d'emploi</label>
                <textarea value={analyzeOfferText} onChange={e => setAnalyzeOfferText(e.target.value)} placeholder="Collez ici le texte complet de l'offre d'emploi..." rows={6} />
              </div>
              {error && <p className="career-error">{error}</p>}
              <button type="submit" className="save-btn" disabled={analyzeLoading} style={{ marginTop: '1rem' }}>
                {analyzeLoading ? 'Analyse en cours...' : 'Lancer l\'analyse'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="career-form">
              {mode === 'cv' ? (
                <>
                  <div className="form-group">
                    <label>Mon CV (PDF) - optionnel</label>
                    <input type="file" accept=".pdf,application/pdf" onChange={e => setCvFile(e.target.files?.[0] || null)} className="career-file-input" />
                  </div>
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>OU collez le texte de votre CV</label>
                    <textarea value={cvText} onChange={e => setCvText(e.target.value)} placeholder="Collez ici le texte de votre CV..." rows={8} />
                  </div>
                  <div className="form-group">
                    <label>Offre d'emploi - optionnel</label>
                    <textarea value={form.offreEmploi} onChange={e => setForm({ ...form, offreEmploi: e.target.value })} placeholder="Collez ici le texte de l'offre d'emploi..." rows={5} />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group"><label>Nom</label><input type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Prenom Nom" /></div>
                  <div className="form-group"><label>Formation</label><input type="text" value={form.formation} onChange={e => setForm({ ...form, formation: e.target.value })} placeholder="Diplomes, ecoles..." /></div>
                  <div className="form-group"><label>Experiences</label><textarea value={form.experiences} onChange={e => setForm({ ...form, experiences: e.target.value })} placeholder="Postes, dates, missions..." rows={4} /></div>
                  <div className="form-group"><label>Competences</label><textarea value={form.competences} onChange={e => setForm({ ...form, competences: e.target.value })} placeholder="Competences techniques..." rows={3} /></div>
                  <div className="form-group"><label>Poste vise</label><input type="text" value={form.poste} onChange={e => setForm({ ...form, poste: e.target.value })} placeholder="Developpeur, Chef de projet..." /></div>
                  <div className="form-group"><label>Offre d'emploi - optionnel</label><textarea value={form.offreEmploi} onChange={e => setForm({ ...form, offreEmploi: e.target.value })} placeholder="Collez ici l'offre d'emploi..." rows={5} /></div>
                </>
              )}
              {error && <p className="career-error">{error}</p>}
              <button type="submit" className="save-btn" disabled={loading} style={{ marginTop: '1rem' }}>
                {loading ? 'Generation en cours...' : 'Generer CV et lettre'}
              </button>
            </form>
          )}
        </section>
      )}

      {analysisResult && (
        <>
          <section className="settings-section analysis-header">
            <div className="analysis-top-row">
              <div>
                <h2 style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '0.25rem' }}>{analysisResult.jobTitle || 'Analyse de pertinence'}</h2>
                {analysisResult.company && <p className="analysis-company">{analysisResult.company}</p>}
                {analysisResult.candidateName && <p className="analysis-candidate">{analysisResult.candidateName}</p>}
              </div>
              <div className="quiz-score-circle" data-percentage={analysisResult.overallScore}>
                <svg viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" className="quiz-score-bg" />
                  <circle cx="60" cy="60" r="52" className="quiz-score-fill"
                    style={{ strokeDasharray: `${(analysisResult.overallScore / 100) * 327} 327` }} />
                </svg>
                <div className="quiz-score-value">
                  <span className="quiz-score-number">{analysisResult.overallScore}%</span>
                  <span className="quiz-score-label">pertinence</span>
                </div>
              </div>
            </div>

            <p className="analysis-global-feedback">{analysisResult.globalFeedback}</p>
          </section>

          {analysisResult.categories && analysisResult.categories.length > 0 && (
            <section className="settings-section">
              <h2>Scores par categorie</h2>
              <div className="analysis-categories">
                {analysisResult.categories.map((cat, i) => (
                  <div key={i} className="analysis-category">
                    <div className="analysis-category-header">
                      <span className="analysis-category-name">{cat.name}</span>
                      <span className="analysis-category-score">{cat.score}%</span>
                    </div>
                    <div className="analysis-bar">
                      <div
                        className={`analysis-bar-fill ${cat.score >= 70 ? 'high' : cat.score >= 40 ? 'medium' : 'low'}`}
                        style={{ width: `${cat.score}%` }}
                      />
                    </div>
                    <p className="analysis-category-detail">{cat.details}</p>
                    <span className="analysis-category-weight">Poids : {cat.weight}%</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {analysisResult.skillsMatch && analysisResult.skillsMatch.length > 0 && (
            <section className="settings-section">
              <h2>Correspondance des competences</h2>
              <div className="analysis-skills-grid">
                {analysisResult.skillsMatch.map((s, i) => (
                  <div key={i} className={`analysis-skill-card ${s.status}`}>
                    <div className="analysis-skill-header">
                      <span className="analysis-skill-name">{s.skill}</span>
                      <span className={`analysis-skill-badge ${s.status}`}>
                        {s.status === 'match' && 'Correspond'}
                        {s.status === 'partial' && 'Partiel'}
                        {s.status === 'missing' && 'Absent'}
                      </span>
                    </div>
                    <p className="analysis-skill-detail">{s.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {analysisResult.experienceMatch && (
            <section className="settings-section">
              <h2>Experience professionnelle</h2>
              <div className="analysis-experience">
                <div className="analysis-exp-row">
                  <span className="analysis-exp-label">Demande par l'offre</span>
                  <span className="analysis-exp-value">{analysisResult.experienceMatch.requiredYears}</span>
                </div>
                <div className="analysis-exp-row">
                  <span className="analysis-exp-label">Experience du candidat</span>
                  <span className="analysis-exp-value">{analysisResult.experienceMatch.candidateYears}</span>
                </div>
                {analysisResult.experienceMatch.relevantExperiences && analysisResult.experienceMatch.relevantExperiences.length > 0 && (
                  <div className="analysis-exp-list">
                    <h3>Experiences pertinentes</h3>
                    <ul className="quiz-feedback-list quiz-strengths">
                      {analysisResult.experienceMatch.relevantExperiences.map((exp, i) => <li key={i}>{exp}</li>)}
                    </ul>
                  </div>
                )}
                {analysisResult.experienceMatch.gaps && analysisResult.experienceMatch.gaps.length > 0 && (
                  <div className="analysis-exp-list">
                    <h3>Lacunes identifiees</h3>
                    <ul className="quiz-feedback-list quiz-improvements">
                      {analysisResult.experienceMatch.gaps.map((gap, i) => <li key={i}>{gap}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="settings-section">
            <div className="analysis-verdict-grid">
              {analysisResult.strengths && analysisResult.strengths.length > 0 && (
                <div className="quiz-feedback-section">
                  <h3>Points forts</h3>
                  <ul className="quiz-feedback-list quiz-strengths">
                    {analysisResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {analysisResult.weaknesses && analysisResult.weaknesses.length > 0 && (
                <div className="quiz-feedback-section">
                  <h3>Points faibles</h3>
                  <ul className="quiz-feedback-list quiz-improvements">
                    {analysisResult.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
            <section className="settings-section">
              <h2>Recommandations</h2>
              <div className="analysis-recommendations">
                {analysisResult.recommendations.map((r, i) => (
                  <div key={i} className="analysis-recommendation">{r}</div>
                ))}
              </div>
            </section>
          )}

          <div className="quiz-results-actions">
            <button type="button" className="save-btn" onClick={resetAnalysis}>Nouvelle analyse</button>
          </div>
        </>
      )}

      {result && (
        <>
          <div className="career-toolbar">
            <button type="button" className={`career-view-tab ${viewTab === 'cv' ? 'active' : ''}`} onClick={() => setViewTab('cv')}>CV</button>
            <button type="button" className={`career-view-tab ${viewTab === 'lettre' ? 'active' : ''}`} onClick={() => setViewTab('lettre')}>Lettre</button>
            <button type="button" className={`career-view-tab ${viewTab === 'suggestions' ? 'active' : ''}`} onClick={() => setViewTab('suggestions')}>Suggestions</button>
            {isJsonMode && (
              <button type="button" className={`career-view-tab ${showEditor ? 'active' : ''}`} onClick={() => setShowEditor(!showEditor)}>
                {showEditor ? 'Masquer editeur' : 'Modifier manuellement'}
              </button>
            )}
            <button type="button" className="career-view-tab" onClick={() => { setResult(null); setRefineMessages([]); }}>
              Nouvelle generation
            </button>
          </div>

          {viewTab !== 'suggestions' && isJsonMode && (
            <div className="career-tpl-selector">
              {viewTab === 'cv' && CV_TEMPLATES.map(t => (
                <button key={t.id} type="button" className={`career-tpl-btn ${cvTemplateId === t.id ? 'active' : ''}`} onClick={() => setCvTemplateId(t.id)}>{t.name}</button>
              ))}
              {viewTab === 'lettre' && LETTER_TEMPLATES.map(t => (
                <button key={t.id} type="button" className={`career-tpl-btn ${letterTemplateId === t.id ? 'active' : ''}`} onClick={() => setLetterTemplateId(t.id)}>{t.name}</button>
              ))}
            </div>
          )}

          {viewTab === 'cv' && (
            <div className={showEditor && isJsonMode ? 'career-split' : ''}>
              {showEditor && isJsonMode && (
                <div className="career-editor-panel">
                  <div className="career-editor-panel-header">
                    <div className="career-editor-tabs">
                      <button type="button" className={`career-editor-tab ${editorTab === 'cv' ? 'active' : ''}`} onClick={() => setEditorTab('cv')}>CV</button>
                      <button type="button" className={`career-editor-tab ${editorTab === 'lettre' ? 'active' : ''}`} onClick={() => { setEditorTab('lettre'); setViewTab('lettre'); }}>Lettre</button>
                    </div>
                  </div>
                  {editorTab === 'cv' && cvData && <CvEditor data={cvData} onChange={handleCvDataChange} />}
                  {editorTab === 'lettre' && lettreData && <LettreEditor data={lettreData} onChange={handleLettreDataChange} />}
                </div>
              )}
              <div className="career-preview-panel">
                <div className="career-preview-wrapper" ref={cvPreviewRef}>
                  {isJsonMode && cvData ? <CvTpl data={cvData} /> : (
                    <div className="settings-section career-result">
                      <div className="career-block markdown-content"><ReactMarkdown>{result.cv || ''}</ReactMarkdown></div>
                    </div>
                  )}
                </div>
                <div className="pdf-action-container" style={{ marginTop: '0.75rem' }}>
                  <button type="button" className="download-pdf-btn" onClick={() => downloadPdf(cvPreviewRef, 'cv.pdf')}>Telecharger le CV en PDF</button>
                </div>
              </div>
            </div>
          )}

          {viewTab === 'lettre' && (
            <div className={showEditor && isJsonMode ? 'career-split' : ''}>
              {showEditor && isJsonMode && (
                <div className="career-editor-panel">
                  <div className="career-editor-panel-header">
                    <div className="career-editor-tabs">
                      <button type="button" className={`career-editor-tab ${editorTab === 'cv' ? 'active' : ''}`} onClick={() => { setEditorTab('cv'); setViewTab('cv'); }}>CV</button>
                      <button type="button" className={`career-editor-tab ${editorTab === 'lettre' ? 'active' : ''}`} onClick={() => setEditorTab('lettre')}>Lettre</button>
                    </div>
                  </div>
                  {editorTab === 'cv' && cvData && <CvEditor data={cvData} onChange={handleCvDataChange} />}
                  {editorTab === 'lettre' && lettreData && <LettreEditor data={lettreData} onChange={handleLettreDataChange} />}
                </div>
              )}
              <div className="career-preview-panel">
                <div className="career-preview-wrapper" ref={lettrePreviewRef}>
                  {isJsonMode && lettreData ? <LetterTpl data={lettreData} /> : (
                    <div className="settings-section career-result">
                      <div className="career-block markdown-content"><ReactMarkdown>{result.lettre || ''}</ReactMarkdown></div>
                    </div>
                  )}
                </div>
                <div className="pdf-action-container" style={{ marginTop: '0.75rem' }}>
                  <button type="button" className="download-pdf-btn" onClick={() => downloadPdf(lettrePreviewRef, 'lettre_motivation.pdf')}>Telecharger la lettre en PDF</button>
                </div>
              </div>
            </div>
          )}

          {viewTab === 'suggestions' && (
            <div className="settings-section career-result">
              <div className="career-block markdown-content"><ReactMarkdown>{result.suggestions || ''}</ReactMarkdown></div>
            </div>
          )}

          <div className="career-refine-bar">
            {refineMessages.length > 0 && (
              <div className="career-refine-messages">
                {refineMessages.map((msg, i) => (
                  <div key={i} className={`career-refine-msg career-refine-msg-${msg.role}`}>
                    <span className="career-refine-msg-label">{msg.role === 'user' ? 'Vous' : 'IA'}</span>
                    <span className="career-refine-msg-text">{msg.content}</span>
                  </div>
                ))}
                {refineLoading && (
                  <div className="career-refine-msg career-refine-msg-assistant">
                    <span className="career-refine-msg-label">IA</span>
                    <span className="career-refine-msg-text"><span className="typing"><span></span><span></span><span></span></span></span>
                  </div>
                )}
                <div ref={refineEndRef} />
              </div>
            )}
            <form onSubmit={handleRefine} className="career-refine-form">
              <input type="text" className="career-refine-input" value={refineInput} onChange={e => setRefineInput(e.target.value)}
                placeholder="Demandez une modification (ex: traduire en anglais, reformuler l'experience X...)" disabled={refineLoading} />
              <button type="submit" className="career-refine-send" disabled={refineLoading || !refineInput.trim()}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

export default function CareerPage() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <CareerContent />
      </AuthProvider>
    </SettingsProvider>
  );
}
